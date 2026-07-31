import { useMemo } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { usePathStore } from '../store/pathStore';
import { useBallStore } from '../store/ballStore';
import { useConeStore } from '../store/coneStore';
import { useHistoryStore, createStateSnapshot } from '../store/historyStore';
import { capture, restore } from '../utils/boardSnapshotIO';
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

  return useMemo(
    () =>
      outOfBounds(
        // Annotations are never out of bounds, so this deliberately does not
        // subscribe to them: an arrow the coach redraws must not re-run the
        // report, and passing an empty list states that rule at the call site.
        { players, paths, ball, cones, annotations: [], camera: null },
        boundary,
      ),
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

  // Recorded before the edit, exactly as a drag records its pre-drag board. The
  // full board rides along because this moves more than players — see
  // StateSnapshot.board.
  useHistoryStore.getState().pushSnapshot({
    ...createStateSnapshot(before.players, before.annotations),
    board: before,
  });

  restore(pullInsideBoundary(before, boundary));
}
