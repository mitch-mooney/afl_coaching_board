import { describe, it, expect } from 'vitest';
import {
  getTouchDistance,
  getTouchMidpoint,
  calculateZoomFactor,
  getTouchDelta,
  clampZoomFactor,
  applyZoomFactor,
  interpolateZoom,
  isSameGesturePoint,
  getTouchAngle,
  touchToNDC,
  type TouchPoint,
  type Point,
} from '../touchHelpers';

describe('touchHelpers', () => {
  // ============================================================================
  // getTouchDistance TESTS
  // ============================================================================

  describe('getTouchDistance', () => {
    it('should return 0 for identical points', () => {
      const touch1: TouchPoint = { clientX: 100, clientY: 100 };
      const touch2: TouchPoint = { clientX: 100, clientY: 100 };

      expect(getTouchDistance(touch1, touch2)).toBe(0);
    });

    it('should calculate horizontal distance correctly', () => {
      const touch1: TouchPoint = { clientX: 0, clientY: 0 };
      const touch2: TouchPoint = { clientX: 100, clientY: 0 };

      expect(getTouchDistance(touch1, touch2)).toBe(100);
    });

    it('should calculate vertical distance correctly', () => {
      const touch1: TouchPoint = { clientX: 0, clientY: 0 };
      const touch2: TouchPoint = { clientX: 0, clientY: 50 };

      expect(getTouchDistance(touch1, touch2)).toBe(50);
    });

    it('should calculate diagonal distance correctly (3-4-5 triangle)', () => {
      const touch1: TouchPoint = { clientX: 0, clientY: 0 };
      const touch2: TouchPoint = { clientX: 3, clientY: 4 };

      expect(getTouchDistance(touch1, touch2)).toBe(5);
    });

    it('should handle negative coordinates', () => {
      const touch1: TouchPoint = { clientX: -50, clientY: -50 };
      const touch2: TouchPoint = { clientX: 50, clientY: 50 };

      // Distance for 100, 100 diagonal
      const expected = Math.sqrt(100 * 100 + 100 * 100);
      expect(getTouchDistance(touch1, touch2)).toBeCloseTo(expected, 5);
    });

    it('should be commutative (order independent)', () => {
      const touch1: TouchPoint = { clientX: 10, clientY: 20 };
      const touch2: TouchPoint = { clientX: 30, clientY: 40 };

      expect(getTouchDistance(touch1, touch2)).toBe(getTouchDistance(touch2, touch1));
    });
  });

  // ============================================================================
  // getTouchMidpoint TESTS
  // ============================================================================

  describe('getTouchMidpoint', () => {
    it('should return the same point for identical touches', () => {
      const touch1: TouchPoint = { clientX: 100, clientY: 100 };
      const touch2: TouchPoint = { clientX: 100, clientY: 100 };
      const result = getTouchMidpoint(touch1, touch2);

      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('should calculate midpoint on horizontal line', () => {
      const touch1: TouchPoint = { clientX: 0, clientY: 50 };
      const touch2: TouchPoint = { clientX: 100, clientY: 50 };
      const result = getTouchMidpoint(touch1, touch2);

      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });

    it('should calculate midpoint on vertical line', () => {
      const touch1: TouchPoint = { clientX: 50, clientY: 0 };
      const touch2: TouchPoint = { clientX: 50, clientY: 100 };
      const result = getTouchMidpoint(touch1, touch2);

      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });

    it('should calculate midpoint on diagonal line', () => {
      const touch1: TouchPoint = { clientX: 0, clientY: 0 };
      const touch2: TouchPoint = { clientX: 100, clientY: 200 };
      const result = getTouchMidpoint(touch1, touch2);

      expect(result.x).toBe(50);
      expect(result.y).toBe(100);
    });

    it('should handle negative coordinates', () => {
      const touch1: TouchPoint = { clientX: -100, clientY: -100 };
      const touch2: TouchPoint = { clientX: 100, clientY: 100 };
      const result = getTouchMidpoint(touch1, touch2);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should be commutative (order independent)', () => {
      const touch1: TouchPoint = { clientX: 20, clientY: 30 };
      const touch2: TouchPoint = { clientX: 80, clientY: 70 };

      const result1 = getTouchMidpoint(touch1, touch2);
      const result2 = getTouchMidpoint(touch2, touch1);

      expect(result1.x).toBe(result2.x);
      expect(result1.y).toBe(result2.y);
    });
  });

  // ============================================================================
  // calculateZoomFactor TESTS
  // ============================================================================

  describe('calculateZoomFactor', () => {
    it('should return 1 when distances are equal', () => {
      expect(calculateZoomFactor(100, 100)).toBe(1);
    });

    it('should return > 1 for zoom in (fingers spreading apart)', () => {
      expect(calculateZoomFactor(100, 200)).toBe(2);
    });

    it('should return < 1 for zoom out (fingers pinching together)', () => {
      expect(calculateZoomFactor(200, 100)).toBe(0.5);
    });

    it('should handle small zoom changes', () => {
      expect(calculateZoomFactor(100, 110)).toBeCloseTo(1.1, 5);
    });

    it('should return 1 for initial distance of 0 (guard against division by zero)', () => {
      expect(calculateZoomFactor(0, 100)).toBe(1);
    });

    it('should return 1 for negative initial distance', () => {
      expect(calculateZoomFactor(-100, 50)).toBe(1);
    });

    it('should return 1 for negative current distance', () => {
      expect(calculateZoomFactor(100, -50)).toBe(1);
    });

    it('should return 1 for non-finite initial distance', () => {
      expect(calculateZoomFactor(Infinity, 100)).toBe(1);
      expect(calculateZoomFactor(NaN, 100)).toBe(1);
    });

    it('should return 1 for non-finite current distance', () => {
      expect(calculateZoomFactor(100, Infinity)).toBe(1);
      expect(calculateZoomFactor(100, NaN)).toBe(1);
    });

    it('should handle very small distances', () => {
      expect(calculateZoomFactor(0.001, 0.002)).toBeCloseTo(2, 5);
    });
  });

  // ============================================================================
  // getTouchDelta TESTS
  // ============================================================================

  describe('getTouchDelta', () => {
    it('should return zero delta for identical points', () => {
      const prev: Point = { x: 100, y: 100 };
      const current: Point = { x: 100, y: 100 };
      const result = getTouchDelta(prev, current);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should calculate positive delta for rightward movement', () => {
      const prev: Point = { x: 0, y: 0 };
      const current: Point = { x: 50, y: 0 };
      const result = getTouchDelta(prev, current);

      expect(result.x).toBe(50);
      expect(result.y).toBe(0);
    });

    it('should calculate negative delta for leftward movement', () => {
      const prev: Point = { x: 100, y: 0 };
      const current: Point = { x: 50, y: 0 };
      const result = getTouchDelta(prev, current);

      expect(result.x).toBe(-50);
      expect(result.y).toBe(0);
    });

    it('should calculate positive delta for downward movement', () => {
      const prev: Point = { x: 0, y: 0 };
      const current: Point = { x: 0, y: 50 };
      const result = getTouchDelta(prev, current);

      expect(result.x).toBe(0);
      expect(result.y).toBe(50);
    });

    it('should calculate diagonal movement correctly', () => {
      const prev: Point = { x: 10, y: 10 };
      const current: Point = { x: 30, y: 40 };
      const result = getTouchDelta(prev, current);

      expect(result.x).toBe(20);
      expect(result.y).toBe(30);
    });
  });

  // ============================================================================
  // clampZoomFactor TESTS
  // ============================================================================

  describe('clampZoomFactor', () => {
    it('should return value unchanged when within bounds', () => {
      expect(clampZoomFactor(1.5)).toBe(1.5);
    });

    it('should clamp to minimum when below', () => {
      expect(clampZoomFactor(0.05, 0.1, 10)).toBe(0.1);
    });

    it('should clamp to maximum when above', () => {
      expect(clampZoomFactor(15, 0.1, 10)).toBe(10);
    });

    it('should use default min/max values', () => {
      expect(clampZoomFactor(0.05)).toBe(0.1);
      expect(clampZoomFactor(15)).toBe(10);
    });

    it('should handle custom bounds', () => {
      expect(clampZoomFactor(0.3, 0.5, 2)).toBe(0.5);
      expect(clampZoomFactor(3, 0.5, 2)).toBe(2);
    });

    it('should return exact boundary values', () => {
      expect(clampZoomFactor(0.1, 0.1, 10)).toBe(0.1);
      expect(clampZoomFactor(10, 0.1, 10)).toBe(10);
    });
  });

  // ============================================================================
  // applyZoomFactor TESTS
  // ============================================================================

  describe('applyZoomFactor', () => {
    it('should multiply current zoom by factor', () => {
      expect(applyZoomFactor(1, 2, 0.1, 10)).toBe(2);
    });

    it('should clamp result to minimum', () => {
      expect(applyZoomFactor(0.2, 0.25, 0.1, 10)).toBe(0.1);
    });

    it('should clamp result to maximum', () => {
      expect(applyZoomFactor(5, 3, 0.1, 10)).toBe(10);
    });

    it('should handle zoom factor of 1 (no change)', () => {
      expect(applyZoomFactor(2, 1, 0.1, 10)).toBe(2);
    });

    it('should handle fractional zoom factors', () => {
      expect(applyZoomFactor(2, 1.5, 0.1, 10)).toBe(3);
    });
  });

  // ============================================================================
  // interpolateZoom TESTS
  // ============================================================================

  describe('interpolateZoom', () => {
    it('should return current zoom when smoothing factor is 0', () => {
      expect(interpolateZoom(1, 2, 0)).toBe(1);
    });

    it('should return target zoom when smoothing factor is 1', () => {
      expect(interpolateZoom(1, 2, 1)).toBe(2);
    });

    it('should interpolate with default factor', () => {
      // Default factor is 0.1, so should move 10% towards target
      const result = interpolateZoom(1, 2);
      expect(result).toBeCloseTo(1.1, 5);
    });

    it('should interpolate with custom factor', () => {
      // With factor 0.5, should be halfway
      expect(interpolateZoom(1, 3, 0.5)).toBe(2);
    });

    it('should clamp smoothing factor to valid range', () => {
      expect(interpolateZoom(1, 2, -1)).toBe(1); // Clamped to 0
      expect(interpolateZoom(1, 2, 2)).toBe(2); // Clamped to 1
    });

    it('should work when zooming out (target < current)', () => {
      expect(interpolateZoom(2, 1, 0.5)).toBe(1.5);
    });
  });

  // ============================================================================
  // isSameGesturePoint TESTS
  // ============================================================================

  describe('isSameGesturePoint', () => {
    it('should return true for identical points', () => {
      const touch1: TouchPoint = { clientX: 100, clientY: 100 };
      const touch2: TouchPoint = { clientX: 100, clientY: 100 };

      expect(isSameGesturePoint(touch1, touch2)).toBe(true);
    });

    it('should return true for points within threshold', () => {
      const touch1: TouchPoint = { clientX: 100, clientY: 100 };
      const touch2: TouchPoint = { clientX: 105, clientY: 105 };

      expect(isSameGesturePoint(touch1, touch2, 10)).toBe(true);
    });

    it('should return false for points outside threshold', () => {
      const touch1: TouchPoint = { clientX: 100, clientY: 100 };
      const touch2: TouchPoint = { clientX: 120, clientY: 120 };

      expect(isSameGesturePoint(touch1, touch2, 10)).toBe(false);
    });

    it('should use default threshold of 10', () => {
      const touch1: TouchPoint = { clientX: 100, clientY: 100 };
      const touch2: TouchPoint = { clientX: 109, clientY: 100 };

      expect(isSameGesturePoint(touch1, touch2)).toBe(true);
    });

    it('should handle edge case at exact threshold', () => {
      const touch1: TouchPoint = { clientX: 0, clientY: 0 };
      const touch2: TouchPoint = { clientX: 10, clientY: 0 };

      // At exactly 10 pixels, should be false (< threshold, not <=)
      expect(isSameGesturePoint(touch1, touch2, 10)).toBe(false);
    });
  });

  // ============================================================================
  // getTouchAngle TESTS
  // ============================================================================

  describe('getTouchAngle', () => {
    it('should return 0 for horizontal right direction', () => {
      const touch1: TouchPoint = { clientX: 0, clientY: 0 };
      const touch2: TouchPoint = { clientX: 100, clientY: 0 };

      expect(getTouchAngle(touch1, touch2)).toBe(0);
    });

    it('should return PI/2 for vertical down direction', () => {
      const touch1: TouchPoint = { clientX: 0, clientY: 0 };
      const touch2: TouchPoint = { clientX: 0, clientY: 100 };

      expect(getTouchAngle(touch1, touch2)).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should return PI for horizontal left direction', () => {
      const touch1: TouchPoint = { clientX: 100, clientY: 0 };
      const touch2: TouchPoint = { clientX: 0, clientY: 0 };

      expect(getTouchAngle(touch1, touch2)).toBeCloseTo(Math.PI, 5);
    });

    it('should return -PI/2 for vertical up direction', () => {
      const touch1: TouchPoint = { clientX: 0, clientY: 100 };
      const touch2: TouchPoint = { clientX: 0, clientY: 0 };

      expect(getTouchAngle(touch1, touch2)).toBeCloseTo(-Math.PI / 2, 5);
    });

    it('should return PI/4 for 45-degree diagonal', () => {
      const touch1: TouchPoint = { clientX: 0, clientY: 0 };
      const touch2: TouchPoint = { clientX: 100, clientY: 100 };

      expect(getTouchAngle(touch1, touch2)).toBeCloseTo(Math.PI / 4, 5);
    });
  });

  // ============================================================================
  // touchToNDC TESTS
  // ============================================================================

  describe('touchToNDC', () => {
    it('should convert center of container to origin (0, 0)', () => {
      const touch: TouchPoint = { clientX: 500, clientY: 500 };
      const result = touchToNDC(touch, 1000, 1000);

      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(0, 5);
    });

    it('should convert top-left to (-1, 1)', () => {
      const touch: TouchPoint = { clientX: 0, clientY: 0 };
      const result = touchToNDC(touch, 1000, 1000);

      expect(result.x).toBeCloseTo(-1, 5);
      expect(result.y).toBeCloseTo(1, 5);
    });

    it('should convert bottom-right to (1, -1)', () => {
      const touch: TouchPoint = { clientX: 1000, clientY: 1000 };
      const result = touchToNDC(touch, 1000, 1000);

      expect(result.x).toBeCloseTo(1, 5);
      expect(result.y).toBeCloseTo(-1, 5);
    });

    it('should handle non-square containers', () => {
      const touch: TouchPoint = { clientX: 800, clientY: 300 };
      const result = touchToNDC(touch, 800, 600);

      expect(result.x).toBeCloseTo(1, 5); // Right edge
      expect(result.y).toBeCloseTo(0, 5); // Middle vertically
    });

    it('should return (0, 0) for zero width container', () => {
      const touch: TouchPoint = { clientX: 100, clientY: 100 };
      const result = touchToNDC(touch, 0, 600);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should return (0, 0) for zero height container', () => {
      const touch: TouchPoint = { clientX: 100, clientY: 100 };
      const result = touchToNDC(touch, 800, 0);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should return (0, 0) for negative dimensions', () => {
      const touch: TouchPoint = { clientX: 100, clientY: 100 };
      const result = touchToNDC(touch, -800, 600);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });
});
