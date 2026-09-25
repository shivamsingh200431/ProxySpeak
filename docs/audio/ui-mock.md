# ProxiSpeak Audio UI Mock

## Microphone Permission Screens

The microphone UI should support four states.


## 1. Allow Microphone

Title:

Allow microphone access

Message:

ProxiSpeak needs access to your microphone so you can communicate with nearby teammates.

Button:

Allow Microphone


## 2. Waiting for Permission

Title:

Waiting for microphone permission

Message:

Please respond to the microphone permission request in your browser.

Status:

Waiting...


## 3. Microphone Denied

Title:

Microphone access denied

Message:

Microphone access has been blocked.

Instruction:

Open your browser site settings and allow microphone access, then try again.

Button:

Try Again


## 4. No Microphone Found

Title:

No microphone found

Message:

ProxiSpeak could not find a microphone on this device.

Instruction:

Connect a microphone and try again.

Button:

Try Again


# Mute Button

The audio control should have two main states.

## Unmuted

Icon:

Microphone

Label:

Mute

Meaning:

The user's microphone is currently active.


## Muted

Icon:

Microphone with slash

Label:

Unmute

Meaning:

The user's microphone is currently disabled.


# Connection Indicator

The audio interface should also show the WebRTC connection state.

## Connecting

Status:

Connecting...

Meaning:

The application is attempting to establish the audio connection.


## Connected

Status:

Connected

Meaning:

The WebRTC audio connection has been established.


## Failed

Status:

Connection failed

Meaning:

The WebRTC audio connection could not be established.


# UI Layout

The planned control can be represented as:

┌─────────────────────────────────┐
│                                 │
│        Audio Status             │
│        ● Connected              │
│                                 │
│        [ 🎤 Mute ]              │
│                                 │
└─────────────────────────────────┘