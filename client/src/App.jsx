import { useEffect, useRef, useState } from "react";
import { useMovement } from "./hooks/useMovement";
import WorldCanvas from "./components/WorldCanvas";
import ControlsOverlay from "./components/ControlsOverlay";
import WorldHUD from "./components/WorldHUD";
import { socket, SERVER_URL } from "./socket/index";

/**
 * ProxySpeak Frontend Application Shell
 * Responsible for coordinating world state, player identity, controls, and HUD.
 * Socket.io integration follows the event contract defined in contracts.md.
 */
export default function App() {
  // ── Player name & UI controls (Vimalesh branch) ──────────────────────────
  const [playerName, setPlayerName] = useState("");
  const [showProximityZone, setShowProximityZone] = useState(true);

  // ── Socket / presence state (main branch) ────────────────────────────────
  const nameRef = useRef("");
  const joinFailedRef = useRef(false);

  const [playerId, setPlayerId] = useState("");
  const [status, setStatus] = useState("Not connected");
  const [error, setError] = useState("");

  // Remote players array prepared for contracts.md Week-2 integration.
  // Each entry follows schema: { id: string, name: string, x: number, y: number }
  const [remotePlayers] = useState([]);

  // ── Frame-smooth keyboard movement (Vimalesh branch) ─────────────────────
  const { position, heading, activeKeys, resetPosition } = useMovement();

  // Keep nameRef in sync so the connect handler always reads the latest value.
  useEffect(() => {
    nameRef.current = playerName;
  }, [playerName]);

  // ── Socket event listeners (main branch) ─────────────────────────────────
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

  // ── Join / Leave handlers (main branch) ──────────────────────────────────
  function handleNameChange(value) {
    setPlayerName(value);
    nameRef.current = value;
    if (error) setError("");
  }

  function handleConnectClick() {
    const trimmedName = playerName.trim();

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div>
          <p className="eyebrow">PROXIMITY AUDIO ECOSYSTEM</p>
          <h1 className="app-title">ProxySpeak</h1>
          <p className="subtitle">
            A shared digital space where distance influences communication.
          </p>
        </div>

        <div className={`status-badge${isJoined ? " status-badge--online" : ""}`} role="status">
          <span className="status-dot" />
          <span>{status}</span>
        </div>
      </header>

      {/* ── Main card ── */}
      <section className="card">
        {/* Toolbar: world title + join/leave panel */}
        <div className="toolbar">
          <div>
            <h2>Virtual Workspace</h2>
            <p>Move your avatar using W, A, S, D or the Arrow keys.</p>
          </div>

          {/* Join / Leave panel — contract-compliant (contracts.md §8) */}
          <div className="join-panel">
            <label htmlFor="display-name">Display name</label>
            <div className="join-controls">
              <input
                id="display-name"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter your name"
                name="displayName"
                autoComplete="off"
                maxLength={20}
                disabled={isJoined || isConnecting}
              />

              {isJoined ? (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={handleLeave}
                >
                  Leave World
                </button>
              ) : (
                <button
                  type="button"
                  className="button"
                  onClick={handleConnectClick}
                  disabled={isConnecting}
                >
                  {isConnecting ? "Joining…" : "Join World"}
                </button>
              )}
            </div>
            <span className="input-hint">1–20 characters</span>
          </div>
        </div>

        {/* Inline error message */}
        {error && <p className="error">{error}</p>}

        {/* Keyboard controls overlay */}
        <ControlsOverlay
          activeKeys={activeKeys}
          playerName={playerName}
          onNameChange={handleNameChange}
          onResetPosition={resetPosition}
          showProximityZone={showProximityZone}
          onToggleProximityZone={() => setShowProximityZone((prev) => !prev)}
        />

        {/* Canvas world */}
        <WorldCanvas
          position={position}
          heading={heading}
          playerName={playerName || "You"}
          remotePlayers={remotePlayers}
          showProximityZone={showProximityZone}
        />
      </section>

      {/* ── HUD telemetry ── */}
      <WorldHUD position={position} remotePlayersCount={remotePlayers.length} />

      {/* ── Stats row: playerId + world info ── */}
      <section className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Player ID</span>
          <strong className="stat-value mono">{playerId || "—"}</strong>
          <span className="stat-meta">Server-assigned (6 chars)</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">World</span>
          <strong className="stat-value">Single shared world</strong>
          <span className="stat-meta">Multi-world in a future milestone</span>
        </div>
      </section>

      {/* ── Server info footer ── */}
      <p className="server-info">
        Connected server: <span>{SERVER_URL}</span>
      </p>

      {/* ── Proximity instructions ── */}
      <footer className="instructions-card">
        <h3>Proximity Interaction Guide</h3>
        <p>
          When other players enter your <strong>90-unit voice zone</strong>, audio
          connections will establish automatically in future milestones. Move closer
          to communicate; step outside the radius to disengage.
        </p>
      </footer>
    </main>
  );
}
