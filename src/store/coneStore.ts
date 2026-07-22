import { create } from 'zustand';

export interface Cone {
  id: string;
  position: [number, number, number];
}

interface ConeState {
  cones: Cone[];
  isConePlacementActive: boolean;
  addCone: (position: [number, number, number]) => void;
  removeCone: (id: string) => void;
  setCones: (cones: Cone[]) => void;
  clearCones: () => void;
  setConePlacementActive: (active: boolean) => void;
}

const createId = () => Math.random().toString(36).substring(2, 9);

export const useConeStore = create<ConeState>((set) => ({
  cones: [],
  isConePlacementActive: false,

  addCone(position: [number, number, number]) {
    set((state) => ({
      cones: [...state.cones, { id: createId(), position }],
    }));
  },

  removeCone(id: string) {
    set((state) => ({ cones: state.cones.filter((c) => c.id !== id) }));
  },

  setCones(cones: Cone[]) {
    set({ cones });
  },

  clearCones() {
    set({ cones: [] });
  },

  setConePlacementActive(active: boolean) {
    set({ isConePlacementActive: active });
  },
}));
