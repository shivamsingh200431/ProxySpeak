/**
 * Proximity filtering: distance calculation, the 90-unit threshold, and
 * proximity-entered / proximity-left event emission.
 * Owner: Sagar — Milestone 3 (Proximity System). See contracts.md §8/§10.
 *
 * Kept as its own module (rather than folded into events.js) so the pure
 * distance/threshold logic is independently unit-testable, and so this
 * stays easy to hand off to Milestone 4 (WebRTC) later — proximity-entered/
 * proximity-left are exactly the hooks a future audio layer would listen to
 * for connecting/tearing down peer audio.
 */

export const PROXIMITY_THRESHOLD = 90;

/**
 * Euclidean distance between two { x, y } points.
 */
export function calculateDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Whether two { x, y } points are within the given threshold (defaults to
 * the standard 90-unit proximity range).
 */
export function isWithinProximity(a, b, threshold = PROXIMITY_THRESHOLD) {
  return calculateDistance(a, b) <= threshold;
}

/**
 * Canonical, order-independent key for a pair of playerIds, used as the
 * Set key for tracking which pairs are currently "in proximity".
 */
function pairKey(playerIdA, playerIdB) {
  return [playerIdA, playerIdB].sort().join('|');
}

/**
 * Recomputes proximity state between `movedPlayer` and every other player
 * currently in the same world, emitting `proximity-entered` / `proximity-left`
 * directly to both sockets of any pair whose state changed.
 *
 * Only pairs involving `movedPlayer` are checked — correct and sufficient
 * because no other player's position changed in this tick. Call this both
 * on join (to establish initial state against whoever is already in the
 * world) and after every accepted movement update.
 *
 * `world` must have a `players` Map (socket.id -> player) and a
 * `proximityPairs` Set (created alongside the world, see events.js).
 * Each player must have `{ id, playerId, x, y }`, where `id` is the
 * underlying socket.id used for direct targeting via `io.to(id)`.
 *
 * @param {import('socket.io').Server} io
 * @param {{ players: Map, proximityPairs: Set<string> }} world
 * @param {{ id: string, playerId: string, x: number, y: number }} movedPlayer
 */
export function updateProximity(io, world, movedPlayer) {
  for (const other of world.players.values()) {
    if (other.playerId === movedPlayer.playerId) continue;

    const key = pairKey(movedPlayer.playerId, other.playerId);
    const wasNearby = world.proximityPairs.has(key);
    const isNearby = isWithinProximity(movedPlayer, other);

    if (isNearby && !wasNearby) {
      world.proximityPairs.add(key);
      io.to(movedPlayer.id).emit('proximity-entered', { playerId: other.playerId });
      io.to(other.id).emit('proximity-entered', { playerId: movedPlayer.playerId });
    } else if (!isNearby && wasNearby) {
      world.proximityPairs.delete(key);
      io.to(movedPlayer.id).emit('proximity-left', { playerId: other.playerId });
      io.to(other.id).emit('proximity-left', { playerId: movedPlayer.playerId });
    }
  }
}

/**
 * Clears every proximity pair involving `player` — call this when a player
 * leaves a world (explicit leave-world or disconnect), BEFORE removing them
 * from `world.players`. Notifies the remaining side of each pair with
 * `proximity-left` so it can tear down any nearby-state UI/audio, since
 * `player-left` alone doesn't tell the client their proximity state changed.
 *
 * @param {import('socket.io').Server} io
 * @param {{ players: Map, proximityPairs: Set<string> }} world
 * @param {{ playerId: string }} player
 */
export function clearPlayerProximity(io, world, player) {
  for (const key of [...world.proximityPairs]) {
    const [a, b] = key.split('|');
    if (a !== player.playerId && b !== player.playerId) continue;

    world.proximityPairs.delete(key);

    const otherPlayerId = a === player.playerId ? b : a;
    const other = [...world.players.values()].find((p) => p.playerId === otherPlayerId);

    if (other) {
      io.to(other.id).emit('proximity-left', { playerId: player.playerId });
    }
  }
}
