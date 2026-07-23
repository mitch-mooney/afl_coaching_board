import { Plane, Ray, Vector2, Vector3, Camera, Raycaster } from 'three';
import { snapToField } from './fieldGeometry';

/** Rotation applied per recentred screen-pixel during right-drag. */
export const ROTATION_SENSITIVITY = 0.01;
/** A drag step must exceed this (metres) before it sets a facing direction. */
export const FACING_MIN_DISTANCE = 0.3;

// Module-scoped scratch — avoids the per-frame Vector3/Plane allocation the
// inline callers used to do. Safe to share only because callers run inside a
// synchronous, single-threaded useFrame: intersectGroundPlane writes then
// reads scratchHit within one uninterrupted call and returns a fresh array,
// so nothing aliases the scratch across calls. Don't reuse from async code.
const GROUND_PLANE = new Plane(new Vector3(0, 1, 0), 0); // y = 0
const scratchHit = new Vector3();

/**
 * Intersect a ray with the ground plane (y = 0). Returns the [x, z] hit, or
 * null when the ray is parallel to the plane or points away from it.
 */
export function intersectGroundPlane(ray: Ray): [number, number] | null {
  const hit = ray.intersectPlane(GROUND_PLANE, scratchHit);
  return hit ? [hit.x, hit.z] : null;
}

/**
 * Facing rotation for a drag step: atan2(dx, dz) once the move exceeds
 * minDistance, else null (too small to determine a direction).
 */
export function facingRotation(
  from: [number, number, number],
  to: [number, number, number],
  minDistance: number = FACING_MIN_DISTANCE,
): number | null {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const dist = Math.sqrt(dx * dx + dz * dz);
  return dist > minDistance ? Math.atan2(dx, dz) : null;
}

/**
 * Right-drag rotation: horizontal screen delta → new absolute rotation.
 * viewportWidth is passed in (was window.innerWidth) so this is pure.
 */
export function dragRotation(
  startRotation: number,
  startClientX: number,
  pointerX: number,
  viewportWidth: number,
  sensitivity: number = ROTATION_SENSITIVITY,
): number {
  const clientX = (pointerX * viewportWidth) / 2;
  const deltaX = clientX - (startClientX - viewportWidth / 2);
  return startRotation + deltaX * sensitivity;
}

/**
 * Snap the current pointer onto the field: raycast from the camera, intersect
 * the ground plane, snap to field bounds. Returns [x, z] or null. The caller
 * owns y (players sit at 0, the ball at AFL_BALL.length).
 */
export function snapPointerToField(
  pointer: Vector2,
  camera: Camera,
  raycaster: Raycaster,
): [number, number] | null {
  raycaster.setFromCamera(pointer, camera);
  const point = intersectGroundPlane(raycaster.ray);
  if (!point) return null;
  return snapToField(point[0], point[1]);
}
