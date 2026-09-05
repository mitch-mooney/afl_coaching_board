import type { Ball } from '../models/BallModel';
import { DEFAULT_TEAM_COLORS, PLAYERS_PER_TEAM, skinToneFor, type Player } from '../models/PlayerModel';
import { getTeamById } from '../data/aflTeams';
import type { BoardSnapshot } from './boardSnapshot';
import { snapToField, type Boundary, type FieldPoint } from './fieldGeometry';

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

/** What a placed player wears: the team's current jersey. */
export interface PlayerAppearance {
  color: string;
  teamPresetId: string | undefined;
}

/**
 * The jersey a team's players currently wear, from its preset or the team
 * default. The same pair `playerStore.setTeamPreset` writes onto every player of
 * the team, so a player placed after choosing a preset matches their teammates.
 */
export function teamAppearance(teamId: Player['teamId'], presetId: string | null): PlayerAppearance {
  const preset = presetId ? getTeamById(presetId) : undefined;
  return preset
    ? { color: preset.primaryColor, teamPresetId: preset.id }
    : { color: DEFAULT_TEAM_COLORS[teamId], teamPresetId: undefined };
}

/**
 * The lowest number from 1 upward that no player of this team holds, or null
 * when the team already holds `PLAYERS_PER_TEAM`. The ceiling is the whole
 * defence against `isInterchangeBench`, which drops 19 to 22 on every read.
 */
function lowestFreeNumber(players: Player[], teamId: Player['teamId']): number | null {
  const taken = new Set(
    players.filter((player) => player.teamId === teamId).map((player) => player.number),
  );
  for (let number = 1; number <= PLAYERS_PER_TEAM; number += 1) {
    if (!taken.has(number)) return number;
  }
  return null;
}

/**
 * The rotation that looks from one ground point toward another, under the
 * convention `dragMath.facingRotation` uses: rotation 0 faces +z, so the angle
 * is atan2(dx, dz). Standing on the target gives 0, which is as good as any.
 */
function facing(from: FieldPoint, to: FieldPoint): number {
  return Math.atan2(to[0] - from[0], to[1] - from[1]);
}

/**
 * The board with one more player of `teamId` standing where the coach tapped.
 *
 * The point is snapped to the boundary first, so Placement honours the Out of
 * bounds invariant that the board places nothing outside the Boundary. This is
 * a deliberate contrast with `addCone`, whose lack of clamping is the known
 * exception in issue #34. The player faces the ball when the board has one and
 * the ground centre when it does not, so switching to their POV looks at the
 * contest. Number, id and skin tone come from the seeding rules, so a placed #4
 * is indistinguishable from a seeded #4. No name and no position code.
 *
 * Returns the *same* snapshot by reference when the team already holds 18.
 * `editBoard` asks `boardChanged` before recording, so a refused placement
 * costs nothing on the undo stack and needs no guard at the call site.
 */
export function placePlayer(
  snap: BoardSnapshot,
  teamId: Player['teamId'],
  point: FieldPoint,
  appearance: PlayerAppearance,
  boundary: Boundary,
): BoardSnapshot {
  const number = lowestFreeNumber(snap.players, teamId);
  if (number === null) return snap;

  const [x, z] = snapToField(point[0], point[1], boundary);
  const lookAt: FieldPoint = snap.ball ? [snap.ball.position[0], snap.ball.position[2]] : [0, 0];

  const player: Player = {
    id: `${teamId}-player-${number}`,
    teamId,
    position: [x, 0, z],
    rotation: facing([x, z], lookAt),
    color: appearance.color,
    number,
    skinTone: skinToneFor(number),
    teamPresetId: appearance.teamPresetId,
  };

  return { ...snap, players: [...snap.players, player] };
}
