import { useCallback } from 'react';
import { useHistoryStore } from '../store/historyStore';
import { usePlayerStore } from '../store/playerStore';

/**
 * useBoardUndo - restores the previous player positions from history.
 * Shared by the Setup pod's Undo control and the Ctrl/Cmd-Z keyboard shortcut.
 */
export function useBoardUndo() {
  const updateMultiplePlayers = usePlayerStore((s) => s.updateMultiplePlayers);
  const { undo, canUndo, pauseRecording, resumeRecording } = useHistoryStore();

  const handleUndo = useCallback(() => {
    if (!canUndo()) return;
    pauseRecording(); // don't record the restoration as a new action
    const snapshot = undo();
    if (snapshot) {
      const updates = snapshot.players.map((p) => ({
        playerId: p.id,
        position: p.position,
        rotation: p.rotation,
      }));
      updateMultiplePlayers(updates);
    }
    resumeRecording();
  }, [undo, canUndo, pauseRecording, resumeRecording, updateMultiplePlayers]);

  return { handleUndo, canUndo };
}
