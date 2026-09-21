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
- Socket.io
- Socket.io Client

### Planned stack

- **MongoDB** — persistence and geospatial queries
- **WebRTC** — peer-to-peer audio
- **Web Audio API** — distance-based audio processing
- **Redis** — only if required by scaling or deployment needs

## 4. Repository Structure

```text
ProxySpeak/
├── client/
│   ├── src/
│   │   ├── socket/
│   │   ├── App.jsx
│   │   └── main.jsx
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
- Socket server URL: `VITE_SERVER_URL` when provided, otherwise `http://localhost:5000`

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

Finalized for the connection/join/leave layer (Milestone 2, Week 1). Movement and full presence-list events will be appended here in Week 2 once the player registry (shared world state) lands.

### Client → Server

| Event | Payload | Notes |
| --- | --- | --- |
| `join-world` | `{ name: string }` | 1–20 chars after trim, required. Rejected if the connection already joined. |
| `leave-world` | *(none)* | Explicit, intentional leave. Distinct from a network disconnect. |

### Server → Client

| Event | Payload | Sent to |
| --- | --- | --- |
| `world-joined` | `{ playerId: string, name: string }` | Sender only — successful join acknowledgement. `playerId` is a server-generated 6-character public player identifier. The internal Socket.io ID is never exposed through this contract. |
| `player-joined` | `{ playerId: string, name: string }` | Everyone except sender. |
| `player-left` | `{ playerId: string }` | Everyone, for explicit leave and disconnect cleanup. |
| `join-error` | `{ code: string, message: string }` | Sender only. Codes: `INVALID_PAYLOAD`, `INVALID_NAME`, `ALREADY_JOINED`. |

### Built-in Socket.io lifecycle

- `connection` — fires when the client establishes a Socket.io connection.
- `disconnect` — fires when the client loses or closes the connection.

### Client connection behavior

- The client does not connect automatically on page load.
- The user enters a display name and selects **Join World**.
- The client trims the name and rejects empty names or names longer than 20 characters before opening the socket connection.
- After `connect`, the client emits `join-world` with the display name.
- A successful `world-joined` response stores the server-generated 6-character `playerId` as the local display ID. The internal Socket.io connection ID remains server-only.
- Player IDs use uppercase letters and digits, excluding visually ambiguous characters such as `I`, `O`, `0`, and `1`.
- Week 1 uses one implicit shared world; a separate `worldId` is intentionally not defined yet.
- A future multi-world model will introduce an explicit world identifier as part of the authoritative world registry.
- `join-error` is shown to the user and the socket is disconnected.
- **Leave World** emits `leave-world` before closing the socket.
- The client uses `VITE_SERVER_URL` when configured and defaults to `http://localhost:5000`.

### Scope boundary

Week 1 establishes connection and join/leave behavior. Position synchronization, remote-player state, and the authoritative player registry are Week 2 work.

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
