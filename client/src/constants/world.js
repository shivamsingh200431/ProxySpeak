/**
 * World and rendering constants for ProxySpeak.
 * Keeps geometry, physics limits, and visual design values centralized.
 */

export const WORLD_WIDTH = 900;
export const WORLD_HEIGHT = 520;

export const SPAWN_POSITION = {
  x: 450,
  y: 260
};

export const PLAYER_RADIUS = 14;

// Planned proximity threshold documented in contracts.md.
// This is currently used for visual feedback only.
export const AUDIO_RADIUS = 90;
export const BOUNDARY_PADDING = 24;

// Movement speed in pixels per frame when using continuous key tracking loop
export const MOVE_SPEED = 3.5;

export const THEME = {
  bg: "#0b0f19",
  gridMajor: "#1f293d",
  gridMinor: "#141c2e",
  boundaryWall: "#3b82f6",
  boundaryFill: "rgba(59, 130, 246, 0.04)",
  player: {
    core: "#60a5fa",
    glow: "rgba(96, 165, 250, 0.4)",
    ring: "#93c5fd",
    heading: "#ffffff",
    labelBg: "rgba(15, 23, 42, 0.85)",
    labelText: "#f8fafc",
    labelBorder: "rgba(96, 165, 250, 0.35)"
  },
  proximity: {
    fill: "rgba(59, 130, 246, 0.12)",
    stroke: "rgba(96, 165, 250, 0.6)",
    strokeDashed: "rgba(147, 197, 253, 0.35)"
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
