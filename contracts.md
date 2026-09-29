

## 20. Stable World Camera with UI-Safe Avatar Bounds — 2026-09-30

The workspace world camera and avatar movement bounds are now intentionally decoupled.

### Camera behavior

- The world Canvas always computes its visual scale and offset from the full viewport.
- Opening Settings, People, Map, or Invite must not recenter, resize, or expose an empty/black region in the world.
- World elements remain visible behind glass panels, including areas where avatars are not allowed to walk.

### UI-safe movement behavior

- Persistent UI and the currently open contextual panel still define invisible screen-space movement lanes.
- These lanes are converted into world coordinates using the stable full-viewport camera transform.
- The local avatar is prevented from entering those lanes.
- The restriction applies to avatar movement only; it does not hide or crop the underlying world.

This preserves the intended spatial-world behavior: **the world continues behind the interface, while the avatar stays out of the interface's interaction space.**

This is a client presentation/movement change only and does not alter server-authoritative world bounds or Socket.io contracts.
