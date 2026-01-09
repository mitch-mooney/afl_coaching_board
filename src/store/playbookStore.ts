import { create } from 'zustand';
import Dexie, { Table } from 'dexie';
import { Player } from '../models/PlayerModel';

interface Playbook {
  id?: number;
  name: string;
  description?: string;
  createdAt: Date;
  playerPositions: Player[];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraZoom: number;
  annotations?: any[]; // Will be defined when annotations are implemented
}

class PlaybookDatabase extends Dexie {
  playbooks!: Table<Playbook>;

  constructor() {
    super('AFLPlaybookDB');
    this.version(1).stores({
      playbooks: '++id, name, createdAt',
    });
  }
}

const db = new PlaybookDatabase();

interface PlaybookState {
  playbooks: Playbook[];
  currentPlaybook: Playbook | null;
  isLoading: boolean;
  
  // Actions
  loadPlaybooks: () => Promise<void>;
  savePlaybook: (playbook: Omit<Playbook, 'id' | 'createdAt'>) => Promise<number>;
  deletePlaybook: (id: number) => Promise<void>;
  loadPlaybook: (id: number) => Promise<void>;
  clearCurrentPlaybook: () => void;
}

export const usePlaybookStore = create<PlaybookState>((set) => ({
  playbooks: [],
  currentPlaybook: null,
  isLoading: false,
  
  loadPlaybooks: async () => {
    set({ isLoading: true });
    try {
      const playbooks = await db.playbooks.orderBy('createdAt').reverse().toArray();
      set({ playbooks, isLoading: false });
    } catch (error) {
      console.error('Error loading playbooks:', error);
      set({ isLoading: false });
    }
  },
  
  savePlaybook: async (playbookData) => {
    try {
      const playbook: Playbook = {
        ...playbookData,
        createdAt: new Date(),
      };
      const id = await db.playbooks.add(playbook);
      await usePlaybookStore.getState().loadPlaybooks();
      return id;
    } catch (error) {
      console.error('Error saving playbook:', error);
      throw error;
    }
  },
  
  deletePlaybook: async (id) => {
    try {
      await db.playbooks.delete(id);
      await usePlaybookStore.getState().loadPlaybooks();
      if (usePlaybookStore.getState().currentPlaybook?.id === id) {
        set({ currentPlaybook: null });
      }
    } catch (error) {
      console.error('Error deleting playbook:', error);
      throw error;
    }
  },
  
  loadPlaybook: async (id) => {
    try {
      const playbook = await db.playbooks.get(id);
      if (playbook) {
        set({ currentPlaybook: playbook });
      }
    } catch (error) {
      console.error('Error loading playbook:', error);
      throw error;
    }
  },
  
  clearCurrentPlaybook: () => {
    set({ currentPlaybook: null });
  },
}));
