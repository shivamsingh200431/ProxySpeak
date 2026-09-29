/**
 * ControlsOverlay component providing visual movement keycaps and quick world actions.
 * Player identity is controlled by the contract-compliant Join World field in App.
 */
export default function ControlsOverlay({
  activeKeys = {},
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
          title="Toggle the visual proximity radius"
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
