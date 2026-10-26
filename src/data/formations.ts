/**
 * Pre-built AFL Formation Templates
 *
 * Coordinates are board coordinates, in metres from the centre of the ground:
 * `[x, z]`, where x runs goal to goal and z runs wing to wing. Team 1 defends the
 * goal at -x and attacks +x; Team 2 the reverse.
 *
 * Positions are absolute metres on Standard ground (165 × 135), like every other
 * position on the board (ADR 0002). Spots that depend on a goal line are written
 * as distances out from Standard ground's goal line, so the reasoning is
 * readable even though the result is fixed.
 *
 * Each team is numbered by jersey: player n stands in the position
 * NUMBER_TO_POSITION[n] names (1 = FB, 10 = RK, 12 = R, ...), so a Labels-on
 * board never puts the full back in the forward pocket.
 *
 * Only Centre Bounce, Kick-in Press and Kick-in Kick appear in the Setup sheet.
 * The rest are reachable only through getFormationById.
 */

import { Formation, PlayerPosition } from '../types/Formation';
import { FIELD_MARKINGS } from '../models/FieldModel';
import { STANDARD_BOUNDARY } from '../utils/fieldGeometry';
import { NUMBER_TO_POSITION } from './aflPositions';

type TeamId = 'team1' | 'team2';

/** A board point in metres: x goal to goal, z wing to wing. */
type Point = [x: number, z: number];

/** One player's spot, before a jersey number is given to it. */
interface Spot {
  role: string;
  at: Point;
}

/** The goal line Team 2 defends on Standard ground; Team 1's is its negative. */
const GOAL_LINE = STANDARD_BOUNDARY.semiX;

/**
 * Metres between direct opponents. Each stands half of it toward the goal they
 * defend, so a defender is always goal-side of the forward they mind, and two
 * opponents never share a spot.
 */
const OPPONENT_GAP = 3;

/** Jersey numbers 1-18 in order, as the positions they name. */
const JERSEY_ROLES = Array.from({ length: 18 }, (_, i) => NUMBER_TO_POSITION[i + 1]);

/** The heading that turns a player at `from` to look at `target`. */
function facing(from: Point, target: Point): number {
  return Math.atan2(target[0] - from[0], target[1] - from[1]);
}

function rotateHalfTurn([x, z]: Point): Point {
  return [-x, -z];
}

/** A point shifted along the goal axis toward the goal a team defends. */
function goalSide([x, z]: Point, teamId: TeamId, metres: number): Point {
  return [teamId === 'team1' ? x - metres : x + metres, z];
}

/**
 * Number a team's 18 spots by jersey: the first spot listed for a role goes to
 * the lower number. Throws if the spots are not exactly one team's 18 positions.
 */
function numberedTeam(teamId: TeamId, spots: Spot[], lookAt: Point): PlayerPosition[] {
  const remaining = [...spots];
  const team = JERSEY_ROLES.map((role, i) => {
    const k = remaining.findIndex((s) => s.role === role);
    if (k < 0) throw new Error(`${teamId} has no spot for #${i + 1} ${role}`);
    const [spot] = remaining.splice(k, 1);
    return {
      playerNumber: i + 1,
      teamId,
      position: [spot.at[0], 0, spot.at[1]] as [number, number, number],
      rotation: facing(spot.at, lookAt),
      role,
    };
  });
  if (remaining.length > 0) throw new Error(`${teamId} has ${remaining.length} spots no jersey takes`);
  return team;
}

/**
 * Both teams from one team's shape: Team 2 is Team 1 turned a half-turn about
 * the centre, so each Team 1 spot is shared with the Team 2 player of the
 * opposite position (FF with FB, HFF with HBF, wing with wing). The two are then
 * split OPPONENT_GAP apart, each toward the goal it defends.
 */
function matchedUp(team1Shape: Spot[], lookAt: Point): PlayerPosition[] {
  const half = OPPONENT_GAP / 2;
  return [
    ...numberedTeam(
      'team1',
      team1Shape.map((s) => ({ role: s.role, at: goalSide(s.at, 'team1', half) })),
      lookAt,
    ),
    ...numberedTeam(
      'team2',
      team1Shape.map((s) => ({ role: s.role, at: goalSide(rotateHalfTurn(s.at), 'team2', half) })),
      lookAt,
    ),
  ];
}

const CENTRE: Point = [0, 0];

/**
 * The six phase-of-play shapes predate the board's coordinates and are written
 * as { x: across, z: along }, Team 1's half only. Read them as board points.
 */
function legacyShape(rows: Array<{ x: number; z: number; role: string }>): Spot[] {
  return rows.map((r) => ({ role: r.role, at: [r.z, r.x] }));
}

