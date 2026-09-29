import { WORLD_HEIGHT, WORLD_WIDTH } from "../constants/world";

export const WORLD_BOUNDS = {
  minX: 42,
  minY: 42,
  maxX: WORLD_WIDTH - 42,
  maxY: WORLD_HEIGHT - 42
};

const WALL = 4;
const DOOR = 30;

// The SVG world is a six-room grid. Collision follows the visible
// architecture while leaving the same corridor/door openings open.
// Rendering and collision stay separate so the art can later be replaced
// by a Tiled map without changing movement code.

function horizontalWall(x, y, width, gapCenter = null) {
  if (gapCenter == null) return [{ x, y, w: width, h: WALL }];

  const gapStart = gapCenter - DOOR / 2;
  const gapEnd = gapCenter + DOOR / 2;

  return [
    ...(gapStart > x ? [{ x, y, w: gapStart - x, h: WALL }] : []),
    ...(gapEnd < x + width ? [{ x: gapEnd, y, w: x + width - gapEnd, h: WALL }] : [])
  ];
}

function verticalWall(x, y, height, gapCenter = null) {
  if (gapCenter == null) return [{ x, y, w: WALL, h: height }];

  const gapStart = gapCenter - DOOR / 2;
  const gapEnd = gapCenter + DOOR / 2;

  return [
    ...(gapStart > y ? [{ x, y, w: WALL, h: gapStart - y }] : []),
    ...(gapEnd < y + height ? [{ x, y: gapEnd, w: WALL, h: y + height - gapEnd }] : [])
  ];
}

const OUTER_WALLS = [
  { x: 32, y: 32, w: 836, h: WALL },
  { x: 32, y: 484, w: 836, h: WALL },
  { x: 32, y: 32, w: WALL, h: 456 },
  { x: 864, y: 32, w: WALL, h: 456 }
];

const ROOM_WALLS = [
  // Top row.
  ...horizontalWall(58, 58, 230),
  ...horizontalWall(58, 205, 230, 170),
  ...verticalWall(58, 58, 150),
  ...verticalWall(285, 58, 150, 116),

  ...horizontalWall(330, 58, 240),
  ...horizontalWall(330, 205, 240, 450),
  ...verticalWall(330, 58, 150, 116),
  ...verticalWall(567, 58, 150, 116),

  ...horizontalWall(612, 58, 230),
  ...horizontalWall(612, 205, 230, 727),
  ...verticalWall(612, 58, 150, 116),
  ...verticalWall(839, 58, 150),

  // Bottom row.
  ...horizontalWall(58, 288, 230, 170),
  ...horizontalWall(58, 458, 230),
  ...verticalWall(58, 288, 170),
  ...verticalWall(285, 288, 170, 355),

  ...horizontalWall(330, 288, 240, 450),
  ...horizontalWall(330, 458, 240),
  ...verticalWall(330, 288, 170, 355),
  ...verticalWall(567, 288, 170, 355),

  ...horizontalWall(612, 288, 230, 727),
  ...horizontalWall(612, 458, 230),
  ...verticalWall(612, 288, 170, 355),
  ...verticalWall(839, 288, 170)
];

const FURNITURE_SOLIDS = [
  { x: 88, y: 114, w: 158, h: 42 },
  { x: 88, y: 348, w: 150, h: 46 },
  { x: 662, y: 346, w: 130, h: 44 },
  { x: 378, y: 116, w: 144, h: 56 },
  { x: 660, y: 114, w: 130, h: 58 },
  { x: 382, y: 340, w: 136, h: 62 }
];

export const SOLID_RECTS = [...OUTER_WALLS, ...ROOM_WALLS];
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
