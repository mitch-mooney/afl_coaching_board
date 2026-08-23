import { describe, it, expect } from 'vitest';
import {
  isPointInField,
  snapToField,
  positionToZone,
  boundaryOf,
  outOfBounds,
  pullInsideBoundary,
  STANDARD_BOUNDARY,
  boundaryPoints,
  fiftyMetreArcPoints,
  type Boundary,
  type FieldPoint,
} from '../fieldGeometry';
import type { BoardSnapshot } from '../boardSnapshot';
import type { Player } from '../../models/PlayerModel';
import type { MovementPath } from '../../models/PathModel';
import type { Annotation } from '../../store/annotationStore';

/**
 * These cases pin the behaviour of the board at **Standard ground** (165 × 135) —
 * the dimensions that were hardcoded before Venues existed. They are written as
 * football claims rather than as restatements of the arithmetic, and every
 * expectation here was verified against the pre-Venue implementation.
 *
 * That makes this file the regression guard for the whole Venue wave: whatever
 * changes, a board rendered at Standard ground must keep answering exactly this.
 */

const STANDARD = STANDARD_BOUNDARY; // 82.5 × 67.5 — the pre-Venue hardcoded ground

/** A tight community ground: short and narrow. */
const TIGHT = boundaryOf({ boundaryLength: 150, boundaryWidth: 110 });
/** A wide ground, near the top of the range a coach would measure. */
const WIDE = boundaryOf({ boundaryLength: 175, boundaryWidth: 141 });

describe('isPointInField', () => {
  it('puts the centre bounce inside the ground', () => {
    expect(isPointInField(0, 0, STANDARD)).toBe(true);
  });

  it('puts a point just short of the goal line inside, and one past it outside', () => {
    expect(isPointInField(82, 0, STANDARD)).toBe(true);
    expect(isPointInField(83, 0, STANDARD)).toBe(false);
  });

  it('puts a point just short of the wing boundary inside, and one past it outside', () => {
    expect(isPointInField(0, 67, STANDARD)).toBe(true);
    expect(isPointInField(0, 68, STANDARD)).toBe(false);
  });

  it('treats the ground as an ellipse, not its bounding box — a forward pocket corner is out', () => {
    // Inside the 82.5 × 67.5 box, but outside the ellipse.
    expect(isPointInField(60, 50, STANDARD)).toBe(false);
    expect(isPointInField(58, 46, STANDARD)).toBe(true);
  });
});

describe('snapToField', () => {
  it('leaves a position that is already on the ground untouched', () => {
    expect(snapToField(20, -30, STANDARD)).toEqual([20, -30]);
  });

  it('pulls a position past the goal line back onto the boundary', () => {
    const [x, z] = snapToField(200, 0, STANDARD);
    expect(x).toBeCloseTo(82.5);
    expect(z).toBeCloseTo(0);
  });

  it('pulls a position past the wing back onto the boundary', () => {
    const [x, z] = snapToField(0, 200, STANDARD);
    expect(x).toBeCloseTo(0);
    expect(z).toBeCloseTo(67.5);
  });

  it('lands a diagonal overshoot exactly on the boundary ellipse', () => {
    const [x, z] = snapToField(120, 90, STANDARD);
    const onEllipse = (x / 82.5) ** 2 + (z / 67.5) ** 2;
    expect(onEllipse).toBeCloseTo(1);
    // and stays in the quadrant it came from
    expect(x).toBeGreaterThan(0);
    expect(z).toBeGreaterThan(0);
  });

  it('always lands somewhere the ground agrees is on the ground', () => {
    // The invariant the out-of-bounds report leans on: a clamped drag must not
    // report the player it just clamped as outside. Rounding in cos/sin can put
    // a projected point a few ULPs past the ellipse, so this sweeps the whole
    // way round at three grounds rather than trusting one lucky angle.
    for (const ground of [STANDARD, TIGHT, WIDE]) {
      for (let step = 0; step < 360; step++) {
        const angle = (step * Math.PI) / 180;
        const [x, z] = snapToField(
          200 * Math.cos(angle),
          200 * Math.sin(angle),
          ground,
        );
        expect(isPointInField(x, z, ground)).toBe(true);
      }
    }
  });
});

