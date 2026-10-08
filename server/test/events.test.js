import test from "node:test";
import assert from "node:assert/strict";
import {
  connectedPlayers,
  registerSocketEvents,
  worlds,
} from "../src/socket/events.js";

function createHarness() {
  const connectionHandlers = [];
  const sockets = new Map();

 const io = { on(event, handler) { if (event === "connection") connectionHandlers.push(handler); }, to(id) { return { emit(event, payload) { const target = sockets.get(id); if (target) target.emit(event, payload); }, }; }, };

  registerSocketEvents(io);

  function createSocket(id) {
    const socket = {
      id,
      handlers: new Map(),
      emitted: [],
      rooms: new Set(),

      on(event, handler) {
        this.handlers.set(event, handler);
      },

      emit(...args) {
        this.emitted.push(args);
      },

      join(room) {
        this.rooms.add(room);
      },

      leave(room) {
        this.rooms.delete(room);
      },

      to(room) {
        return {
          emit(event, payload) {
            for (const other of sockets.values()) {
              if (other.id !== id && other.rooms.has(room)) {
                other.emit(event, payload);
              }
            }
          },
        };
      },
    };

    sockets.set(id, socket);
    connectionHandlers[0](socket);
    return socket;
  }

  return { createSocket };
}

test.beforeEach(() => {
  connectedPlayers.clear();
  worlds.clear();
});

test("registers the Socket.io connection handler", () => {
  const handlers = [];

  registerSocketEvents({
    on(event, handler) {
      if (event === "connection") handlers.push(handler);
    },
  });

  assert.equal(handlers.length, 1);
});

test("creates a world with an invite code, player identity, and spawn", () => {
  const { createSocket } = createHarness();
  const socket = createSocket("socket-1");

  socket.handlers.get("create-world")({ name: "Shivam" });

  const player = connectedPlayers.get("socket-1");
  const world = worlds.get(player.worldId);

  assert.ok(world);
  assert.match(world.worldId, /^[A-Z2-9]{6}$/);
  assert.match(world.inviteCode, /^[A-Z2-9]{6}$/);
  assert.match(player.playerId, /^[A-Z2-9]{6}$/);
  assert.equal(player.name, "Shivam");
  assert.equal(player.x, 900);
  assert.equal(player.y, 700);
  assert.equal(world.players.size, 1);

  assert.equal(socket.emitted[0][0], "world-joined");
  assert.deepEqual(socket.emitted[0][1].players, [
    { playerId: player.playerId, name: "Shivam", x: 900, y: 700 },
  ]);
  assert.equal(socket.emitted[1][0], "world-created");
  assert.equal(socket.emitted[1][1].inviteCode, world.inviteCode);
});

test("joins a world by invite code, sends a snapshot, and notifies existing members", () => {
  const { createSocket } = createHarness();
  const first = createSocket("socket-1");
  const second = createSocket("socket-2");

  first.handlers.get("create-world")({ name: "Shivam" });
  const firstPlayer = connectedPlayers.get("socket-1");
  const world = worlds.get(firstPlayer.worldId);

  first.emitted.length = 0;
  second.emitted.length = 0;

  second.handlers.get("join-world")({
    name: "Sagar",
    inviteCode: world.inviteCode,
  });

  const secondPlayer = connectedPlayers.get("socket-2");

  assert.equal(secondPlayer.worldId, world.worldId);
  assert.equal(world.players.size, 2);

  assert.equal(second.emitted[0][0], "world-joined");

  const snapshot = second.emitted[0][1];
  assert.equal(snapshot.worldId, world.worldId);
  assert.equal(snapshot.inviteCode, world.inviteCode);
  assert.equal(snapshot.playerId, secondPlayer.playerId);
  assert.equal(snapshot.players.length, 2);

  assert.deepEqual(
    snapshot.players.find((p) => p.playerId === firstPlayer.playerId),
    {
      playerId: firstPlayer.playerId,
      name: "Shivam",
      x: 900,
      y: 700,
    },
  );

  assert.deepEqual(
    snapshot.players.find((p) => p.playerId === secondPlayer.playerId),
    {
      playerId: secondPlayer.playerId,
      name: "Sagar",
      x: 900,
      y: 700,
    },
  );

  assert.deepEqual(first.emitted[0], [
    "player-joined",
    {
      playerId: secondPlayer.playerId,
      name: "Sagar",
      x: 900,
      y: 700,
    },
  ]);
});

test("player-moved updates state, clamps bounds, and broadcasts through the world room", () => {
  const { createSocket } = createHarness();
  const first = createSocket("socket-1");
  const second = createSocket("socket-2");

  first.handlers.get("create-world")({ name: "Shivam" });
  const world = [...worlds.values()][0];

  second.handlers.get("join-world")({
    name: "Sagar",
    inviteCode: world.inviteCode,
  });

  const player = connectedPlayers.get("socket-1");

  first.emitted.length = 0;
  second.emitted.length = 0;

  first.handlers.get("player-moved")({ x: 1000, y: 720 });

  assert.equal(player.x, 1000);
  assert.equal(player.y, 720);
  assert.deepEqual(second.emitted[0], [
    "player-moved",
    { playerId: player.playerId, x: 1000, y: 720 },
  ]);
  assert.equal( first.emitted.some(([event]) => event === "player-moved"), false, );

  first.emitted.length = 0;
  second.emitted.length = 0;

  first.handlers.get("player-moved")({ x: -500, y: 5000 });

  assert.equal(player.x, 60);
  assert.equal(player.y, 1040);
  assert.deepEqual(second.emitted[0], [
    "player-moved",
    { playerId: player.playerId, x: 60, y: 1040 },
  ]);

  second.emitted.length = 0;

  first.handlers.get("player-moved")({ x: "bad", y: 500 });

  assert.equal(player.x, 60);
  assert.equal(player.y, 1040);
  assert.equal(second.emitted.length, 0);
});

