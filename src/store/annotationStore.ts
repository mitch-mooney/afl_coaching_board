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
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  annotations: [],
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
    }));
  },
  
  clearAnnotations: () => {
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
}));