describe('positionToZone follows the width of the ground', () => {
  it('calls a player 26 m off centre a winger on a tight ground, but a rover at Standard', () => {
    // A wing is the outer part of *this* ground. 26 m off centre is well outside
    // the middle of a 110 m ground, and merely wide-ish on a 135 m one.
    expect(positionToZone(0, 26, TIGHT)).toBe('W');
    expect(positionToZone(0, 26, STANDARD)).toBe('R');
  });

  it('puts a player the same share of the way to the boundary in the same zone at every width', () => {
    for (const ground of [TIGHT, STANDARD, WIDE]) {
      expect(positionToZone(0, 0.5 * ground.semiZ, ground)).toBe('W');
      expect(positionToZone(0, 0.4 * ground.semiZ, ground)).toBe('R');
    }
  });

  it('keeps the centre square the same size on a tight ground — 14 m off the bounce is still the centre', () => {
    // The centre square is a 50 × 50 Absolute marking, identical at every
    // ground. Scaling its lateral edge with the width would push a player
    // standing inside the painted square out of the centre zone on a tight
    // ground, which is the failure normalising positions was rejected for.
    for (const ground of [TIGHT, STANDARD, WIDE]) {
      expect(positionToZone(0, 14, ground)).toBe('C');
    }
  });

  it('splits the deep forward into full forward and pocket at the same fraction of width', () => {
    for (const ground of [TIGHT, STANDARD, WIDE]) {
      const deep = ground.semiX - 20; // 20 m out from goal, in the goal square area
      expect(positionToZone(deep, 0.15 * ground.semiZ, ground)).toBe('FF');
      expect(positionToZone(deep, 0.3 * ground.semiZ, ground)).toBe('FP');
    }
  });
});

describe('positionToZone measures forward and back from the goal line', () => {
  /** x for a central position the given distance out from the attacking goal. */
  const outFromGoal = (boundary: Boundary, metres: number) => boundary.semiX - metres;

  it('calls a player 34.5 m out from goal the full forward at 150 m, 165 m and 175 m alike', () => {
    // The top of the 50 is 50 m from goal at every ground in the country, so a
    // deep forward is deep at every length. Measured from the centre of the
    // ground instead, this player is CHF on the short ground and FF on the long
    // one — the forward line sliding with the ground, which is the failure this
    // anchoring exists to remove.
    expect(positionToZone(outFromGoal(TIGHT, 34.5), 0, TIGHT)).toBe('FF');
    expect(positionToZone(outFromGoal(STANDARD, 34.5), 0, STANDARD)).toBe('FF');
    expect(positionToZone(outFromGoal(WIDE, 34.5), 0, WIDE)).toBe('FF');
  });

  it('keeps the centre-half-forward band reaching 54.5 m out from goal at every length', () => {
    expect(positionToZone(outFromGoal(TIGHT, 54.5), 0, TIGHT)).toBe('CHF');
    expect(positionToZone(outFromGoal(STANDARD, 54.5), 0, STANDARD)).toBe('CHF');
    expect(positionToZone(outFromGoal(WIDE, 54.5), 0, WIDE)).toBe('CHF');
  });

  it('mirrors the back half — the same distances out from the defensive goal', () => {
    expect(positionToZone(-outFromGoal(TIGHT, 54.5), 0, TIGHT)).toBe('CHB');
    expect(positionToZone(-outFromGoal(TIGHT, 54.5), 0.5 * TIGHT.semiZ, TIGHT)).toBe('HBF');
  });

  it('leaves a player behind the arc on a long ground in the midfield, not the forward line', () => {
    // On a 175 m ground, 30 m off centre is 57.5 m out from goal — behind the
    // 50 m arc, so a midfielder. The centre-anchored reading called this CHF
    // because it only ever asked how far from the middle the player stood.
    expect(positionToZone(30, 0, WIDE)).toBe('R');
  });
});

