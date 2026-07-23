import { describe, it, expect } from 'vitest';
import { povCameraPose, POV_LOOK_AHEAD, POV_LOOK_UP } from '../cameraMath';

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
