import { beginEdit } from './boardEdit';
import { capture, restore } from './boardSnapshotIO';
import { dropBall } from './ballDrop';
import { useBallStore } from '../store/ballStore';

/** The open half of a ball drag — call `drop()` when the coach's hand lifts. */
export interface BallDragHandle {
  /**
   * Ends the drag: applies the drop inside the drag's own Board edit and
   * commits it, so the move and the give are one undo step. Idempotent: a
   * second call does nothing.
   */
  drop: (at: [number, number, number], playerIdUnder: string | null) => void;
}

/**
 * Begin the Board edit for a ball drag. The drag writes the ball's position
 * live as the finger moves; the drop then decides who, if anyone, has it.
 *
 * The drop is computed from the ball as it was when the drag began, not where
 * the drag left it. Dragging a held ball off and back onto its Carrier is then
 * `dropBall`'s same-reference case, the ball goes back where it was, and the
 * edit records nothing. Every other slice is read at the drop, so anything else
 * that folded into the edit mid-drag is kept.
 */
export function beginBallDrag(): BallDragHandle {
  const startBall = useBallStore.getState().ball;
  const edit = beginEdit('Move ball');
  let dropped = false;

  return {
    drop: (at, playerIdUnder) => {
      if (dropped) return;
      dropped = true;
      restore(dropBall({ ...capture(), ball: startBall }, at, playerIdUnder));
      edit.commit();
    },
  };
}
