import type { BoardSnapshot } from './boardSnapshot';

/**
 * ballDrop — the pure "who has the ball" edit. A coach gives the ball by
 * dropping it on a player and releases it by dragging it off its Carrier. Given
 * a snapshot, where the ball was let go and the player under the pointer at that
 * moment, returns the next snapshot. No stores, and no catch radius: which
 * player is under the pointer is the scene's raycast's answer, not this
 * module's, so a drop that lands on no player is loose and nothing here guesses
 * who was meant. The same pure-vs-IO split as boardPlacement.
 */

/**
 * The board after the ball is dropped at `at`.
 *
 * - A player under the pointer becomes the Carrier. The ball is written at the
 *   release point and the held-ball follow carries it from there.
 * - No player under the pointer leaves the ball loose at the release point,
 *   releasing any Carrier.
 *
 * Returns the *same* snapshot by reference when a held ball is dropped back on
 * its own Carrier, or when the board has no ball, so `editBoard` records
 * nothing. Players, paths, annotations and cones are carried through by
 * reference.
 */
export function dropBall(
  snap: BoardSnapshot,
  at: [number, number, number],
  playerIdUnder: string | null,
): BoardSnapshot {
  const { ball } = snap;
  if (!ball) return snap;

  // An id the board does not hold is no player at all, so the ball never
  // belongs to someone who is not there.
  const carrier =
    playerIdUnder && snap.players.some((player) => player.id === playerIdUnder)
      ? playerIdUnder
      : undefined;

  if (carrier && carrier === ball.assignedPlayerId) return snap;

  // `assignedPlayerId: undefined` rather than a deleted key, the loose shape
  // `boardPlacement` writes and `boardChanged` reads as unassigned.
  return { ...snap, ball: { ...ball, position: at, assignedPlayerId: carrier } };
}