describe('positionToZone at Standard ground', () => {
  it('calls a deep central forward the full forward', () => {
    expect(positionToZone(60, 0, STANDARD)).toBe('FF');
  });

  it('calls a deep wide forward a forward pocket', () => {
    expect(positionToZone(60, 30, STANDARD)).toBe('FP');
  });

  it('calls a central half-forward the centre half forward', () => {
    expect(positionToZone(35, 10, STANDARD)).toBe('CHF');
  });

  it('calls a wide half-forward a half forward flank', () => {
    expect(positionToZone(35, 25, STANDARD)).toBe('HFF');
  });

  it('calls someone holding width at the centre a winger', () => {
    expect(positionToZone(0, 35, STANDARD)).toBe('W');
  });

  it('calls the centre bounce the centre', () => {
    expect(positionToZone(0, 0, STANDARD)).toBe('C');
  });

  it('calls a general midfielder a rover', () => {
    expect(positionToZone(20, 20, STANDARD)).toBe('R');
  });

  it('calls a central half-back the centre half back', () => {
    expect(positionToZone(-35, 10, STANDARD)).toBe('CHB');
  });

  it('calls a wide half-back a half back flank', () => {
    expect(positionToZone(-35, 25, STANDARD)).toBe('HBF');
  });

  it('calls a deep central defender the full back', () => {
    expect(positionToZone(-60, 0, STANDARD)).toBe('FB');
  });

  it('calls a deep wide defender a back pocket', () => {
    expect(positionToZone(-60, 30, STANDARD)).toBe('BP');
  });
});

describe('positionToZone reads each end deep band first, so the two ends mirror', () => {
  it('names the deepest defensive band FB and BP at every ground', () => {
    // The back end used to test the half-back band first, so it swallowed
    // everything deeper and FB/BP could never be produced — a player dragged
    // into the goal square was suggested centre half back.
    for (const ground of [TIGHT, STANDARD, WIDE]) {
      const inTheGoalSquare = -(ground.semiX - 5);
      expect(positionToZone(inTheGoalSquare, 0, ground)).toBe('FB');
      expect(positionToZone(inTheGoalSquare, 0.5 * ground.semiZ, ground)).toBe('BP');
    }
  });

  it('still names the half-back band CHB and HBF — the deep band must not swallow it', () => {
    for (const ground of [TIGHT, STANDARD, WIDE]) {
      const onTheHalfBackLine = -(ground.semiX - 45); // between 34.5 and 54.5 out
      expect(positionToZone(onTheHalfBackLine, 0, ground)).toBe('CHB');
      expect(positionToZone(onTheHalfBackLine, 0.5 * ground.semiZ, ground)).toBe('HBF');
    }
  });

  it('splits FB from CHB at the same distance out from goal that splits FF from CHF', () => {
    // 34.5 m out is where the deep band stops at both ends, or the two halves of
    // the ground disagree about how deep a deep forward is.
    const justInside = STANDARD.semiX - 34.5;
    const justOutside = STANDARD.semiX - 34.6;
    expect(positionToZone(-justInside, 0, STANDARD)).toBe('FB');
    expect(positionToZone(-justOutside, 0, STANDARD)).toBe('CHB');
    expect(positionToZone(justInside, 0, STANDARD)).toBe('FF');
    expect(positionToZone(justOutside, 0, STANDARD)).toBe('CHF');
  });

  it('calls a deep, wide defender a back pocket rather than a winger', () => {
    // The wing band starts narrower than the pocket split, so a deep player wide
    // enough to be on the wing line is where the two bands could compete. Pinned
    // as on the ground, so the case stays a defender rather than a point in the
    // car park that no drag could ever produce.
    expect(isPointInField(-55, 45, STANDARD)).toBe(true);
    expect(positionToZone(-55, 45, STANDARD)).toBe('BP');
    expect(positionToZone(55, 45, STANDARD)).toBe('FP');
  });
});

