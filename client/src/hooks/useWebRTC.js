import { useCallback, useEffect, useRef } from "react";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
const PROXIMITY_AUDIO_RADIUS = 90;
const VOICE_ACTIVITY_THRESHOLD = 0.045;
const VOICE_ACTIVITY_RELEASE = 0.028;

function shouldOffer(localPlayerId, remotePlayerId) {
  return localPlayerId < remotePlayerId;
}

function getAudioContextConstructor() {
  return window.AudioContext || window.webkitAudioContext;
}

export function useWebRTC({ socket, playerId, micStream, remotePlayers, localPosition }) {
  const peersRef = useRef(new Map());
  const pendingIceRef = useRef(new Map());
  const remotePlayersRef = useRef(remotePlayers);
  const micStreamRef = useRef(micStream);
  const localPositionRef = useRef(localPosition);
  const audioContextRef = useRef(null);
  const micAnalyserRef = useRef(null);
  const micSourceRef = useRef(null);
  const visualizerFrameRef = useRef(null);
  const voiceActiveRef = useRef(false);
  const recoveryAttemptsRef = useRef(new Map());
  const recoverOfferRef = useRef(null);

  useEffect(() => { remotePlayersRef.current = remotePlayers; }, [remotePlayers]);
  useEffect(() => { micStreamRef.current = micStream; }, [micStream]);
  useEffect(() => { localPositionRef.current = localPosition; }, [localPosition]);

  const ensureAudioContext = useCallback(async () => {
    const AudioContext = getAudioContextConstructor();
    if (!AudioContext) return null;

    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext({ latencyHint: "interactive" });
      audioContextRef.current.addEventListener("statechange", () => {
        console.debug("[webrtc] AudioContext state", {
          state: audioContextRef.current?.state,
        });
      });
      console.debug("[webrtc] AudioContext created", {
        state: audioContextRef.current.state,
      });
    }

    if (audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch (error) {
        console.warn("[webrtc] AudioContext resume failed", error);
      }
    }

    console.debug("[webrtc] AudioContext ready", {
      state: audioContextRef.current.state,
    });
    return audioContextRef.current;
  }, []);

  const clearVoiceIndicator = useCallback(() => {
    const app = document.querySelector(".workspace-app");
    if (!app) return;
    app.dataset.voiceActive = "false";
    app.style.setProperty("--mic-level", "0");
    voiceActiveRef.current = false;
  }, []);

  const closePeer = useCallback((remotePlayerId, expectedPeer = null) => {
    const peer = peersRef.current.get(remotePlayerId);
    // Async callbacks from an older RTCPeerConnection must never close a
    // replacement connection created for the same public playerId.
    if (!peer || (expectedPeer && peer !== expectedPeer)) return;

    peer.connection.onicecandidate = null;
    peer.connection.ontrack = null;
    peer.connection.onconnectionstatechange = null;
    peer.connection.oniceconnectionstatechange = null;
    peer.connection.onicecandidateerror = null;

    try {
      peer.connection.close();
    } catch {
      // The connection may already be closed by the browser.
    }

    if (peer.audio?.element) {
      peer.audio.element.pause();
      peer.audio.element.srcObject = null;
    }
    peer.audio?.source?.disconnect();
    peer.audio?.gain?.disconnect();
    pendingIceRef.current.delete(remotePlayerId);
    peersRef.current.delete(remotePlayerId);
  }, []);

  const flushPendingIce = useCallback(async (remotePlayerId, peer) => {
    if (!peer.connection.remoteDescription) return;

    const candidates = pendingIceRef.current.get(remotePlayerId);
    if (!candidates?.length) return;

    pendingIceRef.current.delete(remotePlayerId);

    for (const candidate of candidates) {
      try {
        await peer.connection.addIceCandidate(candidate);
        console.debug("[webrtc] ICE candidate added", { remotePlayerId });
      } catch (error) {
        console.warn("[webrtc] queued ICE candidate rejected", {
          remotePlayerId,
          error,
        });
      }
    }
  }, []);

  const queueIceCandidate = useCallback((remotePlayerId, candidate) => {
    const queued = pendingIceRef.current.get(remotePlayerId) || [];
    queued.push(candidate);
    pendingIceRef.current.set(remotePlayerId, queued);
    console.debug("[webrtc] ICE candidate queued", {
      remotePlayerId,
      queuedCount: queued.length,
    });
  }, []);

  const getOrCreatePeer = useCallback((remotePlayerId) => {
    const existing = peersRef.current.get(remotePlayerId);
    if (existing) return existing;

    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer = {
      connection,
      audio: null,
      audioTransceiver: null,
      makingOffer: false,
      offerSent: false,
    };

    peersRef.current.set(remotePlayerId, peer);

    const transceiver = connection.addTransceiver("audio", { direction: "sendrecv" });
    peer.audioTransceiver = transceiver;

    connection.onicecandidate = (event) => {
      if (!event.candidate) return;

      socket.emit("webrtc-ice-candidate", {
        targetPlayerId: remotePlayerId,
        fromPlayerId: playerId,
        candidate: event.candidate.toJSON(),
      });

      console.debug("[webrtc] ICE candidate sent", {
        remotePlayerId,
        candidateType: event.candidate.type,
      });
    };

    connection.onicecandidateerror = (event) => {
      console.warn("[webrtc] ICE candidate error", {
        remotePlayerId,
        url: event.url,
        errorCode: event.errorCode,
        errorText: event.errorText,
      });
    };

    connection.oniceconnectionstatechange = () => {
      console.debug("[webrtc] ICE state", {
        remotePlayerId,
        state: connection.iceConnectionState,
      });

      if (connection.iceConnectionState === "failed") {
        console.warn("[webrtc] ICE connection failed", { remotePlayerId });
      }
    };

    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      console.debug("[webrtc] peer state", { remotePlayerId, state });

      if (state === "connected") {
        recoveryAttemptsRef.current.delete(remotePlayerId);
      }

      if (state === "failed") {
        const attempts = recoveryAttemptsRef.current.get(remotePlayerId) || 0;
        closePeer(remotePlayerId, peer);

        // Recovery remains pairwise: only the deterministic offerer starts a
        // replacement negotiation, and only once until that peer connects.
        const remote = remotePlayersRef.current.find(
          (item) => item.playerId === remotePlayerId,
        );
        const local = localPositionRef.current;
        const stillNearby = remote &&
          Math.hypot(local.x - remote.x, local.y - remote.y) <= PROXIMITY_AUDIO_RADIUS;

        if (stillNearby && shouldOffer(playerId, remotePlayerId) && attempts < 1) {
          recoveryAttemptsRef.current.set(remotePlayerId, attempts + 1);
          queueMicrotask(() => recoverOfferRef.current?.(remotePlayerId));
        }
      } else if (state === "closed") {
        closePeer(remotePlayerId, peer);
      }
    };

    connection.ontrack = async (event) => {
      console.debug("[webrtc] remote audio track received", {
        remotePlayerId,
        trackId: event.track?.id,
        kind: event.track?.kind,
        readyState: event.track?.readyState,
        streamCount: event.streams.length,
      });

      // replaceTrack() on an addTransceiver-created sender can produce a
      // streamless track event. Always build a stream so remote audio is not dropped.
      const stream = event.streams[0] || new MediaStream([event.track]);

      event.track.addEventListener("mute", () => {
        console.warn("[webrtc] remote audio track muted", { remotePlayerId });
      });
      event.track.addEventListener("unmute", () => {
        console.debug("[webrtc] remote audio track unmuted", {
          remotePlayerId,
          readyState: event.track.readyState,
        });
      });
      event.track.addEventListener("ended", () => {
        console.warn("[webrtc] remote audio track ended", { remotePlayerId });
      });

      if (peer.audio?.element) {
        peer.audio.element.pause();
        peer.audio.element.srcObject = null;
      }

      const remote = remotePlayersRef.current.find((item) => item.playerId === remotePlayerId);
      const currentPosition = localPositionRef.current;
      const distance = remote
        ? Math.hypot(currentPosition.x - remote.x, currentPosition.y - remote.y)
        : PROXIMITY_AUDIO_RADIUS;
      const initialGain = Math.max(
        0,
        Math.min(1, 1 - distance / PROXIMITY_AUDIO_RADIUS),
      );

      // Use a media element for remote playback so autoplay failures are
      // observable and can be retried after a user gesture.
      const element = new Audio();
      element.autoplay = true;
      element.playsInline = true;
      element.muted = false;
      element.volume = initialGain;
      element.srcObject = stream;
      peer.audio = { element };

      console.debug("[webrtc] remote audio element attached", {
        remotePlayerId,
        trackState: event.track.readyState,
        trackMuted: event.track.muted,
        streamAudioTracks: stream.getAudioTracks().length,
        remotePlayerFound: Boolean(remote),
        distance: remote ? Math.round(distance) : null,
        volume: Number(initialGain.toFixed(3)),
        paused: element.paused,
        muted: element.muted,
      });

      try {
        await element.play();
        console.debug("[webrtc] remote audio playback started", {
          remotePlayerId,
          paused: element.paused,
          volume: element.volume,
          readyState: element.readyState,
        });
      } catch (error) {
        console.warn("[webrtc] remote audio playback blocked", {
          remotePlayerId,
          name: error?.name,
          message: error?.message,
        });
      }
    };

    const track = micStreamRef.current?.getAudioTracks?.()[0];
    if (track) {
      console.debug("[webrtc] attaching local microphone track", {
        remotePlayerId,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
      });
      transceiver.sender.replaceTrack(track).then(() => {
        console.debug("[webrtc] local microphone track attached", {
          remotePlayerId,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      }).catch((error) => {
        console.warn("[webrtc] initial microphone track attach failed", error);
      });
    } else {
      console.warn("[webrtc] no local microphone track when peer was created", {
        remotePlayerId,
      });
    }

    return peer;
  }, [closePeer, ensureAudioContext, playerId, socket]);

  const createOffer = useCallback(async (remotePlayerId) => {
    const peer = getOrCreatePeer(remotePlayerId);

    if (
      peer.offerSent ||
      peer.connection.signalingState !== "stable" ||
      peer.makingOffer
    ) return;

    peer.makingOffer = true;
    peer.offerSent = true;

    try {
      const offer = await peer.connection.createOffer();
      await peer.connection.setLocalDescription(offer);

      socket.emit("webrtc-offer", {
        targetPlayerId: remotePlayerId,
        fromPlayerId: playerId,
        sdp: peer.connection.localDescription,
      });

      console.debug("[webrtc] offer sent", { remotePlayerId });
    } catch (error) {
      console.error("[webrtc] offer creation failed", { remotePlayerId, error });
      closePeer(remotePlayerId, peer);
      throw error;
    } finally {
      peer.makingOffer = false;
    }
  }, [closePeer, getOrCreatePeer, playerId, socket]);

  useEffect(() => {
    recoverOfferRef.current = createOffer;
    return () => {
      if (recoverOfferRef.current === createOffer) recoverOfferRef.current = null;
    };
  }, [createOffer]);

  useEffect(() => {
    if (!playerId || typeof RTCPeerConnection === "undefined") return;

    for (const remote of remotePlayers) {
      const distance = Math.hypot(localPosition.x - remote.x, localPosition.y - remote.y);

      if (distance <= PROXIMITY_AUDIO_RADIUS) {
        getOrCreatePeer(remote.playerId);

        if (shouldOffer(playerId, remote.playerId)) {
          createOffer(remote.playerId).catch(() => {});
        }
      }
    }
  }, [createOffer, getOrCreatePeer, localPosition, playerId, remotePlayers]);

  useEffect(() => {
    if (!playerId || typeof RTCPeerConnection === "undefined") return undefined;

    const onProximityEntered = ({ playerId: remotePlayerId }) => {
      if (!remotePlayerId || remotePlayerId === playerId) return;

      recoveryAttemptsRef.current.delete(remotePlayerId);
      getOrCreatePeer(remotePlayerId);

      if (shouldOffer(playerId, remotePlayerId)) {
        createOffer(remotePlayerId).catch(() => {});
      }
    };

    const onProximityLeft = ({ playerId: remotePlayerId }) => {
      if (!remotePlayerId || remotePlayerId === playerId) return;
      pendingIceRef.current.delete(remotePlayerId);
      recoveryAttemptsRef.current.delete(remotePlayerId);
      closePeer(remotePlayerId);
      console.debug("[webrtc] proximity left; peer closed", { remotePlayerId });
    };

    const onOffer = async (payload) => {
      if (payload?.targetPlayerId !== playerId || !payload.fromPlayerId || !payload.sdp) return;

      const peer = getOrCreatePeer(payload.fromPlayerId);

      try {
        await peer.connection.setRemoteDescription(payload.sdp);
        await flushPendingIce(payload.fromPlayerId, peer);

        const answer = await peer.connection.createAnswer();
        await peer.connection.setLocalDescription(answer);

        socket.emit("webrtc-answer", {
          targetPlayerId: payload.fromPlayerId,
          fromPlayerId: playerId,
          sdp: peer.connection.localDescription,
        });

        console.debug("[webrtc] answer sent", { remotePlayerId: payload.fromPlayerId });
      } catch (error) {
        console.error("[webrtc] offer handling failed", {
          remotePlayerId: payload.fromPlayerId,
          error,
        });
        closePeer(payload.fromPlayerId, peer);
      }
    };

    const onAnswer = async (payload) => {
      if (payload?.targetPlayerId !== playerId || !payload.fromPlayerId || !payload.sdp) return;

      const peer = peersRef.current.get(payload.fromPlayerId);
      if (!peer) return;

      try {
        await peer.connection.setRemoteDescription(payload.sdp);
        await flushPendingIce(payload.fromPlayerId, peer);
        console.debug("[webrtc] answer applied", { remotePlayerId: payload.fromPlayerId });
      } catch (error) {
        console.error("[webrtc] answer handling failed", {
          remotePlayerId: payload.fromPlayerId,
          error,
        });
        closePeer(payload.fromPlayerId, peer);
      }
    };

    const onCandidate = async (payload) => {
      if (
        payload?.targetPlayerId !== playerId ||
        !payload.fromPlayerId ||
        !payload.candidate
      ) {
        return;
      }

      const remotePlayerId = payload.fromPlayerId;
      const peer = peersRef.current.get(remotePlayerId);

      if (!peer || !peer.connection.remoteDescription) {
        queueIceCandidate(remotePlayerId, payload.candidate);
        return;
      }

      try {
        await peer.connection.addIceCandidate(payload.candidate);
        console.debug("[webrtc] ICE candidate added", { remotePlayerId });
      } catch (error) {
        console.warn("[webrtc] ICE candidate rejected", {
          remotePlayerId,
          error,
        });
      }
    };

    const onSignalingError = (payload) => {
      console.warn("[webrtc] signaling error", payload);
    };

    socket.on("proximity-entered", onProximityEntered);
    socket.on("proximity-left", onProximityLeft);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice-candidate", onCandidate);
    socket.on("webrtc-signaling-error", onSignalingError);

    return () => {
      socket.off("proximity-entered", onProximityEntered);
      socket.off("proximity-left", onProximityLeft);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice-candidate", onCandidate);
      socket.off("webrtc-signaling-error", onSignalingError);

      for (const remotePlayerId of peersRef.current.keys()) {
        closePeer(remotePlayerId);
      }
      pendingIceRef.current.clear();
    };
  }, [
    closePeer,
    createOffer,
    flushPendingIce,
    getOrCreatePeer,
    playerId,
    queueIceCandidate,
    socket,
  ]);

  useEffect(() => {
    for (const peer of peersRef.current.values()) {
      const track = micStream?.getAudioTracks?.()[0] || null;

      peer.audioTransceiver?.sender.replaceTrack(track).catch((error) => {
        console.warn("[webrtc] microphone track update failed", error);
      });
    }
  }, [micStream]);

  useEffect(() => {
    let cancelled = false;

    async function setupMicrophoneAnalyser() {
      const track = micStream?.getAudioTracks?.()[0];

      if (!track) {
        micSourceRef.current?.disconnect();
        micAnalyserRef.current?.disconnect();
        micSourceRef.current = null;
        micAnalyserRef.current = null;
        clearVoiceIndicator();
        return;
      }

      const context = await ensureAudioContext();
      if (!context || cancelled) return;

      micSourceRef.current?.disconnect();
      micAnalyserRef.current?.disconnect();

      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.72;

      const source = context.createMediaStreamSource(micStream);
      source.connect(analyser);

      micSourceRef.current = source;
      micAnalyserRef.current = analyser;

      const data = new Uint8Array(analyser.fftSize);

      const updateVisualizer = () => {
        if (cancelled || !micAnalyserRef.current) return;

        analyser.getByteTimeDomainData(data);

        let sum = 0;
        for (const value of data) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / data.length);
        const level = Math.min(1, rms * 3.4);
        const wasActive = voiceActiveRef.current;
        const isActive = wasActive
          ? level >= VOICE_ACTIVITY_RELEASE
          : level >= VOICE_ACTIVITY_THRESHOLD;

        voiceActiveRef.current = isActive;

        const app = document.querySelector(".workspace-app");
        if (app) {
          app.style.setProperty("--mic-level", level.toFixed(3));
          app.dataset.voiceActive = isActive ? "true" : "false";
        }

        visualizerFrameRef.current = requestAnimationFrame(updateVisualizer);
      };

      cancelAnimationFrame(visualizerFrameRef.current);
      updateVisualizer();
    }

    setupMicrophoneAnalyser().catch((error) => {
      console.warn("[webrtc] microphone visualizer setup failed", error);
      clearVoiceIndicator();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(visualizerFrameRef.current);
      micSourceRef.current?.disconnect();
      micAnalyserRef.current?.disconnect();
      micSourceRef.current = null;
      micAnalyserRef.current = null;
    };
  }, [clearVoiceIndicator, ensureAudioContext, micStream]);

  useEffect(() => {
    const resumeFromUserGesture = () => {
      const context = audioContextRef.current;
      if (context?.state === "suspended") {
        context.resume().catch((error) => {
          console.warn("[webrtc] AudioContext resume failed", error);
        });
      }

      for (const [remotePlayerId, peer] of peersRef.current) {
        const element = peer.audio?.element;
        if (!element || !element.paused) continue;
        element.play().then(() => {
          console.debug("[webrtc] remote audio playback resumed after gesture", {
            remotePlayerId,
            volume: element.volume,
          });
        }).catch((error) => {
          console.warn("[webrtc] remote audio playback still blocked", {
            remotePlayerId,
            name: error?.name,
            message: error?.message,
          });
        });
      }
    };

    document.addEventListener("pointerup", resumeFromUserGesture);
    document.addEventListener("keydown", resumeFromUserGesture);

    return () => {
      document.removeEventListener("pointerup", resumeFromUserGesture);
      document.removeEventListener("keydown", resumeFromUserGesture);
    };
  }, []);

  useEffect(() => {
    for (const [remotePlayerId, peer] of peersRef.current) {
      const remote = remotePlayersRef.current.find((item) => item.playerId === remotePlayerId);
      if (!remote || !peer.audio?.element) continue;

      const distance = Math.hypot(localPosition.x - remote.x, localPosition.y - remote.y);
      const volume = Math.max(0, Math.min(1, 1 - distance / PROXIMITY_AUDIO_RADIUS));

      peer.audio.element.volume = volume;
      console.debug("[webrtc] remote audio volume updated", {
        remotePlayerId,
        distance: Math.round(distance),
        volume: Number(volume.toFixed(3)),
        paused: peer.audio.element.paused,
        readyState: peer.audio.element.readyState,
      });
    }
  }, [localPosition, remotePlayers]);

  useEffect(() => () => {
    cancelAnimationFrame(visualizerFrameRef.current);
    clearVoiceIndicator();

    // closePeer tears down both the RTCPeerConnection and its playback sink.
    // Do this before clearing the map; clearing first would make the loop below
    // unable to find and stop the audio elements, allowing orphaned audio to
    // survive a hook unmount/reinitialization.
    for (const remotePlayerId of [...peersRef.current.keys()]) {
      closePeer(remotePlayerId);
    }

    pendingIceRef.current.clear();
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  }, [clearVoiceIndicator, closePeer]);
}
