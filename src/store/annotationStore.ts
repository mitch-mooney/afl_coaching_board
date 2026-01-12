import { create } from 'zustand';

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
  selectedAnnotationId: string | null;
  selectedTool: AnnotationType | null;
  selectedColor: string;
  thickness: number;

  // Actions
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  selectAnnotation: (annotationId: string | null) => void;
  setSelectedTool: (tool: AnnotationType | null) => void;
  setSelectedColor: (color: string) => void;
  setThickness: (thickness: number) => void;
  getAnnotation: (annotationId: string) => Annotation | undefined;
  updateAnnotationPoints: (id: string, points: number[][]) => void;
  updateAnnotationPoint: (id: string, pointIndex: number, newPoint: number[]) => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: [],
  selectedAnnotationId: null,
  selectedTool: null,
  selectedColor: '#ffff00', // Yellow default
  thickness: 2,
  
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
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    }));
  },
  
  clearAnnotations: () => {
    set({ annotations: [], selectedAnnotationId: null });
  },

  selectAnnotation: (annotationId) => {
    set({ selectedAnnotationId: annotationId });
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

  getAnnotation: (annotationId) => {
    return get().annotations.find((a) => a.id === annotationId);
  },

  updateAnnotationPoints: (id, points) => {
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? { ...a, points } : a
      ),
    }));
  },

  updateAnnotationPoint: (id, pointIndex, newPoint) => {
    set((state) => ({
      annotations: state.annotations.map((a) => {
        if (a.id !== id) return a;
        const updatedPoints = [...a.points];
        updatedPoints[pointIndex] = newPoint;
        return { ...a, points: updatedPoints };
      }),
    }));
  },
}));
