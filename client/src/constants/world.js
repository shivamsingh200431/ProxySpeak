/**
 * World and rendering constants for ProxySpeak.
 * Keeps geometry, physics limits, and visual design values centralized.
 */

export const WORLD_WIDTH = 1800;
export const WORLD_HEIGHT = 1100;

export const SPAWN_POSITION = {
  x: 900,
  y: 610
};

export const PLAYER_RADIUS = 14;

// Planned proximity threshold documented in contracts.md.
// This is currently used for visual feedback only.
export const AUDIO_RADIUS = 160;
export const BOUNDARY_PADDING = 60;

// Movement speed in pixels per frame when using continuous key tracking loop
export const MOVE_SPEED = 4.2;

export const THEME = {
  bg: "#121211",
  gridMajor: "#30302b",
  gridMinor: "#1d1d1a",
  boundaryWall: "#ff302f",
  boundaryFill: "rgba(255, 48, 47, 0.035)",
  player: {
    core: "#ff302f",
    glow: "rgba(255, 48, 47, 0.28)",
    ring: "#ff7775",
    heading: "#ffffff",
    labelBg: "rgba(12, 12, 11, 0.82)",
    labelText: "#f7f7f4",
    labelBorder: "rgba(255, 48, 47, 0.35)"
  },
  proximity: {
    fill: "rgba(255, 48, 47, 0.08)",
    stroke: "rgba(255, 48, 47, 0.55)",
    strokeDashed: "rgba(255, 200, 61, 0.32)"
  },
  remotePlayer: {
    core: "#34d399",
    glow: "rgba(52, 211, 153, 0.4)",
    ring: "#a7f3d0",
    labelBg: "rgba(15, 23, 42, 0.85)",
    labelText: "#ecfdf5",
    labelBorder: "rgba(52, 211, 153, 0.35)"
  }
};
