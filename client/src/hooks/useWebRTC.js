import { useCallback, useEffect, useRef } from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  // Public fallback only. Use provider-issued, short-lived credentials in production.
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

// Must stay aligned with server/src/socket/proximity.js and constants/world.js.
const PROXIMITY_AUDIO_RADIUS = 180;

function shouldOffer(localPlayerId, remotePlayerId) {
  return localPlayerId.localeCompare(remotePlayerId) < 0;
}

export function useWebRTC({ socket, playerId, micStream, remotePlayers, localPosition }) {
  const peersRef = useRef(new Map());
  const remotePlayersRef = useRef(remotePlayers);
  const micStreamRef = useRef(micStream);
  const audioContextRef = useRef(null);

  useEffect(() => { remotePlayersRef.current = remotePlayers; }, [remotePlayers]);
  useEffect(() => { micStreamRef.current = micStream; }, [micStream]);

  const closePeer = useCallback((remotePlayerId) => {
    const peer = peersRef.current.get(remotePlayerId);
    if (!peer) return;
    peer.closed = true;
    peer.connection.ontrack = null;
    peer.connection.onicecandidate = null;
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
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      // ontrack can fire more than once during renegotiation; release the prior graph.
      peer.audio?.source?.disconnect();
      peer.audio?.gain?.disconnect();
      if (peer.audio?.element) {
        peer.audio.element.pause();
        peer.audio.element.srcObject = null;
        peer.audio.element.remove();
      }

      const context = audioContextRef.current || new AudioContext({ latencyHint: "interactive" });
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const gain = context.createGain();
      // Web Audio is the only audible path; element is a muted compatibility sink.
      const element = new Audio();
      element.autoplay = true;
      element.playsInline = true;
      element.volume = 0;
      element.srcObject = stream;
      element.style.display = "none";
      document.body.appendChild(element);
      source.connect(gain).connect(context.destination);
      peer.audio = { source, gain, element };

      if (context.state === "suspended") context.resume().catch(() => {});
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

    const track = micStreamRef.current?.getAudioTracks?.()[0];
    if (track) transceiver.sender.replaceTrack(track).catch(() => {});
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
        // Deterministic role election should prevent glare; reject unexpected collisions.
        if (connection.signalingState !== "stable") {
          console.warn("[webrtc] offer arrived in non-stable state", {
            remotePlayerId, state: connection.signalingState,
          });
          return;
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
    for (const peer of peersRef.current.values()) {
      peer.audioTransceiver?.sender.replaceTrack(track).catch(() => {});
    }
  }, [micStream]);

  useEffect(() => {
    for (const [remotePlayerId, peer] of peersRef.current) {
      const remote = remotePlayersRef.current.find((item) => item.playerId === remotePlayerId);
      if (!remote || !peer.audio?.gain) continue;
      const distance = Math.hypot(localPosition.x - remote.x, localPosition.y - remote.y);
      const gain = Math.max(0, Math.min(1, 1 - distance / PROXIMITY_AUDIO_RADIUS));
      peer.audio.gain.gain.setTargetAtTime(gain, peer.audio.gain.context.currentTime, 0.04);
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
      for (const id of [...peersRef.current.keys()]) closePeer(id);
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, [closePeer]);
}
