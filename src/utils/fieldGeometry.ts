import type { BoundaryDimensions } from '../models/VenueModel';
import { STANDARD_GROUND_DIMENSIONS } from '../models/VenueModel';
import type { BoardSnapshot } from './boardSnapshot';

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

/**
 * How far inside the ellipse a snapped point is placed, as a fraction of the
 * semi-axes — about 80 nanometres at a real ground, and far larger than the
 * rounding it exists to absorb.
 *
 * `cos`/`sin` round, so a point projected onto the ellipse can land a few ULPs
 * *outside* it and fail isPointInField. Nobody noticed while snapping only ever
 * clamped a drag, but out-of-bounds asks the two functions to agree:
 * isPointInField(snapToField(p)) must be true, or dragging a player to the wing
 * would report them off the ground, and Pull inside boundary would leave a
 * notice it had just resolved.
 */
const SNAP_INSET = 1e-9;

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
      const snappedX = boundary.semiX * Math.cos(angle) * (1 - SNAP_INSET);
      const snappedZ = boundary.semiZ * Math.sin(angle) * (1 - SNAP_INSET);

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

// ── Out of bounds ───────────────────────────────────────────────────────────
//
// The snapshot-level form of the two point-level functions above: what of a
// board's content sits outside a Boundary, and the same board with that content
// pulled inside. Both stay pure — the live board and the Active Venue are
// resolved by useOutOfBounds, the same split as useActiveBoundary.
//
// Annotations are absent from both, deliberately. They are inert markup and may
// point off-ground on purpose — an arrow drawn from where the interchange bench
// would be is not a mistake to count, and moving its endpoint would distort a
// shape the coach drew.

/**
 * What of a board's content sits outside a Boundary. Ids rather than a bare
 * number so a caller can point at the entities as well as count them.
 */
export interface OutOfBoundsReport {
  /** Ids of the players standing outside the boundary. */
  players: string[];
  /** Ids of the cones outside the boundary. */
  cones: string[];
  /** Ids of the MovementPaths with at least one keyframe outside the boundary. */
  paths: string[];
  /** Whether the ball is outside; false when the board has no ball. */
  ball: boolean;
  /**
   * How many entities are outside. A path counts once however many of its
   * keyframes leave the ground, so this reads as "how much of the structure
   * doesn't fit" — one winger a metre out versus half the side — rather than as
   * a keyframe tally.
   */
  count: number;
}

/** Is this entity position on the ground? Only x/z matter; y is height. */
function isPositionInField(position: [number, number, number], boundary: Boundary): boolean {
  return isPointInField(position[0], position[2], boundary);
}

/**
 * Project a position onto the boundary if it is outside it. Returns the *same*
 * array when it is already inside, which is what lets pullInsideBoundary leave
 * in-bounds content byte-identical rather than rebuilding it.
 */
function pullPositionInside(
  position: [number, number, number],
  boundary: Boundary,
): [number, number, number] {
  if (isPositionInField(position, boundary)) return position;
  const [x, z] = snapToField(position[0], position[2], boundary);
  // Height is carried through untouched: content is pulled sideways onto the
  // ground, never lifted.
  return [x, position[1], z];
}

/**
 * What of this board falls outside the given ground. Derived on demand and never
 * stored: it appears the instant the Active Venue changes and clears the instant
 * it is resolved, so there is no dirty flag to keep in sync.
 */
export function outOfBounds(snap: BoardSnapshot, boundary: Boundary): OutOfBoundsReport {
  const players = snap.players
    .filter((player) => !isPositionInField(player.position, boundary))
    .map((player) => player.id);

  const cones = snap.cones
    .filter((cone) => !isPositionInField(cone.position, boundary))
    .map((cone) => cone.id);

  // A path matters more than a static position: a play whose leads run off the
  // ground looks perfectly fine standing still and only fails when the coach
  // presses play in front of the team.
  const paths = snap.paths
    .filter((path) => path.keyframes.some((kf) => !isPositionInField(kf.position, boundary)))
    .map((path) => path.id);

  const ball = snap.ball ? !isPositionInField(snap.ball.position, boundary) : false;

  return {
    players,
    cones,
    paths,
    ball,
    count: players.length + cones.length + paths.length + (ball ? 1 : 0),
  };
}

/**
 * The same board with every out-of-bounds player, cone, ball and path keyframe
 * projected onto the boundary. Never called automatically — no fit on load and
 * no clamp during playback — because reshaping a play the coach designed is
 * their decision, not the app's. This is the one-tap version of making it.
 *
 * Content that already fits is returned by reference, so "pulled inside" and
 * "untouched" are distinguishable by identity as well as by value; the input
 * snapshot is never mutated.
 */
export function pullInsideBoundary(snap: BoardSnapshot, boundary: Boundary): BoardSnapshot {
  return {
    ...snap,
    players: snap.players.map((player) => {
      const position = pullPositionInside(player.position, boundary);
      return position === player.position ? player : { ...player, position };
    }),
    cones: snap.cones.map((cone) => {
      const position = pullPositionInside(cone.position, boundary);
      return position === cone.position ? cone : { ...cone, position };
    }),
    paths: snap.paths.map((path) => {
      let moved = false;
      const keyframes = path.keyframes.map((kf) => {
        const position = pullPositionInside(kf.position, boundary);
        if (position === kf.position) return kf;
        moved = true;
        return { ...kf, position };
      });
      return moved ? { ...path, keyframes } : path;
    }),
    ball: (() => {
      if (!snap.ball) return snap.ball;
      const position = pullPositionInside(snap.ball.position, boundary);
      return position === snap.ball.position ? snap.ball : { ...snap.ball, position };
    })(),
    // annotations and camera ride through the spread untouched.
  };
}