// ── Out of bounds ───────────────────────────────────────────────────────────
//
// The claim under test is the football one: a play authored on a wide ground
// does not fit a tight one, and the app has to say so plainly and be able to
// adapt it on request — without ever touching an Annotation, which may point
// off-ground on purpose.

const board = (over: Partial<BoardSnapshot> = {}): BoardSnapshot => ({
  players: [],
  paths: [],
  annotations: [],
  camera: null,
  ball: null,
  cones: [],
  ...over,
});

const playerAt = (id: string, x: number, z: number): Player => ({
  id,
  teamId: 'team1',
  position: [x, 0, z],
  rotation: 0,
  color: '#0066cc',
});

/** A MovementPath through the given [x, z] points, one second apart. */
const pathThrough = (id: string, ...points: Array<[number, number]>): MovementPath => ({
  id,
  entityId: 'team1-player-1',
  entityType: 'player',
  keyframes: points.map(([x, z], i) => ({
    timestamp: i,
    position: [x, 0, z] as [number, number, number],
  })),
  duration: points.length - 1,
  startTimeOffset: 0,
});

const arrowAt = (id: string, x: number, z: number): Annotation => ({
  id,
  type: 'arrow',
  points: [[x, 0, z], [x + 5, 0, z]],
  color: '#ffff00',
  createdAt: new Date(0),
});

describe('outOfBounds', () => {
  it('says nothing is outside when the whole play fits', () => {
    const snap = board({
      players: [playerAt('p1', 0, 0), playerAt('p2', 40, 30)],
      ball: { id: 'ball-1', position: [10, 0, 10], color: '#8B4513', size: 0.3 },
      cones: [{ id: 'c1', position: [-20, 0, 20] }],
      paths: [pathThrough('path-1', [0, 0], [30, 20])],
    });

    expect(outOfBounds(snap, TIGHT).count).toBe(0);
  });

  it('counts a winger who fits the standard ground but not a tighter one', () => {
    const snap = board({ players: [playerAt('winger', 0, 60)] });

    expect(outOfBounds(snap, STANDARD).count).toBe(0);
    expect(outOfBounds(snap, TIGHT)).toMatchObject({ players: ['winger'], count: 1 });
  });

  it('counts the ball and cones alongside the players', () => {
    const snap = board({
      players: [playerAt('deep-forward', 80, 0)],
      ball: { id: 'ball-1', position: [80, 0, 0], color: '#8B4513', size: 0.3 },
      cones: [{ id: 'c1', position: [0, 0, 62] }],
    });

    const report = outOfBounds(snap, TIGHT);
    expect(report.players).toEqual(['deep-forward']);
    expect(report.ball).toBe(true);
    expect(report.cones).toEqual(['c1']);
    expect(report.count).toBe(3);
  });

  it('counts a path that leaves the ground even though it starts and ends on it', () => {
    // The case that looks fine standing still and only fails on playback.
    const snap = board({ paths: [pathThrough('lead', [0, 0], [0, 62], [20, 0])] });

    expect(outOfBounds(snap, TIGHT)).toMatchObject({ paths: ['lead'], count: 1 });
  });

  it('counts a path once however many of its keyframes leave the ground', () => {
    // "How much of the structure doesn't fit", not a keyframe tally.
    const snap = board({ paths: [pathThrough('lap', [0, 60], [20, 61], [40, 60])] });

    expect(outOfBounds(snap, TIGHT).count).toBe(1);
  });

  it('never counts an Annotation, even one drawn well outside the boundary', () => {
    const snap = board({ annotations: [arrowAt('a1', 200, 200)] });

    expect(outOfBounds(snap, TIGHT).count).toBe(0);
  });

  it('reads as "three players and one path do not fit"', () => {
    const snap = board({
      players: [playerAt('p1', 0, 60), playerAt('p2', 0, -60), playerAt('p3', 78, 0)],
      paths: [pathThrough('lead', [0, 0], [0, 62])],
    });

    expect(outOfBounds(snap, TIGHT).count).toBe(4);
  });
});

