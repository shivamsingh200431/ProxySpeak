import test from "node:test";
import assert from "node:assert/strict";
import { connectedPlayers, registerSocketEvents, worlds } from "../src/socket/events.js";

function createHarness() {
  const connectionHandlers = [];
  const sockets = new Map();
  const io = {
    emitted: [],
    toEmitted: [],
    on(event, handler) {
      if (event === "connection") connectionHandlers.push(handler);
    },
    emit(...args) {
      this.emitted.push(args);
      for (const socket of sockets.values()) socket.emit(...args);
    },
    to(id) {
      return {
        emit: (...args) => {
          this.toEmitted.push({ id, args });
          sockets.get(id)?.emit(...args);
        },
      };
    },
  };
  registerSocketEvents(io);

  function createSocket(id) {
    const socket = {
      id,
      handlers: new Map(),
      emitted: [],
      rooms: new Set(),
      roomEmitted: [],
      on(event, handler) { this.handlers.set(event, handler); },
      emit(...args) { this.emitted.push(args); },
      join(room) { this.rooms.add(room); },
      leave(room) { this.rooms.delete(room); },
      to(room) {
        return {
          emit: (...args) => {
            const record = { from: id, room, args };
            this.roomEmitted.push(record);
            for (const other of sockets.values()) {
              if (other.id !== id && other.rooms.has(room)) other.emit(...args);
            }
          },
        };
      },
    };
    sockets.set(id, socket);
    connectionHandlers[0](socket);
    return socket;
  }

  return { io, createSocket };
}

