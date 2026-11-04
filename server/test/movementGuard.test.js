import test from "node:test";
import assert from "node:assert/strict";
import { createMovementRateLimiter, isValidMovement } from "../src/socket/movementGuard.js";

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