// ── Phase-of-play shapes (not in the Setup sheet) ───────────────────────────

const STANDARD_SETUP: Formation = {
  id: 'standard-setup',
  name: 'Standard Setup',
  description: 'Traditional AFL positioning with players in their designated areas. Balanced formation suitable for most game situations.',
  category: 'pre-built',
  positions: matchedUp(
    legacyShape([
      { x: 0, z: -60, role: 'FB' },
      { x: -25, z: -55, role: 'BP' },
      { x: 25, z: -55, role: 'BP' },
      { x: 0, z: -40, role: 'CHB' },
      { x: -35, z: -40, role: 'HBF' },
      { x: 35, z: -40, role: 'HBF' },
      { x: -50, z: 0, role: 'W' },
      { x: 50, z: 0, role: 'W' },
      { x: 0, z: -5, role: 'C' },
      { x: 0, z: 5, role: 'RK' },
      { x: -15, z: 5, role: 'RR' },
      { x: 15, z: 5, role: 'R' },
      { x: 0, z: 40, role: 'CHF' },
      { x: -35, z: 40, role: 'HFF' },
      { x: 35, z: 40, role: 'HFF' },
      { x: 0, z: 60, role: 'FF' },
      { x: -25, z: 55, role: 'FP' },
      { x: 25, z: 55, role: 'FP' },
    ]),
    CENTRE,
  ),
};

const ZONE_DEFENSE: Formation = {
  id: 'zone-defense',
  name: 'Zone Defense',
  description: 'Players positioned in defensive zones rather than man-to-man. Compact structure to limit opposition scoring opportunities.',
  category: 'pre-built',
  positions: matchedUp(
    legacyShape([
      { x: 0, z: -55, role: 'FB' },
      { x: -20, z: -50, role: 'BP' },
      { x: 20, z: -50, role: 'BP' },
      { x: -40, z: -45, role: 'HBF' },
      { x: 40, z: -45, role: 'HBF' },
      { x: 0, z: -35, role: 'CHB' },
      { x: -30, z: -15, role: 'W' },
      { x: 30, z: -15, role: 'W' },
      { x: -15, z: -20, role: 'RR' },
      { x: 15, z: -20, role: 'R' },
      { x: 0, z: -5, role: 'C' },
      { x: 0, z: 10, role: 'RK' },
      { x: 0, z: 25, role: 'CHF' },
      { x: -30, z: 35, role: 'HFF' },
      { x: 30, z: 35, role: 'HFF' },
      { x: 0, z: 55, role: 'FF' },
      { x: -20, z: 50, role: 'FP' },
      { x: 20, z: 50, role: 'FP' },
    ]),
    CENTRE,
  ),
};

const PRESS: Formation = {
  id: 'press',
  name: 'Press',
  description: 'High forward pressure formation with midfielders pushing forward. Aggressive setup to force turnovers in opposition territory.',
  category: 'pre-built',
  positions: matchedUp(
    legacyShape([
      { x: 0, z: -58, role: 'FB' },
      { x: -22, z: -52, role: 'BP' },
      { x: 22, z: -52, role: 'BP' },
      { x: 0, z: -35, role: 'CHB' },
      { x: -35, z: -38, role: 'HBF' },
      { x: 35, z: -38, role: 'HBF' },
      { x: -45, z: 25, role: 'W' },
      { x: 45, z: 25, role: 'W' },
      { x: 0, z: 20, role: 'C' },
      { x: 0, z: 35, role: 'RK' },
      { x: -20, z: 25, role: 'RR' },
      { x: 20, z: 25, role: 'R' },
      { x: 0, z: 50, role: 'CHF' },
      { x: -30, z: 48, role: 'HFF' },
      { x: 30, z: 48, role: 'HFF' },
      { x: 0, z: 58, role: 'FF' },
      { x: -18, z: 58, role: 'FP' },
      { x: 18, z: 58, role: 'FP' },
    ]),
    CENTRE,
  ),
};

