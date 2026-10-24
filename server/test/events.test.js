import test from "node:test";
import assert from "node:assert/strict";
import { connectedPlayers, registerSocketEvents, worlds } from "../src/socket/events.js";

function createHarness(id = "socket-1") {
  const connectionHandlers = [];
  const io = {
    handlers: new Map(),
    emitted: [],
    on(event, handler) {
      if (event === "connection") connectionHandlers.push(handler);
      else this.handlers.set(event, handler);
    },
    emit(...args) {
      this.emitted.push(args);
    },
  };
  registerSocketEvents(io);

  const socket = {
    id,
    handlers: new Map(),
    emitted: [],
    joinedRooms: [],
    leftRooms: [],
    roomEmitted: [],
    on(event, handler) {
      this.handlers.set(event, handler);
    },
    emit(...args) {
      this.emitted.push(args);
    },
    join(room) {
      this.joinedRooms.push(room);
    },
    leave(room) {
      this.leftRooms.push(room);
    },
    to(room) {
      return {
        emit: (...args) => this.roomEmitted.push({ room, args }),
      };
    },
  };

  connectionHandlers[0](socket);
  return { io, socket };
}

function createWorld(harness, name = "Shivam") {
  harness.socket.handlers.get("create-world")({ name });
  const created = harness.socket.emitted.find(([event]) => event === "world-created");
  assert.ok(created, "creator should receive world-created");
  return created[1];
}

function joinWorld(harness, name, inviteCode) {
  harness.socket.handlers.get("join-world")({ name, inviteCode });
  return harness.socket.emitted.find(([event]) => event === "world-joined")?.[1];
}

test.beforeEach(() => {
  connectedPlayers.clear();
  worlds.clear();
});

test("registers the Socket.io connection handler", () => {
  const handlers = [];
  registerSocketEvents({ on(event, handler) { if (event === "connection") handlers.push(handler); } });
  assert.equal(handlers.length, 1);
});

