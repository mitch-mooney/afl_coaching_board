import { useCallback } from 'react';
import {
  useHistoryStore,
  annotationFromSnapshot,
  type StateSnapshot,
} from '../store/historyStore';
import { usePlayerStore } from '../store/playerStore';
import { useAnnotationStore } from '../store/annotationStore';

/**
 * Applies a history snapshot back onto the live board — player positions and
 * annotations. Keeps undo's lightweight player+annotation shape (paths/ball/
 * cones/camera are intentionally outside undo for this slice).
 */
export function restoreBoardSnapshot(snapshot: StateSnapshot): void {
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
  const { undo, canUndo, pauseRecording, resumeRecording } =
    useHistoryStore.getState();
  if (!canUndo()) return;
  pauseRecording(); // don't record the restoration as a new action
  const snapshot = undo();
  if (snapshot) restoreBoardSnapshot(snapshot);
  resumeRecording();
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
