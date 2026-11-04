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
