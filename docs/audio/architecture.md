# ProxySpeak Audio Architecture

## Planned audio architecture

Audio is planned for a later milestone. This document describes boundaries only; this Week 1 PR does not implement microphone capture, WebRTC, signaling, or Web Audio processing.

```text
                    ProxySpeak application
                           │
                           │ Socket.io signaling
                           ▼
                  ┌───────────────────┐
                  │  WebRTC signaling │
                  │  exchange only    │
                  └─────────┬─────────┘
                            │
                            │ SDP / ICE control data
                            ▼
User Microphone ──► getUserMedia() ──► RTCPeerConnection
                                         │
                                         │ peer-to-peer media
                                         ▼
                                  Remote Audio Stream
                                         │
                                         ▼
                                  MediaStreamSource
                                         │
                                         ▼
                                      GainNode
                                         │
                                         ▼
                                  Audio Destination
                                         │
                                         ▼
                                      Speakers
```

## Responsibilities

- **getUserMedia()**: request the local microphone stream after the user grants permission.
- **Socket.io signaling**: exchange WebRTC connection information through the application server; it does not carry the audio media.
- **RTCPeerConnection**: establish and maintain the peer-to-peer media connection.
- **MediaStreamSource**: expose the received audio stream to the Web Audio API.
- **GainNode**: apply distance-based volume attenuation.
- **Audio Destination**: send the processed audio to the user's speakers.

## Proximity boundary

The initial planned proximity threshold is 90 world units. It is currently a visual design value only. Server-side proximity filtering and audio attenuation are future milestones.

## Failure states

The eventual implementation should expose understandable states for microphone permission, peer connection, and connection failure without blocking the rest of the world UI.