describe('pullInsideBoundary', () => {
  it('brings an out-of-bounds player onto the ground', () => {
    const snap = board({ players: [playerAt('winger', 0, 60)] });

    const pulled = pullInsideBoundary(snap, TIGHT);

    expect(isPointInField(pulled.players[0].position[0], pulled.players[0].position[2], TIGHT))
      .toBe(true);
    expect(pulled.players[0].position[2]).toBeCloseTo(TIGHT.semiZ);
  });

  it('leaves the height alone — a player is pulled sideways, not lifted', () => {
    const snap = board({ players: [{ ...playerAt('winger', 0, 60), position: [0, 1.2, 60] }] });

    expect(pullInsideBoundary(snap, TIGHT).players[0].position[1]).toBe(1.2);
  });

  it('resolves the report — nothing is out of bounds afterwards', () => {
    const snap = board({
      players: [playerAt('p1', 0, 60), playerAt('p2', 78, 0)],
      ball: { id: 'ball-1', position: [0, 0, -64], color: '#8B4513', size: 0.3 },
      cones: [{ id: 'c1', position: [70, 0, 40] }],
      paths: [pathThrough('lead', [0, 0], [0, 62], [78, 10])],
    });

    // Every kind was genuinely outside to begin with, or this asserts nothing.
    expect(outOfBounds(snap, TIGHT).count).toBe(5);
    expect(outOfBounds(pullInsideBoundary(snap, TIGHT), TIGHT).count).toBe(0);
  });

  it('leaves in-bounds content byte-identical', () => {
    const snap = board({
      players: [playerAt('inside', 10, 10), playerAt('outside', 0, 60)],
      cones: [{ id: 'c1', position: [-20, 0, 20] }],
      ball: { id: 'ball-1', position: [0, 0, 0], color: '#8B4513', size: 0.3 },
      paths: [pathThrough('short', [0, 0], [10, 10])],
    });

    const pulled = pullInsideBoundary(snap, TIGHT);

    expect(pulled.players[0]).toBe(snap.players[0]);
    expect(pulled.cones[0]).toBe(snap.cones[0]);
    expect(pulled.ball).toBe(snap.ball);
    expect(pulled.paths[0]).toBe(snap.paths[0]);
  });

  it('leaves the in-bounds keyframes of a path that strays byte-identical', () => {
    const snap = board({ paths: [pathThrough('lead', [0, 0], [0, 62], [20, 0])] });

    const pulled = pullInsideBoundary(snap, TIGHT);

    expect(pulled.paths[0].keyframes[0]).toBe(snap.paths[0].keyframes[0]);
    expect(pulled.paths[0].keyframes[2]).toBe(snap.paths[0].keyframes[2]);
    expect(pulled.paths[0].keyframes[1]).not.toBe(snap.paths[0].keyframes[1]);
  });

  it('never moves an Annotation, however far outside it is drawn', () => {
    const snap = board({ annotations: [arrowAt('a1', 200, 200)] });

    expect(pullInsideBoundary(snap, TIGHT).annotations[0]).toBe(snap.annotations[0]);
  });

  it('does not mutate the snapshot it was given', () => {
    const snap = board({ players: [playerAt('winger', 0, 60)] });

    pullInsideBoundary(snap, TIGHT);

    expect(snap.players[0].position).toEqual([0, 0, 60]);
  });
});

// ── The curve, as points ─────────────────────────────────────────────────────

/**
 * How far off the ellipse a point is, as the ellipse equation's own residual:
 * 0 on the line, negative inside, positive outside. Stated once so the claims
 * below read as "this point is on the boundary" rather than as arithmetic.
 */
const offEllipse = (point: FieldPoint, boundary: Boundary): number =>
  (point[0] / boundary.semiX) ** 2 + (point[1] / boundary.semiZ) ** 2 - 1;