const SPREAD: Formation = {
  id: 'spread',
  name: 'Spread',
  description: 'Wide distribution formation to create space and open up the ground. Players positioned near the boundary to stretch the defence.',
  category: 'pre-built',
  positions: matchedUp(
    legacyShape([
      { x: 0, z: -58, role: 'FB' },
      { x: -35, z: -55, role: 'BP' },
      { x: 35, z: -55, role: 'BP' },
      { x: 0, z: -38, role: 'CHB' },
      { x: -50, z: -35, role: 'HBF' },
      { x: 50, z: -35, role: 'HBF' },
      { x: -60, z: 0, role: 'W' },
      { x: 60, z: 0, role: 'W' },
      { x: -25, z: 0, role: 'C' },
      { x: 25, z: 0, role: 'RK' },
      { x: -40, z: 15, role: 'RR' },
      { x: 40, z: 15, role: 'R' },
      { x: 0, z: 38, role: 'CHF' },
      { x: -50, z: 35, role: 'HFF' },
      { x: 50, z: 35, role: 'HFF' },
      { x: 0, z: 58, role: 'FF' },
      { x: -35, z: 55, role: 'FP' },
      { x: 35, z: 55, role: 'FP' },
    ]),
    CENTRE,
  ),
};

const FLOOD: Formation = {
  id: 'flood',
  name: 'Flood',
  description: 'Extra defenders behind the ball creating a defensive wall. Ideal for protecting a lead or limiting opposition scoring.',
  category: 'pre-built',
  positions: matchedUp(
    legacyShape([
      { x: 0, z: -58, role: 'FB' },
      { x: -25, z: -55, role: 'BP' },
      { x: 25, z: -55, role: 'BP' },
      { x: 0, z: -42, role: 'CHB' },
      { x: -40, z: -45, role: 'HBF' },
      { x: 40, z: -45, role: 'HBF' },
      { x: -55, z: -20, role: 'W' },
      { x: 55, z: -20, role: 'W' },
      { x: -20, z: -25, role: 'C' },
      { x: 20, z: -25, role: 'RK' },
      { x: -30, z: -35, role: 'RR' },
      { x: 30, z: -35, role: 'R' },
      { x: 0, z: 10, role: 'CHF' },
      { x: -30, z: 20, role: 'HFF' },
      { x: 30, z: 20, role: 'HFF' },
      { x: 0, z: 48, role: 'FF' },
      { x: -20, z: 40, role: 'FP' },
      { x: 20, z: 40, role: 'FP' },
    ]),
    CENTRE,
  ),
};

const MAN_ON_MAN: Formation = {
  id: 'man-on-man',
  name: 'Man-on-Man',
  description: 'Tight defensive marking formation with each player assigned to mark an opponent. Used against teams with dangerous individual players.',
  category: 'pre-built',
  positions: matchedUp(
    legacyShape([
      { x: 0, z: -55, role: 'FB' },
      { x: -22, z: -50, role: 'BP' },
      { x: 22, z: -50, role: 'BP' },
      { x: 0, z: -38, role: 'CHB' },
      { x: -33, z: -38, role: 'HBF' },
      { x: 33, z: -38, role: 'HBF' },
      { x: -48, z: 0, role: 'W' },
      { x: 48, z: 0, role: 'W' },
      { x: 0, z: 0, role: 'C' },
      { x: 0, z: 8, role: 'RK' },
      { x: -18, z: 0, role: 'RR' },
      { x: 18, z: 0, role: 'R' },
      { x: 0, z: 38, role: 'CHF' },
      { x: -33, z: 38, role: 'HFF' },
      { x: 33, z: 38, role: 'HFF' },
      { x: 0, z: 55, role: 'FF' },
      { x: -22, z: 50, role: 'FP' },
      { x: 22, z: 50, role: 'FP' },
    ]),
    CENTRE,
  ),
};

// ── Centre Bounce ───────────────────────────────────────────────────────────

/**
 * The 6-6-6 starting position, Law 13.1 (Laws of Australian Football 2024),
 * which the 2026 rule changes keep at centre ball-ups:
 * - six of each team inside each 50 m arc;
 * - four of each team in the centre square, the Ruck inside the centre circle
 *   in its own defensive half and nobody else inside it (Law 13.2(b));
 * - one of each team in each wing area: the band between the centre square's two
 *   goal-facing sides, outside the square, out to the boundary (Diagram 2).
 * The 2026 changes drop the requirement for a player in each goal square.
 *
 * Every spot is a contest between two direct opponents, split OPPONENT_GAP
 * apart goal-side. Team 1's forward 50 is listed; its defensive 50 is the same
 * shape turned a half-turn, with the roles swapped.
 */
const CENTRE_BOUNCE_FORWARD_50: Array<{ at: Point; team1: string; team2: string }> = [
  { at: [GOAL_LINE - 12.5, 0], team1: 'FF', team2: 'FB' },
  { at: [GOAL_LINE - 18.5, -18], team1: 'FP', team2: 'BP' },
  { at: [GOAL_LINE - 18.5, 18], team1: 'FP', team2: 'BP' },
  { at: [GOAL_LINE - 40.5, 0], team1: 'CHF', team2: 'CHB' },
  { at: [GOAL_LINE - 32.5, -27], team1: 'HFF', team2: 'HBF' },
  { at: [GOAL_LINE - 32.5, 27], team1: 'HFF', team2: 'HBF' },
];

