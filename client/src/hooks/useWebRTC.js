import { useCallback, useEffect, useRef } from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  // Public fallback only. Use provider-issued, short-lived credentials in production.
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

// Must stay aligned with server/src/socket/proximity.js and constants/world.js.
const PROXIMITY_AUDIO_RADIUS = 90;
const VOICE_ACTIVITY_THRESHOLD = 0.045;
const VOICE_ACTIVITY_RELEASE = 0.028;

function shouldOffer(localPlayerId, remotePlayerId) {
  return localPlayerId.localeCompare(remotePlayerId) < 0;
}

export function useWebRTC({ socket, playerId, micStream, remotePlayers, localPosition }) {
  const peersRef = useRef(new Map());
  const remotePlayersRef = useRef(remotePlayers);
  const micStreamRef = useRef(micStream);
  const localPositionRef = useRef(localPosition);
  const audioContextRef = useRef(null);
  const micAnalyserRef = useRef(null);
  const micSourceRef = useRef(null);
  const visualizerFrameRef = useRef(null);
  const voiceActiveRef = useRef(false);

  useEffect(() => { remotePlayersRef.current = remotePlayers; }, [remotePlayers]);
  useEffect(() => { micStreamRef.current = micStream; }, [micStream]);
  useEffect(() => { localPositionRef.current = localPosition; }, [localPosition]);

  const ensureAudioContext = useCallback(async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext({ latencyHint: "interactive" });
    }
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }, []);

  const clearVoiceIndicator = useCallback(() => {
    const app = document.querySelector(".workspace-app");
    if (app) {
      app.dataset.voiceActive = "false";
      app.style.setProperty("--mic-level", "0");
    }
    voiceActiveRef.current = false;
  }, []);

  const closePeer = useCallback((remotePlayerId) => {
    const peer = peersRef.current.get(remotePlayerId);
    if (!peer) return;
    peer.closed = true;
    peer.connection.ontrack = null;
    peer.connection.onicecandidate = null;
    peer.connection.onicecandidateerror = null;
    peer.connection.oniceconnectionstatechange = null;
    peer.connection.onconnectionstatechange = null;
    try { peer.connection.close(); } catch {}
    peer.audio?.source?.disconnect();
    peer.audio?.gain?.disconnect();
    if (peer.audio?.element) {
      peer.audio.element.pause();
      peer.audio.element.srcObject = null;
      peer.audio.element.remove();
    }
    peer.audio = null;
    peer.pendingCandidates.length = 0;
    peersRef.current.delete(remotePlayerId);
  }, []);

  const getOrCreatePeer = useCallback((remotePlayerId) => {
    const existing = peersRef.current.get(remotePlayerId);
    if (existing) return existing;

    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer = {
      connection,
      audio: null,
      makingOffer: false,
      polite: playerId.localeCompare(remotePlayerId) > 0,
      ignoreOffer: false,
      closed: false,
      pendingCandidates: [],
      operations: Promise.resolve(),
    };
    peersRef.current.set(remotePlayerId, peer);
    const transceiver = connection.addTransceiver("audio", { direction: "sendrecv" });
    peer.audioTransceiver = transceiver;

    // Serialize SDP/ICE state mutations; socket events can arrive back-to-back.
    peer.enqueue = (operation) => {
      const task = peer.operations.then(() => {
        if (!peer.closed && peersRef.current.get(remotePlayerId) === peer) return operation();
      });
      peer.operations = task.catch((error) => {
        console.warn("[webrtc] peer operation failed", { remotePlayerId, error });
      });
      return task;
    };

    const flushCandidates = async () => {
      while (peer.pendingCandidates.length && connection.remoteDescription && !peer.closed) {
        const candidate = peer.pendingCandidates.shift();
        try {
          await connection.addIceCandidate(candidate);
        } catch (error) {
          // A rejected candidate should not destroy an otherwise healthy peer.
          console.debug("[webrtc] candidate ignored", { remotePlayerId, name: error?.name });
        }
      }
    };
    peer.flushCandidates = flushCandidates;

    connection.onicecandidate = ({ candidate }) => {
      if (!candidate || peer.closed) return;
      socket.emit("webrtc-ice-candidate", {
        targetPlayerId: remotePlayerId,
        fromPlayerId: playerId,
        candidate: candidate.toJSON(),
      });
    };

    connection.onicecandidateerror = (event) => {
      console.debug("[webrtc] ICE candidate error", {
        remotePlayerId, url: event.url, errorCode: event.errorCode, errorText: event.errorText,
      });
    };

    connection.ontrack = (event) => {
      if (peer.closed || peersRef.current.get(remotePlayerId) !== peer) return;
      const stream = event.streams[0] || new MediaStream([event.track]);

      // A transceiver/replaced sender may deliver a streamless track.
      // Play remote media through a real, unmuted media element so browser
      // autoplay failures are observable and can be retried after a gesture.
      const remote = remotePlayersRef.current.find((item) => item.playerId === remotePlayerId);
      const local = localPositionRef.current;
      const distance = remote
        ? Math.hypot(local.x - remote.x, local.y - remote.y)
        : null;
      // Do not start silent if the position snapshot has not arrived yet;
      // the proximity effect applies the exact distance volume as soon as it does.
      const initialVolume = distance === null
        ? 1
        : Math.max(0, Math.min(1, 1 - distance / PROXIMITY_AUDIO_RADIUS));

      if (peer.audio?.element) {
        peer.audio.element.pause();
        peer.audio.element.srcObject = null;
        peer.audio.element.remove();
      }

      const element = new Audio();
      element.autoplay = true;
      element.playsInline = true;
      element.muted = false;
      element.volume = initialVolume;
      element.srcObject = stream;
      peer.audio = { element };

      event.track.addEventListener("mute", () => {
        console.warn("[webrtc] remote audio track muted", { remotePlayerId });
      });
      event.track.addEventListener("unmute", () => {
        console.debug("[webrtc] remote audio track unmuted", { remotePlayerId });
      });
      event.track.addEventListener("ended", () => {
        console.warn("[webrtc] remote audio track ended", { remotePlayerId });
      });

      console.debug("[webrtc] remote audio element attached", {
        remotePlayerId,
        trackState: event.track.readyState,
        trackMuted: event.track.muted,
        streamAudioTracks: stream.getAudioTracks().length,
        remotePlayerFound: Boolean(remote),
        distance: remote ? Math.round(distance) : null,
        volume: Number(initialVolume.toFixed(3)),
      });

      element.play().then(() => {
        if (peer.closed || peersRef.current.get(remotePlayerId) !== peer) {
          element.pause();
          element.srcObject = null;
        } else {
          console.debug("[webrtc] remote audio playback started", {
            remotePlayerId,
            paused: element.paused,
            volume: element.volume,
            readyState: element.readyState,
          });
        }
      }).catch((error) => {
        console.warn("[webrtc] remote audio playback blocked", {
          remotePlayerId,
          name: error?.name,
          message: error?.message,
        });
      });
    };

    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      console.debug("[webrtc] peer state", { remotePlayerId, state });
      if (["failed", "closed"].includes(state) && peersRef.current.get(remotePlayerId) === peer) {
        closePeer(remotePlayerId);
      }
    };
    connection.oniceconnectionstatechange = () => {
      if (connection.iceConnectionState === "failed" && !peer.closed) {
        // Give ICE restart a chance without replacing the connection immediately.
        connection.restartIce();
      }
    };

    const track = micStreamRef.current?.getAudioTracks?.()[0] || null;
    if (track) {
      transceiver.sender.replaceTrack(track).then(() => {
        console.debug("[webrtc] local microphone track attached", {
          remotePlayerId,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      }).catch((error) => {
        console.warn("[webrtc] initial microphone track attach failed", {
          remotePlayerId,
          name: error?.name,
          message: error?.message,
        });
      });
    } else {
      console.debug("[webrtc] peer created before microphone permission", { remotePlayerId });
    }
    return peer;
  }, [closePeer, playerId, socket]);

  const createOffer = useCallback(async (remotePlayerId) => {
    const peer = getOrCreatePeer(remotePlayerId);
    if (!peer || peer.closed || peer.makingOffer) return;
    await peer.enqueue(async () => {
      const { connection } = peer;
      if (connection.signalingState !== "stable") return;
      peer.makingOffer = true;
      try {
        const offer = await connection.createOffer();
        if (peer.closed) return;
        await connection.setLocalDescription(offer);
        socket.emit("webrtc-offer", {
          targetPlayerId: remotePlayerId,
          fromPlayerId: playerId,
          sdp: connection.localDescription,
        });
      } finally {
        peer.makingOffer = false;
      }
    });
  }, [getOrCreatePeer, playerId, socket]);

  useEffect(() => {
    if (!playerId || typeof RTCPeerConnection === "undefined") return;
    for (const remote of remotePlayers) {
      if (!remote?.playerId || remote.playerId === playerId) continue;
      const distance = Math.hypot(localPosition.x - remote.x, localPosition.y - remote.y);
      if (distance <= PROXIMITY_AUDIO_RADIUS) {
        getOrCreatePeer(remote.playerId);
        if (shouldOffer(playerId, remote.playerId)) {
          createOffer(remote.playerId).catch((error) =>
            console.warn("[webrtc] offer failed", { remotePlayerId: remote.playerId, error }));
        }
      } else if (peersRef.current.has(remote.playerId)) {
        closePeer(remote.playerId);
      }
    }
    const presentIds = new Set(remotePlayers.map((remote) => remote.playerId));
    for (const id of peersRef.current.keys()) {
      if (!presentIds.has(id)) closePeer(id);
    }
  }, [closePeer, createOffer, getOrCreatePeer, localPosition, playerId, remotePlayers]);

  useEffect(() => {
    if (!playerId || typeof RTCPeerConnection === "undefined") return undefined;

    const onProximityEntered = ({ playerId: remotePlayerId } = {}) => {
      if (!remotePlayerId || remotePlayerId === playerId) return;
      getOrCreatePeer(remotePlayerId);
      if (shouldOffer(playerId, remotePlayerId)) {
        createOffer(remotePlayerId).catch((error) =>
          console.warn("[webrtc] offer failed", { remotePlayerId, error }));
      }
    };
    const onProximityLeft = ({ playerId: remotePlayerId } = {}) => {
      if (remotePlayerId && remotePlayerId !== playerId) closePeer(remotePlayerId);
    };

    const onOffer = (payload) => {
      if (payload?.targetPlayerId !== playerId || !payload.fromPlayerId || !payload.sdp) return;
      const remotePlayerId = payload.fromPlayerId;
      const peer = getOrCreatePeer(remotePlayerId);
      peer.enqueue(async () => {
        const { connection } = peer;
        // Keep the deterministic offerer as the normal path, but use Perfect
        // Negotiation to recover safely if simultaneous offers ever collide.
        const offerCollision = payload.sdp.type === "offer" &&
          (peer.makingOffer || connection.signalingState !== "stable");
        peer.ignoreOffer = !peer.polite && offerCollision;
        if (peer.ignoreOffer) {
          // ICE candidates queued before the colliding offer belong to the
          // ignored negotiation and must not leak into a later description.
          peer.pendingCandidates.length = 0;
          console.debug("[webrtc] ignoring colliding offer (impolite peer)", { remotePlayerId });
          return;
        }
        if (offerCollision && peer.polite) {
          await connection.setLocalDescription({ type: "rollback" });
        }
        await connection.setRemoteDescription(payload.sdp);
        await peer.flushCandidates();
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        socket.emit("webrtc-answer", {
          targetPlayerId: remotePlayerId,
          fromPlayerId: playerId,
          sdp: connection.localDescription,
        });
      });
    };

    const onAnswer = (payload) => {
      if (payload?.targetPlayerId !== playerId || !payload.fromPlayerId || !payload.sdp) return;
      const peer = peersRef.current.get(payload.fromPlayerId);
      if (!peer) return;
      peer.enqueue(async () => {
        if (peer.connection.signalingState !== "have-local-offer") return;
        await peer.connection.setRemoteDescription(payload.sdp);
        await peer.flushCandidates();
      });
    };

    const onCandidate = (payload) => {
      if (payload?.targetPlayerId !== playerId || !payload.fromPlayerId || !payload.candidate) return;
      // A candidate may beat the offer over signaling; retain it on a placeholder peer.
      const peer = getOrCreatePeer(payload.fromPlayerId);
      peer.enqueue(async () => {
        if (peer.ignoreOffer) return;
        if (!peer.connection.remoteDescription) {
          peer.pendingCandidates.push(payload.candidate);
          return;
        }
        try {
          await peer.connection.addIceCandidate(payload.candidate);
        } catch (error) {
          console.debug("[webrtc] candidate ignored", { remotePlayerId: payload.fromPlayerId, name: error?.name });
        }
      });
    };

    socket.on("proximity-entered", onProximityEntered);
    socket.on("proximity-left", onProximityLeft);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice-candidate", onCandidate);

    return () => {
      socket.off("proximity-entered", onProximityEntered);
      socket.off("proximity-left", onProximityLeft);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice-candidate", onCandidate);
      for (const id of [...peersRef.current.keys()]) closePeer(id);
    };
  }, [closePeer, createOffer, getOrCreatePeer, playerId, socket]);

  useEffect(() => {
    const track = micStream?.getAudioTracks?.()[0] || null;
    for (const [remotePlayerId, peer] of peersRef.current) {
      const sender = peer.audioTransceiver?.sender;
      if (!sender) continue;
      sender.replaceTrack(track).then(() => {
        console.debug("[webrtc] microphone sender updated", {
          remotePlayerId,
          trackAttached: Boolean(track),
          enabled: track?.enabled ?? false,
          muted: track?.muted ?? false,
          readyState: track?.readyState ?? "none",
        });
      }).catch((error) => {
        console.warn("[webrtc] microphone sender update failed", {
          remotePlayerId,
          name: error?.name,
          message: error?.message,
        });
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
      const tick = () => {
        if (cancelled || !micAnalyserRef.current) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / data.length);
        const level = Math.min(1, rms * 3.4);
        const isActive = voiceActiveRef.current
          ? level >= VOICE_ACTIVITY_RELEASE
          : level >= VOICE_ACTIVITY_THRESHOLD;
        voiceActiveRef.current = isActive;

        const app = document.querySelector(".workspace-app");
        if (app) {
          app.style.setProperty("--mic-level", level.toFixed(3));
          app.dataset.voiceActive = isActive ? "true" : "false";
        }
        visualizerFrameRef.current = requestAnimationFrame(tick);
      };

      cancelAnimationFrame(visualizerFrameRef.current);
      tick();
    }

    setupMicrophoneAnalyser().catch((error) => {
      console.warn("[webrtc] microphone analyser unavailable", { name: error?.name });
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
    for (const [remotePlayerId, peer] of peersRef.current) {
      const remote = remotePlayersRef.current.find((item) => item.playerId === remotePlayerId);
      if (!remote || !peer.audio?.element) continue;
      const distance = Math.hypot(localPosition.x - remote.x, localPosition.y - remote.y);
      const volume = Math.max(0, Math.min(1, 1 - distance / PROXIMITY_AUDIO_RADIUS));
      peer.audio.element.volume = volume;
    }
  }, [localPosition, remotePlayers]);

  useEffect(() => {
    const resume = () => {
      const context = audioContextRef.current;
      if (context?.state === "suspended") context.resume().catch(() => {});
      for (const peer of peersRef.current.values()) {
        if (peer.audio?.element?.paused) peer.audio.element.play().catch(() => {});
      }
    };
    document.addEventListener("pointerup", resume);
    document.addEventListener("keydown", resume);
    return () => {
      document.removeEventListener("pointerup", resume);
      document.removeEventListener("keydown", resume);
      cancelAnimationFrame(visualizerFrameRef.current);
      micSourceRef.current?.disconnect();
      micAnalyserRef.current?.disconnect();
      micSourceRef.current = null;
      micAnalyserRef.current = null;
      clearVoiceIndicator();
      for (const id of [...peersRef.current.keys()]) closePeer(id);
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, [clearVoiceIndicator, closePeer]);
}
