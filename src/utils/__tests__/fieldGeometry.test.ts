import { describe, it, expect } from 'vitest';
import { isPointInField, snapToField, positionToZone, STANDARD_BOUNDARY } from '../fieldGeometry';

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

describe('positionToZone at Standard ground', () => {
  it('calls a deep central forward the full forward', () => {
    expect(positionToZone(60, 0)).toBe('FF');
  });

  it('calls a deep wide forward a forward pocket', () => {
    expect(positionToZone(60, 30)).toBe('FP');
  });

  it('calls a central half-forward the centre half forward', () => {
    expect(positionToZone(35, 10)).toBe('CHF');
  });

  it('calls a wide half-forward a half forward flank', () => {
    expect(positionToZone(35, 25)).toBe('HFF');
  });

  it('calls someone holding width at the centre a winger', () => {
    expect(positionToZone(0, 35)).toBe('W');
  });

  it('calls the centre bounce the centre', () => {
    expect(positionToZone(0, 0)).toBe('C');
  });

  it('calls a general midfielder a rover', () => {
    expect(positionToZone(20, 20)).toBe('R');
  });

  it('calls a central half-back the centre half back', () => {
    expect(positionToZone(-35, 10)).toBe('CHB');
  });

  it('calls a wide half-back a half back flank', () => {
    expect(positionToZone(-35, 25)).toBe('HBF');
  });

  it('KNOWN BUG: calls a deep defender a centre half back, never FB or BP', () => {
    // The half-back check catches everything deeper than it, so the FB/BP branch
    // is unreachable. Ticketed at .scratch/venue/deferred/01 — deliberately NOT
    // fixed here, and pinned so the Venue work cannot change it by accident.
    expect(positionToZone(-60, 0)).toBe('CHB');
    expect(positionToZone(-60, 30)).toBe('HBF');
  });
});
