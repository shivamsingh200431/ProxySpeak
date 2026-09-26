# ProxiSpeak Audio Architecture

## Audio Flow

The planned ProxiSpeak audio system follows this flow:

User Microphone
      ↓
getUserMedia()
      ↓
Local MediaStream
      ↓
RTCPeerConnection
      ↓
Remote Audio Stream
      ↓
MediaStreamSource
      ↓
GainNode
      ↓
Audio Destination
      ↓
Speakers