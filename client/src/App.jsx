import { useState } from "react";
import { useMovement } from "./hooks/useMovement";
import WorldCanvas from "./components/WorldCanvas";
import ControlsOverlay from "./components/ControlsOverlay";
import WorldHUD from "./components/WorldHUD";

/**
 * ProxySpeak Frontend Application Shell
 * Responsible for coordinating world state, player identity, controls, and HUD.
 */
export default function App() {
  const [playerName, setPlayerName] = useState("Vimalesh");
  const [showProximityZone, setShowProximityZone] = useState(true);
  const [status, setStatus] = useState("Local Simulation");

  // Remote players array prepared for contracts.md integration
  // Each remote player follows schema: { id: string, name: string, x: number, y: number }
  const [remotePlayers] = useState([]);

  // Continuous frame-smooth keyboard movement hook
  const { position, heading, activeKeys, resetPosition } = useMovement();

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">PROXIMITY AUDIO ECOSYSTEM</p>
          <h1 className="app-title">ProxySpeak</h1>
          <p className="subtitle">
            A shared digital space where distance influences communication.
          </p>
        </div>

        <div className="status-badge" role="status">
          <span className="status-dot" />
          <span>{status}</span>
        </div>
      </header>

      <section className="card">
        <div className="toolbar">
          <div>
            <h2>Virtual Workspace</h2>
            <p>Move your avatar using W, A, S, D or the Arrow keys.</p>
          </div>

          <div className="toolbar-actions">
            <span className="badge-tag">Milestone 1 Baseline</span>
          </div>
        </div>

        <ControlsOverlay
          activeKeys={activeKeys}
          playerName={playerName}
          onNameChange={setPlayerName}
          onResetPosition={resetPosition}
          showProximityZone={showProximityZone}
          onToggleProximityZone={() => setShowProximityZone((prev) => !prev)}
        />

        <WorldCanvas
          position={position}
          heading={heading}
          playerName={playerName}
          remotePlayers={remotePlayers}
          showProximityZone={showProximityZone}
        />
      </section>

      <WorldHUD position={position} remotePlayersCount={remotePlayers.length} />

      <footer className="instructions-card">
        <h3>Proximity Interaction Guide</h3>
        <p>
          When other players enter your <strong>90-unit voice zone</strong>, audio connections
          will establish automatically in future milestones. Move closer to communicate; step outside
          the radius to disengage.
        </p>
      </footer>
    </main>
  );
}
