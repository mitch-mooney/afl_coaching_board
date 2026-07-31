/**
 * A **Venue** is a ground the coach has measured. Only its boundary varies between
 * grounds — every other marking (centre square, 50 m arcs, goal square, post spacing)
 * is identical everywhere and lives in FIELD_MARKINGS.
 *
 * See docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md. This module holds
 * only the dimensions today; the full Venue record and its store arrive with the
 * Venue wave's ticket 02.
 */

/** The axes of a Venue's boundary ellipse, in metres. */
export interface BoundaryDimensions {
  /** Goal-to-goal, in metres. */
  boundaryLength: number;
  /** Wing-to-wing, in metres. */
  boundaryWidth: number;
}

/**
 * The generic ground the board falls back to. These are the dimensions that used to
 * be hardcoded in FIELD_CONFIG — they match no real ground, which is the whole reason
 * Venues exist. Kept as the seeded, un-deletable Venue so that there is always an
 * Active Venue and no consumer needs a null branch.
 */
export const STANDARD_GROUND_DIMENSIONS: BoundaryDimensions = {
  boundaryLength: 165,
  boundaryWidth: 135,
};
