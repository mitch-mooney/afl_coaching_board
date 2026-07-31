import { describe, it, expect } from 'vitest';
import { povCameraPose, presetCameraPose, POV_LOOK_AHEAD, POV_LOOK_UP } from '../cameraMath';
import { STANDARD_BOUNDARY, boundaryOf } from '../fieldGeometry';

// A tight community ground: 150 m goal-to-goal, 110 m wing-to-wing.
const TIGHT = boundaryOf({ boundaryLength: 150, boundaryWidth: 110 });

describe('povCameraPose', () => {
  it('faces +z at rotation 0: camera sits behind (−z), looks ahead (+z)', () => {
    const pose = povCameraPose([0, 0, 0], 0, 3, 10);
    expect(pose.position).toEqual([0, 3, -10]);
    expect(pose.lookAt).toEqual([0, 1, 5]);
  });

  it('faces +x at rotation π/2: camera sits behind (−x), looks ahead (+x)', () => {
    const pose = povCameraPose([0, 0, 0], Math.PI / 2, 3, 10);
    expect(pose.position[0]).toBeCloseTo(-10, 10);
    expect(pose.position[1]).toBe(3);
    expect(pose.position[2]).toBeCloseTo(0, 10);
    expect(pose.lookAt[0]).toBeCloseTo(5, 10);
    expect(pose.lookAt[1]).toBe(1);
    expect(pose.lookAt[2]).toBeCloseTo(0, 10);
  });

  it('tracks a non-origin player, applying height and distance offsets', () => {
    const pose = povCameraPose([10, 2, -4], 0, 3, 10);
    expect(pose.position).toEqual([10, 5, -14]);
    expect(pose.lookAt).toEqual([10, 3, 1]);
  });

  it('locks the sign pairing at a mixed angle (π/4) with a non-origin player', () => {
    // sin(π/4) = cos(π/4) ≈ 0.70710678, so both axes are non-trivial at once —
    // this catches an accidental swap of the behind (−dir·dist) vs ahead (+dir·5) signs.
    const pose = povCameraPose([10, 2, -4], Math.PI / 4, 3, 10);
    expect(pose.position[0]).toBeCloseTo(2.928932, 6); // 10 − 0.70710678·10
    expect(pose.position[1]).toBe(5); // 2 + 3
    expect(pose.position[2]).toBeCloseTo(-11.071068, 6); // −4 − 0.70710678·10
    expect(pose.lookAt[0]).toBeCloseTo(13.535534, 6); // 10 + 0.70710678·5
    expect(pose.lookAt[1]).toBe(3); // 2 + 1
    expect(pose.lookAt[2]).toBeCloseTo(-0.464466, 6); // −4 + 0.70710678·5
  });

  it('exposes the look-ahead and look-up constants', () => {
    expect(POV_LOOK_AHEAD).toBe(5);
    expect(POV_LOOK_UP).toBe(1);
  });
});

describe('presetCameraPose', () => {
  // Standard ground is the regression guard: these are the poses the three presets
  // have always used, and they must not move for a coach who never records a Venue.
  describe('at Standard ground (165 × 135)', () => {
    it('top looks straight down from 200 m', () => {
      expect(presetCameraPose('top', STANDARD_BOUNDARY)).toEqual({
        position: [0, 200, 0],
        target: [0, 0, 0],
      });
    });

    it('sideline sits 150 m off the wing, 50 m up', () => {
      expect(presetCameraPose('sideline', STANDARD_BOUNDARY).position).toEqual([0, 50, 150]);
    });

    it('end-to-end sits 150 m beyond the goal, 50 m up', () => {
      expect(presetCameraPose('end-to-end', STANDARD_BOUNDARY).position).toEqual([150, 50, 0]);
    });
  });

  describe('at a tighter ground (150 × 110)', () => {
    it('frames closer than Standard ground from every preset', () => {
      // The point of the whole feature: a smaller ground is framed smaller, so it
      // reads as smaller rather than being zoomed back up to fill the screen.
      expect(presetCameraPose('top', TIGHT).position[1]).toBeLessThan(200);
      expect(presetCameraPose('sideline', TIGHT).position[2]).toBeLessThan(150);
      expect(presetCameraPose('end-to-end', TIGHT).position[0]).toBeLessThan(150);
    });

    it('stands the sideline camera off the wing by the ground half-length it has to fit', () => {
      // 55 m to the wing + 75 m of half-length to fit across the frame.
      const [x, y, z] = presetCameraPose('sideline', TIGHT).position;
      expect([x, z]).toEqual([0, 130]);
      expect(y).toBeCloseTo(130 / 3, 6);
    });

    it('stands the end-to-end camera off the goal by the half-width it has to fit', () => {
      // 75 m to the goal line + 55 m of half-width to fit across the frame.
      const [x, y, z] = presetCameraPose('end-to-end', TIGHT).position;
      expect([x, z]).toEqual([130, 0]);
      expect(y).toBeCloseTo(130 / 3, 6);
    });
  });

  it('always looks at the centre bounce, at every ground', () => {
    for (const view of ['top', 'sideline', 'end-to-end'] as const) {
      expect(presetCameraPose(view, TIGHT).target).toEqual([0, 0, 0]);
    }
  });

  it('is unaffected by which end is which — a ground is symmetric about the centre', () => {
    const wide = boundaryOf({ boundaryLength: 165, boundaryWidth: 141 });
    expect(presetCameraPose('sideline', wide).position[2]).toBeGreaterThan(150);
    expect(presetCameraPose('end-to-end', wide).position[0]).toBeGreaterThan(150);
  });

  it('views a longer ground from higher up even when it is also narrower', () => {
    // 170 × 110: longer than Standard goal-to-goal but much tighter across. Top
    // view has to rise to keep the extra length in frame — the ends are what would
    // be cropped, and they are the part that grew.
    const longAndNarrow = boundaryOf({ boundaryLength: 170, boundaryWidth: 110 });
    expect(presetCameraPose('top', longAndNarrow).position[1]).toBeGreaterThan(200);
  });
});
