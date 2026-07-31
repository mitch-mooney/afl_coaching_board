import { useMemo } from 'react';
import { boundaryOf, type Boundary } from '../utils/fieldGeometry';
import { boundaryDimensionsOf, selectActiveVenue, useVenueStore } from '../store/venueStore';

/**
 * The Boundary the board is currently rendered against — the IO half of the
 * otherwise pure fieldGeometry, in the same shape as boardSnapshot /
 * boardSnapshotIO.
 *
 * This is the single place a ground is resolved. Everything that needs the
 * ground's size — the grass, the apron, the bowl, the goals, the arcs, the
 * scoreboard's offset, drag clamping, stroke authoring, thumbnails — asks here,
 * so switching the Active Venue moves all of them together and none can be
 * missed. The drag and Stroke hot paths ask on every pointer event, so the
 * result is resolved once in component scope and never per event.
 *
 * Before the Venue records have loaded there is no Active Venue to read, and the
 * board falls back to Standard ground for that instant — the same dimensions the
 * app has always used, so the first paint is never wrong in a new way.
 *
 * Nothing here touches the camera, deliberately: when the Active Venue changes
 * the boundary moves and the viewpoint holds still, because holding it still is
 * the comparison the coach switched grounds to make. See ADR 0002.
 */
export function useActiveBoundary(): Boundary {
  // Subscribed to the record, not to its dimensions: a selector returning a fresh
  // object every read has no stable snapshot for useSyncExternalStore to compare.
  const venue = useVenueStore(selectActiveVenue);
  const { boundaryLength, boundaryWidth } = boundaryDimensionsOf(venue);

  // Keyed on the two measurements rather than the record, so re-reading the
  // Venue table hands back the identical Boundary object and the stadium bowl's
  // geometry — rebuilt whenever this reference changes — is not regenerated for
  // a rename or an unrelated Venue being added.
  return useMemo(
    () => boundaryOf({ boundaryLength, boundaryWidth }),
    [boundaryLength, boundaryWidth],
  );
}
