import { WORLD_HEIGHT, WORLD_WIDTH } from "../constants/world";

export const WORLD_BOUNDS = {
  minX: 60,
  minY: 60,
  maxX: WORLD_WIDTH - 60,
  maxY: WORLD_HEIGHT - 60
};

const WALL = 6;
const DOOR = 70;

function horizontalWall(x, y, width, gapCenters = []) {
  if (!gapCenters.length) return [{ x, y, w: width, h: WALL }];

  const gaps = gapCenters
    .map((center) => [center - DOOR / 2, center + DOOR / 2])
    .sort((a, b) => a[0] - b[0]);

  const segments = [];
  let cursor = x;

  for (const [gapStart, gapEnd] of gaps) {
    if (gapStart > cursor) segments.push({ x: cursor, y, w: gapStart - cursor, h: WALL });
    cursor = Math.max(cursor, gapEnd);
  }

  if (cursor < x + width) segments.push({ x: cursor, y, w: x + width - cursor, h: WALL });
  return segments;
}

function verticalWall(x, y, height, gapCenters = []) {
  if (!gapCenters.length) return [{ x, y, w: WALL, h: height }];

  const gaps = gapCenters
    .map((center) => [center - DOOR / 2, center + DOOR / 2])
    .sort((a, b) => a[0] - b[0]);

  const segments = [];
  let cursor = y;

  for (const [gapStart, gapEnd] of gaps) {
    if (gapStart > cursor) segments.push({ x, y: cursor, w: WALL, h: gapStart - cursor });
    cursor = Math.max(cursor, gapEnd);
  }

  if (cursor < y + height) segments.push({ x, y: cursor, w: WALL, h: y + height - cursor });
  return segments;
}

// Large connected workspace: three columns, three room bands,
// wide horizontal and vertical corridors, and a central hub.
const OUTER_WALLS = [
  { x: 60, y: 60, w: 1680, h: WALL },
  { x: 60, y: 1040, w: 1680, h: WALL },
  { x: 60, y: 60, w: WALL, h: 986 },
  { x: 1734, y: 60, w: WALL, h: 986 }
];

const ROOM_WALLS = [
  // Top band.
  ...horizontalWall(100, 100, 400),
  ...horizontalWall(100, 350, 400, [300]),
  ...verticalWall(100, 100, 250),
  ...verticalWall(500, 100, 250, [225]),

  ...horizontalWall(650, 100, 500),
  ...horizontalWall(650, 350, 500, [900]),
  ...verticalWall(650, 100, 250, [225]),
  ...verticalWall(1150, 100, 250, [225]),

  ...horizontalWall(1300, 100, 400),
  ...horizontalWall(1300, 350, 400, [1500]),
  ...verticalWall(1300, 100, 250, [225]),
  ...verticalWall(1700, 100, 250),

  // Middle band.
  ...horizontalWall(100, 475, 400, [300]),
  ...horizontalWall(100, 725, 400, [300]),
  ...verticalWall(100, 475, 250),
  ...verticalWall(500, 475, 250, [600]),

  ...horizontalWall(650, 475, 500, [900]),
  ...horizontalWall(650, 725, 500, [900]),
  ...verticalWall(650, 475, 250, [600]),
  ...verticalWall(1150, 475, 250, [600]),

  ...horizontalWall(1300, 475, 400, [1500]),
  ...horizontalWall(1300, 725, 400, [1500]),
  ...verticalWall(1300, 475, 250, [600]),
  ...verticalWall(1700, 475, 250),

  // Bottom band.
  ...horizontalWall(100, 850, 400, [300]),
  ...horizontalWall(100, 1030, 400),
  ...verticalWall(100, 850, 180),
  ...verticalWall(500, 850, 180, [940]),

  ...horizontalWall(650, 850, 500, [900]),
  ...horizontalWall(650, 1030, 500),
  ...verticalWall(650, 850, 180, [940]),
  ...verticalWall(1150, 850, 180, [940]),

  ...horizontalWall(1300, 850, 400, [1500]),
  ...horizontalWall(1300, 1030, 400),
  ...verticalWall(1300, 850, 180, [940]),
  ...verticalWall(1700, 850, 180)
];

const FURNITURE_SOLIDS = [
  // Lounge.
  { x: 150, y: 155, w: 190, h: 52 },
  { x: 375, y: 275, w: 70, h: 38 },

  // Focus.
  { x: 760, y: 150, w: 280, h: 70 },
  { x: 720, y: 265, w: 120, h: 42 },
  { x: 980, y: 265, w: 120, h: 42 },

  // Meeting.
  { x: 1380, y: 145, w: 240, h: 76 },

  // Social.
  { x: 150, y: 525, w: 180, h: 52 },
  { x: 355, y: 650, w: 90, h: 38 },

  // Central hub.
  { x: 760, y: 535, w: 280, h: 64 },
  { x: 760, y: 640, w: 120, h: 42 },
  { x: 920, y: 640, w: 120, h: 42 },

  // Quiet.
  { x: 1380, y: 540, w: 240, h: 64 },

  // Work.
  { x: 150, y: 895, w: 180, h: 54 },
  { x: 360, y: 955, w: 90, h: 34 },

  // Lab.
  { x: 760, y: 885, w: 280, h: 58 },

  // Archive.
  { x: 1380, y: 890, w: 240, h: 52 }
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
