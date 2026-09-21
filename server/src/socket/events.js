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

import { validateJoinWorldPayload } from './validators.js';

// socket.id -> { id, name }
export const connectedPlayers = new Map();

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

  const player = { id: socket.id, name: result.name };
  connectedPlayers.set(socket.id, player);

  // Ack to the joining client.
  socket.emit('world-joined', player);
  // Tell everyone else a new player arrived.
  socket.broadcast.emit('player-joined', player);

  console.log(`[socket] ${player.name} (${player.id}) joined the world`);
}

function handlePlayerExit(io, socket, cause) {
  const player = connectedPlayers.get(socket.id);

  if (!player) {
    // Disconnected before ever joining — nothing to clean up or broadcast.
    console.log(`[socket] ${socket.id} disconnected before joining (${cause})`);
    return;
  }

  connectedPlayers.delete(socket.id);
  io.emit('player-left', { id: player.id });
  console.log(`[socket] ${player.name} (${player.id}) left the world (${cause})`);
}
