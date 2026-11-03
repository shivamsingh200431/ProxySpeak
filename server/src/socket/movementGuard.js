/**
 * Server-authoritative movement guard.
 * Rejects malformed coordinates and throttles noisy clients.
 */
export const MOVEMENT_RATE_LIMIT = 30;
export const MOVEMENT_RATE_WINDOW_MS = 1000;

export function isValidMovement(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  // Keep numeric-string compatibility with the existing event contract.
  const x = Number(payload.x);
  const y = Number(payload.y);
  return Number.isFinite(x) && Number.isFinite(y);
}

export function createMovementRateLimiter({
  limit = MOVEMENT_RATE_LIMIT,
  windowMs = MOVEMENT_RATE_WINDOW_MS,
  now = Date.now,
} = {}) {
  const buckets = new Map();
  return function allow(key) {
    const current = now();
    let bucket = buckets.get(key);
    if (!bucket || current - bucket.startedAt >= windowMs || current < bucket.startedAt) {
      bucket = { startedAt: current, count: 0 };
      buckets.set(key, bucket);
    }
    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
  };
}
