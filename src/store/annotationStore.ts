import { create } from 'zustand';
import {
  useHistoryStore,
  createStateSnapshot,
  type AnnotationSnapshot,
} from './historyStore';

// Lazy getter to avoid circular dependency with playerStore
const getPlayerStore = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./playerStore').usePlayerStore;

export type AnnotationType = 'line' | 'arrow' | 'circle' | 'rectangle' | 'text';

export interface Annotation {
  id: string;
  type: AnnotationType;
  points: number[][]; // 2D points on screen or 3D points in world space
  color: string;
  thickness?: number;
  text?: string;
  createdAt: Date;
}

interface AnnotationState {
  annotations: Annotation[];
  selectedTool: AnnotationType | null;
  selectedColor: string;
  thickness: number;

  // Actions
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  setSelectedTool: (tool: AnnotationType | null) => void;
  setSelectedColor: (color: string) => void;
  setThickness: (thickness: number) => void;
  /** Restore annotations from a history snapshot (for undo/redo) */
  restoreFromSnapshot: (snapshots: AnnotationSnapshot[]) => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: [],
  selectedTool: null,
  selectedColor: '#ffff00', // Yellow default
  thickness: 2,

  addAnnotation: (annotation) => {
    const { annotations } = get();
    const historyStore = useHistoryStore.getState();
    const playerStore = getPlayerStore().getState();

    // Push current state to history before making the change
    if (!historyStore.isPaused) {
      historyStore.pushSnapshot(
        createStateSnapshot(playerStore.players, annotations)
      );
    }

    const newAnnotation: Annotation = {
      ...annotation,
      id: `annotation-${Date.now()}-${Math.random()}`,
      createdAt: new Date(),
    };
    set((state) => ({
      annotations: [...state.annotations, newAnnotation],
    }));
  },

  removeAnnotation: (id) => {
    const { annotations } = get();
    const historyStore = useHistoryStore.getState();
    const playerStore = getPlayerStore().getState();

    // Push current state to history before making the change
    if (!historyStore.isPaused) {
      historyStore.pushSnapshot(
        createStateSnapshot(playerStore.players, annotations)
      );
    }

    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
    }));
  },

  clearAnnotations: () => {
    const { annotations } = get();
    const historyStore = useHistoryStore.getState();
    const playerStore = getPlayerStore().getState();

    // Only push to history if there are annotations to clear
    if (!historyStore.isPaused && annotations.length > 0) {
      historyStore.pushSnapshot(
        createStateSnapshot(playerStore.players, annotations)
      );
    }

    set({ annotations: [] });
  },

  setSelectedTool: (tool) => {
    set({ selectedTool: tool });
  },

  setSelectedColor: (color) => {
    set({ selectedColor: color });
  },

  setThickness: (thickness) => {
    set({ thickness });
  },

  restoreFromSnapshot: (snapshots) => {
    // Rebuild annotations from snapshots
    const restoredAnnotations: Annotation[] = snapshots.map((snapshot) => ({
      id: snapshot.id,
      type: snapshot.type,
      points: snapshot.points.map((point) => [...point]),
      color: snapshot.color,
      thickness: snapshot.thickness,
      text: snapshot.text,
      createdAt: new Date(), // Restore with current timestamp since we don't store it
    }));

    set({ annotations: restoredAnnotations });
  },
}));
