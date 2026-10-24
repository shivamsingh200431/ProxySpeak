# ProxySpeak Audio Research

> Week 1 research only. No microphone, WebRTC, or Web Audio behavior is implemented by this PR.

## 1. getUserMedia()

The browser's `navigator.mediaDevices.getUserMedia()` API is planned for requesting access to the user's microphone.

The application should treat permission as an explicit state and handle:
- permission granted
- permission denied
- no microphone/device available
- a request that is still pending

Actual permission requests belong to the Voice Communication milestone and are not part of this UI mock.

## 2. RTCPeerConnection

`RTCPeerConnection` is the planned WebRTC API for establishing a peer-to-peer media connection between nearby users.

The application will eventually use it to:
- add the local microphone track
- exchange connection/session information
- receive remote audio tracks
- monitor connection state and handle failures

The peer connection itself will not be created by this Week 1 mock.

## 3. WebRTC signaling

WebRTC peers need an application-level signaling path to exchange the information required to establish a connection.

For ProxySpeak, the planned signaling boundary is the existing Socket.io server. Signaling messages are control data only; the eventual audio media should flow peer-to-peer through WebRTC.

Signaling will be implemented after movement/presence synchronization and proximity detection are stable.

## 4. Web Audio API

The planned Web Audio API layer will process remote audio after a WebRTC media stream is received.

The expected browser-side chain is:

```text
Remote MediaStream
      ↓
MediaStreamSource
      ↓
GainNode
      ↓
Audio Destination
      ↓
Speakers
```

## 5. Distance attenuation

ProxySpeak will eventually use player distance to control perceived audio volume.

The initial design uses a 90-world-unit proximity threshold as documented in `contracts.md`. The current frontend uses this value only as a visual prototype; it does not currently filter peers or change audio volume.

When implemented, distance calculation and attenuation behavior should be defined as part of the Proximity and Voice milestones.
