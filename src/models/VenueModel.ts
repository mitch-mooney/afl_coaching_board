/**
 * A **Venue** is a ground the coach has measured. Only its boundary varies between
 * grounds — every other marking (centre square, 50 m arcs, goal square, post spacing)
 * is identical everywhere and lives in FIELD_MARKINGS.
 *
 * See docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md.
 */

/** The axes of a Venue's boundary ellipse, in metres. */
export interface BoundaryDimensions {
  /** Goal-to-goal, in metres. */
  boundaryLength: number;
  /** Wing-to-wing, in metres. */
  boundaryWidth: number;
}

/** A named ground the coach has measured. */
export interface Venue extends BoundaryDimensions {
  id?: number; // Dexie auto-increment PK
  name: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  isDefault?: boolean; // true for the un-deletable "Standard ground"
}

/**
 * The generic ground the board falls back to. These are the dimensions that used to
 * be hardcoded in the field model — they match no real ground, which is the whole
 * reason Venues exist. Seeded as an un-deletable Venue so that there is always an
 * Active Venue and no consumer needs a null branch.
 */
export const STANDARD_GROUND_NAME = 'Standard ground';

export const STANDARD_GROUND_DIMENSIONS: BoundaryDimensions = {
  boundaryLength: 165,
  boundaryWidth: 135,
};

/**
 * The range a community ground plausibly falls in. Outside it we warn; we never
 * refuse, because the coach paced the ground out and we did not.
 */
const PLAUSIBLE_LENGTH = { min: 120, max: 200 };
const PLAUSIBLE_WIDTH = { min: 90, max: 170 };

export type VenueValidation =
  | { ok: true; warning?: string }
  | { ok: false; error: string };

/**
 * Validate a coach's measurements.
 *
 * Only one mistake is worth blocking: entering the two numbers the wrong way round.
 * An AFL ground is always longer goal-to-goal than it is wing-to-wing, so a width
 * that meets or exceeds the length is a transposition, not a ground — and accepting
 * it would silently reshape the spacing of every Play. Everything else is at most
 * unusual, and unusual grounds are exactly the ones this feature exists for.
 */
export function validateBoundaryDimensions(dimensions: BoundaryDimensions): VenueValidation {
  const { boundaryLength, boundaryWidth } = dimensions;

  if (!Number.isFinite(boundaryLength) || !Number.isFinite(boundaryWidth)) {
    return { ok: false, error: 'Enter both dimensions in metres.' };
  }

  if (boundaryLength <= 0 || boundaryWidth <= 0) {
    return { ok: false, error: 'Both dimensions must be greater than zero.' };
  }

  if (boundaryWidth >= boundaryLength) {
    return {
      ok: false,
      error: 'A ground is longer than it is wide — check the two numbers are the right way round.',
    };
  }

  const outOfRange =
    boundaryLength < PLAUSIBLE_LENGTH.min ||
    boundaryLength > PLAUSIBLE_LENGTH.max ||
    boundaryWidth < PLAUSIBLE_WIDTH.min ||
    boundaryWidth > PLAUSIBLE_WIDTH.max;

  if (outOfRange) {
    return {
      ok: true,
      warning: `That is an unusual size for a ground (most run ${PLAUSIBLE_LENGTH.min}–${PLAUSIBLE_LENGTH.max} m long and ${PLAUSIBLE_WIDTH.min}–${PLAUSIBLE_WIDTH.max} m wide). Saved as measured.`,
    };
  }

  return { ok: true };
}
