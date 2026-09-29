import { WORLD_HEIGHT, WORLD_WIDTH } from "../constants/world";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getCameraTarget({ player, camera = { x: 0, y: 0 }, viewportWidth, viewportHeight }) {
  const left = viewportWidth * 0.30;
  const right = viewportWidth * 0.70;
  const top = viewportHeight * 0.30;
  const bottom = viewportHeight * 0.70;

  let x = camera.x;
  let y = camera.y;
  const playerScreenX = player.x - x;
  const playerScreenY = player.y - y;

  if (playerScreenX < left) x = player.x - left;
  if (playerScreenX > right) x = player.x - right;
  if (playerScreenY < top) y = player.y - top;
  if (playerScreenY > bottom) y = player.y - bottom;

  return {
    x: clamp(x, 0, Math.max(0, WORLD_WIDTH - viewportWidth)),
    y: clamp(y, 0, Math.max(0, WORLD_HEIGHT - viewportHeight))
  };
}

export function getInitialCamera({ player, viewportWidth, viewportHeight }) {
  return getCameraTarget({
    player,
    camera: { x: 0, y: 0 },
    viewportWidth,
    viewportHeight
  });
}

export function getVisibleWorldBounds({ camera, viewportWidth, viewportHeight }) {
  return {
    minX: camera.x,
    minY: camera.y,
    maxX: camera.x + viewportWidth,
    maxY: camera.y + viewportHeight
  };
}
