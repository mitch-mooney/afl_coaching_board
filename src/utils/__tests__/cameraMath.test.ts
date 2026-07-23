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

  it('exposes the look-ahead and look-up constants', () => {
    expect(POV_LOOK_AHEAD).toBe(5);
    expect(POV_LOOK_UP).toBe(1);
  });
});
