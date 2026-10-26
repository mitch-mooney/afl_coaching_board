import { describe, it, expect } from 'vitest';
import {
  getFormationById,
  PRE_BUILT_FORMATIONS,
  validateFormation,
} from '../formations';
import type { Formation, PlayerPosition } from '../../types/Formation';
import { STANDARD_BOUNDARY, isPointInField } from '../../utils/fieldGeometry';
import { FIELD_MARKINGS } from '../../models/FieldModel';
import { NUMBER_TO_POSITION } from '../aflPositions';

// Board coordinates: position[0] runs goal to goal, position[2] runs wing to
// wing. Team 1 defends the goal at -x, Team 2 the goal at +x. Every distance
// below is measured from a painted marking (FIELD_MARKINGS) or quoted from the
// Laws of Australian Football 2024, not from the formation data.
type TeamId = 'team1' | 'team2';
const TEAMS: TeamId[] = ['team1', 'team2'];

/** The goal line on Standard ground. */
const GOAL_LINE = STANDARD_BOUNDARY.semiX;
const HALF_SQUARE = FIELD_MARKINGS.centerSquareSize / 2;

/** The goal line a team defends, as an x coordinate. */
function defendedGoal(team: TeamId): number {
  return team === 'team1' ? -GOAL_LINE : GOAL_LINE;
}

function formation(id: string): Formation {
  const f = getFormationById(id);
  if (!f) throw new Error(`Formation ${id} not found`);
  return f;
}

function teamOf(f: Formation, team: TeamId): PlayerPosition[] {
  return f.positions.filter((p) => p.teamId === team);
}

function distance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function at(p: PlayerPosition): [number, number] {
  return [p.position[0], p.position[2]];
}

/** Metres from the centre of the goal line at x = goalX. */
function fromGoal(p: PlayerPosition, goalX: number): number {
  return distance(at(p), [goalX, 0]);
}

/** Facing as the board reads it: rotation θ looks along (sin θ, cos θ). */
function faces(p: PlayerPosition, target: [number, number]): boolean {
  const [x, z] = at(p);
  const want = Math.atan2(target[0] - x, target[1] - z);
  const diff = Math.atan2(Math.sin(want - (p.rotation ?? 0)), Math.cos(want - (p.rotation ?? 0)));
  return Math.abs(diff) < 1e-6;
}

/**
 * 18 a side, and every seeded player on the ground.
 *
 * The board used to seed 22 per team, four of whom sat at formation x = 73 as an
 * interchange bench — outside every realistic Boundary, which made the
 * out-of-bounds readout report 8 on every play forever. Issue #29 deleted the
 * bench rather than exempting it, so that out of bounds stays pure geometry and
 * becomes *true*. These tests are what stops it growing back.
 */
describe('every pre-built formation is 18 a side, entirely inside the Boundary', () => {
  it.each(PRE_BUILT_FORMATIONS.map((f) => [f.id, f] as const))(
    '%s holds 18 per team and validates',
    (_id, formation) => {
      expect(formation.positions.filter((p) => p.teamId === 'team1')).toHaveLength(18);
      expect(formation.positions.filter((p) => p.teamId === 'team2')).toHaveLength(18);
      expect(validateFormation(formation)).toBe(true);
    },
  );

  it.each(PRE_BUILT_FORMATIONS.map((f) => [f.id, f] as const))(
    '%s seeds nobody outside Standard ground',
    (_id, formation) => {
      const outside = formation.positions.filter(
        (p) => !isPointInField(p.position[0], p.position[2], STANDARD_BOUNDARY),
      );
      expect(outside).toEqual([]);
    },
  );

  it.each(PRE_BUILT_FORMATIONS.map((f) => [f.id, f] as const))(
    '%s numbers each team 1..18 with no interchange role left behind',
    (_id, formation) => {
      expect(formation.positions.filter((p) => p.role === 'INT')).toEqual([]);
      for (const teamId of ['team1', 'team2'] as const) {
        const numbers = formation.positions
          .filter((p) => p.teamId === teamId)
          .map((p) => p.playerNumber)
          .sort((a, b) => a - b);
        expect(numbers).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
      }
    },
  );
});

