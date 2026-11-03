# ProxySpeak MVP Readiness Checklist

This is a release-validation plan, not a claim that the checks have passed. Complete each item on a staging deployment or local test environment before inviting external beta testers.

## MVP exit goal

A first-time user can enter a world, find another player, and start a natural nearby conversation within 30 seconds, without assistance.

## Scope guardrails

**In scope:** shared-world join/leave, player presence and movement, proximity voice, mic/mute feedback, disconnect/reconnect handling, input validation, deployment connectivity, basic error visibility.

**Out of scope for this MVP:** accounts/authentication, persistence, friends/chat, world discovery, monetization, achievements, complex moderation dashboards, and unrelated redesign. Revisit only if testing identifies a blocker.

## Gate 1 — Reproducible baseline

- [ ] Start from latest `main` and record commit SHA.
- [ ] Install dependencies from lockfile using `npm ci`.
- [ ] Run `npm run build`.
- [ ] Run `npm run test --workspace=server`.
- [ ] Record command output, environment/runtime versions, and any existing failures.
- [ ] Inspect open PRs against latest main; review overlapping/stale changes before integration.

## Gate 2 — Multiplayer and lifecycle

- [ ] 4 clients join the same world and see consistent player presence.
- [ ] Joining a different world does not leak presence or signaling across worlds.
- [ ] Movement updates are visible to other clients and remain within valid world bounds.
- [ ] Malformed, non-finite, oversized, or out-of-bounds movement payloads are safely rejected/clamped.
- [ ] Excessive movement/event rates cannot create unbounded work or implausible position changes.
- [ ] Leave, tab close, refresh, reconnect, and transient disconnect do not leave ghost players.
- [ ] Repeated join/leave cycles do not accumulate duplicate listeners or stale state.

## Gate 3 — Voice behavior (manual multi-client test required)

- [ ] Microphone permission granted: user can start voice successfully.
- [ ] Microphone permission denied/unavailable: understandable feedback; app remains usable.
- [ ] Two nearby users can hear one another in both directions.
- [ ] Users beyond the configured range do not receive proximity voice.
- [ ] Crossing the threshold tears down or restores the appropriate peer audio without duplicates.
- [ ] Mute/unmute reliably changes local transmission and visible state.
- [ ] Leaving/disconnecting closes relevant peer connections and audio resources.
- [ ] ICE failure and reconnection paths recover or present a clear actionable error.
- [ ] Validate at least two browsers/devices and users on different networks.
- [ ] Record observed latency, failures, browser versions, and reproducible steps.

### Range contract

The documented baseline is **90 world units, inclusive**. Keep server proximity eligibility, client peer lifecycle, visual indication, and distance gain consistent with the agreed product rule. Do not change the radius incidentally as part of cleanup.

## Gate 4 — Security and operational readiness

- [ ] Server validates all client-originated event payloads and world membership.
- [ ] Movement speed/rate enforcement is tested server-side; client constants are not treated as security controls.
- [ ] Signaling routes only to an eligible peer in the sender's world.
- [ ] Errors/logs exclude secrets and unnecessary personal data.
- [ ] Production uses HTTPS/WSS and explicit environment configuration.
- [ ] TURN/STUN configuration is documented and verified on restrictive networks; do not assume STUN alone is sufficient.
- [ ] Health endpoint, startup behavior, and graceful failure are checked.
- [ ] Known limitation: world/player state is in-memory and is lost on server restart. Plan beta expectations accordingly.

## Gate 5 — Usability and closed beta

- [ ] A first-time user can create/join a world without developer assistance.
- [ ] Nearby users, audio range, microphone state, connection state, mute, and leave controls are understandable.
- [ ] Test 30 minutes with 4 clients; no ghost users, stuck audio, or major uncaught errors.
- [ ] Run a small 10–20 person invite-only beta only after critical gates pass.
- [ ] Capture feedback on onboarding friction, audio reliability, and whether conversations feel natural.

## Test report template

- Date / tester:
- Main commit SHA:
- Browser, OS, device:
- Network setup:
- Build result:
- Server test result:
- Multiplayer test result:
- Voice test result:
- Bugs (steps to reproduce, expected vs actual):
- Blockers / owner / next action:

## Completion policy

Do not mark a gate complete based only on implementation claims or unit tests. Separate automated test evidence from manual multi-device/network validation. Open a focused issue or PR for each unresolved blocker. Keep all changes on a feature branch and merge only after review.
