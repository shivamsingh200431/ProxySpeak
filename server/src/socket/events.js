/**
 * Real-time event handling: connection, join-world, leave-world, disconnect.
 * Owner: Sagar — Week 1 (see contracts.md §8).
 *
 * Scope note: this module only tracks *who is connected and has joined*.
 * It intentionally does NOT own positions, spawn data, or the authoritative
 * world-state model — that registry is Shivam's Milestone 2 deliverable
 * ("server-side player registry, user/session identity, spawn data").
 * This in-memory map exists so join/leave/disconnect can be demoed and
 * validated end-to-end this week; it should be merged into / replaced by
 * the real registry when Milestone 2 lands. Do not build parallel state on
 * top of this once that registry exists.
 */

import crypto from "node:crypto";
import { validateJoinWorldPayload } from "./validators.js";

const PLAYER_ID_LENGTH = 6;
const PLAYER_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// socket.id -> { id, playerId, name }
export const connectedPlayers = new Map();

function generatePlayerId() {
  let playerId;

  do {
    const bytes = crypto.randomBytes(PLAYER_ID_LENGTH);
    playerId = Array.from(bytes, (byte) =>
      PLAYER_ID_ALPHABET[byte % PLAYER_ID_ALPHABET.length]
    ).join("");
  } while ([...connectedPlayers.values()].some((player) => player.playerId === playerId));

  return playerId;
}

/**
 * Attaches connection/join-world/leave-world/disconnect handlers to the
 * given Socket.io server instance.
 *
 * Usage (in the file that creates `io`, owned by Shivam):
 *   import { registerSocketEvents } from './socket/events.js';
 *   registerSocketEvents(io);
 *
 * @param {import('socket.io').Server} io
 */
export function registerSocketEvents(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on('join-world', (payload) => {
      handleJoinWorld(io, socket, payload);
    });

    socket.on('leave-world', () => {
      handlePlayerExit(io, socket, 'leave-world');
    });

    socket.on('disconnect', (reason) => {
      handlePlayerExit(io, socket, `disconnect:${reason}`);
    });
  });
}

function handleJoinWorld(io, socket, payload) {
  if (connectedPlayers.has(socket.id)) {
    socket.emit('join-error', {
      code: 'ALREADY_JOINED',
      message: 'This connection has already joined the world.',
    });
    return;
  }

  const result = validateJoinWorldPayload(payload);

  if (!result.valid) {
    socket.emit('join-error', {
      code: result.code,
      message: result.message,
    });
    console.warn(`[socket] rejected join-world from ${socket.id}: ${result.message}`);
    return;
  }

  const player = { id: socket.id, playerId: generatePlayerId(), name: result.name };
  connectedPlayers.set(socket.id, player);

  // Ack to the joining client.
  socket.emit("world-joined", { playerId: player.playerId, name: player.name });
  // Tell everyone else a new player arrived.
  socket.broadcast.emit("player-joined", { playerId: player.playerId, name: player.name });

  console.log(`[socket] ${player.name} (${player.playerId}) joined the world [socket: ${player.id}]`);
}

function handlePlayerExit(io, socket, cause) {
  const player = connectedPlayers.get(socket.id);

  if (!player) {
    // Disconnected before ever joining — nothing to clean up or broadcast.
    console.log(`[socket] ${socket.id} disconnected before joining (${cause})`);
    return;
  }

  connectedPlayers.delete(socket.id);
  io.emit("player-left", { playerId: player.playerId });
  console.log(`[socket] ${player.name} (${player.playerId}) left the world (${cause})`);
}
