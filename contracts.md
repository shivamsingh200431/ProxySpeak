# ProxySpeak Technical Contracts

This document describes the **current repository behavior** and shared interfaces. Update it when a public interface, data shape, or architectural behavior changes.

## 1. Project and architecture

ProxySpeak is a browser-based virtual workspace with real-time presence and proximity-based voice.

- Repository: `shivamsingh200431/ProxySpeak`
- Client: React, Vite, JavaScript, HTML5 Canvas
- Server: Node.js, Express, Socket.io
- Voice: client-side WebRTC; remote audio routed through Web Audio API
- State: in-memory world/player registries (not persistent)
- Client/server workspaces: `client/` and `server/`

```text
Browser client (Canvas/UI, movement, peer audio)
       | HTTP + Socket.io
       v
Node/Express + Socket.io server
  - world membership and public identity
  - position state and bounds clamping
  - proximity pair tracking/events
  - WebRTC signaling routing only
```

The server routes signaling. It does not process media, inspect SDP/ICE semantics, or manage RTCPeerConnection state.

## 2. Development setup

Requires Node.js LTS and npm.

```bash
npm install
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:5000`
- Health check: `GET /health`

Commands:
- `npm run dev`: run client and server
- `npm run dev:client`: client only
- `npm run dev:server`: server only
- `npm run build`: client production build
- `npm start`: server
- `npm run test --workspace=server`: server test suite

## 3. World and player model

- World coordinate space: **1800 × 1100**
- Spawn: **(900, 700)**
- Server boundary padding: **60u**
- Client movement speed constant: **252 world units/second**
- The current map artwork contains nine connected prototype rooms.
- World/player state is in memory and is removed with lifecycle cleanup; it is not restored after server restart.
- Public player IDs, world IDs, and invite codes are six characters generated from an alphabet excluding visually ambiguous characters.
- Socket IDs are server-only. Public player payloads do not expose them.

Public player snapshot:

```json
{
  "playerId": "ABC234",
  "name": "Shivam",
  "x": 900,
  "y": 700
}
```

The server validates coordinate values as finite numbers and clamps them to the padded world bounds. **This is not full authoritative movement simulation:** client-side collision and movement speed are not security enforcement, and movement rate/speed validation remains a hardening task.

## 4. Socket.io world events

### Client → server

| Event | Payload | Behavior |
| --- | --- | --- |
| `create-world` | `{ name: string }` | Validates name, creates a world, and joins creator. |
| `join-world` | `{ name: string, inviteCode: string }` | Validates name and joins a world by invite code. |
| `player-moved` | `{ x: number, y: number }` | Updates joined member's bounded position, broadcasts it, reevaluates proximity. |
| `leave-world` | none | Removes the member from the current world. |

Names are trimmed and must contain 1–20 characters. A socket already in a world must leave before creating or joining another.

### Server → client

| Event | Payload | Audience |
| --- | --- | --- |
| `world-created` | `{ worldId, inviteCode, name }` | Creator |
| `world-joined` | world metadata, local identity/position, `players: Player[]` | Joining client |
| `player-joined` | `Player` | Other members of that world |
| `player-moved` | `{ playerId, x, y }` | Other members of that world |
| `player-left` | `{ playerId }` | Other members of that world |
| `join-error` / `world-error` | `{ code, message }` | Requesting client |

Movement and presence broadcasts are scoped to a Socket.io world room. Explicit leave and disconnect remove player state, clean proximity pairs, and notify remaining members. Empty worlds are deleted.

## 5. Proximity contract

- Authoritative threshold: **90 world units**, inclusive.
- Distance: Euclidean distance between player coordinates.
- Only members of the same world can form proximity pairs.
- Pair keys are canonical unordered pairs stored in the world proximity set.
- Proximity is evaluated on world join and accepted movement.
- `proximity-entered` is sent to both peers when the pair enters range.
- `proximity-left` is sent to both peers when the pair leaves range.
- Payload: `{ playerId: string }`, identifying the other member from the recipient's perspective.
- On leave/disconnect, active pairs are cleared; remaining peers receive `proximity-left`.

