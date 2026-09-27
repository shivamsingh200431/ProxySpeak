/**
 * ControlsOverlay component providing visual keycaps (lighting up on press),
 * player name configuration, and quick world actions.
 */
export default function ControlsOverlay({
  activeKeys = {},
  playerName,
  onNameChange,
  onResetPosition,
  showProximityZone,
  onToggleProximityZone
}) {
  const isW = !!(activeKeys["w"] || activeKeys["arrowup"]);
  const isA = !!(activeKeys["a"] || activeKeys["arrowleft"]);
  const isS = !!(activeKeys["s"] || activeKeys["arrowdown"]);
  const isD = !!(activeKeys["d"] || activeKeys["arrowright"]);

  return (
    <div className="controls-overlay">
      <div className="controls-left">
        <div className="player-input-group">
          <label htmlFor="playerNameInput">Player Tag</label>
          <input
            id="playerNameInput"
            type="text"
            maxLength={18}
            value={playerName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter your name"
            className="player-name-input"
          />
        </div>

        <div className="keycap-group">
          <span className="keycap-label">Movement:</span>
          <div className="keycaps">
            <span className={`keycap ${isW ? "active" : ""}`}>W / ↑</span>
            <span className={`keycap ${isA ? "active" : ""}`}>A / ←</span>
            <span className={`keycap ${isS ? "active" : ""}`}>S / ↓</span>
            <span className={`keycap ${isD ? "active" : ""}`}>D / →</span>
          </div>
        </div>
      </div>

      <div className="controls-right">
        <button
          type="button"
          onClick={onToggleProximityZone}
          className={`btn-secondary ${showProximityZone ? "active" : ""}`}
          title="Toggle proximity audio radius visualization"
        >
          {showProximityZone ? "Radius: Visible" : "Radius: Hidden"}
        </button>

        <button
          type="button"
          onClick={onResetPosition}
          className="btn-secondary"
          title="Center player to world spawn coordinates"
        >
          Center Spawn
        </button>
      </div>
    </div>
  );
}
