import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  BOUNDARY_PADDING,
  AUDIO_RADIUS
} from "../constants/world";

/**
 * WorldHUD component displaying local telemetry, boundary status,
 * planned proximity range, and local presence state.
 */
export default function WorldHUD({ position, remotePlayersCount = 0 }) {
  const isNearBoundary =
    position.x <= BOUNDARY_PADDING + 8 ||
    position.x >= WORLD_WIDTH - BOUNDARY_PADDING - 8 ||
    position.y <= BOUNDARY_PADDING + 8 ||
    position.y >= WORLD_HEIGHT - BOUNDARY_PADDING - 8;

  return (
    <section className="stats-hud">
      <div className="stat-card">
        <span className="stat-label">Coordinates</span>
        <strong className="stat-value">
          X: {Math.round(position.x)} <span className="stat-sep">/</span> Y: {Math.round(position.y)}
        </strong>
        <span className="stat-meta">
          World: {WORLD_WIDTH} × {WORLD_HEIGHT}
        </span>
      </div>

      <div className="stat-card">
        <span className="stat-label">Proximity Range</span>
        <strong className="stat-value">{AUDIO_RADIUS} units</strong>
        <span className="stat-meta">Planned proximity threshold</span>
      </div>

      <div className="stat-card">
        <span className="stat-label">Arena Boundary</span>
        <strong className={`stat-value ${isNearBoundary ? "stat-warning" : "stat-normal"}`}>
          {isNearBoundary ? "Perimeter Wall Contact" : "Clear (In-Bounds)"}
        </strong>
        <span className="stat-meta">Clamped to playfield limits</span>
      </div>

      <div className="stat-card">
        <span className="stat-label">World Presence</span>
        <strong className="stat-value">
          {remotePlayersCount > 0
            ? `${remotePlayersCount + 1} Players Present`
            : "Local Environment"}
        </strong>
        <span className="stat-meta">
          {remotePlayersCount > 0
            ? `${remotePlayersCount} remote peers`
            : "Remote presence in Week 2"}
        </span>
      </div>
    </section>
  );
}
