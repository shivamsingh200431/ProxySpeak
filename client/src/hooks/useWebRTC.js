import { useCallback, useEffect, useRef } from "react";

console.warn("🟢 useWebRTC.js REWRITE");


const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

const PROXIMITY_AUDIO_RADIUS = 90;
const VOICE_ACTIVITY_THRESHOLD = 0.045;
const VOICE_ACTIVITY_RELEASE = 0.028;

function getAudioContextConstructor() {
  return window.AudioContext || window.webkitAudioContext;
}


function createPeer({ socket, playerId, remotePlayerId, onClose }) {
  const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

 
  const polite = playerId > remotePlayerId;

  let makingOffer = false;
  let ignoreOffer = false;
  let closed = false;
  let audioSender = null;
  let element = null;

  connection.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      await connection.setLocalDescription();
      socket.emit("webrtc-offer", {
        targetPlayerId: remotePlayerId,
        fromPlayerId: playerId,
        sdp: connection.localDescription,
      });
      console.debug("[webrtc] offer sent", { remotePlayerId });
    } catch (error) {
      console.error("[webrtc] negotiation failed", { remotePlayerId, error });
    } finally {
      makingOffer = false;
    }
  };

  connection.onicecandidate = ({ candidate }) => {
    if (!candidate) return;
    socket.emit("webrtc-ice-candidate", {
      targetPlayerId: remotePlayerId,
      fromPlayerId: playerId,
      candidate: candidate.toJSON(),
    });
  };

  connection.onicecandidateerror = (event) => {
    console.debug("[webrtc] ICE candidate error (routine unless connection also fails)", {
      remotePlayerId,
      url: event.url,
      errorCode: event.errorCode,
      errorText: event.errorText,
    });
  };

  connection.oniceconnectionstatechange = () => {
    console.debug("[webrtc] ICE state", { remotePlayerId, state: connection.iceConnectionState });
    if (connection.iceConnectionState === "failed") {
      console.warn("[webrtc] ICE failed — restarting ICE", { remotePlayerId });
      connection.restartIce();
    }
  };

  connection.onconnectionstatechange = () => {
    console.debug("[webrtc] peer state", { remotePlayerId, state: connection.connectionState });
  };

  connection.ontrack = (event) => {
    console.debug("[webrtc] remote track received", {
      remotePlayerId,
      trackMuted: event.track.muted,
      readyState: event.track.readyState,
      streamCount: event.streams.length,
    });

    const stream = event.streams[0] || new MediaStream([event.track]);

    if (!element) {
      element = new Audio();
      element.autoplay = true;
      element.playsInline = true;
      element.volume = 1;
    }
    element.srcObject = stream;
    element.play().catch((error) => {
      console.warn("[webrtc] remote audio playback blocked, will resume on next user gesture", {
        remotePlayerId,
        name: error?.name,
      });
    });
  };

  function cleanupAudio() {
    if (element) {
      element.pause();
      element.srcObject = null;
      element = null;
    }
  }

  async function setTrack(track) {
    if (closed) return;

    if (track) {
      if (audioSender) {
        await audioSender.replaceTrack(track).catch((error) => {
          console.warn("[webrtc] replaceTrack failed", { remotePlayerId, error });
        });
      } else {
        audioSender = connection.addTrack(track);
      }
    } else if (audioSender) {
      await audioSender.replaceTrack(null).catch(() => {});
    }
  }

  async function handleSignal({ sdp, candidate }) {
    try {
      if (sdp) {
        const offerCollision = sdp.type === "offer" && (makingOffer || connection.signalingState !== "stable");
        ignoreOffer = !polite && offerCollision;
        if (ignoreOffer) {
          console.debug("[webrtc] ignoring colliding offer (impolite peer)", { remotePlayerId });
          return;
        }

        await connection.setRemoteDescription(sdp);

        if (sdp.type === "offer") {
          await connection.setLocalDescription();
          socket.emit("webrtc-answer", {
            targetPlayerId: remotePlayerId,
            fromPlayerId: playerId,
            sdp: connection.localDescription,
          });
          console.debug("[webrtc] answer sent", { remotePlayerId });
        }
      } else if (candidate) {
        try {
          await connection.addIceCandidate(candidate);
        } catch (error) {
          if (!ignoreOffer) {
            console.warn("[webrtc] ICE candidate rejected", { remotePlayerId, error });
          }
        }
      }
    } catch (error) {
      console.error("[webrtc] signal handling failed", { remotePlayerId, error });
    }
  }

  function close() {
    if (closed) return;
    closed = true;
    connection.onnegotiationneeded = null;
    connection.onicecandidate = null;
    connection.ontrack = null;
    connection.onconnectionstatechange = null;
    connection.oniceconnectionstatechange = null;
    connection.onicecandidateerror = null;
    cleanupAudio();
    try {
      connection.close();
    } catch {
    }
    onClose?.();
  }

  function getRemoteAudioElement() {
    return element;
  }

  return { connection, setTrack, handleSignal, close, getRemoteAudioElement };
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
    const AudioContext = getAudioContextConstructor();
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
    if (!app) return;
    app.dataset.voiceActive = "false";
    app.style.setProperty("--mic-level", "0");
    voiceActiveRef.current = false;
  }, []);

  const closePeer = useCallback((remotePlayerId) => {
    const peer = peersRef.current.get(remotePlayerId);
    if (!peer) return;
    peer.close();
    peersRef.current.delete(remotePlayerId);
  }, []);

  const getOrCreatePeer = useCallback((remotePlayerId) => {
    const existing = peersRef.current.get(remotePlayerId);
    if (existing) return existing;
    if (!playerId || typeof RTCPeerConnection === "undefined") return null;

    const peer = createPeer({
      socket,
      playerId,
      remotePlayerId,
      onClose: () => peersRef.current.delete(remotePlayerId),
    });

    peersRef.current.set(remotePlayerId, peer);

    const initialTrack = micStreamRef.current?.getAudioTracks?.()[0] || null;
    if (initialTrack) peer.setTrack(initialTrack);

    return peer;
  }, [socket, playerId]);

  useEffect(() => {
    if (!playerId || typeof RTCPeerConnection === "undefined") return;

    for (const remote of remotePlayers) {
      const distance = Math.hypot(localPosition.x - remote.x, localPosition.y - remote.y);
      const hasPeer = peersRef.current.has(remote.playerId);

      if (distance <= PROXIMITY_AUDIO_RADIUS && !hasPeer) {
        getOrCreatePeer(remote.playerId);
      } else if (distance > PROXIMITY_AUDIO_RADIUS && hasPeer) {
        closePeer(remote.playerId);
      }
    }

    const presentIds = new Set(remotePlayers.map((r) => r.playerId));
    for (const remotePlayerId of [...peersRef.current.keys()]) {
      if (!presentIds.has(remotePlayerId)) closePeer(remotePlayerId);
    }
  }, [getOrCreatePeer, closePeer, localPosition, playerId, remotePlayers]);

  useEffect(() => {
    if (!playerId || typeof RTCPeerConnection === "undefined") return undefined;

    const onProximityEntered = ({ playerId: remotePlayerId }) => {
      if (!remotePlayerId || remotePlayerId === playerId) return;
      getOrCreatePeer(remotePlayerId);
    };

    const onProximityLeft = ({ playerId: remotePlayerId }) => {
      if (!remotePlayerId || remotePlayerId === playerId) return;
      closePeer(remotePlayerId);
    };

    const onOffer = (payload) => {
      if (payload?.targetPlayerId !== playerId || !payload.fromPlayerId || !payload.sdp) return;
      const peer = getOrCreatePeer(payload.fromPlayerId);
      peer?.handleSignal({ sdp: payload.sdp });
    };

    const onAnswer = (payload) => {
      if (payload?.targetPlayerId !== playerId || !payload.fromPlayerId || !payload.sdp) return;
      const peer = peersRef.current.get(payload.fromPlayerId);
      peer?.handleSignal({ sdp: payload.sdp });
    };

    const onCandidate = (payload) => {
      if (payload?.targetPlayerId !== playerId || !payload.fromPlayerId || !payload.candidate) return;
      const peer = getOrCreatePeer(payload.fromPlayerId);
      peer?.handleSignal({ candidate: payload.candidate });
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

      for (const remotePlayerId of [...peersRef.current.keys()]) {
        closePeer(remotePlayerId);
      }
    };
  }, [socket, playerId, getOrCreatePeer, closePeer]);

 
  useEffect(() => {
    const track = micStream?.getAudioTracks?.()[0] || null;
    for (const peer of peersRef.current.values()) {
      peer.setTrack(track);
    }
  }, [micStream]);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
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

    setup().catch(() => clearVoiceIndicator());

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
    const resume = () => {
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
      for (const peer of peersRef.current.values()) {
        const element = peer.getRemoteAudioElement();
        if (element?.paused) element.play().catch(() => {});
      }
    };
    document.addEventListener("pointerup", resume);
    document.addEventListener("keydown", resume);
    return () => {
      document.removeEventListener("pointerup", resume);
      document.removeEventListener("keydown", resume);
    };
  }, []);

  useEffect(() => {
    for (const [remotePlayerId, peer] of peersRef.current) {
      const remote = remotePlayersRef.current.find((item) => item.playerId === remotePlayerId);
      const element = peer.getRemoteAudioElement();
      if (!remote || !element) continue;

      const distance = Math.hypot(localPosition.x - remote.x, localPosition.y - remote.y);
      const volume = Math.max(0, Math.min(1, 1 - distance / PROXIMITY_AUDIO_RADIUS));
      element.volume = volume;
    }
  }, [localPosition, remotePlayers]);

  useEffect(() => () => {
    cancelAnimationFrame(visualizerFrameRef.current);
    clearVoiceIndicator();
    for (const remotePlayerId of [...peersRef.current.keys()]) {
      closePeer(remotePlayerId);
    }
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  }, [clearVoiceIndicator, closePeer]);
}
