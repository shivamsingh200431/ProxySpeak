import { WORLD_WIDTH, WORLD_HEIGHT, PLAYER_RADIUS } from "../constants/world";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Keeps the rendered world camera independent from workspace panels.
 *
 * The world always fills the full canvas and remains visually stable when
 * Settings/People/Map/Invite opens. UI-safe bounds are calculated separately
 * so avatars cannot walk underneath persistent UI or floating panels.
 */
export function getWorldViewport({ width = window.innerWidth, height = window.innerHeight, panel = null } = {}) {
  const sidebar = width >= 1050 ? 315 : width >= 760 ? 245 : width >= 560 ? 225 : 72;
  const top = width >= 760 ? 86 : 76;
  const bottom = width >= 760 ? 96 : 82;

  const rightPanel = panel
    ? Math.min(width >= 560 ? 390 : 340, Math.max(0, width - sidebar - 24))
    : 0;

  // Visual camera: always cover the complete viewport. Opening a panel must
  // not recenter or resize the world behind it.
  const scale = Math.max(width / WORLD_WIDTH, height / WORLD_HEIGHT);
  const offsetX = (width - WORLD_WIDTH * scale) / 2;
  const offsetY = (height - WORLD_HEIGHT * scale) / 2;

  // Avatar movement: reserve screen-space lanes for persistent UI and the
  // currently open floating panel. The world remains visible in those lanes;
  // only the avatar is prevented from entering them.
  const safeLeft = sidebar;
  const safeRight = Math.max(safeLeft + 120, width - rightPanel);
  const safeTop = top;
  const safeBottom = Math.max(safeTop + 120, height - bottom);

  const minX = clamp(
    (safeLeft - offsetX) / scale + PLAYER_RADIUS,
    PLAYER_RADIUS,
    WORLD_WIDTH - PLAYER_RADIUS
  );
  const maxX = clamp(
    (safeRight - offsetX) / scale - PLAYER_RADIUS,
    PLAYER_RADIUS,
    WORLD_WIDTH - PLAYER_RADIUS
  );
  const minY = clamp(
    (safeTop - offsetY) / scale + PLAYER_RADIUS,
    PLAYER_RADIUS,
    WORLD_HEIGHT - PLAYER_RADIUS
  );
  const maxY = clamp(
    (safeBottom - offsetY) / scale - PLAYER_RADIUS,
    PLAYER_RADIUS,
    WORLD_HEIGHT - PLAYER_RADIUS
  );

  return {
    scale,
    offsetX,
    offsetY,
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minY: Math.min(minY, maxY),
    maxY: Math.max(minY, maxY)
  };
}
