import test from "node:test";
import assert from "node:assert/strict";
import { connectedPlayers, registerSocketEvents, worlds } from "../src/socket/events.js";

function createHarness() {
  const connectionHandlers = [];
  const sockets = new Map();
  const io = {
    on(event, handler) {
      if (event === "connection") connectionHandlers.push(handler);
    },
    to(id) {
      return {
        emit(event, payload) {
          sockets.get(id)?.emit(event, payload);
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
      on(event, handler) { this.handlers.set(event, handler); },
      emit(...args) { this.emitted.push(args); },
      join(room) { this.rooms.add(room); },
      leave(room) { this.rooms.delete(room); },
      to(room) {
        return {
          emit(event, payload) {
            for (const other of sockets.values()) {
              if (other.id !== id && other.rooms.has(room)) other.emit(event, payload);
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

test("disconnect clears active proximity and notifies the remaining peer", () => {
  const { createSocket } = createHarness();
  const owner = createSocket("lifecycle-owner");
  const guest = createSocket("lifecycle-guest");

  owner.handlers.get("create-world")({ name: "Owner" });
  const world = worlds.get(connectedPlayers.get(owner.id).worldId);
  guest.handlers.get("join-world")({ name: "Guest", inviteCode: world.inviteCode });

  const departing = connectedPlayers.get(guest.id);
  const pair = [connectedPlayers.get(owner.id).playerId, departing.playerId].sort().join("|");
  assert.equal(world.proximityPairs.has(pair), true);

  owner.emitted.length = 0;
  guest.handlers.get("disconnect")("transport close");

  assert.equal(connectedPlayers.has(guest.id), false);
  assert.equal(world.players.has(guest.id), false);
  assert.equal(world.proximityPairs.has(pair), false);
  assert.deepEqual(owner.emitted.filter(([event]) => event === "proximity-left"), [
    ["proximity-left", { playerId: departing.playerId }],
  ]);
  assert.deepEqual(owner.emitted.filter(([event]) => event === "player-left"), [
    ["player-left", { playerId: departing.playerId }],
  ]);
  assert.equal(worlds.has(world.worldId), true);
});

test("leave followed by disconnect is idempotent and does not duplicate departure events", () => {
  const { createSocket } = createHarness();
  const owner = createSocket("idempotent-owner");
  const guest = createSocket("idempotent-guest");

  owner.handlers.get("create-world")({ name: "Owner" });
  const world = worlds.get(connectedPlayers.get(owner.id).worldId);
  guest.handlers.get("join-world")({ name: "Guest", inviteCode: world.inviteCode });
  const departingId = connectedPlayers.get(guest.id).playerId;

  owner.emitted.length = 0;
  guest.handlers.get("leave-world")();
  guest.handlers.get("disconnect")("client namespace disconnect");

  assert.equal(connectedPlayers.has(guest.id), false);
  assert.equal(world.players.has(guest.id), false);
  assert.equal(world.proximityPairs.size, 0);
  assert.equal(owner.emitted.filter(([event, payload]) =>
    event === "player-left" && payload.playerId === departingId).length, 1);
  assert.equal(owner.emitted.filter(([event, payload]) =>
    event === "proximity-left" && payload.playerId === departingId).length, 1);
});

test("world state is removed after the final member departs without affecting another world", () => {
  const { createSocket } = createHarness();
  const alpha = createSocket("world-alpha");
  const beta = createSocket("world-beta");

  alpha.handlers.get("create-world")({ name: "Alpha" });
  beta.handlers.get("create-world")({ name: "Beta" });
  const alphaWorldId = connectedPlayers.get(alpha.id).worldId;
  const betaWorldId = connectedPlayers.get(beta.id).worldId;

  assert.notEqual(alphaWorldId, betaWorldId);
  alpha.handlers.get("leave-world")();

  assert.equal(worlds.has(alphaWorldId), false);
  assert.equal(connectedPlayers.has(alpha.id), false);
  assert.equal(worlds.has(betaWorldId), true);
  assert.equal(worlds.get(betaWorldId).players.has(beta.id), true);

  beta.handlers.get("disconnect")("transport close");
  assert.equal(worlds.has(betaWorldId), false);
  assert.equal(worlds.size, 0);
});
