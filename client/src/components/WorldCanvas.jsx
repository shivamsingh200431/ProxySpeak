import { useEffect, useRef } from "react";
import { WORLD_WIDTH, WORLD_HEIGHT, AUDIO_RADIUS } from "../constants/world";
import { getWorldViewport } from "../utils/worldViewport";

const WORLD_ART = "/world/proxyspeak-world.svg";

export default function WorldCanvas({
  position,
  playerName = "You",
  remotePlayers = [],
  showProximityZone = true,
  activePanel = null
}) {
  const canvasRef = useRef(null);
  const artRef = useRef(null);

  useEffect(() => {
    const image = new Image();
    image.src = WORLD_ART;
    artRef.current = image;
    return () => { image.onload = null; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const cssWidth = Math.max(320, canvas.clientWidth);
      const cssHeight = Math.max(240, canvas.clientHeight);
      const dpr = window.devicePixelRatio || 1;
      const viewport = getWorldViewport({ width: cssWidth, height: cssHeight, panel: activePanel });

      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.fillStyle = "#070909";
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      ctx.save();
      ctx.translate(viewport.offsetX, viewport.offsetY);
      ctx.scale(viewport.scale, viewport.scale);
      drawWorld(ctx, artRef.current, position, playerName, remotePlayers, showProximityZone, viewport);
      ctx.restore();
    };

    const art = artRef.current;
    art?.addEventListener("load", render);
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    render();
    window.addEventListener("resize", render);

    return () => {
      art?.removeEventListener("load", render);
      observer.disconnect();
      window.removeEventListener("resize", render);
    };
  }, [position, playerName, remotePlayers, showProximityZone, activePanel]);

  return <div className="canvas-container"><canvas ref={canvasRef} className="world-canvas" /></div>;
}

function drawWorld(ctx, art, position, playerName, remotePlayers, showProximityZone, viewport) {
  if (art?.complete && art.naturalWidth > 0) {
    ctx.drawImage(art, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  } else {
    ctx.fillStyle = "#121716";
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  if (showProximityZone) {
    const gradient = ctx.createRadialGradient(position.x, position.y, 8, position.x, position.y, AUDIO_RADIUS);
    gradient.addColorStop(0, "rgba(255,48,47,.18)");
    gradient.addColorStop(.65, "rgba(255,48,47,.055)");
    gradient.addColorStop(1, "rgba(255,48,47,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(position.x, position.y, AUDIO_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = "rgba(255,48,47,.52)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(position.x, position.y, AUDIO_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  remotePlayers.forEach(player => {
    const visible = player.x >= viewport.minX && player.x <= viewport.maxX &&
      player.y >= viewport.minY && player.y <= viewport.maxY;
    if (!visible) return;

    const distance = Math.hypot(player.x - position.x, player.y - position.y);
    const near = distance <= AUDIO_RADIUS;

    if (near) {
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = "rgba(53,208,127,.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(position.x, position.y);
      ctx.lineTo(player.x, player.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawStickman(ctx, player.x, player.y, player.name, false,
      near ? Math.round(distance) + "u nearby" : Math.round(distance) + "u");
  });

  drawStickman(ctx, position.x, position.y, playerName, true, "YOU");
}

function drawStickman(ctx, x, y, name, local, sub) {
  const accent = local ? "#ff302f" : "#35d07f";
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.shadowColor = local ? "rgba(255,48,47,.42)" : "rgba(53,208,127,.28)";
  ctx.shadowBlur = 14;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y + 2, 21, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(8,9,8,.88)";
  ctx.beginPath();
  ctx.arc(x, y - 12, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#f2f1eb";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y + 13);
  ctx.moveTo(x, y - 1);
  ctx.lineTo(x - 9, y + 7);
  ctx.moveTo(x, y - 1);
  ctx.lineTo(x + 9, y + 7);
  ctx.moveTo(x, y + 13);
  ctx.lineTo(x - 7, y + 23);
  ctx.moveTo(x, y + 13);
  ctx.lineTo(x + 7, y + 23);
  ctx.stroke();

  drawLabel(ctx, x, y - 40, name, sub, local);
  ctx.restore();
}

function drawLabel(ctx, x, y, name, sub, local) {
  ctx.textAlign = "center";
  ctx.font = "700 12px Arial, sans-serif";
  const nameWidth = ctx.measureText(name).width;
  ctx.font = "9px Arial, sans-serif";
  const subWidth = ctx.measureText(sub).width;
  const width = Math.max(nameWidth, subWidth) + 24;

  ctx.fillStyle = "rgba(7,8,7,.9)";
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - 22, width, 35, 8);
  ctx.fill();

  ctx.strokeStyle = local ? "rgba(255,48,47,.58)" : "rgba(255,255,255,.15)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#f5f4ef";
  ctx.font = "700 12px Arial, sans-serif";
  ctx.fillText(name, x, y - 6);
  ctx.fillStyle = local ? "#ff7775" : "#a3aaa5";
  ctx.font = "9px Arial, sans-serif";
  ctx.fillText(sub, x, y + 10);
}
