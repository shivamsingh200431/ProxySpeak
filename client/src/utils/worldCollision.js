import { WORLD_HEIGHT, WORLD_WIDTH } from "../constants/world";

export const WORLD_BOUNDS = {
  minX: 42,
  minY: 42,
  maxX: WORLD_WIDTH - 42,
  maxY: WORLD_HEIGHT - 42
};

// Walkable areas are intentionally defined separately from rendering.
// This lets us replace the SVG with a Tiled map later without changing
// player movement or multiplayer contracts.
export const SOLID_RECTS = [
  { x: 32, y: 32, w: 26, h: 456 },
  { x: 842, y: 32, w: 26, h: 456 },
  { x: 32, y: 32, w: 836, h: 26 },
  { x: 32, y: 462, w: 836, h: 26 },

  // Interior room walls. Door gaps are intentionally left open.
  { x: 58, y: 58, w: 230, h: 3 },
  { x: 58, y: 205, w: 230, h: 3 },
  { x: 58, y: 58, w: 3, h: 54 },
  { x: 58, y: 156, w: 3, h: 52 },
  { x: 285, y: 58, w: 3, h: 55 },
  { x: 285, y: 136, w: 3, h: 72 },

  { x: 330, y: 58, w: 240, h: 3 },
  { x: 330, y: 205, w: 240, h: 3 },
  { x: 330, y: 58, w: 3, h: 55 },
  { x: 330, y: 136, w: 3, h: 72 },
  { x: 567, y: 58, w: 3, h: 55 },
  { x: 567, y: 136, w: 3, h: 72 },

  { x: 612, y: 58, w: 230, h: 3 },
  { x: 612, y: 205, w: 230, h: 3 },
  { x: 612, y: 58, w: 3, h: 55 },
  { x: 612, y: 136, w: 3, h: 72 },
  { x: 839, y: 58, w: 3, h: 456 },
];

const FURNITURE_SOLIDS = [
  { x: 88, y: 114, w: 158, h: 42 },
  { x: 88, y: 348, w: 150, h: 46 },
  { x: 662, y: 346, w: 130, h: 44 },
  { x: 378, y: 116, w: 144, h: 56 },
  { x: 660, y: 114, w: 130, h: 58 },
  { x: 382, y: 340, w: 136, h: 62 }
];

export const COLLISION_RECTS = [...SOLID_RECTS, ...FURNITURE_SOLIDS];

export function collides(x, y, radius = 12) {
  return COLLISION_RECTS.some(rect => {
    const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    return Math.hypot(x - nearestX, y - nearestY) < radius;
  });
}

export function canOccupy(x, y, radius = 12) {
  return (
    x >= WORLD_BOUNDS.minX &&
    x <= WORLD_BOUNDS.maxX &&
    y >= WORLD_BOUNDS.minY &&
    y <= WORLD_BOUNDS.maxY &&
    !collides(x, y, radius)
  );
}
