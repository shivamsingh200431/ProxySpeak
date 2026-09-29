

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


## 22. Expanded Traversable Workspace Map — 2026-09-30

The prototype workspace is now intentionally a large connected map rather than a compact six-room demo.

### World geometry

- World coordinate space is expanded from 900 × 520 to **1800 × 1100**.
- The layout uses nine rooms across three horizontal bands: Lounge, Focus, Meeting, Social, Commons, Quiet, Work, Lab, and Archive.
- Wide horizontal and vertical corridors connect the rooms into one traversable network.
- The central Commons area is the default spawn and social anchor.
- Room walls and corridor openings are authored in the same coordinate space as the SVG so collision and rendering stay aligned.
- Furniture remains solid but does not seal the main routes.

### Traversal intent

The avatar should have meaningful travel distance between rooms, with multiple routes through the workspace instead of being confined to one compact cluster.

The visual reference is the **connected-room traversal structure** of social multiplayer maps; ProxySpeak keeps its own corporate workspace identity and does not copy another game's map or art.

### Runtime changes

- Server-authoritative world bounds are now 1800 × 1100 with 60px boundary padding.
- Client spawn position is 900, 610.
- Visual proximity radius is increased from 90u to 160u to remain meaningful at the larger map scale.
- Movement speed is increased from 3.5 to 4.2 pixels/frame to keep traversal responsive across the larger space.
- Collision remains client-side movement/presentation logic; the server still owns shared player position state.

This is still a prototype layout. The next map-art iteration can replace the SVG with a proper Tiled-authored map while preserving the movement and multiplayer contracts. Tiled's JSON map format supports tile layers and object layers, including positioned objects that can carry collision-related data.


## 23. Player-Follow Camera with Deadzone and World-Edge Clamping — 2026-09-30

The workspace now uses a camera that views a portion of the larger world instead of fitting the complete map into the viewport.

### Camera model

- Player coordinates remain absolute world coordinates.
- The camera has its own world-space X/Y position.
- Screen position is derived as:
  - `screenX = playerX - cameraX`
  - `screenY = playerY - cameraY`
- The camera uses a deadzone occupying approximately 30%–70% of the viewport on both axes.
- The player can move freely inside that deadzone without moving the map.
- When the player crosses a deadzone edge, the camera follows by translating the world in the opposite direction.
- Camera movement is smoothed with interpolation so following is not visually abrupt.

### Camera clamping

The camera is clamped to:

- `0 <= cameraX <= WORLD_WIDTH - viewportWidth`
- `0 <= cameraY <= WORLD_HEIGHT - viewportHeight`

When the camera reaches a world edge, it stops. The avatar can then continue moving toward the corresponding physical edge of the world/viewport.

### Movement relationship

- Avatar movement is constrained by world/collision bounds, not by UI panels.
- Opening Settings, People, Map, or Invite does not change the player's movement bounds or camera coordinate system.
- Rendering translates the world by `-cameraX, -cameraY`.
- Remote players remain in absolute world coordinates and are rendered only when inside the current camera viewport.

This establishes the map as a genuinely larger navigable world and makes the camera responsible for viewport tracking.
