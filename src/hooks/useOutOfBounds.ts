import { useMemo } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { usePathStore } from '../store/pathStore';
import { useBallStore } from '../store/ballStore';
import { useConeStore } from '../store/coneStore';
import { capture, restore } from '../utils/boardSnapshotIO';
import { editBoard } from '../utils/boardEdit';
import { PULL_INSIDE_BOUNDARY_LABEL } from '../components/Board/hud/fitReadout';
import {
  outOfBounds,
  pullInsideBoundary,
  type Boundary,
  type OutOfBoundsReport,
} from '../utils/fieldGeometry';
import { useActiveBoundary } from './useActiveBoundary';

/**
 * The store-touching half of `fieldGeometry`'s out-of-bounds pair: what of the
 * *live* board falls outside the *Active* Venue, and the one-tap edit that pulls
 * it inside. Same split as useActiveBoundary and boardSnapshot / boardSnapshotIO
 * — all the geometry is over there and testable at any dimensions.
 */

/**
 * What of the live board falls outside the Active Venue's Boundary.
 *
 * Derived, never stored: the report is recomputed from whatever is on the board
 * right now, so it appears the instant the Active Venue changes and clears the
 * instant the coach resolves it. There is no dirty flag and nothing to keep in
 * sync, which is what makes leaving a play out of bounds a legitimate state to
 * sit in rather than an error the app has to remember.
 */
export function useOutOfBounds(): OutOfBoundsReport {
  const boundary = useActiveBoundary();
  const players = usePlayerStore((s) => s.players);
  const paths = usePathStore((s) => s.paths);
  const ball = useBallStore((s) => s.ball);
  const cones = useConeStore((s) => s.cones);

  // Four subscriptions, not six: outOfBounds takes PlaceableContent, so
  // annotations are not merely ignored — there is nowhere to pass them, and an
  // arrow the coach redraws cannot re-run the report.
  return useMemo(
    () => outOfBounds({ players, paths, ball, cones }, boundary),
    [players, paths, ball, cones, boundary],
  );
}

/**
 * Pull every out-of-bounds player, cone, path keyframe and the ball inside the
 * given Boundary, as one undoable board edit.
 *
 * Plain function rather than a hook so an event handler can call it directly.
 * The board is read and written through the snapshot IO path, so this knows
 * nothing about individual store shapes — and nothing here reaches Dexie: the
 * Play on disk only changes when the coach saves it, which is what makes looking
 * at a play on another ground cost nothing.
 */
export function pullBoardInsideBoundary(boundary: Boundary): void {
  const before = capture();
  if (outOfBounds(before, boundary).count === 0) return;

  // One Board edit, recorded through the module every edit goes through. Its
  // label is what the Fit readout's memory reads: while an entry with this
  // label is on `past`, the readout says the board has been pulled inside, and
  // undo takes the claim away with the edit. Still no dirty flag — nothing is
  // set here that anything else has to clear.
  editBoard(PULL_INSIDE_BOUNDARY_LABEL, () => {
    // The camera is nulled on the way back in, exactly as undo does it: pulling
    // content inside must not touch the viewpoint, and holding the view still
    // while the ground changes underneath is the comparison the coach came for.
    restore({ ...pullInsideBoundary(before, boundary), camera: null });
  });
}
