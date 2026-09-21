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

## 8. Socket.io Event Contract

Finalized for the connection/join/leave layer (Milestone 2, Week 1). Movement
and full presence-list events will be appended here in Week 2 once the
player registry (Milestone 2, shared world state) lands.

### Client → Server

| Event | Payload | Notes |
| --- | --- | --- |
| `join-world` | `{ name: string }` | 1–20 chars after trim, required. Rejected if the connection already joined. |
| `leave-world` | *(none)* | Explicit, intentional leave (e.g. a "Leave" button). Distinct from a network disconnect. |

### Server → Client

| Event | Payload | Sent to |
| --- | --- | --- |
| `world-joined` | `{ id: string, name: string }` | Sender only — ack of a successful join. |
| `player-joined` | `{ id: string, name: string }` | Broadcast to everyone except sender. |
| `player-left` | `{ id: string }` | Broadcast to everyone (covers both `leave-world` and `disconnect`). |
| `join-error` | `{ code: string, message: string }` | Sender only. `code` is one of `INVALID_PAYLOAD`, `INVALID_NAME`, `ALREADY_JOINED`. |

### Built-in Socket.io lifecycle (not custom events)

- `connection` — fires when a socket connects, before any world join.
- `disconnect` — fires on network-level disconnect (tab close, network drop, etc.). Handled identically to `leave-world` for cleanup/broadcast purposes.

### Scope boundary

The connection/join/leave handling (`server/src/socket/events.js`) keeps a
minimal in-memory map of `socket.id -> { id, name }` purely to validate and
demo this layer. It does not own positions, spawn coordinates, or the
authoritative world-state model — that is the Milestone 2 player registry.
When the registry lands, this map is merged into it, not duplicated.

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
