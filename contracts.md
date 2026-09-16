# ProxySpeak Project Contracts

This file is the single source of truth for important architectural and technical decisions.

## Project

Name: ProxySpeak

Repository: shivamsingh200431/ProxySpeak

Purpose: A virtual shared environment where users communicate through proximity-based audio.

## Architecture

The project uses a single monorepo with npm workspaces:

- client: React frontend
- server: Node.js backend
- docs: project documentation

## Technology Direction

Frontend:
- React
- Vite
- HTML5 Canvas
- Web Audio API

Backend:
- Node.js
- Express
- Socket.io

Database:
- MongoDB with geospatial queries

Audio:
- WebRTC for peer-to-peer audio
- Web Audio API for attenuation and spatial effects

Future:
- Redis may be added for scaling

## Responsibilities

Frontend:
- Render virtual world
- Handle movement
- Display nearby users
- Request microphone permission
- Establish WebRTC connections
- Apply audio effects

Backend:
- Manage sessions and presence
- Broadcast movement
- Filter nearby users
- Handle WebRTC signaling
- Provide future persistence

## Proximity Audio Concept

Each user has an x/y position.

Distance affects:
- Volume
- Spatial positioning
- Whether audio is audible

The exact attenuation formula will be documented before implementation.

## Provisional Socket Events

- user:join
- user:leave
- user:move
- presence:update
- webrtc:offer
- webrtc:answer
- webrtc:ice-candidate

These may be changed after discussion.

## Governance Rule

Whenever we make a significant decision, we update:

contracts.md

Significant decisions include:
- Framework changes
- Database changes
- Socket event changes
- API contract changes
- Authentication decisions
- WebRTC architecture changes
- Folder structure changes
- Proximity algorithm changes
- Deployment changes

## Current Phase

Initial monorepo boilerplate.

Next:
1. Verify client and server
2. Connect Socket.io
3. Define movement contract
4. Build shared world state
5. Add proximity filtering
6. Add WebRTC signaling
7. Add distance-based audio