The proximity signal describes nearby state; it is not proof that media transport is connected.

## 6. WebRTC signaling contract

Signaling messages contain the target and sender's public player IDs. Server routing resolves the target only within the sender's current world and forwards the payload unchanged.

| Event | Payload fields |
| --- | --- |
| `webrtc-offer` | `{ targetPlayerId, fromPlayerId, sdp }` |
| `webrtc-answer` | `{ targetPlayerId, fromPlayerId, sdp }` |
| `webrtc-ice-candidate` | `{ targetPlayerId, fromPlayerId, candidate }` |

Server checks:
- Sender must be in a world.
- Target must be a different player in the sender's current world.
- `fromPlayerId` must match the authenticated socket's public player ID.
- Invalid or unavailable targets produce `webrtc-signaling-error`; signaling is not routed across worlds.

Routing error codes include `TARGET_NOT_FOUND`, `NOT_IN_WORLD`, and `INVALID_TARGET`.

### Negotiation and lifecycle

- The lexicographically lower public player ID is designated offerer; the other peer answers.
- The client manages RTCPeerConnection objects and ICE exchange.
- Proximity entry triggers peer setup/negotiation.
- Proximity exit closes and removes the corresponding peer connection and audio nodes.
- Leave/disconnect uses the same peer cleanup path through proximity notifications.
- A later proximity re-entry starts a new negotiation.

## 7. Client audio behavior and limitations

The client implements a peer connection per nearby remote public player ID, an audio send/receive transceiver, ICE candidate forwarding, microphone track attachment when a local stream is available, and remote track routing through Web Audio API source/gain nodes.

- Microphone permission must remain explicit; joining a world or proximity alone must not silently request it.
- Remote audio gain follows the 90u range: `clamp(1 - distance / 90, 0, 1)`.
- The browser and network still determine whether a peer connection succeeds.
- ICE/TURN setup, permissions, device behavior, and deployment must be exercised in real browsers and networks.
- Do not describe proximity state or successful signaling as a guaranteed voice call.
- Public fallback STUN/TURN configuration is not a production reliability commitment. Configure and verify appropriate deployment ICE servers.

The landing-page Proximity Lab is a **presentation-only local simulation**. Its labels and slider are not live network or media state and do not request microphone access.

## 8. Product/UI contract

The product has two primary experiences:
1. Public landing page describing proximity communication.
2. Joined virtual workspace.

The workspace presents people/presence, proximity, voice controls, room context, navigation, and world HUD. UI must not claim peer audio is active unless connection state supports that claim. Demo-only labels must not imply production behavior.

Visual direction: near-black corporate base, red primary brand/action, yellow proximity/attention, green active/connected states, warm white text, and Atkinson Hyperlegible typography. Keep motion purposeful and respect reduced-motion preferences.

See `docs/ui-design-direction.md` for expanded design guidance and `docs/audio/` for supporting audio design notes.

## 9. Tests and verification

Server test files currently cover:
- Proximity distance, pair entry/exit, and cleanup
- Socket event registration, world lifecycle, movement and world scoping
- Join payload validation

Test command: `npm run test --workspace=server`.

The existence of tests is not a claim that the latest main revision has passed CI. Run tests and the client production build, then exercise two or more browsers for voice negotiation, ICE failure, mute/permission handling, proximity teardown, and re-entry.

## 10. Known gaps / next engineering priorities

1. Add movement speed/rate validation and assess server-authoritative collision/physics.
2. Add automated CI for server tests and client build; retain observable results.
3. Run browser/network end-to-end voice tests, including reconnect and error paths.
4. Configure and validate production TURN/ICE services.
5. Decide product requirements for persistence, authentication, deployment monitoring, and recovery.

## 11. Engineering principles

- Separate rendering from networking and server state.
- Validate all client-originated payloads.
- Scope presence and signaling to the current world.
- Keep shared event contracts explicit and backward-compatible where practical.
- Use environment variables for deployment-specific configuration.
- Update this contract when behavior, payloads, or lifecycle semantics change.