describe('validateFormation', () => {
  it('rejects a formation still carrying a 22-man team', () => {
    const centreBounce = getFormationById('centre-bounce')!;
    const withBench = {
      ...centreBounce,
      positions: [
        ...centreBounce.positions,
        ...Array.from({ length: 4 }, (_, i) => ({
          playerNumber: 19 + i,
          teamId: 'team1' as const,
          position: [-25 + i * 6, 0, 73] as [number, number, number],
          rotation: 0,
          role: 'INT',
        })),
      ],
    };
    expect(validateFormation(withBench)).toBe(false);
  });
});


describe('every pre-built formation is playable as laid out', () => {
  it.each(PRE_BUILT_FORMATIONS.map((f) => [f.id, f] as const))(
    '%s stands nobody within 2 m of anyone else',
    (_id, f) => {
      const crowded: string[] = [];
      f.positions.forEach((a, i) =>
        f.positions.slice(i + 1).forEach((b) => {
          if (distance(at(a), at(b)) < 2) {
            crowded.push(`${a.teamId} #${a.playerNumber} ${a.role} / ${b.teamId} #${b.playerNumber} ${b.role}`);
          }
        }),
      );
      expect(crowded).toEqual([]);
    },
  );

  it.each(PRE_BUILT_FORMATIONS.map((f) => [f.id, f] as const))(
    '%s puts each jersey number in the position that number names',
    (_id, f) => {
      for (const p of f.positions) {
        expect(`#${p.playerNumber} ${p.role}`).toBe(`#${p.playerNumber} ${NUMBER_TO_POSITION[p.playerNumber]}`);
      }
    },
  );
});

/**
 * Centre Bounce is the 6-6-6 starting position, Law 13.1 of the Laws of
 * Australian Football 2024: six of each team in each area between the boundary
 * and a 50 m arc, four in the centre square, one in each shaded wing area of
 * Diagram 2 (the band between the centre square's two goal-facing sides, out to
 * the boundary), and the Ruck in the centre circle in its defensive half. The
 * 2026 rule changes keep 6-6-6 at centre ball-ups and drop the requirement for a
 * player in each goal square, so none is asserted.
 */
