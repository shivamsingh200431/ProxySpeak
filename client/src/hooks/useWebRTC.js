import { useCallback, useEffect, useRef } from "react";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
const PROXIMITY_AUDIO_RADIUS = 90;

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
    peer.connection.close();
    peer.audio?.source?.disconnect();
    peer.audio?.gain?.disconnect();
    peer.audio?.element?.remove();
    peersRef.current.delete(remotePlayerId);
  }, []);

  const getOrCreatePeer = useCallback((remotePlayerId) => {
    const existing = peersRef.current.get(remotePlayerId);
    if (existing) return existing;

    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer = { connection, audio: null, makingOffer: false };
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
    };

    connection.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = audioContextRef.current || new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const gain = context.createGain();
      const element = new Audio();
      element.autoplay = true;
      element.srcObject = stream;
      element.style.display = "none";
      document.body.appendChild(element);
      source.connect(gain).connect(context.destination);
      element.volume = 0;
      peer.audio = { source, gain, element };
    };

    connection.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(connection.connectionState)) closePeer(remotePlayerId);
    };

    const track = micStreamRef.current?.getAudioTracks?.()[0];
    if (track) transceiver.sender.replaceTrack(track);
    return peer;
  }, [closePeer, playerId, socket]);

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
    } finally {
      peer.makingOffer = false;
    }
  }, [getOrCreatePeer, playerId, socket]);

  useEffect(() => {
    if (!playerId || typeof RTCPeerConnection === "undefined") return;
    for (const remote of remotePlayers) {
      const distance = Math.hypot(localPosition.x - remote.x, localPosition.y - remote.y);
      if (distance <= PROXIMITY_AUDIO_RADIUS) {
        getOrCreatePeer(remote.playerId);
        if (shouldOffer(playerId, remote.playerId)) {
          createOffer(remote.playerId).catch(() => closePeer(remote.playerId));
        }
      }
    }
  }, [closePeer, createOffer, getOrCreatePeer, localPosition, playerId, remotePlayers]);

  useEffect(() => {
    if (!playerId || typeof RTCPeerConnection === "undefined") return undefined;

    const onProximityEntered = ({ playerId: remotePlayerId }) => {
      if (!remotePlayerId || remotePlayerId === playerId) return;
      getOrCreatePeer(remotePlayerId);
      if (shouldOffer(playerId, remotePlayerId)) createOffer(remotePlayerId).catch(() => closePeer(remotePlayerId));
    };

    const onProximityLeft = ({ playerId: remotePlayerId }) => closePeer(remotePlayerId);

    const onOffer = async (payload) => {
      if (payload?.targetPlayerId !== playerId || !payload.fromPlayerId || !payload.sdp) return;
      const peer = getOrCreatePeer(payload.fromPlayerId);
      try {
        await peer.connection.setRemoteDescription(payload.sdp);
        const answer = await peer.connection.createAnswer();
        await peer.connection.setLocalDescription(answer);
        socket.emit("webrtc-answer", {
          targetPlayerId: payload.fromPlayerId,
          fromPlayerId: playerId,
          sdp: peer.connection.localDescription,
        });
      } catch {
        closePeer(payload.fromPlayerId);
      }
    };

    const onAnswer = async (payload) => {
      if (payload?.targetPlayerId !== playerId || !payload.fromPlayerId || !payload.sdp) return;
      const peer = peersRef.current.get(payload.fromPlayerId);
      if (!peer) return;
      try { await peer.connection.setRemoteDescription(payload.sdp); }
      catch { closePeer(payload.fromPlayerId); }
    };

    const onCandidate = async (payload) => {
      if (payload?.targetPlayerId !== playerId || !payload.fromPlayerId || !payload.candidate) return;
      const peer = peersRef.current.get(payload.fromPlayerId);
      if (!peer) return;
      try { await peer.connection.addIceCandidate(payload.candidate); }
      catch { closePeer(payload.fromPlayerId); }
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
      for (const remotePlayerId of peersRef.current.keys()) closePeer(remotePlayerId);
    };
  }, [closePeer, createOffer, getOrCreatePeer, playerId, socket]);

  useEffect(() => {
    for (const peer of peersRef.current.values()) {
      const track = micStream?.getAudioTracks?.()[0] || null;
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

  useEffect(() => () => {
    audioContextRef.current?.close().catch(() => {});
  }, []);
}
