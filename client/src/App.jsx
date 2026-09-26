import AudioMockUI from "./components/AudioMockUI";
import { useEffect, useRef, useState } from "react";
import { SERVER_URL, socket } from "./socket/socket";

const WIDTH = 900;
const HEIGHT = 520;

export default function App() {
  const canvasRef = useRef(null);
  const nameRef = useRef("");
  const joinFailedRef = useRef(false);

  const [position, setPosition] = useState({ x: 450, y: 260 });
  const [name, setName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [status, setStatus] = useState("Not connected");
  const [error, setError] = useState("");

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

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

  useEffect(() => {
    function handleConnect() {
      setStatus("Connected");
      setError("");
      socket.emit("join-world", { name: nameRef.current.trim() });
    }

    function handleWorldJoined(player) {
      setPlayerId(player.playerId);
      setStatus(`Joined as ${player.name}`);
      setError("");
    }

    function handleJoinError(payload) {
      joinFailedRef.current = true;
      setError(payload.message);
      setStatus("Join failed");
      setPlayerId("");
      socket.disconnect();
    }

    function handleDisconnect() {
      setPlayerId("");

      if (!joinFailedRef.current) {
        setStatus("Disconnected");
      }
    }

    socket.on("connect", handleConnect);
    socket.on("world-joined", handleWorldJoined);
    socket.on("join-error", handleJoinError);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("world-joined", handleWorldJoined);
      socket.off("join-error", handleJoinError);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  function handleNameChange(event) {
    const value = event.target.value;
    setName(value);
    nameRef.current = value;

    if (error) {
      setError("");
    }
  }

  function handleConnectClick() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Enter a name before joining.");
      return;
    }

    if (trimmedName.length > 20) {
      setError("Name must be between 1 and 20 characters.");
      return;
    }

    nameRef.current = trimmedName;
    joinFailedRef.current = false;
    setError("");
    setStatus("Connecting...");
    socket.connect();
  }

  function handleLeave() {
    if (socket.connected) {
      socket.emit("leave-world");
      socket.disconnect();
    }
  }

  const isJoined = Boolean(playerId);
  const isConnecting = status === "Connecting..." || status === "Connected";

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

        <div className={`status ${isJoined ? "status--online" : ""}`}>
          <span className="status-dot" />
          {status}
        </div>
      </header>

      <section className="card">
        <div className="toolbar">
          <div>
            <h2>Virtual Workspace</h2>
            <p>Move using WASD or arrow keys.</p>
          </div>

          <div className="join-panel">
            <label htmlFor="display-name">Display name</label>
            <div className="join-controls">
              <input
                id="display-name"
                value={name}
                onChange={handleNameChange}
                placeholder="Enter your name"
                name="displayName"
                autoComplete="off"
                maxLength={20}
                disabled={isJoined || isConnecting}
              />

              {isJoined ? (
                <button
                  className="button button--secondary"
                  onClick={handleLeave}
                >
                  Leave World
                </button>
              ) : (
                <button
                  className="button"
                  onClick={handleConnectClick}
                  disabled={isConnecting}
                >
                  {isConnecting ? "Joining..." : "Join World"}
                </button>
              )}
            </div>
            <span className="input-hint">1–20 characters</span>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
      </section>

      <section className="stats">
        <div>
          <span>Position</span>
          <strong>
            X: {Math.round(position.x)} / Y: {Math.round(position.y)}
          </strong>
        </div>

        <div>
          <span>Player ID</span>
          <strong className="mono">{playerId || "—"}</strong>
        </div>

        <div>
          <span>World</span>
          <strong>Single shared world</strong>
        </div>
      </section>

      <p className="server-info">
        Connected server <span>{SERVER_URL}</span>
      </p>

      <AudioMockUI/>
    </main>
  );
}
