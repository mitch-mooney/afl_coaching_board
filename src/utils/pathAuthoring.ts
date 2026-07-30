/**
 * Turning a Path-tip Stroke into a MovementPath.
 *
 * A Path Stroke must begin on the entity it belongs to, and its timing comes
 * from physics rather than from how fast the pen moved — see
 * `docs/adr/0001-pen-authors-finger-manipulates.md`.
 */

import {
  createPathFromWaypoints,
  type MovementPath,
  type PathEntityType,
  type Waypoint,
} from '../models/PathModel';

/** How far from an entity a Stroke may start and still claim it, in metres. */
export const STROKE_CLAIM_RADIUS = 2;

/**
 * The pace a MovementPath is animated at, in metres per second — a hard
 * running pace for a lead. A Stroke's *shape* comes from the pen and its
 * *timing* from physics, so how fast the pen moved means nothing.
 */
export const RUNNING_PACE = 6;

/** Shortest MovementPath a Stroke can produce, in seconds. */
export const MIN_PATH_DURATION = 1;

/** A Stroke covering less ground than this means nothing, in metres. */
export const MIN_STROKE_DISTANCE = 1;

/**
 * How far the pen must travel before a Path Stroke records another sample, in
 * metres. Coarse on purpose: a MovementPath is a run, not a signature.
 */
export const MIN_STROKE_SAMPLE_DISTANCE = 1.5;

export interface StrokeCandidate {
  id: string;
  type: PathEntityType;
  position: readonly [number, number, number];
}

export interface EntityRef {
  id: string;
  type: PathEntityType;
}

/**
 * The entity a Stroke starting at `point` belongs to: the nearest candidate
 * within `radius` on the ground plane, or null if the Stroke started on open
 * grass. The radius is forgiving on purpose — a pen landing just beside a
 * player on an iPad still means that player.
 */
export function entityAtStrokeStart(
  point: readonly [number, number, number],
  entities: readonly StrokeCandidate[],
  radius: number = STROKE_CLAIM_RADIUS
): EntityRef | null {
  let claimed: EntityRef | null = null;
  let claimedDistance = radius;

  for (const entity of entities) {
    const dx = entity.position[0] - point[0];
    const dz = entity.position[2] - point[2];
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance <= claimedDistance) {
      claimed = { id: entity.id, type: entity.type };
      claimedDistance = distance;
    }
  }

  return claimed;
}

/**
 * The MovementPath a Path Stroke describes for `entity`, or null if the Stroke
 * is too short to mean anything.
 */
export function pathFromStroke(
  entity: EntityRef,
  points: readonly number[][]
): MovementPath | null {
  // Cumulative distance to each point, so timestamps track ground covered
  // rather than sample index — the pen samples unevenly, the runner does not.
  const travelledTo = cumulativeStrokeLength(points);
  const travelled = travelledTo[travelledTo.length - 1];

  if (points.length < 2 || travelled <= MIN_STROKE_DISTANCE) return null;

  // The floor stretches time uniformly, so a floored path keeps the stroke's
  // shape and its even pacing — it just plays slower than the running pace.
  const stretch = Math.max(1, MIN_PATH_DURATION / (travelled / RUNNING_PACE));

  const waypoints: Waypoint[] = points.map((position, index) => ({
    timestamp: (travelledTo[index] / RUNNING_PACE) * stretch,
    position: [position[0], position[1], position[2]] as [number, number, number],
  }));

  return createPathFromWaypoints(entity.id, entity.type, waypoints);
}

/**
 * Ground distance travelled along a Stroke at each of its points, in metres.
 * The first entry is always 0; the last is the Stroke's total length.
 */
function cumulativeStrokeLength(points: readonly number[][]): number[] {
  const travelled = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dz = points[i][2] - points[i - 1][2];
    travelled.push(travelled[i - 1] + Math.sqrt(dx * dx + dz * dz));
  }
  return travelled;
}
