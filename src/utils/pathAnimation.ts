import { MovementPath, Keyframe } from '../models/PathModel';

/**
 * pathAnimation - Utility functions for keyframe interpolation and path animation
 * Provides time-based and progress-based position calculations
 */

// Type for 3D position tuple
type Position3D = [number, number, number];

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Linear interpolation between two 3D positions
 */
export function lerpPosition(
  start: Position3D,
  end: Position3D,
  t: number
): Position3D {
  return [
    lerp(start[0], end[0], t),
    lerp(start[1], end[1], t),
    lerp(start[2], end[2], t),
  ];
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Find the two keyframes surrounding a given timestamp
 * Returns the keyframe indices for interpolation
 */
export function findSurroundingKeyframes(
  keyframes: Keyframe[],
  timestamp: number
): { startIndex: number; endIndex: number } {
  if (keyframes.length === 0) {
    return { startIndex: -1, endIndex: -1 };
  }

  if (keyframes.length === 1) {
    return { startIndex: 0, endIndex: 0 };
  }

  // Find the first keyframe with timestamp > target
  let endIndex = keyframes.findIndex((kf) => kf.timestamp > timestamp);

  // If no keyframe found with timestamp > target, use the last keyframe
  if (endIndex === -1) {
    endIndex = keyframes.length - 1;
  }

  // Start index is one before end, clamped to 0
  const startIndex = Math.max(0, endIndex - 1);

  // If timestamp is before first keyframe, both indices point to first
  if (timestamp <= keyframes[0].timestamp) {
    return { startIndex: 0, endIndex: 0 };
  }

  return { startIndex, endIndex };
}

/**
 * Get the interpolated position at a specific timestamp
 */
export function getPositionAtTime(
  path: MovementPath,
  timestamp: number
): Position3D {
  const { keyframes, duration } = path;

  // Handle empty path
  if (keyframes.length === 0) {
    return [0, 0, 0];
  }

  // Handle single keyframe
  if (keyframes.length === 1) {
    return [...keyframes[0].position] as Position3D;
  }

  // Clamp timestamp to valid range
  const clampedTime = clamp(timestamp, 0, duration);

  // Find surrounding keyframes
  const { startIndex, endIndex } = findSurroundingKeyframes(keyframes, clampedTime);

  // If same index, return that keyframe's position
  if (startIndex === endIndex) {
    return [...keyframes[startIndex].position] as Position3D;
  }

  const startKeyframe = keyframes[startIndex];
  const endKeyframe = keyframes[endIndex];

  // Calculate interpolation factor (0-1) between the two keyframes
  const timeDelta = endKeyframe.timestamp - startKeyframe.timestamp;
  const t = timeDelta > 0 ? (clampedTime - startKeyframe.timestamp) / timeDelta : 0;

  return lerpPosition(startKeyframe.position, endKeyframe.position, t);
}

/**
 * Get the interpolated position at a global time, accounting for startTimeOffset
 * Handles three cases:
 * 1. globalTime < startTimeOffset: returns start position (animation hasn't started yet)
 * 2. globalTime > startTimeOffset + duration: returns end position (animation finished)
 * 3. Otherwise: interpolates using local time (globalTime - startTimeOffset)
 */
export function getPositionAtTimeWithOffset(
  path: MovementPath,
  globalTime: number
): Position3D {
  const { keyframes, duration, startTimeOffset } = path;

  // Handle empty path
  if (keyframes.length === 0) {
    return [0, 0, 0];
  }

  // Case 1: Animation hasn't started yet - return start position
  if (globalTime < startTimeOffset) {
    return [...keyframes[0].position] as Position3D;
  }

  // Case 2: Animation has finished - return end position
  if (globalTime > startTimeOffset + duration) {
    return [...keyframes[keyframes.length - 1].position] as Position3D;
  }

  // Case 3: Animation is in progress - interpolate using local time
  const localTime = globalTime - startTimeOffset;
  return getPositionAtTime(path, localTime);
}

/**
 * Get the interpolated position at a progress value (0 to 1)
 * Useful for animation playback where progress is normalized
 */
export function getPositionAtProgress(
  path: MovementPath,
  progress: number
): Position3D {
  // Convert progress (0-1) to timestamp
  const timestamp = clamp(progress, 0, 1) * path.duration;
  return getPositionAtTime(path, timestamp);
}

/**
 * Calculate the total length of a path (sum of distances between keyframes)
 */
export function getPathLength(path: MovementPath): number {
  const { keyframes } = path;

  if (keyframes.length < 2) {
    return 0;
  }

  let totalLength = 0;

  for (let i = 1; i < keyframes.length; i++) {
    const prev = keyframes[i - 1].position;
    const curr = keyframes[i].position;
    totalLength += getDistance(prev, curr);
  }

  return totalLength;
}

/**
 * Calculate distance between two 3D points
 */
export function getDistance(a: Position3D, b: Position3D): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Easing function: ease-in-out (smooth acceleration and deceleration)
 * Input and output are both 0-1
 */
export function easeInOut(t: number): number {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Easing function: ease-out (fast start, slow end)
 */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 2);
}

