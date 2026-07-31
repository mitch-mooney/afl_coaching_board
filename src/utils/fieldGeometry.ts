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
 * The generic ground. No longer what the board renders on — every call site
 * resolves the Active Venue through useActiveBoundary — so this remains for two
 * things only: the dimensions the seeded Standard ground carries, and the
 * ground tests state their claims against.
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

// Lateral zone thresholds, as fractions of half-width.
//
// A wing is the outer part of *this* ground: on a tight ground the wing is
// closer in, because there is less ground for it to be the outside of. So the
// lateral thresholds scale with the Boundary rather than being metres.
//
// Calibrated to reproduce Standard ground exactly — at semiZ = 67.5 they are
// the 30 / 20 / 15 m the board used before Venues existed.
const WING_FRACTION_OF_HALF_WIDTH = 4 / 9; // 0.444 — 30 m at Standard ground
const CHF_HFF_FRACTION_OF_HALF_WIDTH = 8 / 27; // 0.296 — 20 m at Standard ground
const FF_FP_FRACTION_OF_HALF_WIDTH = 2 / 9; // 0.222 — 15 m at Standard ground

// Forward and back thresholds, in metres out from the goal line.
//
// These stay absolute — the top of the 50 is 50 m from goal at every ground in
// the country — but their origin is the goal line at ±semiX, not the centre of
// the ground. Measured from centre, a fixed constant would sit 34.5 m from goal
// on a 165 m ground and 27 m on a 150 m one, sliding the forward line relative
// to the goal it is named after.
//
// Calibrated to reproduce Standard ground exactly: at semiX = 82.5 they are the
// x >= 48 and x >= 28 the board used before Venues existed.
const FULL_FORWARD_METRES_FROM_GOAL = 34.5;
const HALF_FORWARD_METRES_FROM_GOAL = 54.5;

/**
 * How far the centre zone reaches from the bounce, on both axes, in metres.
 *
 * This is the one threshold that is neither relative nor goal-anchored, because
 * the centre square is a 50 × 50 Absolute marking sitting at the middle of the
 * ground: 15 m from the bounce already means the same thing everywhere. Scaling
 * it with the width would push a player standing inside the painted square out
 * of the centre on a tight ground.
 */
const CENTRE_ZONE_METRES_FROM_BOUNCE = 15;

/**
 * How far a position sits out from the goal line it is attacking — the origin
 * every forward/back threshold is measured from. Negative once past the goal
 * line, which the deepest-forward branch reads as deeper still.
 */
function metresFromGoal(x: number, boundary: Boundary): number {
  return boundary.semiX - Math.abs(x);
}

/**
 * Maps field x/z coordinates to an AFL position code, against the ground the
 * board is currently rendered on. The field runs along the X axis: positive X =
 * team2 attacking end. Returns null if the position doesn't map clearly to a
 * known zone.
 *
 * The two axes are treated differently, and the reason is football, not code.
 * **Lateral** thresholds are fractions of half-width, because a wing is defined
 * relative to the ground it is on. **Forward and back** thresholds are absolute
 * metres — but measured from the goal line, which sits at ±semiX, not from the
 * centre of the ground. The top of the 50 is 50 m from goal at every ground in
 * the country, so the goal line is the only origin that keeps "full forward"
 * meaning deep inside the 50 rather than sliding with the ground's length.
 *
 * The one exception to both is the centre zone, which is measured in metres from
 * the bounce on both axes — see CENTRE_ZONE_METRES_FROM_BOUNCE.
 *
 * Zone layout (from team2 attacking end to team1 attacking end), where dTG is
 * distance to that end's goal line and fZ is |z| as a fraction of half-width:
 *   FF/FP:  dTG <= 34.5, split at fZ 0.222
 *   CHF:    dTG <= 54.5 && fZ < 0.296
 *   HFF:    dTG <= 54.5 && fZ >= 0.296
 *   W:      not forward or back && fZ >= 0.444
 *   C/RK:   |x| < 15 && |z| < 15
 *   RR/R:   general midfield
 *   HBF/CHB, BP/FB: the back half mirrors.
 *
 * NOTE: the ordering bug that makes FB and BP unreachable is deliberately left
 * alone here — see .scratch/venue/deferred/01. This function's venue-awareness
 * is a pure substitution of *which* thresholds are used, not a change to *what*
 * it returns.
 */
export function positionToZone(x: number, z: number, boundary: Boundary): string | null {
  const absZ = Math.abs(z);

  const wing = WING_FRACTION_OF_HALF_WIDTH * boundary.semiZ;
  const flankSplit = CHF_HFF_FRACTION_OF_HALF_WIDTH * boundary.semiZ;
  const pocketSplit = FF_FP_FRACTION_OF_HALF_WIDTH * boundary.semiZ;

  // Distance out from the nearer goal line, so the two bands read the same at
  // both ends of the ground; the sign of x is what picks the end.
  const fromGoal = metresFromGoal(x, boundary);
  const withinFullForwardDepth = fromGoal <= FULL_FORWARD_METRES_FROM_GOAL;
  const withinHalfForwardDepth = fromGoal <= HALF_FORWARD_METRES_FROM_GOAL;

  // Forward pocket / full forward end
  if (x > 0 && withinFullForwardDepth) {
    if (absZ < pocketSplit) return 'FF';
    return 'FP';
  }

  // Half forward flank / centre half forward
  if (x > 0 && withinHalfForwardDepth) {
    if (absZ < flankSplit) return 'CHF';
    return 'HFF';
  }

  // Wing
  if (absZ >= wing && !withinHalfForwardDepth) {
    return 'W';
  }

  // Centre midfield zone — measured from the bounce on both axes, never scaled.
  if (Math.abs(x) < CENTRE_ZONE_METRES_FROM_BOUNCE && absZ < CENTRE_ZONE_METRES_FROM_BOUNCE) {
    return 'C';
  }

  // General midfield (rover / ruck rover)
  if (!withinHalfForwardDepth && absZ < wing) {
    return 'R';
  }

  // Half back flank / centre half back
  if (x < 0 && withinHalfForwardDepth) {
    if (absZ < flankSplit) return 'CHB';
    return 'HBF';
  }

  // Back pocket / full back end
  if (x < 0 && withinFullForwardDepth) {
    if (absZ < pocketSplit) return 'FB';
    return 'BP';
  }

  return null;
}
