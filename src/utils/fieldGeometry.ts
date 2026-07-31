import type { BoundaryDimensions } from '../models/VenueModel';
import { STANDARD_GROUND_DIMENSIONS } from '../models/VenueModel';

// Helper functions for field geometry calculations.
//
// Everything here is pure and store-free: the ground is passed in as a Boundary
// rather than read from a store, so geometry can be tested at any dimensions and
// leaf layers can use it without pulling in the store graph. Same split as
// boardSnapshot / boardSnapshotIO.

/**
 * The boundary ellipse, as geometry consumes it. Semi-axes rather than full
 * dimensions because that is what the ellipse maths wants at nearly every site.
 * Deliberately not the whole Venue record — geometry has no business reading a
 * ground's name or id.
 */
export interface Boundary {
  /** Half the goal-to-goal length, in metres. */
  semiX: number;
  /** Half the wing-to-wing width, in metres. */
  semiZ: number;
}

export function boundaryOf(dimensions: BoundaryDimensions): Boundary {
  return {
    semiX: dimensions.boundaryLength / 2,
    semiZ: dimensions.boundaryWidth / 2,
  };
}

/**
 * The generic ground. Call sites use this until the Active Venue exists (Venue
 * wave, ticket 03) — at which point they resolve a Boundary from the store
 * instead and this stays only as the fallback the seeded Venue carries.
 */
export const STANDARD_BOUNDARY: Boundary = boundaryOf(STANDARD_GROUND_DIMENSIONS);

export function isPointInField(x: number, z: number, boundary: Boundary): boolean {
  // Ellipse equation: (x/a)^2 + (z/b)^2 <= 1
  const normalizedX = x / boundary.semiX;
  const normalizedZ = z / boundary.semiZ;

  return (normalizedX * normalizedX + normalizedZ * normalizedZ) <= 1;
}

export function snapToField(x: number, z: number, boundary: Boundary): [number, number] {
  // Snap position to field boundary if outside
  if (!isPointInField(x, z, boundary)) {
    const normalizedX = x / boundary.semiX;
    const normalizedZ = z / boundary.semiZ;

    // Calculate distance from center
    const distance = Math.sqrt(normalizedX * normalizedX + normalizedZ * normalizedZ);

    if (distance > 1) {
      // Project onto ellipse boundary
      const angle = Math.atan2(normalizedZ, normalizedX);
      const snappedX = boundary.semiX * Math.cos(angle);
      const snappedZ = boundary.semiZ * Math.sin(angle);

      return [snappedX, snappedZ];
    }
  }

  return [x, z];
}

/**
 * Maps field x/z coordinates to an AFL position code based on zone boundaries.
 * The field runs along the X axis: positive X = team2 attacking end.
 * Returns null if the position doesn't map clearly to a known zone.
 *
 * Zone layout (from team2 attacking end to team1 attacking end):
 *   FF/FP:  x >= 48
 *   CHF:    x >= 30 && |z| < 20
 *   HFF:    x >= 30 && |z| >= 20
 *   W:      |x| < 30 && |z| >= 30
 *   C/RK:   |x| < 15 && |z| < 15
 *   RR/R:   |x| < 30 && |z| < 30 (general midfield)
 *   HBF:    x <= -30 && |z| >= 20
 *   CHB:    x <= -30 && |z| < 20
 *   BP/FB:  x <= -48
 *
 * NOTE: these thresholds are still calibrated to Standard ground and take no
 * Boundary. Making them follow the Active Venue — lateral thresholds relative to
 * half-width, forward/back anchored to the goal line — is the Venue wave's ticket
 * 04, which changes the signature and the thresholds together. A Boundary accepted
 * here now and ignored would look venue-aware while silently answering for a
 * different ground, which is the exact failure this wave exists to remove.
 */
export function positionToZone(x: number, z: number): string | null {
  const absZ = Math.abs(z);

  // Forward pocket / full forward end
  if (x >= 48) {
    if (absZ < 15) return 'FF';
    return 'FP';
  }

  // Half forward flank / centre half forward
  if (x >= 28) {
    if (absZ < 20) return 'CHF';
    return 'HFF';
  }

  // Wing
  if (absZ >= 30 && Math.abs(x) < 28) {
    return 'W';
  }

  // Centre midfield zone
  if (Math.abs(x) < 15 && absZ < 15) {
    return 'C';
  }

  // General midfield (rover / ruck rover)
  if (Math.abs(x) < 28 && absZ < 30) {
    return 'R';
  }

  // Half back flank / centre half back
  if (x <= -28) {
    if (absZ < 20) return 'CHB';
    return 'HBF';
  }

  // Back pocket / full back end
  if (x <= -48) {
    if (absZ < 15) return 'FB';
    return 'BP';
  }

  return null;
}
