import { useEffect, useRef } from "react";
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_RADIUS,
  AUDIO_RADIUS,
  BOUNDARY_PADDING,
  THEME
} from "../constants/world";

/**
 * HTML5 Canvas renderer for ProxySpeak virtual world.
 * Supports High-DPI displays, coordinate grid, visual boundary fences,
 * player avatar rendering, proximity audio radius circles, and remote player rendering.
 */
export default function WorldCanvas({
  position,
  heading = 0,
  playerName = "You",
  remotePlayers = [],
  showProximityZone = true
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle High-DPI screens for crystal clear lines
    const dpr = window.devicePixelRatio || 1;
    canvas.width = WORLD_WIDTH * dpr;
    canvas.height = WORLD_HEIGHT * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Draw World Background
    ctx.fillStyle = THEME.bg;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Subtle background radial gradient
    const bgGradient = ctx.createRadialGradient(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      50,
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      WORLD_WIDTH / 1.5
    );
    bgGradient.addColorStop(0, "#0f172a");
    bgGradient.addColorStop(1, "#070b14");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 2. Draw Minor & Major Coordinate Grid
    // Minor grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = THEME.gridMinor;
    for (let x = 0; x <= WORLD_WIDTH; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_WIDTH, y);
      ctx.stroke();
    }

    // Major grid
    ctx.strokeStyle = THEME.gridMajor;
    for (let x = 0; x <= WORLD_WIDTH; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_WIDTH, y);
      ctx.stroke();
    }

    // 3. Draw World Boundaries (Visual Wall & Perimeter Accent)
    const minX = BOUNDARY_PADDING;
    const maxX = WORLD_WIDTH - BOUNDARY_PADDING;
    const minY = BOUNDARY_PADDING;
    const maxY = WORLD_HEIGHT - BOUNDARY_PADDING;
    const boundWidth = maxX - minX;
    const boundHeight = maxY - minY;

    // Out-of-bounds danger border
    ctx.fillStyle = THEME.boundaryFill;
    ctx.fillRect(minX, minY, boundWidth, boundHeight);

    ctx.strokeStyle = THEME.boundaryWall;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(minX, minY, boundWidth, boundHeight);
    ctx.setLineDash([]); // reset dash

    // Draw Corner Brackets to give a tactical world border
    const bracketLen = 14;
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(minX, minY + bracketLen);
    ctx.lineTo(minX, minY);
    ctx.lineTo(minX + bracketLen, minY);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(maxX - bracketLen, minY);
    ctx.lineTo(maxX, minY);
    ctx.lineTo(maxX, minY + bracketLen);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(minX, maxY - bracketLen);
    ctx.lineTo(minX, maxY);
    ctx.lineTo(minX + bracketLen, maxY);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(maxX - bracketLen, maxY);
    ctx.lineTo(maxX, maxY);
    ctx.lineTo(maxX, maxY - bracketLen);
    ctx.stroke();

    // 4. Draw Audio Proximity Radius (Visual Proximity Awareness)
    if (showProximityZone) {
      // Outer translucent fill
      ctx.beginPath();
      ctx.arc(position.x, position.y, AUDIO_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = THEME.proximity.fill;
      ctx.fill();

      // Outer boundary stroke
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = THEME.proximity.stroke;
      ctx.stroke();

      // Subtle dashed inner ring
      ctx.beginPath();
      ctx.arc(position.x, position.y, AUDIO_RADIUS, 0, Math.PI * 2);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = THEME.proximity.strokeDashed;
      ctx.stroke();
      ctx.setLineDash([]);

      // Proximity range label at bottom edge of radius
      ctx.fillStyle = "rgba(147, 197, 253, 0.75)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`Proximity Preview (${AUDIO_RADIUS}u)`, position.x, position.y + AUDIO_RADIUS + 6);
    }

    // 5. Draw Remote Players (Contract-Ready)
    remotePlayers.forEach((player) => {
      const dx = player.x - position.x;
      const dy = player.y - position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isNearby = dist <= AUDIO_RADIUS;

      // Draw proximity connection beam if in audio range
      if (isNearby) {
        ctx.beginPath();
        ctx.moveTo(position.x, position.y);
        ctx.lineTo(player.x, player.y);
        ctx.strokeStyle = "rgba(52, 211, 153, 0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Remote player aura
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER_RADIUS * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = THEME.remotePlayer.glow;
      ctx.fill();

      // Remote player core
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = THEME.remotePlayer.core;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = THEME.remotePlayer.ring;
      ctx.stroke();

      // Remote player name label
      renderPlayerLabel(
        ctx,
        player.x,
        player.y,
        player.name || "Remote Player",
        THEME.remotePlayer.labelBg,
        THEME.remotePlayer.labelText,
        THEME.remotePlayer.labelBorder,
        isNearby ? `${Math.round(dist)}u (Nearby)` : `${Math.round(dist)}u`
      );
    });

    // 6. Draw Local Player Avatar
    // Player outer glow
    ctx.beginPath();
    ctx.arc(position.x, position.y, PLAYER_RADIUS * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = THEME.player.glow;
    ctx.fill();

    // Player core body
    ctx.beginPath();
    ctx.arc(position.x, position.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = THEME.player.core;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = THEME.player.ring;
    ctx.stroke();

    // Direction notch / heading pointer
    const headingLength = PLAYER_RADIUS + 5;
    const tipX = position.x + Math.cos(heading) * headingLength;
    const tipY = position.y + Math.sin(heading) * headingLength;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
    ctx.fillStyle = THEME.player.heading;
    ctx.fill();

    // 7. Draw Local Player Label
    renderPlayerLabel(
      ctx,
      position.x,
      position.y,
      playerName || "You",
      THEME.player.labelBg,
      THEME.player.labelText,
      THEME.player.labelBorder,
      `X: ${Math.round(position.x)} Y: ${Math.round(position.y)}`
    );

    ctx.restore();
  }, [position, heading, playerName, remotePlayers, showProximityZone]);

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className="world-canvas"
        style={{
          width: "100%",
          aspectRatio: `${WORLD_WIDTH} / ${WORLD_HEIGHT}`
        }}
      />
    </div>
  );
}

/**
 * Helper to render polished, centered player label pills with coordinates or distance
 */
function renderPlayerLabel(ctx, x, y, name, bg, textCol, borderCol, subtext) {
  ctx.font = "bold 12px sans-serif";
  const nameWidth = ctx.measureText(name).width;
  ctx.font = "10px sans-serif";
  const subWidth = subtext ? ctx.measureText(subtext).width : 0;

  const pillWidth = Math.max(nameWidth, subWidth) + 16;
  const pillHeight = subtext ? 28 : 20;
  const pillX = x - pillWidth / 2;
  const pillY = y - PLAYER_RADIUS - pillHeight - 8;

  // Background rounded rectangle
  ctx.fillStyle = bg;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 6);
  } else {
    ctx.rect(pillX, pillY, pillWidth, pillHeight);
  }
  ctx.fill();

  // Border
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Name text
  ctx.textAlign = "center";
  ctx.fillStyle = textCol;
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(name, x, pillY + (subtext ? 11 : 14));

  // Subtext (coordinates or distance)
  if (subtext) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.fillText(subtext, x, pillY + 23);
  }
}
