import { useEffect, useRef } from "react";
import { WORLD_WIDTH, WORLD_HEIGHT, AUDIO_RADIUS, THEME } from "../constants/world";

export default function WorldCanvas({ position, playerName = "You", remotePlayers = [], showProximityZone = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const cssWidth = Math.max(320, canvas.clientWidth);
      const cssHeight = Math.max(240, canvas.clientHeight);
      const dpr = window.devicePixelRatio || 1;
      const scale = Math.min(cssWidth / WORLD_WIDTH, cssHeight / WORLD_HEIGHT);
      const offsetX = (cssWidth - WORLD_WIDTH * scale) / 2;
      const offsetY = (cssHeight - WORLD_HEIGHT * scale) / 2;

      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      ctx.fillStyle = "#11110f";
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      drawWorld(ctx, position, playerName, remotePlayers, showProximityZone);
      ctx.restore();
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    window.addEventListener("resize", render);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", render);
    };
  }, [position, playerName, remotePlayers, showProximityZone]);

  return <div className="canvas-container"><canvas ref={canvasRef} className="world-canvas" /></div>;
}

function drawWorld(ctx, position, playerName, remotePlayers, showProximityZone) {
  const bg = ctx.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  bg.addColorStop(0, "#1c1a17");
  bg.addColorStop(0.55, "#29251f");
  bg.addColorStop(1, "#141412");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Architectural floor.
  for (let y = 0; y <= WORLD_HEIGHT; y += 52) {
    ctx.strokeStyle = "rgba(255,255,255,.055)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y); ctx.stroke();
  }
  for (let x = 0; x <= WORLD_WIDTH; x += 52) {
    ctx.strokeStyle = "rgba(255,255,255,.045)";
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke();
  }

  // A subtle perimeter makes the world legible without a hard box.
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.65)";
  ctx.shadowBlur = 28;
  ctx.strokeStyle = "rgba(255,255,255,.13)";
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, WORLD_WIDTH - 28, WORLD_HEIGHT - 28);
  ctx.restore();

  room(ctx, 45, 48, 250, 150, "LOUNGE");
  room(ctx, 330, 38, 255, 135, "FOCUS");
  room(ctx, 635, 45, 215, 160, "MEETING");
  room(ctx, 70, 330, 250, 125, "SOCIAL");
  room(ctx, 625, 325, 205, 135, "QUIET");

  wall(ctx, 295, 30, 2, 445); wall(ctx, 620, 30, 2, 445);
  wall(ctx, 40, 235, 820, 2); wall(ctx, 350, 38, 2, 135); wall(ctx, 545, 38, 2, 135);

  sofa(ctx, 105, 116, 105, 30); sofa(ctx, 685, 385, 100, 30); sofa(ctx, 190, 360, 95, 28);
  table(ctx, 180, 96, 48, 28); table(ctx, 420, 95, 70, 32); table(ctx, 710, 115, 72, 32); table(ctx, 445, 365, 105, 40);
  plant(ctx, 65, 75); plant(ctx, 270, 82); plant(ctx, 590, 84); plant(ctx, 825, 85);
  plant(ctx, 600, 375); plant(ctx, 350, 405); plant(ctx, 835, 400);
  board(ctx, 335, 66, 185, 72, "IDEAS / PEOPLE / PROXIMITY");
  pool(ctx, 760, 250, 72, 42);

  if (showProximityZone) {
    const g = ctx.createRadialGradient(position.x, position.y, 12, position.x, position.y, AUDIO_RADIUS);
    g.addColorStop(0, "rgba(255,48,47,.17)");
    g.addColorStop(.68, "rgba(255,48,47,.05)");
    g.addColorStop(1, "rgba(255,48,47,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(position.x, position.y, AUDIO_RADIUS, 0, Math.PI * 2); ctx.fill();

    ctx.setLineDash([8, 7]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,48,47,.58)";
    ctx.beginPath(); ctx.arc(position.x, position.y, AUDIO_RADIUS, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  remotePlayers.forEach(player => {
    const dist = Math.hypot(player.x - position.x, player.y - position.y);
    const near = dist <= AUDIO_RADIUS;
    if (near) {
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = "rgba(53,208,127,.25)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(position.x, position.y); ctx.lineTo(player.x, player.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    drawStickman(ctx, player.x, player.y, player.name, false, near ? Math.round(dist) + "u nearby" : Math.round(dist) + "u");
  });

  drawStickman(ctx, position.x, position.y, playerName, true, "YOU");
}

function room(ctx, x, y, w, h, label) {
  ctx.fillStyle = "rgba(8,8,7,.20)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,255,255,.11)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,255,255,.38)";
  ctx.font = "700 9px sans-serif";
  ctx.fillText(label, x + 12, y + 17);
}
function wall(ctx, x, y, w, h) { ctx.fillStyle = "rgba(255,255,255,.09)"; ctx.fillRect(x, y, w, h); }
function sofa(ctx, x, y, w, h) { ctx.fillStyle = "#76201f"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#9b2c29"; ctx.fillRect(x, y, w, 7); ctx.fillStyle = "#3a1917"; ctx.fillRect(x + 5, y + h, w - 10, 8); }
function table(ctx, x, y, w, h) { ctx.fillStyle = "#171512"; ctx.fillRect(x, y, w, h); ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.strokeRect(x, y, w, h); ctx.fillStyle = "rgba(255,200,61,.25)"; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 4, 0, Math.PI * 2); ctx.fill(); }
function plant(ctx, x, y) { ctx.fillStyle = "#273a29"; ctx.fillRect(x - 5, y + 14, 10, 10); for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? "#3e6b45" : "#567f4b"; ctx.beginPath(); ctx.ellipse(x + (i - 2) * 5, y + 5 - Math.abs(i - 2) * 2, 5, 12, (i - 2) * .3, 0, Math.PI * 2); ctx.fill(); } }
function board(ctx, x, y, w, h, text) { ctx.fillStyle = "#ddd9ca"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#161513"; ctx.font = "700 11px sans-serif"; text.split(" / ").forEach((line, i) => ctx.fillText(line, x + 12, y + 25 + i * 15)); }
function pool(ctx, x, y, w, h) { ctx.fillStyle = "#193b3c"; ctx.fillRect(x, y, w, h); ctx.strokeStyle = "rgba(110,220,214,.28)"; ctx.strokeRect(x, y, w, h); }

function drawStickman(ctx, x, y, name, local, sub) {
  const accent = local ? "#ff302f" : "#35d07f";
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = local ? "rgba(255,48,47,.45)" : "rgba(53,208,127,.30)";
  ctx.shadowBlur = 16;

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y + 2, 22, 0, Math.PI * 2); ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(8,8,7,.74)";
  ctx.beginPath(); ctx.arc(x, y - 12, 7, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = "#eee9dd";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 13); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x - 9, y + 7); ctx.moveTo(x, y - 1); ctx.lineTo(x + 9, y + 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + 13); ctx.lineTo(x - 7, y + 23); ctx.moveTo(x, y + 13); ctx.lineTo(x + 7, y + 23); ctx.stroke();

  label(ctx, x, y - 40, name, sub, local);
  ctx.restore();
}

function label(ctx, x, y, name, sub, local) {
  ctx.font = "700 12px sans-serif";
  const nameWidth = ctx.measureText(name).width;
  ctx.font = "9px sans-serif";
  const subWidth = ctx.measureText(sub).width;
  const width = Math.max(nameWidth, subWidth) + 24;
  const height = 35;

  ctx.fillStyle = "rgba(7,7,6,.88)";
  ctx.beginPath(); ctx.roundRect(x - width / 2, y - 22, width, height, 8); ctx.fill();
  ctx.strokeStyle = local ? "rgba(255,48,47,.58)" : "rgba(255,255,255,.14)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#f5f4ef";
  ctx.font = "700 12px sans-serif";
  ctx.fillText(name, x, y - 6);
  ctx.fillStyle = local ? "#ff7775" : "#a3a39c";
  ctx.font = "9px sans-serif";
  ctx.fillText(sub, x, y + 10);
}
