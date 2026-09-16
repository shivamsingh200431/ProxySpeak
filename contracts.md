# ProxySpeak Technical Contracts

This document defines the technical contracts, system boundaries, and behavioral expectations for ProxySpeak.

> Update this document whenever a public interface, shared data structure, or significant architectural behavior changes.

## 1. Project Overview

ProxySpeak is a browser-based, real-time proximity audio environment. Users occupy positions in a shared virtual world and will eventually communicate with nearby users through spatially-aware voice communication.

Development is incremental. The real-time movement and presence layer must be established before peer-to-peer audio and persistence are introduced.

## 2. Repository and Architecture

| Item | Value |
| --- | --- |
| Repository | `shivamsingh200431/ProxySpeak` |
| Default branch | `main` |
| Repository type | Single monorepo |
| Frontend directory | `client` |
| Backend directory | `server` |
| Documentation directory | `docs` |

### High-level architecture

```text
┌──────────────────────┐
│    Browser Client    │
│ React + Canvas       │
└──────────┬───────────┘
           │ HTTP / Socket.io
           ▼
┌──────────────────────┐
│ Node.js + Express    │
│ Real-time server     │
└──────────┬───────────┘
           ├── Shared world state
           ├── Player presence
           ├── Movement validation
           ├── WebRTC signaling
           └── Future persistence layer
```

## 3. Technology Stack

### Current stack

- React
- Vite
- JavaScript
- HTML5 Canvas
- Node.js
- Express

### Planned stack

- **Socket.io** — real-time communication
- **MongoDB** — persistence and geospatial queries
- **WebRTC** — peer-to-peer audio
- **Web Audio API** — distance-based audio processing
- **Redis** — only if required by scaling or deployment needs

## 4. Repository Structure

```text
ProxySpeak/
├── client/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── docs/
├── contracts.md
├── README.md
├── package.json
└── .gitignore
```

## 5. Development Environment

### Frontend

- Development server: Vite
- URL: `http://localhost:5173`

### Backend

- Development server: Node.js/Express
- URL: `http://localhost:5000`

### Health endpoint

```http
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "service": "proxyspeak-server"
}
```

## 6. Current Functional Baseline

The following baseline has been implemented and locally verified:

- The monorepo installs successfully using npm.
- Frontend and backend can be started together.
- The React interface renders successfully.
- The Canvas world is visible.
- A local player can be moved using keyboard controls.
- The backend health endpoint responds successfully.
- The initial project has been committed to `main` and pushed to GitHub.

## 7. Real-Time World Model

The planned shared world contains connected players.

Each player will have, at minimum:

```ts
{
  id: string,
  x: number,
  y: number
}
```

Additional fields may be introduced when required, but the initial movement model should remain minimal.

The server is responsible for maintaining authoritative shared player state.

## 8. Planned Socket.io Event Categories

The initial real-time layer is expected to support the following categories.

### Connection events

- Player connected
- Player disconnected
- Initial world state received

### Movement events

- Client movement update
- Server-approved movement update
- Broadcast movement update

### Presence events

- Player joined
- Player left
- Current players list

Exact event names and payload schemas must be finalized before Socket.io implementation.

## 9. Server Authority

The server is authoritative for shared world state.

Clients may send movement updates or movement intentions, but the server must:

- Validate incoming data
- Maintain player positions
- Broadcast accepted state
- Remove disconnected players
- Prevent malformed updates from affecting other clients

## 10. Audio Architecture

Audio will be introduced only after movement and presence synchronization are stable.

Expected flow:

```text
Player Position
      │
      ▼
Proximity Calculation
      │
      ▼
Nearby Player Filtering
      │
      ▼
WebRTC Signaling
      │
      ▼
Peer-to-Peer Audio
      │
      ▼
Web Audio API Distance Attenuation
```

The first audio implementation should prioritize reliable connections, understandable states, and graceful failure handling over advanced effects.

## 11. Implementation Milestones

### Milestone 1 — Foundation

- Monorepo setup
- Frontend setup
- Backend setup
- Canvas prototype
- Basic movement
- Health endpoint
- Local verification
- Initial GitHub push

### Milestone 2 — Real-Time Multiplayer

- Install Socket.io dependencies
- Establish client-server connection
- Assign player IDs
- Define event payloads
- Synchronize player positions
- Render remote players
- Handle joins and disconnects

### Milestone 3 — Proximity System

- Define world coordinate rules
- Calculate player distance
- Identify nearby players
- Apply proximity thresholds
- Handle entering and leaving proximity range

### Milestone 4 — Voice Communication

- Add WebRTC signaling
- Request microphone access
- Establish peer connections
- Handle connection failures
- Add mute controls
- Add distance-based attenuation

### Milestone 5 — Persistence and Deployment

- Add MongoDB where persistence is required
- Add authentication if required
- Configure environment variables
- Add production builds
- Deploy frontend and backend
- Add monitoring and error handling

## 12. Engineering Guidelines

- Keep frontend rendering separate from networking logic.
- Keep server state management separate from HTTP route definitions.
- Validate all data received from clients.
- Avoid introducing infrastructure before it is needed.
- Prefer explicit event names and documented payloads.
- Keep shared contracts backward-compatible where practical.
- Use environment variables for deployment-specific configuration.
- Verify each milestone locally before moving to the next one.
