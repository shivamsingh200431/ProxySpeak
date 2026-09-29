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

The shared world model is now implemented as in-memory server state.

Each connected world member has:

  {
    id: string,
    playerId: string,
    name: string,
    worldId: string,
    x: number,
    y: number
  }

The server owns world membership and the current positions of connected members.

### World lifecycle

- A user can create a world.
- A created world receives a server-generated world ID and invite code.
- The creator automatically joins the created world.
- A second user can join by providing the invite code.
- Empty worlds are removed from the in-memory registry when the final member leaves.
- Persistence is intentionally deferred to the MongoDB milestone.

### Movement

The frontend continues to calculate smooth local movement with WASD/arrow controls.

While inside a world, the client sends throttled position updates to the server. The server clamps positions to world boundaries and broadcasts accepted positions only to members of the same world.

### Current limitation

The current world registry is intentionally in-memory. Restarting the server removes active worlds and invite codes. Durable world persistence and authentication remain future work.

## 8. Socket.io Event Contract

The Socket.io contract now covers world creation, world joining, presence, and movement.

### Client → Server

| Event | Payload | Notes |
| --- | --- | --- |
| create-world | { name: string } | Creates a new in-memory world and automatically joins the creator. |
| join-world | { name: string, inviteCode: string } | Joins an existing world by invite code. Name remains 1–20 chars after trim. |
| player-moved | { x: number, y: number } | Accepted only for a member currently inside a world. Server clamps coordinates. |
| leave-world | none | Explicitly leaves the current world. |

### Server → Client

| Event | Payload | Sent to |
| --- | --- | --- |
| world-created | { worldId, inviteCode, name } | Creator only. |
| world-joined | { worldId, inviteCode, worldName, owner, playerId, name, x, y, players } | Joining client only. |
| player-joined | { playerId, name, x, y } | Other members of the same world. |
| player-moved | { playerId, x, y } | Other members of the same world. |
| player-left | { playerId } | Remaining members of the same world. |
| join-error | { code, message } | Sender only for invalid world join requests. |
| world-error | { code, message } | Sender only for invalid world creation/lifecycle requests. |

### World error codes

- INVALID_PAYLOAD
- INVALID_NAME
- INVITE_CODE_REQUIRED
- WORLD_NOT_FOUND
- ALREADY_IN_WORLD

### Built-in lifecycle

- connection — fires when the client establishes a Socket.io connection.
- disconnect — removes the member from their world and notifies remaining members.

### Client connection behavior

- The client does not connect automatically on /app load.
- The first application state is Join a World.
- Creating a world connects the socket and emits create-world.
- Joining a world connects the socket and emits join-world with the display name and invite code.
- A successful world-joined response establishes the active world and initial presence list.
- The client only renders remote people received from the server for the active world.
- The client emits movement updates only after successfully joining a world.
- Leaving a world emits leave-world before closing the socket.

### Public identifiers

- Player IDs are 6-character uppercase public IDs.
- World IDs and invite codes are 6-character uppercase public codes.
- Ambiguous characters such as I, O, 0, and 1 are excluded.
- Internal Socket.io connection IDs remain server-only.

### Scope boundary

World creation, invitation, membership, movement synchronization, and remote presence are now part of the real-time baseline. Proximity filtering and WebRTC audio remain future milestones.
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


## 14. Landing Page Revamp — 2026-09-29

The landing page has been rebuilt around a product-first editorial flow. The previous oversized cinematic/sticky transition sections are removed because they created excessive empty scroll space and made the content leave the viewport before the intended reveal completed.

### Landing page structure

The public page now uses normal document flow with these sections:

1. Hero — product promise and virtual-office preview
2. Idea — why proximity changes collaboration
3. The Loop — move, arrive, talk, leave
4. Proximity Lab — interactive distance/audio-state demonstration
5. Workspace — virtual-office model and product concepts
6. System — real-time, proximity, WebRTC, and Web Audio architecture
7. Final CTA — entry into the application

### Interaction and animation behavior

- Lenis remains responsible for smooth landing-page scrolling and anchor navigation.
- Motion provides in-view reveals, subtle hover/tap feedback, and spring-like CTA interaction.
- MotionConfig with reducedMotion="user" is used so Motion respects the user's reduced-motion preference.
- Interactive product demonstrations use local React state only and do not imply that unfinished backend/WebRTC functionality is already active.
- No landing-page section relies on a long sticky viewport lock or a scroll-driven cinematic reveal.
- Decorative motion must remain subordinate to product meaning: presence, proximity, navigation, state, and spatial context.

### Proximity Lab presentation contract

The Proximity Lab is explicitly a presentation-only simulation until the real proximity/audio milestones are implemented.

- Distance is displayed in world units.
- The current planned proximity threshold remains 90 world units.
- The slider changes presentation state only.
- Conversation, Nearby, and Out of range are visual labels for the demo and are not network/audio states.
- No microphone access, WebRTC connection, server-side proximity filtering, or real audio processing is triggered by the landing page.

### Landing page visual boundary

The landing page continues to use the dark corporate foundation, red brand/action color, yellow proximity/attention color, green active state, and Atkinson Hyperlegible typography defined in Section 13.

The landing page should prefer restrained grids, frames, product diagrams, and purposeful transitions over particles, glowing blobs, excessive gradients, cursor trails, or oversized cinematic effects.