test("creates a world, joins its owner, and acknowledges creation", () => {
  const harness = createHarness();
  harness.socket.handlers.get("create-world")({ name: "  Shivam  " });
  const player = connectedPlayers.get("socket-1");
  const world = worlds.get(player.worldId);

  assert.equal(player.name, "Shivam");
  assert.match(player.playerId, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(world.name, "Shivam's World");
  assert.equal(world.ownerSocketId, "socket-1");
  assert.equal(world.players.get("socket-1"), player);
  assert.match(world.worldId, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.match(world.inviteCode, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.deepEqual(harness.socket.joinedRooms, [world.worldId]);
  assert.deepEqual(harness.socket.emitted, [
    ["world-joined", {
      worldId: world.worldId, inviteCode: world.inviteCode, worldName: world.name,
      owner: true, playerId: player.playerId, name: "Shivam", x: 900, y: 700,
      players: [{ playerId: player.playerId, name: "Shivam", x: 900, y: 700 }],
    }],
    ["world-created", { worldId: world.worldId, inviteCode: world.inviteCode, name: world.name }],
  ]);
  assert.deepEqual(harness.socket.roomEmitted, [{
    room: world.worldId,
    args: ["player-joined", { playerId: player.playerId, name: "Shivam", x: 900, y: 700 }],
  }]);
  assert.deepEqual(harness.io.emitted, []);
});

test("joins an existing world by invite code with a player snapshot and scoped broadcast", () => {
  const owner = createHarness("owner");
  const created = createWorld(owner, "Shivam");
  const guest = createHarness("guest");
  const response = joinWorld(guest, "  Priya  ", created.inviteCode.toLowerCase());
  const world = worlds.get(created.worldId);
  const guestPlayer = connectedPlayers.get("guest");
  const ownerPlayer = connectedPlayers.get("owner");

  assert.equal(response.worldId, created.worldId);
  assert.equal(response.inviteCode, created.inviteCode);
  assert.equal(response.worldName, "Shivam's World");
  assert.equal(response.owner, false);
  assert.equal(response.playerId, guestPlayer.playerId);
  assert.equal(response.name, "Priya");
  assert.deepEqual(response.players, [
    { playerId: ownerPlayer.playerId, name: "Shivam", x: 900, y: 700 },
    { playerId: guestPlayer.playerId, name: "Priya", x: 900, y: 700 },
  ]);
  assert.deepEqual(guest.socket.joinedRooms, [created.worldId]);
  assert.deepEqual(guest.socket.roomEmitted, [{
    room: created.worldId,
    args: ["player-joined", { playerId: guestPlayer.playerId, name: "Priya", x: 900, y: 700 }],
  }]);
  assert.equal(owner.socket.roomEmitted.filter(({ args }) => args[0] === "player-joined").length, 1);
});

test("world broadcasts are scoped and movement is clamped to world bounds", () => {
  const owner = createHarness("owner");
  const worldA = createWorld(owner);
  const otherOwner = createHarness("other-owner");
  const worldB = createWorld(otherOwner, "Other");
  const guest = createHarness("guest");
  joinWorld(guest, "Priya", worldA.inviteCode);
  const guestPlayer = connectedPlayers.get("guest");

  guest.socket.handlers.get("player-moved")({ x: -100, y: 5000 });
  assert.deepEqual(guestPlayer && { x: guestPlayer.x, y: guestPlayer.y }, { x: 60, y: 1040 });
  assert.deepEqual(guest.socket.roomEmitted.at(-1), {
    room: worldA.worldId,
    args: ["player-moved", { playerId: guestPlayer.playerId, x: 60, y: 1040 }],
  });
  assert.equal(owner.socket.roomEmitted.at(-1).room, worldA.worldId);
  assert.equal(otherOwner.socket.roomEmitted.length, 1);
  assert.equal(otherOwner.socket.roomEmitted[0].room, worldB.worldId);

  guest.socket.handlers.get("player-moved")({ x: 1800, y: 1100 });
  assert.deepEqual({ x: guestPlayer.x, y: guestPlayer.y }, { x: 1740, y: 1040 });
  assert.deepEqual(guest.socket.roomEmitted.at(-1).args[1], {
    playerId: guestPlayer.playerId, x: 1740, y: 1040,
  });
});

test("ignores invalid movement without changing state or broadcasting", () => {
  const owner = createHarness();
  createWorld(owner);
  const player = connectedPlayers.get("socket-1");
  owner.socket.roomEmitted.length = 0;

  owner.socket.handlers.get("player-moved")({ x: "nope", y: 50 });
  assert.deepEqual({ x: player.x, y: player.y }, { x: 900, y: 700 });
  assert.deepEqual(owner.socket.roomEmitted, []);
});

test("removes a player on voluntary leave and deletes an empty world", () => {
  const owner = createHarness();
  const created = createWorld(owner);
  const guest = createHarness("guest");
  joinWorld(guest, "Priya", created.inviteCode);
  const guestId = connectedPlayers.get("guest").playerId;

  guest.socket.handlers.get("leave-world")();
  assert.equal(connectedPlayers.has("guest"), false);
  assert.equal(worlds.get(created.worldId).players.has("guest"), false);
  assert.deepEqual(guest.socket.leftRooms, [created.worldId]);
  assert.deepEqual(guest.socket.roomEmitted.find(({ args }) => args[0] === "player-left"), {
    room: created.worldId, args: ["player-left", { playerId: guestId }],
  });

  owner.socket.handlers.get("leave-world")();
  assert.equal(connectedPlayers.has("owner"), false);
  assert.equal(worlds.has(created.worldId), false);
});

test("removes a disconnected joined player and deletes the world when empty", () => {
  const harness = createHarness();
  const created = createWorld(harness);
  const playerId = connectedPlayers.get("socket-1").playerId;

  harness.socket.handlers.get("disconnect")("transport close");
  assert.equal(connectedPlayers.has("socket-1"), false);
  assert.equal(worlds.has(created.worldId), false);
  assert.deepEqual(harness.socket.leftRooms, [created.worldId]);
  assert.deepEqual(harness.socket.roomEmitted.at(-1), {
    room: created.worldId, args: ["player-left", { playerId }],
  });
});

test("rejects unknown invite codes without changing state", () => {
  const harness = createHarness();
  harness.socket.handlers.get("join-world")({ name: "Shivam", inviteCode: "XXXXXX" });
  assert.deepEqual(harness.socket.emitted, [["join-error", {
    code: "WORLD_NOT_FOUND",
    message: "That world could not be found. Check the invite code.",
  }]]);
  assert.equal(connectedPlayers.size, 0);
  assert.equal(worlds.size, 0);
  assert.deepEqual(harness.socket.joinedRooms, []);
});

test("rejects duplicate joins and attempts to create or join another world", () => {
  const harness = createHarness();
  const created = createWorld(harness);
  const player = connectedPlayers.get("socket-1");
  harness.socket.emitted.length = 0;

  harness.socket.handlers.get("join-world")({ name: "Other", inviteCode: created.inviteCode });
  assert.deepEqual(harness.socket.emitted.at(-1), ["join-error", {
    code: "ALREADY_IN_WORLD", message: "You are already inside a world.",
  }]);
  harness.socket.handlers.get("create-world")({ name: "Other" });
  assert.deepEqual(harness.socket.emitted.at(-1), ["world-error", {
    code: "ALREADY_IN_WORLD", message: "Leave your current world before creating another one.",
  }]);
  assert.equal(worlds.size, 1);
  assert.equal(connectedPlayers.size, 1);
  assert.equal(connectedPlayers.get("socket-1"), player);
  assert.equal(worlds.get(created.worldId).players.size, 1);
});

test("invalid create and join payloads do not corrupt existing worlds or players", () => {
  const owner = createHarness("owner");
  const created = createWorld(owner);
  const beforePlayer = connectedPlayers.get("owner");
  const beforeWorld = worlds.get(created.worldId);
  const invalidCreator = createHarness("invalid-creator");
  invalidCreator.socket.handlers.get("create-world")({ name: "   " });
  assert.deepEqual(invalidCreator.socket.emitted, [["world-error", {
    code: "INVALID_NAME", message: "name must be between 1 and 20 characters.",
  }]]);

  const invalidJoiner = createHarness("invalid-joiner");
  invalidJoiner.socket.handlers.get("join-world")({ name: 123, inviteCode: created.inviteCode });
  assert.deepEqual(invalidJoiner.socket.emitted, [["join-error", {
    code: "INVALID_NAME", message: "name must be a string.",
  }]]);
  assert.equal(connectedPlayers.size, 1);
  assert.equal(connectedPlayers.get("owner"), beforePlayer);
  assert.equal(worlds.size, 1);
  assert.equal(worlds.get(created.worldId), beforeWorld);
  assert.equal(beforeWorld.players.size, 1);
  assert.deepEqual(invalidCreator.socket.joinedRooms, []);
  assert.deepEqual(invalidJoiner.socket.joinedRooms, []);
});

test("does not broadcast leave when disconnecting before joining", () => {
  const { io, socket } = createHarness();
  socket.handlers.get("disconnect")("transport close");
  assert.equal(connectedPlayers.size, 0);
  assert.equal(worlds.size, 0);
  assert.deepEqual(socket.roomEmitted, []);
  assert.deepEqual(io.emitted, []);
});