describe('Centre Bounce', () => {
  const f = formation('centre-bounce');
  /** Clear of a line by at least this much, so a count never hangs on a hair. */
  const OFF_THE_LINE = 1;

  it.each(TEAMS)('%s has six inside each 50 m arc', (team) => {
    for (const goalX of [-GOAL_LINE, GOAL_LINE]) {
      const inside = teamOf(f, team).filter(
        (p) => fromGoal(p, goalX) < FIELD_MARKINGS.fiftyMetreArcRadius - OFF_THE_LINE,
      );
      expect(inside).toHaveLength(6);
    }
  });

  it('stands nobody on a 50 m arc', () => {
    const onLine = f.positions.filter((p) =>
      [-GOAL_LINE, GOAL_LINE].some(
        (goalX) => Math.abs(fromGoal(p, goalX) - FIELD_MARKINGS.fiftyMetreArcRadius) < OFF_THE_LINE,
      ),
    );
    expect(onLine).toEqual([]);
  });

  it.each(TEAMS)('%s has four in the centre square, clear of its lines', (team) => {
    const players = teamOf(f, team);
    const inside = players.filter(
      (p) => Math.abs(p.position[0]) < HALF_SQUARE - OFF_THE_LINE && Math.abs(p.position[2]) < HALF_SQUARE - OFF_THE_LINE,
    );
    expect(inside.map((p) => p.role).sort()).toEqual(['C', 'R', 'RK', 'RR']);
  });

  it.each(TEAMS)('%s has one wing out on each wing, clear of the centre square', (team) => {
    const wingArea = (side: 1 | -1) =>
      teamOf(f, team).filter(
        (p) =>
          Math.abs(p.position[0]) < HALF_SQUARE - OFF_THE_LINE &&
          side * p.position[2] > HALF_SQUARE + OFF_THE_LINE,
      );
    expect(wingArea(-1).map((p) => p.role)).toEqual(['W']);
    expect(wingArea(1).map((p) => p.role)).toEqual(['W']);
  });

  it('has only the two Rucks inside the centre circle, each in its defensive half', () => {
    const inCircle = f.positions.filter(
      (p) => Math.hypot(p.position[0], p.position[2]) < FIELD_MARKINGS.centerCircleOuterRadius,
    );
    expect(inCircle.map((p) => `${p.teamId} ${p.role}`).sort()).toEqual(['team1 RK', 'team2 RK']);
    for (const ruck of inCircle) {
      expect(Math.sign(ruck.position[0])).toBe(Math.sign(defendedGoal(ruck.teamId as TeamId)));
    }
  });

  it('stands every player beside an opponent rather than on top of one', () => {
    for (const p of f.positions) {
      const nearest = Math.min(
        ...f.positions.filter((o) => o.teamId !== p.teamId).map((o) => distance(at(p), at(o))),
      );
      expect(nearest, `${p.teamId} ${p.role}`).toBeGreaterThanOrEqual(2);
      expect(nearest, `${p.teamId} ${p.role}`).toBeLessThanOrEqual(4);
    }
  });

  // The coach's shape, from the #118 review: midfielders start on the circle,
  // and each forward line is an umbrella — one in the goal square, one about
  // 30 m out on the centre line, and four spread around the inside of the arc.

  it.each(TEAMS)('%s starts its three midfielders on the centre circle', (team) => {
    const mids = teamOf(f, team).filter((p) => ['C', 'RR', 'R'].includes(p.role!));
    expect(mids).toHaveLength(3);
    for (const p of mids) {
      const fromCentre = Math.hypot(p.position[0], p.position[2]);
      expect(fromCentre, p.role).toBeGreaterThanOrEqual(FIELD_MARKINGS.centerCircleOuterRadius);
      expect(fromCentre, p.role).toBeLessThanOrEqual(FIELD_MARKINGS.centerCircleOuterRadius + 2);
    }
  });

  describe.each(TEAMS)('%s sets its forward line up as an umbrella', (team) => {
    const attackedGoal = -defendedGoal(team);
    const forwards = teamOf(f, team).filter((p) => ['FF', 'FP', 'CHF', 'HFF'].includes(p.role!));
    const inGoalSquare = (p: PlayerPosition) =>
      Math.abs(attackedGoal - p.position[0]) < FIELD_MARKINGS.goalSquareDepth &&
      Math.abs(p.position[2]) < FIELD_MARKINGS.goalSquareWidth / 2;

    it('puts the full forward in the goal square', () => {
      expect(forwards.filter(inGoalSquare).map((p) => p.role)).toEqual(['FF']);
    });

    it('puts the centre half forward about 30 m out on the centre line', () => {
      const chf = forwards.find((p) => p.role === 'CHF')!;
      expect(Math.abs(fromGoal(chf, attackedGoal) - 30)).toBeLessThanOrEqual(3);
      expect(Math.abs(chf.position[2])).toBeLessThan(3);
    });

    it('spreads the other four around the inside of the 50 m arc, two each side', () => {
      const canopy = forwards.filter((p) => ['FP', 'HFF'].includes(p.role!));
      for (const p of canopy) {
        const d = fromGoal(p, attackedGoal);
        expect(d, p.role).toBeGreaterThan(FIELD_MARKINGS.fiftyMetreArcRadius - 8);
        expect(d, p.role).toBeLessThan(FIELD_MARKINGS.fiftyMetreArcRadius);
      }
      expect(canopy.filter((p) => p.position[2] < -5)).toHaveLength(2);
      expect(canopy.filter((p) => p.position[2] > 5)).toHaveLength(2);
    });
  });

  it('turns everyone to face the bounce', () => {
    const turnedAway = f.positions.filter((p) => !faces(p, [0, 0]));
    expect(turnedAway).toEqual([]);
  });
});

/**
 * Kick-in, Law 17 of the Laws of Australian Football 2024. After a behind the
 * kicker brings the ball into play from within the goal square (17.1(a)); The
 * Mark is set 15 m from the centre of the kick-off line toward the centre of the
 * ground (17.1(d)); every other player must vacate the Protected Area (17.3).
 *
 * Diagram 3 draws the Protected Area as the region in front of the goal out to
 * an arc through The Mark. It is modelled here as everything within the mark's
 * distance of the centre of the goal line: the man on the mark stands on its
 * edge, and everybody else stands beyond it.
 */