/**
 * Easing function: ease-in (slow start, fast end)
 */
export function easeIn(t: number): number {
  return t * t;
}

/**
 * Get position with easing applied to progress
 */
export function getPositionAtProgressWithEasing(
  path: MovementPath,
  progress: number,
  easingFn: (t: number) => number = easeInOut
): Position3D {
  const easedProgress = easingFn(clamp(progress, 0, 1));
  return getPositionAtProgress(path, easedProgress);
}

/**
 * Sample positions along a path at regular intervals
 * Useful for rendering path visualization
 */
export function samplePathPositions(
  path: MovementPath,
  numSamples: number
): Position3D[] {
  if (numSamples < 2) {
    return [getPositionAtProgress(path, 0)];
  }

  const positions: Position3D[] = [];

  for (let i = 0; i < numSamples; i++) {
    const progress = i / (numSamples - 1);
    positions.push(getPositionAtProgress(path, progress));
  }

  return positions;
}

/**
 * Check if a path has any movement (start and end positions differ)
 */
export function pathHasMovement(path: MovementPath): boolean {
  const { keyframes } = path;

  if (keyframes.length < 2) {
    return false;
  }

  const startPos = keyframes[0].position;
  const endPos = keyframes[keyframes.length - 1].position;

  // Check if positions differ (with small epsilon for floating point comparison)
  const epsilon = 0.0001;
  return (
    Math.abs(startPos[0] - endPos[0]) > epsilon ||
    Math.abs(startPos[1] - endPos[1]) > epsilon ||
    Math.abs(startPos[2] - endPos[2]) > epsilon
  );
}

/**
 * Get the velocity at a given progress point (approximate using small delta)
 * Returns velocity vector [vx, vy, vz]
 */
export function getVelocityAtProgress(
  path: MovementPath,
  progress: number
): Position3D {
  const delta = 0.01; // Small time delta for derivative approximation

  const clampedProgress = clamp(progress, 0, 1);
  const p1 = clampedProgress;
  const p2 = clamp(clampedProgress + delta, 0, 1);

  // If at the end, look backwards
  const actualP1 = p2 === p1 ? clamp(p1 - delta, 0, 1) : p1;
  const actualP2 = p2 === p1 ? p1 : p2;

  const pos1 = getPositionAtProgress(path, actualP1);
  const pos2 = getPositionAtProgress(path, actualP2);

  const dt = (actualP2 - actualP1) * path.duration;

  if (dt === 0) {
    return [0, 0, 0];
  }

  return [
    (pos2[0] - pos1[0]) / dt,
    (pos2[1] - pos1[1]) / dt,
    (pos2[2] - pos1[2]) / dt,
  ];
}
