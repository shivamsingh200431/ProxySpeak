import test from "node:test";
import assert from "node:assert/strict";
import {
  createMovementRateLimiter,
  createMovementSpeedGuard,
  isValidMovement,
  MAX_MOVEMENT_SPEED,
  MOVEMENT_BURST_WINDOW_MS,
} from "../src/socket/movementGuard.js";

test("rejects malformed movement payloads", () => {
  for (const payload of [null, undefined, [], "move", {}, { x: "nope", y: 2 }, { x: 2, y: Infinity }, { x: NaN, y: 2 }, { x: null, y: 2 }, { x: "", y: 2 }, { x: "   ", y: 2 }, { x: true, y: 2 }, { x: 2, y: false }]) {
    assert.equal(isValidMovement(payload), false);
  }
});

test("accepts finite numeric coordinates and preserves numeric-string compatibility", () => {
  assert.equal(isValidMovement({ x: 12, y: 34 }), true);
  assert.equal(isValidMovement({ x: "12", y: "34" }), true);
});

test("rate limiter permits configured burst and rejects excess until window expires", () => {
  let now = 1000;
  const allow = createMovementRateLimiter({ limit: 2, windowMs: 500, now: () => now });
  assert.equal(allow("client"), true);
  assert.equal(allow("client"), true);
  assert.equal(allow("client"), false);
  now = 1499;
  assert.equal(allow("client"), false);
  now = 1500;
  assert.equal(allow("client"), true);
});

test("rate limits clients independently and handles clock rollback", () => {
  let now = 1000;
  const allow = createMovementRateLimiter({ limit: 1, windowMs: 500, now: () => now });
  assert.equal(allow("a"), true);
  assert.equal(allow("b"), true);
  assert.equal(allow("a"), false);
  now = 900;
  assert.equal(allow("a"), true);
});


test("rate limiter clear releases a client's bucket and allows a fresh window", () => {
  const allow = createMovementRateLimiter({ limit: 1, now: () => 1000 });
  assert.equal(allow("socket"), true);
  assert.equal(allow("socket"), false);
  assert.equal(allow.clear("socket"), true);
  assert.equal(allow("socket"), true);
  assert.equal(allow.clear("missing"), false);
});


function createClock() {
  let time = 10_000;
  return {
    now: () => time,
    advance: (milliseconds) => { time += milliseconds; },
  };
}

test("movement speed guard allows normal movement within the configured speed", () => {
  const clock = createClock();
  const allow = createMovementSpeedGuard({ now: clock.now });
  allow.initialize("peer-a", { x: 0, y: 0 });

  const burst = MAX_MOVEMENT_SPEED * MOVEMENT_BURST_WINDOW_MS / 1000;
  assert.equal(allow("peer-a", { x: burst, y: 0 }), true);
  clock.advance(100);
  assert.equal(allow("peer-a", { x: burst + MAX_MOVEMENT_SPEED * 0.1, y: 0 }), true);
});

test("movement speed guard rejects teleporting and preserves the last accepted position", () => {
  const clock = createClock();
  const allow = createMovementSpeedGuard({ now: clock.now });
  allow.initialize("peer-a", { x: 100, y: 100 });

  assert.equal(allow("peer-a", { x: 1000, y: 1000 }), false);
  clock.advance(100);
  assert.equal(allow("peer-a", { x: 125.2, y: 100 }), true);
});

test("movement speed guard blocks sustained movement above the configured speed", () => {
  const clock = createClock();
  const allow = createMovementSpeedGuard({ now: clock.now });
  const burst = MAX_MOVEMENT_SPEED * MOVEMENT_BURST_WINDOW_MS / 1000;
  allow.initialize("peer-a", { x: 0, y: 0 });

  assert.equal(allow("peer-a", { x: burst, y: 0 }), true);
  clock.advance(100);
  assert.equal(allow("peer-a", { x: burst + 25.2, y: 0 }), true);
  clock.advance(100);
  assert.equal(allow("peer-a", { x: burst + 75.6, y: 0 }), false);
});

test("movement speed guard caps accumulated burst credit and supports cleanup", () => {
  const clock = createClock();
  const allow = createMovementSpeedGuard({ now: clock.now });
  const capacity = MAX_MOVEMENT_SPEED * MOVEMENT_BURST_WINDOW_MS / 1000;
  allow.initialize("peer-a", { x: 0, y: 0 });
  clock.advance(10_000);

  assert.equal(allow("peer-a", { x: capacity + 0.1, y: 0 }), false);
  assert.equal(allow("peer-a", { x: capacity, y: 0 }), true);
  assert.equal(allow.clear("peer-a"), true);
  assert.equal(allow("peer-a", { x: 5000, y: 5000 }), true);
  allow.clearAll();
});
