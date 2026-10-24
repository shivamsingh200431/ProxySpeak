import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateDistance,
  isWithinProximity,
  updateProximity,
  clearPlayerProximity,
  PROXIMITY_THRESHOLD,
} from "../src/socket/proximity.js";

// Minimal io mock: io.to(socketId).emit(event, payload) records every call
// as [socketId, event, payload] so tests can assert on exactly who received
// exactly what, without needing a real Socket.io server.
function createIoMock() {
  const calls = [];
  return {
    calls,
    to(socketId) {
      return {
        emit(event, payload) {
          calls.push([socketId, event, payload]);
        },
      };
    },
  };
}

function createWorld(players) {
  const map = new Map();
  for (const p of players) map.set(p.id, p);
  return { players: map, proximityPairs: new Set() };
}

test("calculateDistance returns the Euclidean distance", () => {
  assert.equal(calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test("isWithinProximity is true exactly at the threshold boundary", () => {
  assert.equal(isWithinProximity({ x: 0, y: 0 }, { x: PROXIMITY_THRESHOLD, y: 0 }), true);
  assert.equal(isWithinProximity({ x: 0, y: 0 }, { x: PROXIMITY_THRESHOLD + 0.01, y: 0 }), false);
});

test("updateProximity emits proximity-entered to both sides when a player moves into range", () => {
  const io = createIoMock();
  const mover = { id: "socket-a", playerId: "AAAAAA", x: 0, y: 0 };
  const other = { id: "socket-b", playerId: "BBBBBB", x: 50, y: 0 };
  const world = createWorld([mover, other]);

  updateProximity(io, world, mover);

  assert.equal(world.proximityPairs.has("AAAAAA|BBBBBB"), true);
  assert.deepEqual(io.calls, [
    ["socket-a", "proximity-entered", { playerId: "BBBBBB" }],
    ["socket-b", "proximity-entered", { playerId: "AAAAAA" }],
  ]);
});

test("updateProximity does not re-emit for a pair that's already nearby", () => {
  const io = createIoMock();
  const mover = { id: "socket-a", playerId: "AAAAAA", x: 0, y: 0 };
  const other = { id: "socket-b", playerId: "BBBBBB", x: 50, y: 0 };
  const world = createWorld([mover, other]);

  updateProximity(io, world, mover);
  io.calls.length = 0;

  mover.x = 55; // still within threshold, just a small move
  updateProximity(io, world, mover);

  assert.equal(io.calls.length, 0);
});

test("updateProximity emits proximity-left to both sides when a player moves out of range", () => {
  const io = createIoMock();
  const mover = { id: "socket-a", playerId: "AAAAAA", x: 0, y: 0 };
  const other = { id: "socket-b", playerId: "BBBBBB", x: 50, y: 0 };
  const world = createWorld([mover, other]);

  updateProximity(io, world, mover); // enters
  io.calls.length = 0;

  mover.x = 500; // well outside threshold
  updateProximity(io, world, mover);

  assert.equal(world.proximityPairs.has("AAAAAA|BBBBBB"), false);
  assert.deepEqual(io.calls, [
    ["socket-a", "proximity-left", { playerId: "BBBBBB" }],
    ["socket-b", "proximity-left", { playerId: "AAAAAA" }],
  ]);
});

test("updateProximity handles three players independently", () => {
  const io = createIoMock();
  const mover = { id: "socket-a", playerId: "AAAAAA", x: 0, y: 0 };
  const near = { id: "socket-b", playerId: "BBBBBB", x: 50, y: 0 };
  const far = { id: "socket-c", playerId: "CCCCCC", x: 1000, y: 1000 };
  const world = createWorld([mover, near, far]);

  updateProximity(io, world, mover);

  assert.equal(world.proximityPairs.has("AAAAAA|BBBBBB"), true);
  assert.equal(world.proximityPairs.has("AAAAAA|CCCCCC"), false);
  assert.equal(io.calls.length, 2); // only the mover/near pair fired
});

test("clearPlayerProximity notifies the remaining side and clears the pair", () => {
  const io = createIoMock();
  const mover = { id: "socket-a", playerId: "AAAAAA", x: 0, y: 0 };
  const other = { id: "socket-b", playerId: "BBBBBB", x: 50, y: 0 };
  const world = createWorld([mover, other]);

  updateProximity(io, world, mover); // they're nearby
  io.calls.length = 0;

  clearPlayerProximity(io, world, mover); // mover leaves the world

  assert.equal(world.proximityPairs.size, 0);
  assert.deepEqual(io.calls, [["socket-b", "proximity-left", { playerId: "AAAAAA" }]]);
});

test("clearPlayerProximity does nothing when the player had no active pairs", () => {
  const io = createIoMock();
  const mover = { id: "socket-a", playerId: "AAAAAA", x: 0, y: 0 };
  const world = createWorld([mover]);

  clearPlayerProximity(io, world, mover);

  assert.equal(io.calls.length, 0);
});
