/**
 * PathModel - Types and utilities for entity movement paths
 * Reusable path system for ball and player animation
 */

// Entity types that can have movement paths
export type PathEntityType = 'ball' | 'player';

/**
 * A single keyframe representing position at a specific time
 */
export interface Keyframe {
  timestamp: number; // Time in seconds (0 = start)
  position: [number, number, number]; // [x, y, z]
}

/**
 * A waypoint is an alias for Keyframe - used for path editing UI
 * Waypoints are user-placed points that become keyframes
 */
export type Waypoint = Keyframe;

/**
 * A movement path defining how an entity moves over time
 */
export interface MovementPath {
  id: string;
  entityId: string; // ID of the ball or player this path belongs to
  entityType: PathEntityType; // 'ball' or 'player'
  keyframes: Keyframe[]; // Ordered by timestamp
  duration: number; // Total duration in seconds
}

// Path system defaults
export const PATH_DEFAULTS = {
  duration: 5, // Default 5 second animation
  minKeyframes: 2, // Minimum keyframes for a valid path (start + end)
} as const;

/**
 * Create a keyframe at a specific timestamp and position
 */
export function createKeyframe(
  timestamp: number,
  position: [number, number, number]
): Keyframe {
  return {
    timestamp,
    position,
  };
}

/**
 * Create a movement path for an entity
 */
export function createMovementPath(
  entityId: string,
  entityType: PathEntityType,
  startPosition: [number, number, number],
  endPosition: [number, number, number],
  duration: number = PATH_DEFAULTS.duration,
  id?: string
): MovementPath {
  return {
    id: id ?? `path-${entityType}-${entityId}-${Date.now()}`,
    entityId,
    entityType,
    keyframes: [
      createKeyframe(0, startPosition),
      createKeyframe(duration, endPosition),
    ],
    duration,
  };
}

/**
 * Create a movement path from an array of waypoints
 */
export function createPathFromWaypoints(
  entityId: string,
  entityType: PathEntityType,
  waypoints: Waypoint[],
  id?: string
): MovementPath {
  if (waypoints.length < PATH_DEFAULTS.minKeyframes) {
    throw new Error(`Path requires at least ${PATH_DEFAULTS.minKeyframes} waypoints`);
  }

  // Sort waypoints by timestamp
  const sortedKeyframes = [...waypoints].sort((a, b) => a.timestamp - b.timestamp);

  // Calculate duration from last keyframe
  const duration = sortedKeyframes[sortedKeyframes.length - 1].timestamp;

  return {
    id: id ?? `path-${entityType}-${entityId}-${Date.now()}`,
    entityId,
    entityType,
    keyframes: sortedKeyframes,
    duration,
  };
}

/**
 * Add a keyframe to an existing path
 */
export function addKeyframeToPath(
  path: MovementPath,
  keyframe: Keyframe
): MovementPath {
  const newKeyframes = [...path.keyframes, keyframe].sort(
    (a, b) => a.timestamp - b.timestamp
  );
  const newDuration = Math.max(path.duration, keyframe.timestamp);

  return {
    ...path,
    keyframes: newKeyframes,
    duration: newDuration,
  };
}

/**
 * Remove a keyframe from a path by index
 */
export function removeKeyframeFromPath(
  path: MovementPath,
  keyframeIndex: number
): MovementPath {
  if (path.keyframes.length <= PATH_DEFAULTS.minKeyframes) {
    throw new Error(`Cannot remove keyframe: path requires at least ${PATH_DEFAULTS.minKeyframes} keyframes`);
  }

  const newKeyframes = path.keyframes.filter((_, index) => index !== keyframeIndex);
  const newDuration = newKeyframes.length > 0
    ? newKeyframes[newKeyframes.length - 1].timestamp
    : 0;

  return {
    ...path,
    keyframes: newKeyframes,
    duration: newDuration,
  };
}

/**
 * Update a keyframe in a path
 */
export function updateKeyframeInPath(
  path: MovementPath,
  keyframeIndex: number,
  updates: Partial<Keyframe>
): MovementPath {
  const newKeyframes = path.keyframes.map((kf, index) =>
    index === keyframeIndex ? { ...kf, ...updates } : kf
  ).sort((a, b) => a.timestamp - b.timestamp);

  const newDuration = newKeyframes[newKeyframes.length - 1].timestamp;

  return {
    ...path,
    keyframes: newKeyframes,
    duration: newDuration,
  };
}

/**
 * Check if a path is valid (has minimum required keyframes)
 */
export function isValidPath(path: MovementPath): boolean {
  return path.keyframes.length >= PATH_DEFAULTS.minKeyframes && path.duration > 0;
}
