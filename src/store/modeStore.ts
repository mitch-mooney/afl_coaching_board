import { create } from 'zustand';
import { usePlayerStore } from './playerStore';
import { useAnnotationStore } from './annotationStore';
import { useConeStore } from './coneStore';

export type AppMode = 'match' | 'training';

interface ContextSnapshot {
  players: ReturnType<typeof usePlayerStore.getState>['players'];
  annotations: ReturnType<typeof useAnnotationStore.getState>['annotations'];
}

interface ModeState {
  mode: AppMode;
  contextSnapshot: ContextSnapshot | null;
  switchMode: (newMode: AppMode) => void;
  saveContext: () => void;
  restoreContext: () => void;
  resetMode: () => void;
}

export const useModeStore = create<ModeState>((set, get) => ({
  mode: 'match',
  contextSnapshot: null,

  saveContext: () => {
    const players = usePlayerStore.getState().players;
    const annotations = useAnnotationStore.getState().annotations;

    set({
      contextSnapshot: {
        players,
        annotations,
      },
    });
  },

  restoreContext: () => {
    const { contextSnapshot } = get();
    if (!contextSnapshot) return;

    usePlayerStore.getState().setPlayers(contextSnapshot.players);
    useAnnotationStore.getState().setAnnotations(contextSnapshot.annotations);
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
    useAnnotationStore.getState().clearAnnotations();
    useConeStore.getState().clearCones();
  },
}));
