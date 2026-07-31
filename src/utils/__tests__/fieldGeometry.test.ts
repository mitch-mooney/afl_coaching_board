import { describe, it, expect } from 'vitest';
import {
  isPointInField,
  snapToField,
  positionToZone,
  boundaryOf,
  STANDARD_BOUNDARY,
  type Boundary,
} from '../fieldGeometry';

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

  it('KNOWN BUG: calls a deep defender a centre half back, never FB or BP', () => {
    // The half-back check catches everything deeper than it, so the FB/BP branch
    // is unreachable. Ticketed at .scratch/venue/deferred/01 — deliberately NOT
    // fixed here, and pinned so the Venue work cannot change it by accident.
    expect(positionToZone(-60, 0, STANDARD)).toBe('CHB');
    expect(positionToZone(-60, 30, STANDARD)).toBe('HBF');
  });

  it('KNOWN BUG: FB and BP stay unreachable at a tight ground and a wide one too', () => {
    for (const ground of [TIGHT, WIDE]) {
      const deepInDefence = -(ground.semiX - 5);
      expect(positionToZone(deepInDefence, 0, ground)).toBe('CHB');
      expect(positionToZone(deepInDefence, 0.5 * ground.semiZ, ground)).toBe('HBF');
    }
  });
});