function createWorld(socket, name = "Shivam") {
  socket.handlers.get("create-world")({ name });
  const ack = socket.emitted.find(([event]) => event === "world-created");
  assert.ok(ack, "creator should receive world-created");
  return ack[1];
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

test("create-world joins its owner and returns the documented acknowledgements", () => {
  const { createSocket } = createHarness();
  const socket = createSocket("owner");
  socket.handlers.get("create-world")({ name: "  Shivam  " });

  const player = connectedPlayers.get(socket.id);
  const world = worlds.get(player.worldId);
  assert.ok(world);
  assert.equal(world.name, "Shivam's World");
  assert.equal(world.ownerSocketId, socket.id);
  assert.equal(world.players.get(socket.id), player);
  assert.match(world.worldId, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.match(world.inviteCode, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.match(player.playerId, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.deepEqual(socket.rooms, new Set([world.worldId]));
  assert.deepEqual(socket.emitted, [
    ["world-joined", {
      worldId: world.worldId, inviteCode: world.inviteCode, worldName: world.name,
      owner: true, playerId: player.playerId, name: "Shivam", x: 900, y: 700,
      players: [{ playerId: player.playerId, name: "Shivam", x: 900, y: 700 }],
    }],
    ["world-created", { worldId: world.worldId, inviteCode: world.inviteCode, name: world.name }],
  ]);
  assert.deepEqual(socket.roomEmitted[0], {
    from: socket.id, room: world.worldId,
    args: ["player-joined", { playerId: player.playerId, name: "Shivam", x: 900, y: 700 }],
  });
});

test("join-world uses the invite code, returns a player snapshot, and notifies only that world", () => {
  const { createSocket } = createHarness();
  const owner = createSocket("owner");
  const created = createWorld(owner);
  const otherOwner = createSocket("other-owner");
  const otherWorld = createWorld(otherOwner, "Other");
  const guest = createSocket("guest");
  owner.emitted.length = 0;
  otherOwner.emitted.length = 0;

  guest.handlers.get("join-world")({ name: " Priya ", inviteCode: created.inviteCode.toLowerCase() });
  const player = connectedPlayers.get(guest.id);
  const response = guest.emitted.find(([event]) => event === "world-joined")[1];
  assert.equal(player.worldId, created.worldId);
  assert.equal(response.worldId, created.worldId);
  assert.equal(response.inviteCode, created.inviteCode);
  assert.equal(response.worldName, "Shivam's World");
  assert.equal(response.owner, false);
  assert.equal(response.playerId, player.playerId);
  assert.equal(response.name, "Priya");
  assert.deepEqual(response.players, [
    { playerId: connectedPlayers.get(owner.id).playerId, name: "Shivam", x: 900, y: 700 },
    { playerId: player.playerId, name: "Priya", x: 900, y: 700 },
  ]);
  assert.deepEqual(guest.rooms, new Set([created.worldId]));
  assert.deepEqual(owner.emitted.filter(([event]) => event === "player-joined"), [
    ["player-joined", { playerId: player.playerId, name: "Priya", x: 900, y: 700 }],
  ]);
  assert.equal(otherOwner.emitted.length, 0);
  assert.equal(guest.emitted.filter(([event]) => event === "player-joined").length, 0);
  assert.deepEqual(guest.roomEmitted[0], {
    from: guest.id, room: created.worldId,
    args: ["player-joined", { playerId: player.playerId, name: "Priya", x: 900, y: 700 }],
  });
  assert.notEqual(created.worldId, otherWorld.worldId);
});

test("movement broadcasts to same-world peers only and clamps coordinates", () => {
  const { createSocket } = createHarness();
  const owner = createSocket("owner");
  const created = createWorld(owner);
  const peer = createSocket("peer");
  peer.handlers.get("join-world")({ name: "Priya", inviteCode: created.inviteCode });
  const other = createSocket("other");
  createWorld(other, "Other");
  const player = connectedPlayers.get(owner.id);
  owner.emitted.length = 0;
  peer.emitted.length = 0;
  other.emitted.length = 0;

  owner.handlers.get("player-moved")({ x: 1000, y: 720 });
  assert.deepEqual({ x: player.x, y: player.y }, { x: 1000, y: 720 });
  assert.deepEqual(peer.emitted.find(([event]) => event === "player-moved"), [
    "player-moved", { playerId: player.playerId, x: 1000, y: 720 },
  ]);
  assert.equal(owner.emitted.some(([event]) => event === "player-moved"), false);
  assert.equal(other.emitted.length, 0);

  peer.emitted.length = 0;
  owner.handlers.get("player-moved")({ x: -500, y: 5000 });
  assert.deepEqual({ x: player.x, y: player.y }, { x: 60, y: 1040 });
  assert.deepEqual(peer.emitted.find(([event]) => event === "player-moved"), [
    "player-moved", { playerId: player.playerId, x: 60, y: 1040 },
  ]);

  peer.emitted.length = 0;
  owner.handlers.get("player-moved")({ x: 1800, y: 1100 });
  assert.deepEqual({ x: player.x, y: player.y }, { x: 1740, y: 1040 });
  assert.deepEqual(peer.emitted.find(([event]) => event === "player-moved"), [
    "player-moved", { playerId: player.playerId, x: 1740, y: 1040 },
  ]);
});

test("invalid movement does not change state or broadcast", () => {
  const { createSocket } = createHarness();
  const owner = createSocket("owner");
  createWorld(owner);
  const player = connectedPlayers.get(owner.id);
  owner.roomEmitted.length = 0;
  owner.handlers.get("player-moved")({ x: "bad", y: 500 });
  assert.deepEqual({ x: player.x, y: player.y }, { x: 900, y: 700 });
  assert.deepEqual(owner.roomEmitted, []);
});

test("proximity entry, exit, and leave cleanup are sent to the affected peers", () => {
  const { createSocket } = createHarness();
  const owner = createSocket("owner");
  const created = createWorld(owner);
  const peer = createSocket("peer");

  peer.handlers.get("join-world")({ name: "Priya", inviteCode: created.inviteCode });
  const ownerPlayer = connectedPlayers.get(owner.id);
  const peerPlayer = connectedPlayers.get(peer.id);
  assert.deepEqual(owner.emitted.filter(([event]) => event === "proximity-entered"), [
    ["proximity-entered", { playerId: peerPlayer.playerId }],
  ]);
  assert.deepEqual(peer.emitted.filter(([event]) => event === "proximity-entered"), [
    ["proximity-entered", { playerId: ownerPlayer.playerId }],
  ]);

  owner.emitted.length = 0;
  peer.emitted.length = 0;
  owner.handlers.get("player-moved")({ x: 1100, y: 700 });
  assert.deepEqual(owner.emitted.filter(([event]) => event === "proximity-left"), [
    ["proximity-left", { playerId: peerPlayer.playerId }],
  ]);
  assert.deepEqual(peer.emitted.filter(([event]) => event === "proximity-left"), [
    ["proximity-left", { playerId: ownerPlayer.playerId }],
  ]);

  owner.handlers.get("player-moved")({ x: 900, y: 700 });
  owner.emitted.length = 0;
  peer.emitted.length = 0;
  peer.handlers.get("leave-world")();
  assert.deepEqual(owner.emitted.filter(([event]) => event === "proximity-left"), [
    ["proximity-left", { playerId: peerPlayer.playerId }],
  ]);
  assert.equal(worlds.get(created.worldId).proximityPairs.size, 0);
});

test("explicit leave and disconnect notify peers and delete empty worlds", () => {
  const { createSocket } = createHarness();
  const owner = createSocket("owner");
  const created = createWorld(owner);
  const peer = createSocket("peer");
  peer.handlers.get("join-world")({ name: "Priya", inviteCode: created.inviteCode });
  const peerPlayer = connectedPlayers.get(peer.id);
  const world = worlds.get(created.worldId);

  peer.handlers.get("leave-world")();
  assert.equal(connectedPlayers.has(peer.id), false);
  assert.equal(world.players.has(peer.id), false);
  assert.equal(peer.rooms.has(created.worldId), false);
  assert.deepEqual(owner.emitted.at(-1), ["player-left", { playerId: peerPlayer.playerId }]);
  assert.equal(worlds.has(created.worldId), true);

  const ownerPlayer = connectedPlayers.get(owner.id);
  owner.handlers.get("disconnect")("transport close");
  assert.equal(connectedPlayers.has(owner.id), false);
  assert.equal(worlds.has(created.worldId), false);
  assert.equal(owner.rooms.has(created.worldId), false);
  assert.deepEqual(owner.roomEmitted.at(-1).args, ["player-left", { playerId: ownerPlayer.playerId }]);
});

test("disconnecting a joined peer removes only that player and notifies the remaining member", () => {
  const { createSocket } = createHarness();
  const owner = createSocket("owner");
  const created = createWorld(owner);
  const peer = createSocket("peer");
  peer.handlers.get("join-world")({ name: "Priya", inviteCode: created.inviteCode });
  const player = connectedPlayers.get(peer.id);
  peer.handlers.get("disconnect")("transport close");
  assert.equal(connectedPlayers.has(peer.id), false);
  assert.equal(worlds.get(created.worldId).players.has(peer.id), false);
  assert.deepEqual(owner.emitted.at(-1), ["player-left", { playerId: player.playerId }]);
  assert.equal(worlds.has(created.worldId), true);
});

test("rejects invalid invite codes and payloads without changing world state", () => {
  const { createSocket } = createHarness();
  const owner = createSocket("owner");
  const created = createWorld(owner);
  const beforeWorld = worlds.get(created.worldId);
  const guest = createSocket("guest");

  guest.handlers.get("join-world")({ name: "Priya", inviteCode: "XXXXXX" });
  assert.deepEqual(guest.emitted.at(-1), ["join-error", {
    code: "WORLD_NOT_FOUND", message: "That world could not be found. Check the invite code.",
  }]);
  guest.handlers.get("join-world")({ name: "   ", inviteCode: created.inviteCode });
  assert.deepEqual(guest.emitted.at(-1), ["join-error", {
    code: "INVALID_NAME", message: "name must be between 1 and 20 characters.",
  }]);
  assert.equal(connectedPlayers.size, 1);
  assert.equal(worlds.size, 1);
  assert.equal(worlds.get(created.worldId), beforeWorld);
  assert.equal(beforeWorld.players.size, 1);
  assert.equal(guest.rooms.size, 0);
});

test("rejects duplicate join/create requests without replacing the current membership", () => {
  const { createSocket } = createHarness();
  const socket = createSocket("owner");
  const created = createWorld(socket);
  const player = connectedPlayers.get(socket.id);
  socket.emitted.length = 0;

  socket.handlers.get("join-world")({ name: "Other", inviteCode: created.inviteCode });
  assert.deepEqual(socket.emitted.at(-1), ["join-error", {
    code: "ALREADY_IN_WORLD", message: "You are already inside a world.",
  }]);
  socket.handlers.get("create-world")({ name: "Other" });
  assert.deepEqual(socket.emitted.at(-1), ["world-error", {
    code: "ALREADY_IN_WORLD", message: "Leave your current world before creating another one.",
  }]);
  assert.equal(connectedPlayers.get(socket.id), player);
  assert.equal(worlds.size, 1);
  assert.equal(worlds.get(created.worldId).players.size, 1);
});

test("invalid create and join payloads do not corrupt existing state", () => {
  const { createSocket } = createHarness();
  const owner = createSocket("owner");
  const created = createWorld(owner);
  const guest = createSocket("guest");
  const world = worlds.get(created.worldId);

  guest.handlers.get("create-world")({ name: "   " });
  assert.deepEqual(guest.emitted.at(-1), ["world-error", {
    code: "INVALID_NAME", message: "name must be between 1 and 20 characters.",
  }]);
  guest.handlers.get("join-world")({ name: 123, inviteCode: created.inviteCode });
  assert.deepEqual(guest.emitted.at(-1), ["join-error", {
    code: "INVALID_NAME", message: "name must be a string.",
  }]);
  assert.equal(connectedPlayers.size, 1);
  assert.equal(worlds.size, 1);
  assert.equal(worlds.get(created.worldId), world);
  assert.equal(world.players.size, 1);
  assert.equal(guest.rooms.size, 0);
});

test("disconnect before joining does not emit leave or alter world state", () => {
  const { io, createSocket } = createHarness();
  const socket = createSocket("unjoined");
  socket.handlers.get("disconnect")("transport close");
  assert.equal(connectedPlayers.size, 0);
  assert.equal(worlds.size, 0);
  assert.deepEqual(socket.emitted, []);
  assert.deepEqual(socket.roomEmitted, []);
  assert.deepEqual(io.emitted, []);
});

test("routes WebRTC offers, answers, and ICE candidates to the target socket", () => {
  const { io, createSocket } = createHarness();
  const first = createSocket("first");
  const second = createSocket("second");
  const created = createWorld(first, "Shivam");
  second.handlers.get("join-world")({ name: "Sagar", inviteCode: created.inviteCode });
  const firstPlayer = connectedPlayers.get(first.id);
  const secondPlayer = connectedPlayers.get(second.id);
  first.emitted.length = 0;
  second.emitted.length = 0;
  io.toEmitted.length = 0;

  const offer = { targetPlayerId: secondPlayer.playerId, fromPlayerId: firstPlayer.playerId,
    sdp: { type: "offer", sdp: "mock-offer" } };
  first.handlers.get("webrtc-offer")(offer);
  assert.deepEqual(second.emitted.at(-1), ["webrtc-offer", offer]);

  const answer = { targetPlayerId: firstPlayer.playerId, fromPlayerId: secondPlayer.playerId,
    sdp: { type: "answer", sdp: "mock-answer" } };
  second.handlers.get("webrtc-answer")(answer);
  assert.deepEqual(first.emitted.at(-1), ["webrtc-answer", answer]);

  const candidate = { targetPlayerId: secondPlayer.playerId, fromPlayerId: firstPlayer.playerId,
    candidate: { candidate: "candidate:mock", sdpMid: "0", sdpMLineIndex: 0 } };
  first.handlers.get("webrtc-ice-candidate")(candidate);
  assert.deepEqual(second.emitted.at(-1), ["webrtc-ice-candidate", candidate]);
  assert.deepEqual(io.toEmitted.map(({ id }) => id), [second.id, first.id, second.id]);
  assert.equal(first.emitted.some(([event]) => event === "webrtc-offer"), false);
});

test("rejects WebRTC signaling from unjoined, forged, self, and out-of-world senders/targets", () => {
  const { createSocket } = createHarness();
  const unjoined = createSocket("unjoined");
  unjoined.handlers.get("webrtc-offer")({ targetPlayerId: "BBBBBB", fromPlayerId: "AAAAAA" });
  assert.deepEqual(unjoined.emitted.at(-1), ["webrtc-signaling-error", {
    code: "NOT_IN_WORLD", message: "You must be inside a world to send WebRTC signaling messages.",
  }]);

  const first = createSocket("first");
  const firstWorld = createWorld(first, "First");
  const peer = createSocket("peer");
  peer.handlers.get("join-world")({ name: "Peer", inviteCode: firstWorld.inviteCode });
  const other = createSocket("other");
  createWorld(other, "Other");
  const firstPlayer = connectedPlayers.get(first.id);
  const peerPlayer = connectedPlayers.get(peer.id);
  const otherPlayer = connectedPlayers.get(other.id);

  first.handlers.get("webrtc-offer")({ targetPlayerId: firstPlayer.playerId,
    fromPlayerId: firstPlayer.playerId, sdp: { type: "offer", sdp: "mock" } });
  assert.deepEqual(first.emitted.at(-1), ["webrtc-signaling-error", {
    code: "INVALID_TARGET", message: "The WebRTC signaling target is invalid.",
    targetPlayerId: firstPlayer.playerId,
  }]);

  first.handlers.get("webrtc-offer")({ targetPlayerId: peerPlayer.playerId,
    fromPlayerId: "FORGED", sdp: { type: "offer", sdp: "mock" } });
  assert.deepEqual(first.emitted.at(-1), ["webrtc-signaling-error", {
    code: "INVALID_TARGET", message: "The WebRTC signaling target is invalid.",
    targetPlayerId: peerPlayer.playerId,
  }]);

  first.handlers.get("webrtc-offer")({ targetPlayerId: otherPlayer.playerId,
    fromPlayerId: firstPlayer.playerId, sdp: { type: "offer", sdp: "mock" } });
  assert.deepEqual(first.emitted.at(-1), ["webrtc-signaling-error", {
    code: "TARGET_NOT_FOUND", message: "The WebRTC signaling target is no longer available in this world.",
    targetPlayerId: otherPlayer.playerId,
  }]);

  first.handlers.get("webrtc-offer")({ targetPlayerId: "ZZZZZZ",
    fromPlayerId: firstPlayer.playerId, sdp: { type: "offer", sdp: "mock" } });
  assert.deepEqual(first.emitted.at(-1), ["webrtc-signaling-error", {
    code: "TARGET_NOT_FOUND", message: "The WebRTC signaling target is no longer available in this world.",
    targetPlayerId: "ZZZZZZ",
  }]);
});
