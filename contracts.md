

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


## 21. Room and Corridor Collision Alignment — 2026-09-30

The prototype collision layer now follows the visible six-room SVG architecture instead of only blocking furniture.

### Collision behavior

- Outer world boundaries block the avatar from leaving the world.
- Each room's visible walls are represented by collision segments.
- Door/corridor openings remain traversable.
- The top and bottom room rows connect through the three vertical corridors.
- Rooms in each row connect through the horizontal corridors.
- Furniture remains solid and blocks avatar movement.
- Collision uses the same 900 × 520 coordinate system as the world artwork.

### Movement expectation

The avatar should be able to traverse the workspace through the visible corridors and door openings while being blocked by walls and furniture.

Collision remains client-side movement/presentation logic. The server continues to own authoritative multiplayer position state and world bounds.

This is a prototype alignment layer. When the world is migrated to Tiled, these hand-authored rectangles should be replaced by collision objects from the map.
