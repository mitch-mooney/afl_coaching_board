import { create } from 'zustand';
import { usePlayerStore } from './playerStore';
import { useAnnotationStore } from './annotationStore';
import { useConeStore } from './coneStore';
import { useHistoryStore } from './historyStore';
import { capture, restore } from '../utils/boardSnapshotIO';
import type { BoardSnapshot } from '../utils/boardSnapshot';

export type AppMode = 'match' | 'training';

interface ModeState {
  mode: AppMode;
  contextSnapshot: BoardSnapshot | null;
  switchMode: (newMode: AppMode) => void;
  saveContext: () => void;
  restoreContext: () => void;
  resetMode: () => void;
}

export const useModeStore = create<ModeState>((set, get) => ({
  mode: 'match',
  contextSnapshot: null,

  // Stash the whole board through the canonical snapshot seam, so a mode switch
  // preserves paths/ball/cones/camera too — not just players + annotations.
  saveContext: () => {
    set({ contextSnapshot: capture() });
  },

  restoreContext: () => {
    const { contextSnapshot } = get();
    if (!contextSnapshot) return;

    restore(contextSnapshot);
  },

  switchMode: (newMode: AppMode) => {
    const { mode } = get();

    if (mode === newMode) return;

    if (mode === 'match' && newMode === 'training') {
      get().saveContext();
    } else if (mode === 'training' && newMode === 'match') {
      get().restoreContext();
    }

    set({ mode: newMode });
  },

  resetMode: () => {
    set({ mode: 'match', contextSnapshot: null });
    usePlayerStore.getState().resetPlayers();
    // A mode reset is not a user board-edit — don't record it as undoable.
    const history = useHistoryStore.getState();
    history.pauseRecording();
    useAnnotationStore.getState().clearAnnotations();
    history.resumeRecording();
    useConeStore.getState().clearCones();
  },
}));
