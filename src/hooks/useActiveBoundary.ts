import { STANDARD_BOUNDARY, type Boundary } from '../utils/fieldGeometry';

/**
 * The Boundary the board is currently rendered against — the IO half of the
 * otherwise pure fieldGeometry, in the same shape as boardSnapshot /
 * boardSnapshotIO.
 *
 * Every component that needs the ground's size resolves it here, once, in
 * component scope: the drag and Stroke hot paths ask for it on every pointer
 * event, so it must not be recomputed per event.
 *
 * Today it answers Standard ground. When the Active Venue arrives (Venue wave,
 * ticket 03) this is the ONLY place that changes — which is the point of having
 * it: no call site can be missed, because no call site names a ground.
 */
export function useActiveBoundary(): Boundary {
  return STANDARD_BOUNDARY;
}