test("movement and presence broadcasts are isolated to the current world", () => {
  const { createSocket } = createHarness();
  const first = createSocket("socket-1");
  const second = createSocket("socket-2");
  const third = createSocket("socket-3");

  first.handlers.get("create-world")({ name: "Shivam" });
  const worldOne = [...worlds.values()][0];

  second.handlers.get("join-world")({
    name: "Sagar",
    inviteCode: worldOne.inviteCode,
  });

  third.handlers.get("create-world")({ name: "Vimalesh" });

  const firstPlayer = connectedPlayers.get("socket-1");
  const thirdPlayer = connectedPlayers.get("socket-3");

  assert.notEqual(firstPlayer.worldId, thirdPlayer.worldId);

  first.emitted.length = 0;
  second.emitted.length = 0;
  third.emitted.length = 0;

  first.handlers.get("player-moved")({ x: 1100, y: 750 });

  assert.deepEqual(second.emitted[0], [
    "player-moved",
    {
      playerId: firstPlayer.playerId,
      x: 1100,
      y: 750,
    },
  ]);
  assert.equal(third.emitted.length, 0);
  assert.equal( first.emitted.some(([event]) => event === "player-moved"), false, ); 
});

test("leave-world removes the player, notifies peers, and deletes an empty world", () => {
  const { createSocket } = createHarness();
  const first = createSocket("socket-1");
  const second = createSocket("socket-2");

  first.handlers.get("create-world")({ name: "Shivam" });
  const world = [...worlds.values()][0];

  second.handlers.get("join-world")({
    name: "Sagar",
    inviteCode: world.inviteCode,
  });

  const player = connectedPlayers.get("socket-2");

  first.emitted.length = 0;
  second.handlers.get("leave-world")();

  assert.equal(connectedPlayers.has("socket-2"), false);
  assert.equal(world.players.has("socket-2"), false);
  assert.deepEqual(first.emitted.at(-1), [
    "player-left",
    { playerId: player.playerId },
  ]);
  assert.equal(worlds.has(world.worldId), true);

  first.handlers.get("leave-world")();

  assert.equal(connectedPlayers.has("socket-1"), false);
  assert.equal(worlds.has(world.worldId), false);
});

test("disconnect removes the player, notifies peers, and deletes an empty world", () => {
  const { createSocket } = createHarness();
  const first = createSocket("socket-1");
  const second = createSocket("socket-2");

  first.handlers.get("create-world")({ name: "Shivam" });
  const world = [...worlds.values()][0];

  second.handlers.get("join-world")({
    name: "Sagar",
    inviteCode: world.inviteCode,
  });

  const player = connectedPlayers.get("socket-2");

  first.emitted.length = 0;
  second.handlers.get("disconnect")("transport close");

  assert.equal(connectedPlayers.has("socket-2"), false);
  assert.equal(world.players.has("socket-2"), false);
  assert.deepEqual(first.emitted.at(-1), [
    "player-left",
    { playerId: player.playerId },
  ]);
  assert.equal(worlds.has(world.worldId), true);

  first.handlers.get("disconnect")("transport close");

  assert.equal(connectedPlayers.has("socket-1"), false);
  assert.equal(worlds.has(world.worldId), false);
});

test("disconnecting before joining performs no world cleanup", () => {
  const { createSocket } = createHarness();
  const socket = createSocket("socket-1");

  socket.handlers.get("disconnect")("transport close");

  assert.equal(connectedPlayers.has("socket-1"), false);
  assert.equal(worlds.size, 0);
  assert.equal(socket.emitted.length, 0);
});

test("invalid join does not add a player", () => {
  const { createSocket } = createHarness();
  const socket = createSocket("socket-1");

  socket.handlers.get("join-world")({
    name: "   ",
    inviteCode: "ABC123",
  });

  assert.equal(connectedPlayers.has("socket-1"), false);
  assert.deepEqual(socket.emitted[0], [
    "join-error",
    {
      code: "INVALID_NAME",
      message: "name must be between 1 and 20 characters.",
    },
  ]);
});

test("a player already in a world cannot join or create another world", () => {
  const { createSocket } = createHarness();
  const socket = createSocket("socket-1");

  socket.handlers.get("create-world")({ name: "Shivam" });

  const player = connectedPlayers.get("socket-1");

  socket.emitted.length = 0;

  socket.handlers.get("join-world")({
    name: "AnotherName",
    inviteCode: "ABC123",
  });

  assert.equal(connectedPlayers.get("socket-1"), player);
  assert.deepEqual(socket.emitted[0], [
    "join-error",
    {
      code: "ALREADY_IN_WORLD",
      message: "You are already inside a world.",
    },
  ]);

  socket.emitted.length = 0;

  socket.handlers.get("create-world")({
    name: "AnotherName",
  });

  assert.equal(connectedPlayers.get("socket-1"), player);
  assert.deepEqual(socket.emitted[0], [
    "world-error",
      {
        code: "ALREADY_IN_WORLD",
        message: "Leave your current world before creating another one.",
      },
    ]);
});
