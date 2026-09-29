import { useEffect, useRef } from "react";
import { WORLD_WIDTH, WORLD_HEIGHT, AUDIO_RADIUS } from "../constants/world";
import { getWorldViewport } from "../utils/worldViewport";
import { getCameraTarget, getInitialCamera } from "../utils/camera";

const WORLD_ART = "/world/proxyspeak-world.svg";
const CAMERA_FOLLOW_RATE = 10;

export default function WorldCanvas({
  position,
  playerName = "You",
  remotePlayers = [],
  showProximityZone = true
}) {
  const canvasRef = useRef(null);
  const artRef = useRef(null);
  const cameraRef = useRef(null);
  const playerRef = useRef(position);
  const playersRef = useRef(remotePlayers);
  const nameRef = useRef(playerName);
  const proximityRef = useRef(showProximityZone);
  const renderRef = useRef(null);
  const needsRenderRef = useRef(true);

  useEffect(() => {
    playerRef.current = position;
    needsRenderRef.current = true;
  }, [position]);

  useEffect(() => {
    playersRef.current = remotePlayers;
    needsRenderRef.current = true;
  }, [remotePlayers]);

  useEffect(() => {
    nameRef.current = playerName;
    needsRenderRef.current = true;
  }, [playerName]);

  useEffect(() => {
    proximityRef.current = showProximityZone;
    needsRenderRef.current = true;
  }, [showProximityZone]);

  useEffect(() => {
    const image = new Image();
    image.decoding = "async";
    image.src = WORLD_ART;
    artRef.current = image;
    image.onload = () => { needsRenderRef.current = true; };
    return () => { image.onload = null; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let lastWidth = 0;
    let lastHeight = 0;
    let lastDpr = 0;
    let lastFrameTime = performance.now();

    const resizeCanvas = () => {
      const width = Math.max(320, canvas.clientWidth);
      const height = Math.max(240, canvas.clientHeight);
      const dpr = window.devicePixelRatio || 1;

      if (width !== lastWidth || height !== lastHeight || dpr !== lastDpr) {
        lastWidth = width;
        lastHeight = height;
        lastDpr = dpr;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        cameraRef.current = null;
        needsRenderRef.current = true;
      }
      return { width, height, dpr };
    };

    const render = (now = performance.now()) => {
      const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;
      const { width, height, dpr } = resizeCanvas();

      if (!cameraRef.current) {
        cameraRef.current = getInitialCamera({
          player: playerRef.current,
          viewportWidth: width,
          viewportHeight: height
        });
      }

      const target = getCameraTarget({
        player: playerRef.current,
        camera: cameraRef.current,
        viewportWidth: width,
        viewportHeight: height
      });

      const dx = target.x - cameraRef.current.x;
      const dy = target.y - cameraRef.current.y;

      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        // Exponential smoothing keeps camera follow consistent at 60/120/144Hz.
        const follow = 1 - Math.exp(-CAMERA_FOLLOW_RATE * dt);
        cameraRef.current = {
          x: cameraRef.current.x + dx * follow,
          y: cameraRef.current.y + dy * follow
        };
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#070909";
      ctx.fillRect(0, 0, width, height);

      const viewport = getWorldViewport({
        width,
        height,
        camera: cameraRef.current
      });

      ctx.save();
      // Keep the camera smooth internally, but present the final screen-space
      // translation on whole pixels to avoid sub-pixel shimmer.
      ctx.translate(Math.round(viewport.offsetX), Math.round(viewport.offsetY));
      drawWorld(
        ctx,
        artRef.current,
        playerRef.current,
        nameRef.current,
        playersRef.current,
        proximityRef.current,
        viewport
      );
      ctx.restore();

      const cameraSettled = Math.abs(target.x - cameraRef.current.x) < 0.2 &&
        Math.abs(target.y - cameraRef.current.y) < 0.2;

      if (needsRenderRef.current || !cameraSettled) {
        needsRenderRef.current = false;
        frame = requestAnimationFrame(render);
      } else {
        frame = 0;
      }
      renderRef.current = render;
    };

    renderRef.current = render;
    render();

    const observer = new ResizeObserver(() => {
      needsRenderRef.current = true;
      if (!frame) frame = requestAnimationFrame(render);
    });
    observer.observe(canvas);

    const wake = () => {
      needsRenderRef.current = true;
      if (!frame) frame = requestAnimationFrame(render);
    };
    window.addEventListener("resize", wake);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", wake);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!renderRef.current) return;
    needsRenderRef.current = true;
    // The movement hook publishes positions through React state. Wake the
    // renderer for that frame; camera smoothing continues until settled.
    const frame = requestAnimationFrame(() => {
      if (renderRef.current) renderRef.current();
    });
    return () => cancelAnimationFrame(frame);
  }, [position]);

  return <div className="canvas-container"><canvas ref={canvasRef} className="world-canvas" /></div>;
}

function drawWorld(ctx, art, position, playerName, remotePlayers, showProximityZone, viewport) {
  const localDrawPosition = {
    x: Math.round(position.x),
    y: Math.round(position.y)
  };

  if (art?.complete && art.naturalWidth > 0) {
    ctx.drawImage(art, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  } else {
    ctx.fillStyle = "#121716";
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  if (showProximityZone) {
    const gradient = ctx.createRadialGradient(localDrawPosition.x, localDrawPosition.y, 8, localDrawPosition.x, localDrawPosition.y, AUDIO_RADIUS);
    gradient.addColorStop(0, "rgba(255,48,47,.18)");
    gradient.addColorStop(.65, "rgba(255,48,47,.055)");
    gradient.addColorStop(1, "rgba(255,48,47,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(localDrawPosition.x, localDrawPosition.y, AUDIO_RADIUS, 0, Math.PI * 2);
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
    const drawPosition = {
      x: Math.round(player.x),
      y: Math.round(player.y)
    };
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

    drawStickman(ctx, drawPosition.x, drawPosition.y, player.name, false,
      near ? Math.round(distance) + "u nearby" : Math.round(distance) + "u");
  });

  drawStickman(ctx, localDrawPosition.x, localDrawPosition.y, playerName, true, "YOU");
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
