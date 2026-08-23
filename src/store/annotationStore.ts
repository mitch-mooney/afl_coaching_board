import { create } from 'zustand';

export type AnnotationType = 'line' | 'arrow' | 'circle' | 'rectangle' | 'text' | 'measure' | 'magnifying-glass';

export interface Annotation {
  id: string;
  type: AnnotationType;
  points: number[][]; // 2D points on screen or 3D points in world space
  color: string;
  thickness?: number;
  text?: string;
  magnifySize?: number;
  magnifyZoom?: number;
  createdAt: Date;
}

interface AnnotationState {
  annotations: Annotation[];
  selectedColor: string;
  thickness: number;
  livePreview: { type: AnnotationType; points: number[][] } | null;
  // Pending 3D placement point for the Text tip — set on tap, cleared after input
  pendingTextPoint: [number, number, number] | null;
  /**
   * Where on screen that tap landed, in client coordinates, so the text field
   * can appear beside it instead of across the board. Optional: a pending point
   * set without one falls back to a centred field.
   */
  pendingTextAnchor: { x: number; y: number } | null;

  // Actions
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  setSelectedColor: (color: string) => void;
  setThickness: (thickness: number) => void;
  setLivePreview: (preview: { type: AnnotationType; points: number[][] } | null) => void;
  setPendingTextPoint: (
    point: [number, number, number] | null,
    anchor?: { x: number; y: number } | null
  ) => void;
  clearLivePreview: () => void;
  setAnnotations: (annotations: Annotation[]) => void;
  exportAnnotations: () => string;
  loadAnnotations: (json: string) => void;
}

/**
 * The store mutates the board and records nothing. Every action below serves
 * both the coach and the app — the same `clearAnnotations` is a coach's *Clear
 * annotations* and a mode reset, the same `setAnnotations` is a restore — and
 * only the caller can tell those apart. So the surface that made the edit
 * records it, with `historyStore.recordPreEditSnapshot`, before calling in here.
 *
 * That includes `removeAnnotation`, which no surface calls today: the first one
 * to call it has to record, or removing an Annotation silently stops being
 * undoable while adding and clearing still are.
 */
export const useAnnotationStore = create<AnnotationState>((set) => ({
  annotations: [],
  selectedColor: '#ffff00', // Yellow default
  thickness: 2,
  livePreview: null,
  pendingTextPoint: null,
  pendingTextAnchor: null,

  // One setter owns both halves, so the anchor can never outlive or contradict
  // the placement point it belongs to.
  setPendingTextPoint: (point, anchor = null) => {
    set({ pendingTextPoint: point, pendingTextAnchor: point ? anchor : null });
  },

  addAnnotation: (annotation) => {
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
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
    }));
  },

  clearAnnotations: () => {
    set({ annotations: [] });
  },
  
  setSelectedColor: (color) => {
    set({ selectedColor: color });
  },
  
  setThickness: (thickness) => {
    set({ thickness });
  },

  setLivePreview: (preview) => {
    set({ livePreview: preview });
  },

  clearLivePreview: () => {
    set({ livePreview: null });
  },

  setAnnotations: (annotations) => {
    set({ annotations });
  },

  exportAnnotations: () => {
    let currentState: Annotation[];
    useAnnotationStore.getState();
    currentState = useAnnotationStore.getState().annotations;
    return JSON.stringify(currentState);
  },

  loadAnnotations: (json) => {
    try {
      const parsed = JSON.parse(json) as Annotation[];
      set({ annotations: parsed });
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  },
}));