const KICK_IN_MARK_FROM_KICK_OFF_LINE = 15; // Law 17.1(d)
const PROTECTED_AREA_RADIUS = FIELD_MARKINGS.goalSquareDepth + KICK_IN_MARK_FROM_KICK_OFF_LINE;

describe.each([
  { id: 'kick-in-pressing', kicking: 'team2' as TeamId, pressing: 'team1' as TeamId },
  { id: 'kick-in-kicking', kicking: 'team1' as TeamId, pressing: 'team2' as TeamId },
])('$id: $kicking kicks in, $pressing presses', ({ id, kicking, pressing }) => {
  const f = formation(id);
  const goalX = defendedGoal(kicking);
  const outward = -Math.sign(goalX); // from the goal line toward the centre
  const kicker = teamOf(f, kicking).find((p) => p.role === 'FB')!;
  const mark: [number, number] = [goalX + outward * PROTECTED_AREA_RADIUS, 0];

  it('has the kicker, the full back, inside the goal square', () => {
    const out = (kicker.position[0] - goalX) * outward;
    expect(out).toBeGreaterThan(0);
    expect(out).toBeLessThan(FIELD_MARKINGS.goalSquareDepth);
    expect(Math.abs(kicker.position[2])).toBeLessThan(FIELD_MARKINGS.goalSquareWidth / 2);
  });

  it('puts one pressing player on The Mark, 15 m out from the goal square', () => {
    const onMark = f.positions.filter((p) => distance(at(p), mark) < 1);
    expect(onMark.map((p) => p.teamId)).toEqual([pressing]);
  });

  it('leaves the Protected Area to the kicker and the man on the mark', () => {
    const inside = f.positions.filter(
      (p) => p !== kicker && distance(at(p), mark) >= 1 && fromGoal(p, goalX) <= PROTECTED_AREA_RADIUS + 1,
    );
    expect(inside.map((p) => `${p.teamId} ${p.role}`)).toEqual([]);
  });

  // From the #118 review: the wings stay inside the corridor's width, and the
  // contest at the far end (the kicking team's forwards and the six minding
  // them) is held up around the middle of the ground, not deep.
  it('keeps the wings in, no more than 40 m off the centre line', () => {
    const wings = f.positions.filter((p) => p.role === 'W');
    expect(wings).toHaveLength(4);
    for (const w of wings) expect(Math.abs(w.position[2]), `${w.teamId} W`).toBeLessThanOrEqual(40);
  });

  it('holds the far-end group up around the middle of the ground', () => {
    const farGroup = [
      ...teamOf(f, kicking).filter((p) => ['FF', 'FP', 'CHF', 'HFF'].includes(p.role!)),
      ...teamOf(f, pressing).filter((p) => ['FB', 'BP', 'CHB', 'HBF'].includes(p.role!)),
    ];
    expect(farGroup).toHaveLength(12);
    for (const p of farGroup) {
      expect(Math.abs(p.position[0]), `${p.teamId} ${p.role}`).toBeLessThanOrEqual(HALF_SQUARE + 5);
    }
  });

  it('turns everyone to face the kicker', () => {
    const turnedAway = f.positions.filter((p) => p !== kicker && !faces(p, at(kicker)));
    expect(turnedAway.map((p) => `${p.teamId} ${p.role}`)).toEqual([]);
  });
});

describe('Kick-in Kick is Kick-in Press seen from the other end', () => {
  it('turns each player a half-turn and hands them to the other team', () => {
    const press = formation('kick-in-pressing');
    const kick = formation('kick-in-kicking');
    for (const p of press.positions) {
      const other: TeamId = p.teamId === 'team1' ? 'team2' : 'team1';
      const twin = kick.positions.find((k) => k.teamId === other && k.playerNumber === p.playerNumber)!;
      expect(twin.position[0]).toBeCloseTo(-p.position[0], 9);
      expect(twin.position[2]).toBeCloseTo(-p.position[2], 9);
    }
  });
});
