import { useEffect, useRef, useState } from "react";

const WIDTH = 900;
const HEIGHT = 520;

export default function App() {
  const canvasRef = useRef(null);
  const [position, setPosition] = useState({ x: 450, y: 260 });
  const [status, setStatus] = useState("Not connected");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = "#374151";

    for (let x = 0; x <= WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(position.x, position.y, 90, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(position.x, position.y, 90, 0, Math.PI * 2);
    ctx.strokeStyle = "#60a5fa";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(position.x, position.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#60a5fa";
    ctx.fill();

    ctx.fillStyle = "#dbeafe";
    ctx.font = "14px Arial";
    ctx.fillText("You", position.x - 12, position.y - 20);
  }, [position]);

  useEffect(() => {
    function move(event) {
      const step = 10;

      setPosition((current) => {
        const next = { ...current };
        const key = event.key.toLowerCase();

        if (key === "w" || event.key === "ArrowUp") next.y -= step;
        if (key === "s" || event.key === "ArrowDown") next.y += step;
        if (key === "a" || event.key === "ArrowLeft") next.x -= step;
        if (key === "d" || event.key === "ArrowRight") next.x += step;

        next.x = Math.max(20, Math.min(WIDTH - 20, next.x));
        next.y = Math.max(20, Math.min(HEIGHT - 20, next.y));

        return next;
      });
    }

    window.addEventListener("keydown", move);
    return () => window.removeEventListener("keydown", move);
  }, []);

  return (
    <main className="app">
      <header>
        <div>
          <p className="eyebrow">PROXIMITY AUDIO ECOSYSTEM</p>
          <h1>ProxySpeak</h1>
          <p className="subtitle">
            A shared digital space where distance influences communication.
          </p>
        </div>

        <div className="status">{status}</div>
      </header>

      <section className="card">
        <div className="toolbar">
          <div>
            <h2>Virtual Workspace</h2>
            <p>Move using WASD or arrow keys.</p>
          </div>

          <button onClick={() => setStatus("Ready for Socket.io")}>
            Initialize Connection
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
        />
      </section>

      <section className="stats">
        <div>
          <span>Position</span>
          <strong>
            X: {Math.round(position.x)} / Y: {Math.round(position.y)}
          </strong>
        </div>

        <div>
          <span>Audio Radius</span>
          <strong>90 units</strong>
        </div>

        <div>
          <span>System</span>
          <strong>Frontend Online</strong>
        </div>
      </section>
    </main>
  );
}
