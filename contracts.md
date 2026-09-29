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

### Current frontend movement prototype

The current frontend movement implementation is a local visual prototype. It updates the local Canvas position using keyboard input, but it does not synchronize coordinates with the server or other clients.

Position synchronization, remote-player state, and authoritative movement validation remain Week 2 work.

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

### Proximity design decision

The initial planned proximity threshold is **90 world units**.

This value is currently used by the frontend only as a visual radius/prototype. It does not yet establish an active voice connection, server-side proximity filtering, or WebRTC behavior.

When the proximity system is implemented, the server/client contract will define how distance is calculated and how entering/leaving the threshold affects nearby-player state.

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
- Apply the 90-unit proximity threshold
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


## 13. UI/UX and Product Experience Direction

The UI is intentionally split into two product experiences:

1. **Landing page** — public product introduction and explanation of proximity-based communication.
2. **Application** — the actual shared virtual environment.

### Product identity

ProxySpeak should feel like:

> **Corporate collaboration + virtual world + subtle game mechanics**

The application should be gamified without being presented as a conventional video game. It should use professional virtual-office environments and useful game-like interaction cues such as presence, proximity, speaking states, movement, room occupancy, navigation, and optional badges/achievements.

The design should avoid a generic AI-dashboard aesthetic and unnecessary decorative effects.

### Landing page direction

The landing page should explain the core product through a simple proximity story:

1. Move closer to someone.
2. Enter their proximity range.
3. Hear/talk to nearby people.
4. Walk away and the audio relationship fades.

Planned sections:

- Hero
- How ProxySpeak works
- Proximity voice demonstration
- Virtual office/product showcase
- Feature overview
- Final call to action
- Entry into the application

### Application UI direction

The application should use a professional virtual-office visual language with subtle game mechanics.

Use **people** rather than calling users "players" in user-facing UI.

Core UI concepts include:

- People/presence indicators
- Proximity visualization
- Speaking indicators
- Voice state controls
- Room occupancy
- Movement controls
- Map/navigation
- World HUD
- Meeting/room interfaces
- Optional badges or achievements where they add product value

Development-only labels such as "Mock", "Simulate Permission", or "Visual Only" may be used while features are being implemented, but they are not intended to remain in the finished product UI.

### Visual design system

The primary visual direction is a dark corporate foundation with vibrant red branding and restrained supporting colors.

| Role | Direction |
| --- | --- |
| Background | Near-black |
| Surface | Very dark charcoal |
| Primary text | Warm white |
| Secondary text | Cool/light gray |
| Brand/action | Vibrant red |
| Attention/proximity | Warm yellow |
| Connected/active | Green |
| Secondary accent | Orange |

Red is the primary brand/action color.

Yellow is primarily for proximity, attention, and interaction states.

Green communicates connected/active states.

Black and white provide the corporate foundation.

Purple is not a primary ProxySpeak brand color. Existing purple components should be recolored or restyled when incorporated into ProxySpeak.

### Typography

The current design direction uses **Atkinson Hyperlegible** for headings and body text.

The existing scale is based on a 16px root:

- `sm`: 0.750rem
- `base`: 1rem
- `xl`: 1.333rem
- `2xl`: 1.777rem
- `3xl`: 2.369rem
- `4xl`: 3.158rem
- `5xl`: 4.210rem

Weights:

- Normal: 400
- Bold: 700

### Animation and component strategy

Animation should communicate hierarchy, state, navigation, and social/physical presence rather than exist only for visual spectacle.

Preferred responsibilities:

- **Lenis** — smooth scrolling for the landing page, including anchor navigation and tuned wheel/touch behavior.
- **Scroll-linked cinematic transitions** — custom landing-page sections may map scroll progress to typography scale, opacity, blur, grid movement, and transition layers. These effects are presentation-only and must not alter product state.
- **Motion / Animate UI patterns** — Motion-powered React entrance effects, spring interactions, hover/tap feedback, and reusable reveal patterns inspired by Animate UI. Animate UI is a copy-first component distribution, so only selected patterns should be adapted rather than adding a large UI dependency surface.
- **Canvas** — actual virtual-world rendering.
- Additional animation systems should only be introduced when a concrete interaction requires them.

**Inspira UI** is a design and interaction reference only. It is a Vue/Nuxt project and is not a direct dependency of the React/Vite client.

The intended result is a polished interface without unnecessary particles, glowing blobs, excessive gradients, cursor trails, or animation layers that compete with the product.

### Library boundaries

| Resource | ProxySpeak role |
| --- | --- |
| Lenis | Landing-page smooth scrolling |
| Animate UI | React UI components and motion patterns, adapted to ProxySpeak styling |
| Inspira UI | Visual/interaction reference; no direct Vue/Nuxt dependency |
| Custom Canvas/UI | Virtual-world experience and product-specific interactions |

The virtual-world UI remains custom and should be designed around ProxySpeak's actual behavior.

### Scope boundary

This section defines visual and UX direction. It does not change the real-time networking, movement, proximity, or WebRTC contracts.

The detailed visual guidance is documented in `docs/ui-design-direction.md`.

Future UI changes that introduce a new shared interaction or materially change product behavior should update this contract as well.
