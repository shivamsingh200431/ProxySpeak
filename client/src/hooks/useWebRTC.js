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
  const audioContextRef = useRef(null);
  const micAnalyserRef = useRef(null);
  const micSourceRef = useRef(null);
  const visualizerFrameRef = useRef(null);
  const voiceActiveRef = useRef(false);

  useEffect(() => { remotePlayersRef.current = remotePlayers; }, [remotePlayers]);
  useEffect(() => { micStreamRef.current = micStream; }, [micStream]);

  const ensureAudioContext = useCallback(async () => {
    const AudioContext = getAudioContextConstructor();
    if (!AudioContext) return null;

    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext({ latencyHint: "interactive" });
    }

    if (audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch (error) {
        console.warn("[webrtc] AudioContext resume failed", error);
      }
    }

    return audioContextRef.current;
  }, []);

  const clearVoiceIndicator = useCallback(() => {
    const app = document.querySelector(".workspace-app");
    if (!app) return;
    app.dataset.voiceActive = "false";
    app.style.setProperty("--mic-level", "0");
    voiceActiveRef.current = false;
  }, []);

  const closePeer = useCallback((remotePlayerId) => {
    const peer = peersRef.current.get(remotePlayerId);
    if (!peer) return;

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
      console.debug("[webrtc] peer state", {
        remotePlayerId,
        state: connection.connectionState,
      });

      if (["failed", "closed"].includes(connection.connectionState)) {
        closePeer(remotePlayerId);
      }
    };

    connection.ontrack = async (event) => {
      const stream = event.streams[0];
      if (!stream) return;

      console.debug("[webrtc] remote audio track received", {
        remotePlayerId,
        trackId: event.track?.id,
      });

      const context = await ensureAudioContext();
      if (!context) return;

      peer.audio?.source?.disconnect();
      peer.audio?.gain?.disconnect();

      const source = context.createMediaStreamSource(stream);
      const gain = context.createGain();

      const remote = remotePlayersRef.current.find((item) => item.playerId === remotePlayerId);
      const distance = remote
        ? Math.hypot(localPosition.x - remote.x, localPosition.y - remote.y)
        : PROXIMITY_AUDIO_RADIUS;
      const initialGain = Math.max(
        0,
        Math.min(1, 1 - distance / PROXIMITY_AUDIO_RADIUS),
      );

      gain.gain.value = initialGain;
      source.connect(gain).connect(context.destination);

      peer.audio = { source, gain };

      if (context.state === "suspended") {
        console.warn("[webrtc] AudioContext is still suspended after remote track", {
          remotePlayerId,
        });
      }
    };

    const track = micStreamRef.current?.getAudioTracks?.()[0];
    if (track) {
      transceiver.sender.replaceTrack(track).catch((error) => {
        console.warn("[webrtc] initial microphone track attach failed", error);
      });
    }

    return peer;
  }, [closePeer, ensureAudioContext, playerId, socket]);

  const createOffer = useCallback(async (remotePlayerId) => {
    const peer = getOrCreatePeer(remotePlayerId);

    if (peer.connection.signalingState !== "stable" || peer.makingOffer) return;

    peer.makingOffer = true;

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
      closePeer(remotePlayerId);
      throw error;
    } finally {
      peer.makingOffer = false;
    }
  }, [closePeer, getOrCreatePeer, playerId, socket]);

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

      getOrCreatePeer(remotePlayerId);

      if (shouldOffer(playerId, remotePlayerId)) {
        createOffer(remotePlayerId).catch(() => {});
      }
    };

    const onProximityLeft = ({ playerId: remotePlayerId }) => {
      pendingIceRef.current.delete(remotePlayerId);
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
        closePeer(payload.fromPlayerId);
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
        closePeer(payload.fromPlayerId);
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
      if (!remote || !peer.audio?.gain) continue;

      const distance = Math.hypot(localPosition.x - remote.x, localPosition.y - remote.y);
      const gain = Math.max(0, Math.min(1, 1 - distance / PROXIMITY_AUDIO_RADIUS));

      peer.audio.gain.gain.setTargetAtTime(
        gain,
        peer.audio.gain.context.currentTime,
        0.04,
      );
    }
  }, [localPosition, remotePlayers]);

  useEffect(() => () => {
    cancelAnimationFrame(visualizerFrameRef.current);
    clearVoiceIndicator();

    for (const peer of peersRef.current.values()) {
      try {
        peer.connection.close();
      } catch {
        // Ignore cleanup errors.
      }
    }

    peersRef.current.clear();
    pendingIceRef.current.clear();

    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  }, [clearVoiceIndicator]);
}
