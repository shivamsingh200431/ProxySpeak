/**
 * Server-authoritative movement guard.
 * Rejects malformed coordinates and throttles noisy clients.
 */
export const MOVEMENT_RATE_LIMIT = 30;
export const MOVEMENT_RATE_WINDOW_MS = 1000;

function validCoordinate(value) {
  if (typeof value === "number") return Number.isFinite(value);
  // Preserve numeric-string compatibility, but reject blank/whitespace strings.
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value));
}

export function isValidMovement(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  return validCoordinate(payload.x) && validCoordinate(payload.y);
}

export function createMovementRateLimiter({
  limit = MOVEMENT_RATE_LIMIT,
  windowMs = MOVEMENT_RATE_WINDOW_MS,
  now = Date.now,
} = {}) {
  const buckets = new Map();
  function allow(key) {
    const current = now();
    let bucket = buckets.get(key);
    if (!bucket || current - bucket.startedAt >= windowMs || current < bucket.startedAt) {
      bucket = { startedAt: current, count: 0 };
      buckets.set(key, bucket);
    }
    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
  }
  // Drop per-socket state when its connection ends.
  allow.clear = (key) => buckets.delete(key);
  allow.clearAll = () => buckets.clear();
  return allow;
}


export const MAX_MOVEMENT_SPEED = 252;
export const MOVEMENT_BURST_WINDOW_MS = 200;

/**
 * Limits accepted displacement using a distance token bucket.
 * Tokens refill at maxSpeed world-units/second and are capped to a short
 * burst window so normal packet jitter is tolerated without allowing
 * repeated high-speed movement or teleportation.
 */
export function createMovementSpeedGuard({
  maxSpeed = MAX_MOVEMENT_SPEED,
  burstWindowMs = MOVEMENT_BURST_WINDOW_MS,
  now = Date.now,
} = {}) {
  if (!Number.isFinite(maxSpeed) || maxSpeed <= 0) {
    throw new TypeError("maxSpeed must be a positive finite number.");
  }
  if (!Number.isFinite(burstWindowMs) || burstWindowMs < 0) {
    throw new TypeError("burstWindowMs must be a non-negative finite number.");
  }

  const capacity = maxSpeed * burstWindowMs / 1000;
  const states = new Map();

  function initialize(key, position) {
    const x = Number(position?.x);
    const y = Number(position?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new TypeError("Initial movement position must contain finite x and y coordinates.");
    }
    states.set(key, { x, y, tokens: capacity, updatedAt: now() });
  }

  function allow(key, nextPosition) {
    const x = Number(nextPosition?.x);
    const y = Number(nextPosition?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

    let state = states.get(key);
    if (!state) {
      initialize(key, { x, y });
      return true;
    }

    const currentTime = now();
    const elapsedMs = Math.max(0, currentTime - state.updatedAt);
    state.tokens = Math.min(capacity, state.tokens + maxSpeed * elapsedMs / 1000);
    state.updatedAt = currentTime;

    const distance = Math.hypot(x - state.x, y - state.y);
    if (distance > state.tokens + 1e-6) return false;

    state.tokens = Math.max(0, state.tokens - distance);
    state.x = x;
    state.y = y;
    return true;
  }

  allow.initialize = initialize;
  allow.clear = (key) => states.delete(key);
  allow.clearAll = () => states.clear();
  return allow;
}
