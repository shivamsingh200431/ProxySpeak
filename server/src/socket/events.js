import crypto from "node:crypto";
import { validateJoinWorldPayload } from "./validators.js";
import { updateProximity, clearPlayerProximity } from "./proximity.js";

const PLAYER_ID_LENGTH = 6;
const WORLD_CODE_LENGTH = 6;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SPAWN_POSITION = { x: 900, y: 700 };
const WORLD_WIDTH = 1800;
const WORLD_HEIGHT = 1100;
const BOUNDARY_PADDING = 60;

export const connectedPlayers = new Map();
export const worlds = new Map();

function randomCode(length) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (byte) => ALPHABET[byte% ALPHABET.length]).join("");
}

function uniqueCode(collection, key, length) {
  let code;
  do code = randomCode(length);
  while ([...collection.values()].some((item) => item[key] === code));
  return code;
}

function createWorld(name) {
  const worldId = uniqueCode(worlds, "worldId", WORLD_CODE_LENGTH);
  const inviteCode = uniqueCode(worlds, "inviteCode", WORLD_CODE_LENGTH);
  // proximityPairs: Set of canonical "playerIdA|playerIdB" keys currently
  // within the 90-unit threshold — owned by proximity.js, read/written only
  // through updateProximity()/clearPlayerProximity(). See proximity.js.
  const world = { worldId, inviteCode, name, ownerSocketId: null, players: new Map(), proximityPairs: new Set() };
  worlds.set(worldId, world);
  return world;
}

function publicPlayer(player) {
  return { playerId: player.playerId, name: player.name, x: player.x, y: player.y };
}

function worldSnapshot(world) {
  return [...world.players.values()].map(publicPlayer);
}

function findWorldByInviteCode(inviteCode) {
  return [...worlds.values()].find((world) => world.inviteCode === inviteCode);
}

function removePlayerFromWorld(io, socket, cause) {
  const player = connectedPlayers.get(socket.id);
  if (!player) return;
  const world = worlds.get(player.worldId);
  connectedPlayers.delete(socket.id);

  if (world) {
    // Clear proximity state and notify anyone who was near this player
    // BEFORE removing them from world.players, so clearPlayerProximity can
    // still look up the other side of each pair.
    clearPlayerProximity(io, world, player);

    world.players.delete(socket.id);
    socket.leave(world.worldId);
    socket.to(world.worldId).emit("player-left", {playerId: player.playerId });
    if (world.players.size === 0) worlds.delete(world.worldId);
  }
  console.log(`[socket] ${player.name} (${player.playerId}) left ${player.worldId} (${cause})`);
}

function joinWorld(io, socket, name, world) {
  const player = {
    id: socket.id,
    playerId: uniqueCode(connectedPlayers, "playerId", PLAYER_ID_LENGTH),
    name,
    worldId: world.worldId,
    x: SPAWN_POSITION.x,
    y: SPAWN_POSITION.y,
  };

  connectedPlayers.set(socket.id, player);
  world.players.set(socket.id, player);
  socket.join(world.worldId);

  socket.emit("world-joined", {
    worldId: world.worldId,
    inviteCode: world.inviteCode,
    worldName: world.name,
    owner: world.ownerSocketId === socket.id,
    playerId: player.playerId,
    name: player.name,
    x: player.x,
    y: player.y,
    players: worldSnapshot(world),
  });

  socket.to(world.worldId).emit("player-joined", publicPlayer(player));

  // Establish initial proximity state against whoever is already in the
  // world — without this, a player spawning on top of someone else would
  // show no proximity-entered event until the next move.
  updateProximity(io, world, player);
}

function handleCreateWorld(io, socket, payload) {
  if (connectedPlayers.has(socket.id)) {
    socket.emit("world-error", { code: "ALREADY_IN_WORLD", message: "Leave your current world before creating another one." });
    return;
  }
  const result = validateJoinWorldPayload(payload);
  if (!result.valid) {
    socket.emit("world-error", { code: result.code, message: result.message });
    return;
  }
  const world = createWorld(result.name + "'s World");
  world.ownerSocketId = socket.id;
  joinWorld(io, socket, result.name, world);
  socket.emit("world-created", { worldId: world.worldId, inviteCode: world.inviteCode, name: world.name });
}

