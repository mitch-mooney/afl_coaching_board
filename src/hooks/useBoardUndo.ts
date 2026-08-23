import { useCallback } from 'react';
import { useHistoryStore } from '../store/historyStore';
import { restore } from '../utils/boardSnapshotIO';
import type { BoardSnapshot } from '../utils/boardSnapshot';

/**
 * Applies a history entry's board back onto the live one, with the camera
 * dropped: it stays outside undo, and a null camera is exactly what tells
 * `restore()` to leave the live one alone.
 */
function restoreEntryBoard(board: BoardSnapshot): void {
  restore({ ...board, camera: null });
}

/**
 * Undo the most recent recorded board edit. Plain function (no React) so the
 * restore path is directly unit-testable; the hook below just wraps it.
 */
export function undoBoard(): void {
  // Nothing here has to suppress recording: a restore writes the board stores,
  // and the board stores record nothing — only `boardEdit`'s open edit does,
  // and undo's own restore never opens one.
  const { undo, canUndo } = useHistoryStore.getState();
  if (!canUndo()) return;
  const entry = undo();
  if (entry) restoreEntryBoard(entry.before);
}

/**
 * Redo the most recently undone board edit, restoring the board as it stood
 * after that edit. No control or shortcut calls this today — issue #63 keeps
 * the question of whether a coach should have redo at all — but the data is
 * there to restore, so this is what doing so looks like.
 */
export function redoBoard(): void {
  const { redo, canRedo } = useHistoryStore.getState();
  if (!canRedo()) return;
  const entry = redo();
  if (entry) restoreEntryBoard(entry.after);
}

/**
 * useBoardUndo - restores the previous board state from history. Shared by
 * the Setup pod's Undo control and the Ctrl/Cmd-Z shortcut.
 */
export function useBoardUndo() {
  const canUndo = useHistoryStore((s) => s.canUndo);
  const handleUndo = useCallback(() => undoBoard(), []);
  return { handleUndo, canUndo };
}
