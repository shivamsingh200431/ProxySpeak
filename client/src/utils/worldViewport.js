import { WORLD_WIDTH, WORLD_HEIGHT, PLAYER_RADIUS } from "../constants/world";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Maps the fixed 900x520 world into the viewport while keeping a protected
 * screen-space lane for the persistent workspace UI.
 *
 * The world is intentionally allowed to continue behind the UI visually,
 * but avatars are clamped before they can enter those UI lanes.
 */
export function getWorldViewport({ width = window.innerWidth, height = window.innerHeight, panel = null } = {}) {
  const sidebar = width >= 1050 ? 315 : width >= 760 ? 245 : width >= 560 ? 225 : 72;
  const top = width >= 760 ? 86 : 76;
  const bottom = width >= 760 ? 96 : 82;

  const rightPanel = panel
    ? Math.min(width >= 560 ? 390 : 340, Math.max(0, width - sidebar - 24))
    : 0;

  const scale = Math.max(width / WORLD_WIDTH, height / WORLD_HEIGHT);
  const safeLeft = sidebar;
  const safeRight = Math.max(safeLeft + 120, width - rightPanel);
  const safeTop = top;
  const safeBottom = Math.max(safeTop + 120, height - bottom);

  const centerX = (safeLeft + safeRight) / 2;
  const centerY = (safeTop + safeBottom) / 2;
  const offsetX = centerX - (WORLD_WIDTH * scale) / 2;
  const offsetY = centerY - (WORLD_HEIGHT * scale) / 2;

  const minX = clamp((safeLeft - offsetX) / scale + PLAYER_RADIUS, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
  const maxX = clamp((safeRight - offsetX) / scale - PLAYER_RADIUS, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
  const minY = clamp((safeTop - offsetY) / scale + PLAYER_RADIUS, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
  const maxY = clamp((safeBottom - offsetY) / scale - PLAYER_RADIUS, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);

  return { scale, offsetX, offsetY, minX: Math.min(minX, maxX), maxX: Math.max(minX, maxX), minY: Math.min(minY, maxY), maxY: Math.max(minY, maxY) };
}