## 15. Workspace UI System — 2026-09-29

The `/app` workspace now follows the supplied ProxySpeak visual direction: a dark spatial environment with a glassmorphism interface layered above the world.

### UI structure

The workspace shell includes:

- persistent top workspace bar;
- left navigation for Lounge, People, Map, and Settings;
- room summary and people presence area;
- central HTML5 Canvas world;
- bottom voice/action dock;
- voice-range indicator;
- contextual People, Map, and Settings panels.

### Glassmorphism contract

- Workspace surfaces use translucent backgrounds, borders, blur, and restrained highlights.
- Glass transparency is user-adjustable from Settings.
- The selected transparency value is applied through the workspace CSS custom property `--glass-alpha`.
- UI must remain readable across transparency levels; content must not rely on opacity alone for state.
- The glass system should use restrained blur and contrast rather than excessive glow.

### Color and state contract

- Red is the primary ProxySpeak action/player color.
- Yellow represents proximity/attention.
- Green represents active/connected presence.
- Neutral white/grey provides hierarchy and information.
- The previous blue application palette is no longer the primary workspace UI language.

### Functionality boundary

The workspace UI is a functional layer over the current real-time prototype.

- People data comes from the active world's server presence registry.
- The People panel reports actual members in the current world.
- The Invite panel exposes the active world's real invite code.
- The Map panel reflects the current local position.
- Settings transparency is functional and local to the current workspace session.
- Movement is synchronized to other members of the same world.
- The 90u proximity range remains visual-only.
- Microphone capture, WebRTC audio, emotes, video permissions, and other future interaction controls are not exposed as active controls until their underlying functionality exists.

### Responsive behavior

- Desktop is the primary workspace layout.
- Tablet collapses secondary controls while preserving the world and core actions.
- Mobile uses compact navigation and a reduced bottom dock.
- Panels remain accessible without requiring the user to leave the world.

## 16. World Entry and Functional UI — 2026-09-29

The workspace no longer presents a populated room before the user has entered a world.

### World entry

- The initial `/app` state is a Join a World screen.
- A user can create a world or join an existing world with an invite code.
- Creating a world automatically enters the creator into that world.
- Joining a world places the user into that world's shared presence space.
- Worlds are currently in-memory server state; persistence is a future milestone.

### World presence

- The server owns world membership for connected users.
- A world has a unique world ID and invite code.
- A newly joined user spawns at the defined world spawn position.
- Existing members receive player-joined when someone enters.
- Members receive player-moved updates for users in their world.
- Members receive player-left when someone leaves or disconnects.
- No fabricated/mock people are displayed.
- An empty world explicitly communicates that nobody else is present and offers the invite action.

### Functional UI rule

Only controls backed by current functionality should be visible in the active workspace.

Currently functional:
- Join/Create World
- Leave World
- Invite via world invite code and copy action
- People panel using actual world presence
- Map panel using the current player position
- Settings transparency control
- Movement
- Visual proximity range

Deferred controls such as microphone capture, WebRTC audio, emotes, video permissions, and other future interaction controls should not be presented as active workspace actions until their underlying functionality exists.

### Visual direction

The supplied ProxySpeak workspace reference is the visual target for the active world:

- translucent dark glass panels;
- visible world content through the UI;
- restrained blur and borders;
- warm architectural world palette;
- red local-player/proximity language;
- green active remote presence;
- yellow proximity/attention;
- soft-focus local avatar treatment;
- compact floating labels and controls.

The reference is a design target, not a promise that every visual element shown in the reference is already implemented.

## 17. Workspace Refinement — 2026-09-29

The active workspace visual reference has been refined from the supplied screenshots.

### World framing

- The world is rendered inside a contained, aspect-ratio-preserving stage rather than being stretched/cropped to fill the entire viewport.
- A soft perimeter, vignette, and shadow communicate the world boundary without a heavy solid frame.
- Canvas rendering now adapts its internal pixel density to the displayed stage size so labels and avatars remain crisp on high-resolution screens.

### Avatar direction

- User and remote people are represented as simple stickman figures.
- Local and remote identity remains distinguishable through red/green rings and labels.
- Canvas labels remain readable and are no longer intentionally blurred.

### Contextual controls

- Clicking outside an open floating panel closes it.
- Clicking the active Settings control toggles Settings closed.
- Opening another contextual panel replaces the previous one.
- Floating panels use responsive max-widths so they shrink with the viewport.

### Dynamic bottom dock

The center glass dock is content-driven.

- The dock width is derived from the number of available actions.
- Map and microphone controls are available after joining a world.
- People appears when another real member is present.
- No unused decorative action buttons are rendered.
- Microphone control requests browser microphone permission on first use and can enable/disable the local microphone track. Actual peer voice transmission remains a future WebRTC milestone.

### Background implementation boundary

- The workspace background uses a restrained animated pattern/vignette and a contained world stage.
- Inspira UI is Vue/Nuxt-first, so its copy-first visual patterns are adapted rather than installed as a direct React dependency.
- Animate UI is also copy-first rather than a conventional runtime library; its blur/fade/slide interaction principles are adapted into the workspace panel behavior.
- Lenis remains the landing-page smooth-scroll system. The active workspace is intentionally viewport-based and does not add Lenis scrolling to the world surface, because smooth scrolling would conflict with the spatial application's direct manipulation model.
