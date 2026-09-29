

## 19. Asset-Backed World Layout and Collision — 2026-09-30

The workspace world has moved from a purely programmatic mock environment toward an asset-backed world layout.

### Rendering contract

- The active Canvas world renders a dedicated world-art asset from `client/public/world/proxyspeak-world.svg`.
- The asset defines the visible rooms, corridors, architectural boundaries, and furniture composition.
- Player avatars, proximity visualization, labels, and live multiplayer presence remain Canvas-rendered above the world art.
- The world art uses the existing 900 × 520 world coordinate space so Socket.io position payloads remain compatible.

### Movement contract

- Client movement now uses explicit collision geometry in `client/src/utils/worldCollision.js`.
- Collision geometry is separate from rendering so the visible art can later be replaced by a Tiled map without changing the movement API.
- Wall and furniture collision uses axis-separated resolution, allowing the local avatar to slide along obstacles rather than becoming stuck on diagonal contact.
- The client collision layer is presentation/movement logic only. The server remains authoritative for shared position bounds and multiplayer state.

### Future map source

The intended next step is to replace the SVG prototype with a real Tiled map/tileset package. Tiled supports isometric and orthogonal maps, tile layers, object layers, and custom properties, which makes it suitable for separating visible tiles from collision/spawn metadata. The exported map should use JSON/TMJ or TMX/TSX depending on the chosen asset pack.

The renderer should eventually consume:

```text
Tiled map
├── Floor layer
├── Architecture layer
├── Furniture/props layer
├── Collision object layer
├── Spawn object layer
└── Proximity/room metadata
```

Until a complete tileset/map package is supplied, the SVG world is the stable visual/collision prototype rather than an assertion that the supplied sprite-sheet screenshots are a complete Tiled asset package.

This decision changes workspace rendering and client collision behavior, but does not change the Socket.io event names or server authority model.