function handleJoinWorld(io, socket, payload) {
  if (connectedPlayers.has(socket.id)) {
    socket.emit("join-error", { code: "ALREADY_IN_WORLD", message: "You are already inside a world." });
    return;
  }
  const result = validateJoinWorldPayload(payload);
  if (!result.valid) {
    socket.emit("join-error", { code: result.code,message: result.message });
    return;
  }
  const inviteCode = String(payload?.inviteCode ??"").trim().toUpperCase();
  if (!inviteCode) {
    socket.emit("join-error", { code: "INVITE_CODE_REQUIRED", message: "Enter a world invite code." });
    return;
  }
  const world = findWorldByInviteCode(inviteCode);
  if (!world) {
    socket.emit("join-error", { code: "WORLD_NOT_FOUND", message: "That world could not be found. Check the invite code." });
    return;
  }
  joinWorld(io, socket, result.name, world);
}

function routeWebRTCSignal(io, socket, event, payload) {
  const sender = connectedPlayers.get(socket.id);
  if (!sender) {
    socket.emit("webrtc-signaling-error", {
      code: "NOT_IN_WORLD",
      message: "You must be inside a world to send WebRTC signaling messages.",
    });
    return;
  }

  if (!payload || typeof payload !== "object") {
    socket.emit("webrtc-signaling-error", {
      code: "INVALID_TARGET",
      message: "A valid targetPlayerId is required.",
    });
    return;
  }

  const { targetPlayerId, fromPlayerId } = payload;

  if (
    typeof targetPlayerId !== "string" ||
    !targetPlayerId ||
    targetPlayerId === sender.playerId ||
    fromPlayerId !== sender.playerId
  ) {
    socket.emit("webrtc-signaling-error", {
      code: "INVALID_TARGET",
      message: "The WebRTC signaling target is invalid.",
      targetPlayerId,
    });
    return;
  }

  const world = worlds.get(sender.worldId);
  const target = world
    ? [...world.players.values()].find((player) => player.playerId === targetPlayerId)
    : null;

  if (!target) {
    socket.emit("webrtc-signaling-error", {
      code: "TARGET_NOT_FOUND",
      message: "The WebRTC signaling target is no longer available in this world.",
      targetPlayerId,
    });
    return;
  }

  io.to(target.id).emit(event, payload);
}

function handlePlayerMove(io, socket, payload) {
  const player = connectedPlayers.get(socket.id);
  if (!player) return;
  const x = Number(payload?.x);
  const y = Number(payload?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  player.x = Math.max(BOUNDARY_PADDING, Math.min(WORLD_WIDTH - BOUNDARY_PADDING, x));
  player.y = Math.max(BOUNDARY_PADDING, Math.min(WORLD_HEIGHT - BOUNDARY_PADDING, y));
  socket.to(player.worldId).emit("player-moved", {playerId: player.playerId, x: player.x, y: player.y });

  const world = worlds.get(player.worldId);
  if (world) updateProximity(io, world, player);
}

export function registerSocketEvents(io) {
  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);
    socket.on("create-world", (payload) => handleCreateWorld(io, socket, payload));
    socket.on("join-world", (payload) => handleJoinWorld(io, socket, payload));
    socket.on("player-moved", (payload) => handlePlayerMove(io, socket, payload));
    socket.on("webrtc-offer", (payload) => routeWebRTCSignal(io, socket, "webrtc-offer", payload));
    socket.on("webrtc-answer", (payload) => routeWebRTCSignal(io, socket, "webrtc-answer", payload));
    socket.on("webrtc-ice-candidate", (payload) => routeWebRTCSignal(io, socket, "webrtc-ice-candidate", payload));
    socket.on("leave-world", () => removePlayerFromWorld(io, socket, "leave-world"));
    socket.on("disconnect", (reason) => removePlayerFromWorld(io, socket, `disconnect:${reason}`));
  });
}