const CENTRE_BOUNCE_MIDFIELD: Array<{ at: Point; team1: string; team2: string }> = [
  // Rucks side by side across the centre line, each in its defensive half.
  { at: [0, 0], team1: 'RK', team2: 'RK' },
  // Midfielders paired around the circle, clear of it.
  { at: [0, -9], team1: 'RR', team2: 'RR' },
  { at: [0, 9], team1: 'R', team2: 'R' },
  { at: [-10, 0], team1: 'C', team2: 'C' },
  // Wings out on the wing, well clear of the centre square's side.
  { at: [0, -45], team1: 'W', team2: 'W' },
  { at: [0, 45], team1: 'W', team2: 'W' },
];

function centreBouncePositions(): PlayerPosition[] {
  const contests = [
    ...CENTRE_BOUNCE_FORWARD_50,
    ...CENTRE_BOUNCE_FORWARD_50.map((c) => ({ at: rotateHalfTurn(c.at), team1: c.team2, team2: c.team1 })),
    ...CENTRE_BOUNCE_MIDFIELD,
  ];
  const half = OPPONENT_GAP / 2;
  return [
    ...numberedTeam('team1', contests.map((c) => ({ role: c.team1, at: goalSide(c.at, 'team1', half) })), CENTRE),
    ...numberedTeam('team2', contests.map((c) => ({ role: c.team2, at: goalSide(c.at, 'team2', half) })), CENTRE),
  ];
}

const CENTRE_BOUNCE: Formation = {
  id: 'centre-bounce',
  name: 'Centre Bounce',
  description: 'The 6-6-6 start: six of each team inside each 50 m arc, four in the centre square with the rucks in the circle, one on each wing. Each player stands beside their direct opponent.',
  category: 'pre-built',
  positions: centreBouncePositions(),
};

// ── Kick-in ─────────────────────────────────────────────────────────────────

/**
 * One kick-in, after a behind at the goal Team 2 defends: Team 2 kicks in,
 * Team 1 presses. Kick-in Press is this scene; Kick-in Kick is the same scene
 * turned a half-turn with the teams swapped, so Team 1 kicks in from its own
 * goal square.
 *
 * Laws of Australian Football 2024, Law 17:
 * - the kicker kicks from within the goal square, or plays on out of it (17.1(a));
 * - The Mark is set 15 m from the centre of the kick-off line, toward the centre
 *   of the ground (17.1(d)); the man on the mark stands there;
 * - every other player vacates the Protected Area (17.3, Diagram 3), so the
 *   receivers and the press all start beyond it.
 *
 * The press is the AFL Youth Coaching Manual's "basic 3-4-5 zone" (12 players)
 * moved out past the modern protected area, with the back six goal-side of the
 * kicking team's forwards. The kicking team gives two short options in the
 * pockets (the most common kick-in, per Champion Data), leads at 40 m, a
 * midfield stack, and the ruck as the long target at the corner of the centre
 * square.
 */
const KICK_OFF_LINE = GOAL_LINE - FIELD_MARKINGS.goalSquareDepth;
const KICK_IN_MARK_FROM_KICK_OFF_LINE = 15;
const KICKER: Point = [GOAL_LINE - FIELD_MARKINGS.goalSquareDepth / 2, 0];

/** A point `metres` out from Team 2's goal line, `across` from the centre line. */
function outFromGoal(metres: number, across: number): Point {
  return [GOAL_LINE - metres, across];
}

const KICK_IN_PRESSING_TEAM: Spot[] = [
  // Line 1 (3): the man on the mark, and a pocket each side of him.
  { role: 'FF', at: [KICK_OFF_LINE - KICK_IN_MARK_FROM_KICK_OFF_LINE, 0] },
  { role: 'FP', at: outFromGoal(28, -16) },
  { role: 'FP', at: outFromGoal(28, 16) },
  // Line 2 (4), about 38 m out.
  { role: 'HFF', at: outFromGoal(38, -32) },
  { role: 'RR', at: outFromGoal(38, -12) },
  { role: 'R', at: outFromGoal(38, 12) },
  { role: 'HFF', at: outFromGoal(38, 32) },
  // Line 3 (5), about 55 m out, wings wide.
  { role: 'W', at: outFromGoal(55, -48) },
  { role: 'RK', at: outFromGoal(55, -18) },
  { role: 'C', at: outFromGoal(55, 0) },
  { role: 'CHF', at: outFromGoal(55, 18) },
  { role: 'W', at: outFromGoal(55, 48) },
  // Back six: goal-side of the kicking team's forwards (below).
  { role: 'CHB', at: [-33, 0] },
  { role: 'HBF', at: [-38, -30] },
  { role: 'HBF', at: [-38, 30] },
  { role: 'FB', at: [-61, 0] },
  { role: 'BP', at: [-65, -20] },
  { role: 'BP', at: [-65, 20] },
];

