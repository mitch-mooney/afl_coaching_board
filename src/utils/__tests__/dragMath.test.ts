import { describe, it, expect } from 'vitest';
import { Ray, Vector3 } from 'three';
import {
  intersectGroundPlane,
  facingRotation,
  dragRotation,
  ROTATION_SENSITIVITY,
  FACING_MIN_DISTANCE,
} from '../dragMath';

describe('intersectGroundPlane', () => {
  it('returns the [x, z] where a downward ray meets y=0', () => {
    const ray = new Ray(new Vector3(5, 10, 3), new Vector3(0, -1, 0));
    expect(intersectGroundPlane(ray)).toEqual([5, 3]);
  });

  it('returns null for a ray parallel to the ground plane', () => {
    const ray = new Ray(new Vector3(0, 5, 0), new Vector3(1, 0, 0));
    expect(intersectGroundPlane(ray)).toBeNull();
  });

  it('returns null for a ray pointing away from the plane (t < 0)', () => {
    const ray = new Ray(new Vector3(0, 5, 0), new Vector3(0, 1, 0));
    expect(intersectGroundPlane(ray)).toBeNull();
  });
});

describe('facingRotation', () => {
  it('faces +z as rotation 0', () => {
    expect(facingRotation([0, 0, 0], [0, 0, 1])).toBe(Math.atan2(0, 1));
  });

  it('faces +x as atan2(1, 0)', () => {
    expect(facingRotation([0, 0, 0], [1, 0, 0])).toBe(Math.atan2(1, 0));
  });

  it('faces -z as atan2(0, -1)', () => {
    expect(facingRotation([0, 0, 0], [0, 0, -1])).toBe(Math.atan2(0, -1));
  });

  it('returns null for a sub-threshold move', () => {
    expect(facingRotation([0, 0, 0], [0, 0, 0.2])).toBeNull();
  });

  it('returns null at exactly the threshold (strict >)', () => {
    expect(facingRotation([0, 0, 0], [0, 0, FACING_MIN_DISTANCE])).toBeNull();
  });
});

describe('dragRotation', () => {
  it('is a no-op when the pointer sits at the recentred start', () => {
    // startClientX at viewport centre, pointer at NDC centre → zero delta
    expect(dragRotation(0, 500, 0, 1000)).toBe(0);
  });

  it('applies sensitivity to the recentred screen delta', () => {
    // clientX = 0.5 * 1000/2 = 250; deltaX = 250 - (500 - 500) = 250
    // 1 + 250 * 0.01 = 3.5
    expect(dragRotation(1, 500, 0.5, 1000)).toBeCloseTo(3.5, 10);
  });

  it('exposes the default sensitivity constant', () => {
    expect(ROTATION_SENSITIVITY).toBe(0.01);
  });
});
