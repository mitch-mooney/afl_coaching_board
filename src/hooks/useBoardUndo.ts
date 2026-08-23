import { useCallback } from 'react';
import {
  useHistoryStore,
  annotationFromSnapshot,
  type StateSnapshot,
} from '../store/historyStore';
import { usePlayerStore } from '../store/playerStore';
import { useAnnotationStore } from '../store/annotationStore';
import { restore } from '../utils/boardSnapshotIO';

/**
 * Applies a history snapshot back onto the live board — player positions and
 * annotations. Keeps undo's lightweight player+annotation shape (paths/ball/
 * cones/camera are intentionally outside undo for this slice).
 *
 * An edit that reached further than that records the whole board it was made
 * against, and is undone by putting that board back wholesale — otherwise
 * undoing Pull inside boundary would return the players and leave the ball,
 * cones and path keyframes where the pull put them.
 */
export function restoreBoardSnapshot(snapshot: StateSnapshot): void {
  if (snapshot.board) {
    // The camera is dropped rather than restored: it stays outside undo, and a
    // null camera is exactly what tells restore() to leave the live one alone.
    restore({ ...snapshot.board, camera: null });
    return;
  }

  const updates = snapshot.players.map((p) => ({
    playerId: p.id,
    position: p.position,
    rotation: p.rotation,
  }));
  usePlayerStore.getState().updateMultiplePlayers(updates);
  useAnnotationStore
    .getState()
    .setAnnotations(snapshot.annotations.map(annotationFromSnapshot));
}

/**
 * Undo the most recent recorded board edit. Plain function (no React) so the
 * restore path is directly unit-testable; the hook below just wraps it.
 */
export function undoBoard(): void {
  // Nothing here has to suppress recording: a restore writes the board stores,
  // and the board stores record nothing — only the surface that made an edit
  // does. See `historyStore.recordPreEditSnapshot`.
  const { undo, canUndo } = useHistoryStore.getState();
  if (!canUndo()) return;
  const snapshot = undo();
  if (snapshot) restoreBoardSnapshot(snapshot);
}

/**
 * useBoardUndo - restores the previous board state (players + annotations) from
 * history. Shared by the Setup pod's Undo control and the Ctrl/Cmd-Z shortcut.
 */
export function useBoardUndo() {
  const canUndo = useHistoryStore((s) => s.canUndo);
  const handleUndo = useCallback(() => undoBoard(), []);
  return { handleUndo, canUndo };
}
