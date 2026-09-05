import type { Ball } from '../models/BallModel';
import { PLAYERS_PER_TEAM } from '../models/PlayerModel';
import type { BoardSnapshot } from './boardSnapshot';

/**
 * boardPlacement — the pure "who is on the board" edits. Given a snapshot,
 * returns a new snapshot with players added or taken away, and everything that
 * belonged to a removed player taken with them. No stores: each surface that
 * uses it is nothing more than `editBoard(label, () => restore(fn(capture())))`,
 * the same pure-vs-IO split as boardSnapshot / boardSnapshotIO and boardPlayback.
 */

/**
 * The ball with no owner. Writes `assignedPlayerId: undefined` rather than
 * deleting the key, which is the shape `ballStore.assignBallToPlayer(null)`
 * leaves and the one `boardChanged` already knows to read as unassigned.
 */
function withoutOwner(ball: Ball | null): Ball | null {
  if (!ball || ball.assignedPlayerId === undefined) return ball;
  return { ...ball, assignedPlayerId: undefined };
}

/**
 * The board with no players on it. Every MovementPath that belongs to a player
 * goes with them, and the ball is released so it never belongs to someone who is
 * not there. The ball itself, the ball's own path, every annotation and every
 * cone stay: none of them belongs to a player.
 */
export function withoutPlayers(snap: BoardSnapshot): BoardSnapshot {
  return {
    ...snap,
    players: [],
    paths: snap.paths.filter((path) => path.entityType !== 'player'),
    ball: withoutOwner(snap.ball),
  };
}

/**
 * Whether both teams hold exactly `PLAYERS_PER_TEAM`. The formation presets
 * position 18 a side by number, so they only apply to a board at full strength.
 * A side short of 18 has no one to stand in the missing spots. A side over 18
 * is carrying bench numbers that `isInterchangeBench` drops on the next read.
 *
 * Takes only the `players` slice so a surface that subscribes to the players
 * list can ask without capturing the whole board.
 */
export function atFullStrength(board: Pick<BoardSnapshot, 'players'>): boolean {
  let team1 = 0;
  let team2 = 0;
  for (const player of board.players) {
    if (player.teamId === 'team1') team1 += 1;
    else team2 += 1;
  }
  return team1 === PLAYERS_PER_TEAM && team2 === PLAYERS_PER_TEAM;
}
