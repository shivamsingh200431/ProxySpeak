# ProxySpeak

ProxySpeak is a browser-based virtual workspace where people move through a shared world and communicate with nearby people using proximity-based voice.

## Current implementation

- React + Vite client with a Canvas workspace and nine-room prototype map.
- Keyboard movement, camera following, and client-side collision/presentation.
- Node.js + Express + Socket.io server.
- World creation, invite-code joining, public player identities, presence snapshots, movement broadcasts, and leave/disconnect cleanup.
- Server-side coordinate validation and world-bound clamping.
- Server-managed proximity pairs using Euclidean distance and a **90 world-unit** threshold (inclusive), with entry/exit events scoped to each world.
- WebRTC offer/answer/ICE signaling routed to an identified peer in the sender's world.
- Client WebRTC peer lifecycle, explicit microphone permission, remote audio routing through Web Audio API, and distance-based gain.
- Landing-page Proximity Lab (presentation-only simulation).
- Server tests for events, validation, and proximity logic.

## Important limitations

- Proximity detection and signaling are implemented, but they do **not** guarantee successful voice calls. Permissions, ICE connectivity, network conditions, and deployment configuration matter.
- World/player state is held **in memory** and is lost on server restart. Persistence and authentication are not part of the current baseline.
- The server clamps positions to world bounds, but movement is not fully authoritative physics. Client-side collision/speed behavior is not anti-cheat protection.
- The landing-page Proximity Lab is a local visual demo; it does not create calls or request microphone access.
- Verify TURN configuration for deployment. Do not rely on public fallback STUN/TURN configuration as production infrastructure.

## Technology stack

| Layer | Technology |
| --- | --- |
| Client | React, Vite, JavaScript |
| Rendering | HTML5 Canvas |
| Realtime | Socket.io / Socket.io Client |
| Server | Node.js, Express |
| Voice | WebRTC |
| Audio processing | Web Audio API |
| Persistence | Not currently implemented |
| Scaling | Redis is a possible future option |

## Repository structure

```text
ProxySpeak/
├── client/                  # React/Vite application
│   ├── public/world/        # Prototype map artwork
│   └── src/
│       ├── components/     # Canvas, HUD, workspace UI
│       ├── constants/      # World geometry and audio radius
│       ├── hooks/          # Movement and WebRTC lifecycle
│       ├── landing/        # Public landing page
│       ├── socket/         # Socket.io client
│       └── utils/          # Camera, viewport, collision
├── server/
│   ├── src/socket/         # Events, validation, proximity
│   └── test/               # Node test runner suites
├── docs/                    # Product and audio design notes
├── contracts.md             # Shared technical contracts
└── package.json             # npm workspaces and root scripts
```

## Requirements and setup

Requires Node.js LTS, npm, Git, a modern browser, and microphone access for voice transmission.

```bash
git clone https://github.com/shivamsingh200431/ProxySpeak.git
cd ProxySpeak
npm install
npm run dev
```

Development URLs:
- Client: http://localhost:5173
- Server: http://localhost:5000
- Health: http://localhost:5000/health

The health endpoint should return:

```json
{
  "status": "ok",
  "service": "proxyspeak-server"
}
```

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start client and server concurrently |
| `npm run dev:client` | Start only the Vite client |
| `npm run dev:server` | Start only the backend |
| `npm run build` | Build the client |
| `npm start` | Start the backend |
| `npm run test --workspace=server` | Run server tests |

## Shared behavior at a glance

- World: **1800 × 1100**; spawn: **(900, 700)**.
- Server boundary padding: **60 units**.
- Client movement speed constant: **252 world units/second**.
- Voice proximity threshold: **90 world units**, inclusive.
- Public player IDs and world/invite codes: six characters, from an alphabet excluding visually ambiguous characters.
- World membership and signaling are scoped to the current Socket.io world.

See [`contracts.md`](./contracts.md) for event payloads and lifecycle details, [`docs/audio/`](./docs/audio/) for audio design material, and [`docs/ui-design-direction.md`](./docs/ui-design-direction.md) for UI guidance.

## Next priorities

1. Run and record server tests and client production build in CI.
2. Exercise voice calls across browsers/networks, including ICE failure and proximity teardown/re-entry.
3. Add movement rate/speed validation; assess authoritative collision/physics.
4. Verify production TURN/ICE configuration.
5. Decide release needs for persistence, identity/authentication, and monitoring.

## Development principles

- Separate rendering and networking concerns.
- Validate client-originated data on the server.
- Keep shared event contracts current.
- Use environment variables for deployment configuration.
- Test lifecycle and cross-client behavior, not only happy paths.

## License

License information will be added when the project reaches a release stage.
