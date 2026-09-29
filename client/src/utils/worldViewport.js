import { getVisibleWorldBounds } from "./camera";

export function getWorldViewport({
  width = window.innerWidth,
  height = window.innerHeight,
  camera = { x: 0, y: 0 }
} = {}) {
  const visible = getVisibleWorldBounds({
    camera,
    viewportWidth: width,
    viewportHeight: height
  });

  return {
    scale: 1,
    offsetX: -camera.x,
    offsetY: -camera.y,
    minX: visible.minX,
    maxX: visible.maxX,
    minY: visible.minY,
    maxY: visible.maxY
  };
}