const distanceBetween = (a: FieldPoint, b: FieldPoint): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Every claim about the curve is made at all three, never at Standard alone. */
const GROUNDS: [string, Boundary][] = [
  ['Standard ground', STANDARD],
  ['a tight ground', TIGHT],
  ['a wide ground', WIDE],
];

describe('boundaryPoints', () => {
  it('samples at the count the caller asked for', () => {
    // segments + 1, because the closing point repeats the first.
    expect(boundaryPoints(STANDARD, 64)).toHaveLength(65);
    expect(boundaryPoints(STANDARD, 8)).toHaveLength(9);
  });

  it('closes — the last point returns to the first', () => {
    const points = boundaryPoints(TIGHT, 32);

    expect(distanceBetween(points[0], points[points.length - 1])).toBeLessThan(1e-9);
  });

  it.each(GROUNDS)('puts every sample on the ellipse at %s', (_name, boundary) => {
    for (const point of boundaryPoints(boundary, 64)) {
      // Not exactly 0: the samples carry the snap inset, tens of nanometres at
      // a real ground, so that a drawn point is never off the ground it draws.
      expect(offEllipse(point, boundary)).toBeCloseTo(0, 7);
      expect(offEllipse(point, boundary)).toBeLessThan(0);
    }
  });

  it.each(GROUNDS)('agrees with the membership predicate at %s — no drawn point is off the ground it draws', (
    _name,
    boundary,
  ) => {
    for (const [x, z] of boundaryPoints(boundary, 128)) {
      expect(isPointInField(x, z, boundary)).toBe(true);
    }
  });

  it('reaches the goal line and the wings', () => {
    const points = boundaryPoints(STANDARD, 4);

    // Four segments visit both goal lines and both wings before closing.
    expect(points[0][0]).toBeCloseTo(82.5);
    expect(points[1][1]).toBeCloseTo(67.5);
    expect(points[2][0]).toBeCloseTo(-82.5);
    expect(points[3][1]).toBeCloseTo(-67.5);
  });

  it('hands back a new array every call, never a shared one', () => {
    const first = boundaryPoints(STANDARD, 16);
    const second = boundaryPoints(STANDARD, 16);

    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });
});