const KICK_IN_KICKING_TEAM: Spot[] = [
  // The kicker, in the goal square.
  { role: 'FB', at: KICKER },
  // Short options in each pocket, just outside the protected area.
  { role: 'BP', at: outFromGoal(22, -26) },
  { role: 'BP', at: outFromGoal(22, 26) },
  // Leads at about 40 m.
  { role: 'CHB', at: outFromGoal(40, 0) },
  { role: 'HBF', at: outFromGoal(42, -22) },
  { role: 'HBF', at: outFromGoal(42, 22) },
  // Midfield stack, the ruck as the long target, wings wide.
  { role: 'C', at: outFromGoal(62, 0) },
  { role: 'RR', at: outFromGoal(60, -10) },
  { role: 'R', at: outFromGoal(60, 10) },
  { role: 'RK', at: [22, -22] },
  { role: 'W', at: [12, -50] },
  { role: 'W', at: [12, 50] },
  // Forwards held deep in the front half for a quick contest.
  { role: 'CHF', at: [-30, 0] },
  { role: 'HFF', at: [-35, -30] },
  { role: 'HFF', at: [-35, 30] },
  { role: 'FF', at: [-58, 0] },
  { role: 'FP', at: [-62, -20] },
  { role: 'FP', at: [-62, 20] },
];

function turned(spots: Spot[]): Spot[] {
  return spots.map((s) => ({ role: s.role, at: rotateHalfTurn(s.at) }));
}

const KICK_IN_PRESSING: Formation = {
  id: 'kick-in-pressing',
  name: 'Kick-in (Pressing)',
  description: "Team 1 presses Team 2's kick-in: a man on the mark 15 m out from the goal square, a 3-4-5 zone beyond the protected area, and six back minding Team 2's forwards.",
  category: 'pre-built',
  positions: [
    ...numberedTeam('team1', KICK_IN_PRESSING_TEAM, KICKER),
    ...numberedTeam('team2', KICK_IN_KICKING_TEAM, KICKER),
  ],
};

const KICK_IN_KICKING: Formation = {
  id: 'kick-in-kicking',
  name: 'Kick-in (Kicking)',
  description: "Team 1 kicks in from its goal square against Team 2's press: short options in both pockets, leads at 40 m, a midfield stack, and the ruck as the long target.",
  category: 'pre-built',
  positions: [
    ...numberedTeam('team1', turned(KICK_IN_KICKING_TEAM), rotateHalfTurn(KICKER)),
    ...numberedTeam('team2', turned(KICK_IN_PRESSING_TEAM), rotateHalfTurn(KICKER)),
  ],
};

/**
 * Collection of all pre-built formations
 */
export const PRE_BUILT_FORMATIONS: Formation[] = [
  STANDARD_SETUP,
  ZONE_DEFENSE,
  PRESS,
  SPREAD,
  FLOOD,
  MAN_ON_MAN,
  CENTRE_BOUNCE,
  KICK_IN_PRESSING,
  KICK_IN_KICKING,
];

/**
 * Get a formation by its ID
 */
export function getFormationById(id: string): Formation | undefined {
  return PRE_BUILT_FORMATIONS.find(f => f.id === id);
}

/**
 * Validate that a formation has the required 36 positions — 18 per team, all of
 * them on the ground.
 *
 * There is no interchange bench. Formations used to seed four per team beyond
 * the boundary, which made every play report eight players out of bounds
 * forever; issue #29 deleted the bench rather than exempting it, so that out of
 * bounds could stay pure geometry. A formation carrying 22 a side is one that
 * has grown the bench back, and this returns false for it.
 */
export function validateFormation(formation: Formation): boolean {
  if (formation.positions.length !== 36) {
    return false;
  }

  const team1Count = formation.positions.filter(p => p.teamId === 'team1').length;
  const team2Count = formation.positions.filter(p => p.teamId === 'team2').length;

  return team1Count === 18 && team2Count === 18;
}

/**
 * Get all positions for a specific team from a formation
 */
export function getTeamPositions(
  formation: Formation,
  teamId: 'team1' | 'team2'
): PlayerPosition[] {
  return formation.positions.filter(p => p.teamId === teamId);
}
