import test from "node:test";
import assert from "node:assert/strict";
import { connectedPlayers, registerSocketEvents } from "../src/socket/events.js";

function createHarness() {
  const connectionHandlers = [];
  const io = {
    on(event, handler) {
      if (event === "connection") connectionHandlers.push(handler);
    },
    emit(...args) {
      io.emitted.push(args);
    },
    emitted: [],
  };

  registerSocketEvents(io);

  const socket = {
    id: "socket-1",
    handlers: new Map(),
    emitted: [],
    on(event, handler) {
      this.handlers.set(event, handler);
    },
    emit(...args) {
      this.emitted.push(args);
    },
    broadcast: {
      emitted: [],
      emit(...args) {
        this.emitted.push(args);
      },
    },
  };

  connectionHandlers[0](socket);

  return { io, socket };
}

test.beforeEach(() => {
  connectedPlayers.clear();
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

test("joins a player and emits the expected events", () => {
  const { io, socket } = createHarness();

  socket.handlers.get("join-world")({ name: "  Shivam  " });

  assert.deepEqual(connectedPlayers.get("socket-1"), {
    id: "socket-1",
    name: "Shivam",
  });

  assert.deepEqual(socket.emitted[0], [
    "world-joined",
    { id: "socket-1", name: "Shivam" },
  ]);

  assert.deepEqual(socket.broadcast.emitted[0], [
    "player-joined",
    { id: "socket-1", name: "Shivam" },
  ]);

  assert.equal(io.emitted.length, 0);
});

test("rejects an invalid join without adding a player", () => {
  const { socket } = createHarness();

  socket.handlers.get("join-world")({ name: "   " });

  assert.equal(connectedPlayers.has("socket-1"), false);
  assert.deepEqual(socket.emitted[0], [
    "join-error",
    {
      code: "INVALID_NAME",
      message: "name must be between 1 and 20 characters.",
    },
  ]);
});

test("rejects a duplicate join", () => {
  const { socket } = createHarness();

  socket.handlers.get("join-world")({ name: "Shivam" });
  socket.emitted.length = 0;

  socket.handlers.get("join-world")({ name: "AnotherName" });

  assert.deepEqual(socket.emitted[0], [
    "join-error",
    {
      code: "ALREADY_JOINED",
      message: "This connection has already joined the world.",
    },
  ]);
  assert.deepEqual(connectedPlayers.get("socket-1"), {
    id: "socket-1",
    name: "Shivam",
  });
});

test("removes a joined player and broadcasts player-left on leave", () => {
  const { io, socket } = createHarness();

  socket.handlers.get("join-world")({ name: "Shivam" });
  io.emitted.length = 0;

  socket.handlers.get("leave-world")();

  assert.equal(connectedPlayers.has("socket-1"), false);
  assert.deepEqual(io.emitted[0], ["player-left", { id: "socket-1" }]);
});

test("removes a joined player and broadcasts player-left on disconnect", () => {
  const { io, socket } = createHarness();

  socket.handlers.get("join-world")({ name: "Shivam" });
  io.emitted.length = 0;

  socket.handlers.get("disconnect")("client namespace disconnect");

  assert.equal(connectedPlayers.has("socket-1"), false);
  assert.deepEqual(io.emitted[0], ["player-left", { id: "socket-1" }]);
});

test("does not broadcast player-left when disconnecting before joining", () => {
  const { io, socket } = createHarness();

  socket.handlers.get("disconnect")("transport close");

  assert.equal(connectedPlayers.has("socket-1"), false);
  assert.equal(io.emitted.length, 0);
});
