/**
 * Touch helper utilities for gesture detection calculations.
 * Provides functions for distance, midpoint, and zoom factor calculations
 * used in pinch-to-zoom and two-finger pan gestures.
 */

/**
 * Point interface representing a 2D coordinate
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Touch point interface compatible with Touch API and pointer events
 */
export interface TouchPoint {
  clientX: number;
  clientY: number;
}

/**
 * Calculates the Euclidean distance between two touch points
 * @param touch1 - First touch point with clientX and clientY
 * @param touch2 - Second touch point with clientX and clientY
 * @returns Distance in pixels between the two points
 */
export function getTouchDistance(touch1: TouchPoint, touch2: TouchPoint): number {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the midpoint between two touch points
 * @param touch1 - First touch point with clientX and clientY
 * @param touch2 - Second touch point with clientX and clientY
 * @returns Point representing the midpoint coordinates
 */
export function getTouchMidpoint(touch1: TouchPoint, touch2: TouchPoint): Point {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

/**
 * Calculates the zoom factor based on initial and current pinch distances
 * @param initialDistance - Distance between touch points at gesture start
 * @param currentDistance - Current distance between touch points
 * @returns Zoom factor (> 1 = zoom in, < 1 = zoom out, 1 = no change)
 */
export function calculateZoomFactor(initialDistance: number, currentDistance: number): number {
  // Guard against division by zero or invalid input
  if (initialDistance <= 0 || !Number.isFinite(initialDistance)) {
    return 1;
  }

  if (currentDistance < 0 || !Number.isFinite(currentDistance)) {
    return 1;
  }

  return currentDistance / initialDistance;
}

/**
 * Calculates the delta (change) between two points
 * Useful for tracking pan gesture movement
 * @param previousPoint - Previous touch position
 * @param currentPoint - Current touch position
 * @returns Delta object with x and y movement
 */
export function getTouchDelta(previousPoint: Point, currentPoint: Point): Point {
  return {
    x: currentPoint.x - previousPoint.x,
    y: currentPoint.y - previousPoint.y,
  };
}

/**
 * Clamps a zoom factor within specified bounds
 * @param zoomFactor - The zoom factor to clamp
 * @param minZoom - Minimum allowed zoom level (default: 0.1)
 * @param maxZoom - Maximum allowed zoom level (default: 10)
 * @returns Clamped zoom factor
 */
export function clampZoomFactor(
  zoomFactor: number,
  minZoom: number = 0.1,
  maxZoom: number = 10
): number {
  return Math.max(minZoom, Math.min(maxZoom, zoomFactor));
}

/**
 * Applies a zoom delta to a current zoom level with bounds checking
 * @param currentZoom - Current zoom level
 * @param zoomFactor - Zoom factor from pinch gesture
 * @param minZoom - Minimum allowed zoom level
 * @param maxZoom - Maximum allowed zoom level
 * @returns New zoom level clamped within bounds
 */
export function applyZoomFactor(
  currentZoom: number,
  zoomFactor: number,
  minZoom: number = 0.1,
  maxZoom: number = 10
): number {
  const newZoom = currentZoom * zoomFactor;
  return clampZoomFactor(newZoom, minZoom, maxZoom);
}

/**
 * Smoothly interpolates between two zoom levels
 * Useful for smoother zoom animations
 * @param currentZoom - Current zoom level
 * @param targetZoom - Target zoom level
 * @param smoothingFactor - Interpolation factor (0-1, higher = faster)
 * @returns Interpolated zoom level
 */
export function interpolateZoom(
  currentZoom: number,
  targetZoom: number,
  smoothingFactor: number = 0.1
): number {
  const clampedFactor = Math.max(0, Math.min(1, smoothingFactor));
  return currentZoom + (targetZoom - currentZoom) * clampedFactor;
}

/**
 * Determines if two touch points are close enough to be considered the same gesture
 * @param touch1 - First touch point
 * @param touch2 - Second touch point
 * @param threshold - Distance threshold in pixels (default: 10)
 * @returns True if touch points are within threshold distance
 */
export function isSameGesturePoint(
  touch1: TouchPoint,
  touch2: TouchPoint,
  threshold: number = 10
): boolean {
  const distance = getTouchDistance(touch1, touch2);
  return distance < threshold;
}

/**
 * Calculates the angle between two touch points in radians
 * @param touch1 - First touch point
 * @param touch2 - Second touch point
 * @returns Angle in radians
 */
export function getTouchAngle(touch1: TouchPoint, touch2: TouchPoint): number {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.atan2(dy, dx);
}

/**
 * Converts touch coordinates to normalized device coordinates (NDC)
 * Useful for Three.js integration where coordinates are -1 to 1
 * @param touchPoint - Touch point with clientX and clientY
 * @param containerWidth - Width of the container element
 * @param containerHeight - Height of the container element
 * @returns Point with x and y in range -1 to 1
 */
export function touchToNDC(
  touchPoint: TouchPoint,
  containerWidth: number,
  containerHeight: number
): Point {
  // Guard against division by zero
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (touchPoint.clientX / containerWidth) * 2 - 1,
    y: -(touchPoint.clientY / containerHeight) * 2 + 1,
  };
}