describe('fiftyMetreArcPoints', () => {
  /** The centre of the goal line an arc is struck from. */
  const goalCentre = (end: 'team1' | 'team2', boundary: Boundary): FieldPoint => [
    end === 'team1' ? -boundary.semiX : boundary.semiX,
    0,
  ];

  it.each(GROUNDS)('ends exactly on the boundary at %s', (_name, boundary) => {
    for (const end of ['team1', 'team2'] as const) {
      const points = fiftyMetreArcPoints(boundary, end, 256);

      expect(offEllipse(points[0], boundary)).toBeCloseTo(0, 9);
      expect(offEllipse(points[points.length - 1], boundary)).toBeCloseTo(0, 9);
    }
  });

  it.each(GROUNDS)('stays 50 m from the centre of the goal line at %s', (_name, boundary) => {
    for (const end of ['team1', 'team2'] as const) {
      const centre = goalCentre(end, boundary);

      for (const point of fiftyMetreArcPoints(boundary, end, 128)) {
        expect(distanceBetween(point, centre)).toBeCloseTo(50, 9);
      }
    }
  });

  it('reaches its apex 50 m out from goal, curving toward the centre of the ground', () => {
    const points = fiftyMetreArcPoints(STANDARD, 'team1', 256);
    const deepest = Math.max(...points.map(([x]) => x));

    expect(deepest).toBeCloseTo(-82.5 + 50);
  });

  it('mirrors the two ends', () => {
    const team1 = fiftyMetreArcPoints(STANDARD, 'team1', 64);
    const team2 = fiftyMetreArcPoints(STANDARD, 'team2', 64);

    expect(team1).toHaveLength(team2.length);
    team1.forEach(([x, z], i) => {
      expect(-x).toBeCloseTo(team2[i][0], 9);
      expect(z).toBeCloseTo(team2[i][1], 9);
    });
  });

  it('is clipped shorter on a narrower ground', () => {
    const narrow = fiftyMetreArcPoints(TIGHT, 'team1', 256);
    const wide = fiftyMetreArcPoints(WIDE, 'team1', 256);

    expect(narrow.length).toBeLessThan(wide.length);
  });

  it('keeps more of the half-circle the wider the ground, and never quite all of it', () => {
    // A half-circle struck from the centre of the goal line ends 50 m either
    // side of the goal, on the goal line — and the goal line meets the ellipse
    // only at z = 0. So every ground clips the arc somewhere; a wide one just
    // clips less. There is no ground wide enough to return the raw half-circle.
    const wider = boundaryOf({ boundaryLength: 200, boundaryWidth: 190 });
    const enormous = boundaryOf({ boundaryLength: 1000, boundaryWidth: 950 });

    expect(fiftyMetreArcPoints(WIDE, 'team1', 256).length).toBeLessThan(
      fiftyMetreArcPoints(wider, 'team1', 256).length,
    );
    expect(fiftyMetreArcPoints(enormous, 'team1', 256).length).toBeGreaterThan(
      fiftyMetreArcPoints(wider, 'team1', 256).length,
    );
    expect(fiftyMetreArcPoints(enormous, 'team1', 256).length).toBeLessThan(257);
  });

  it('is continuous — no gap where a sample was dropped', () => {
    for (const boundary of [STANDARD, TIGHT, WIDE]) {
      const segments = 128;
      const points = fiftyMetreArcPoints(boundary, 'team1', segments);
      // One nominal segment of a 50 m arc, with a hair of slack for rounding.
      const longestAllowed = 50 * (Math.PI / segments) * 1.001;

      for (let i = 1; i < points.length; i++) {
        expect(distanceBetween(points[i - 1], points[i])).toBeLessThanOrEqual(longestAllowed);
      }
    }
  });

  it('does not move its endpoints when the segment count changes', () => {
    const coarse = fiftyMetreArcPoints(STANDARD, 'team2', 32);
    const fine = fiftyMetreArcPoints(STANDARD, 'team2', 1024);

    expect(coarse[0][0]).toBeCloseTo(fine[0][0], 6);
    expect(coarse[0][1]).toBeCloseTo(fine[0][1], 6);
    expect(coarse[coarse.length - 1][0]).toBeCloseTo(fine[fine.length - 1][0], 6);
    expect(coarse[coarse.length - 1][1]).toBeCloseTo(fine[fine.length - 1][1], 6);
  });

  it.each(GROUNDS)('agrees with the membership predicate at %s — every drawn point is on the ground', (
    _name,
    boundary,
  ) => {
    for (const [x, z] of fiftyMetreArcPoints(boundary, 'team1', 256)) {
      expect(isPointInField(x, z, boundary)).toBe(true);
    }
  });

  it('draws nothing on a ground too small for a 50 m arc to reach', () => {
    const pocketSized = boundaryOf({ boundaryLength: 20, boundaryWidth: 20 });

    expect(fiftyMetreArcPoints(pocketSized, 'team1', 256)).toEqual([]);
  });

  it('still ends on the boundary where the ground is a sliver and barely any arc survives', () => {
    // Absurd dimensions on purpose: the clip leaves a handful of samples, which
    // is where an off-by-one in finding them would show up as an empty arc.
    const sliver = boundaryOf({ boundaryLength: 100, boundaryWidth: 0.7 });
    const points = fiftyMetreArcPoints(sliver, 'team1', 64);

    expect(points.length).toBeGreaterThan(1);
    expect(offEllipse(points[0], sliver)).toBeCloseTo(0, 9);
    expect(offEllipse(points[points.length - 1], sliver)).toBeCloseTo(0, 9);
    for (const [x, z] of points) {
      expect(isPointInField(x, z, sliver)).toBe(true);
    }
  });

  it('hands back a new array every call, never a shared one', () => {
    const first = fiftyMetreArcPoints(STANDARD, 'team1', 64);
    const second = fiftyMetreArcPoints(STANDARD, 'team1', 64);

    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });
});
