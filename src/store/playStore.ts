import { create } from 'zustand';
import { playbookDB } from './appDatabase';
import type { Play } from '../models/PlayModel';

// Export the table reference so tests can clear it directly.
// (The IndexedDB table keeps its legacy name `scenarios`; a Play is what it stores.)
export const playTable = playbookDB.scenarios;

interface PlayState {
  plays: Play[];
  activePlayId: number | null;
  loadPlays: () => Promise<void>;
  createPlay: (name: string, playbookId: number) => Promise<number>;
  updatePlay: (id: number, patch: Partial<Play>) => Promise<void>;
  deletePlay: (id: number) => Promise<void>;
  setActivePlay: (id: number | null) => void;
}

export const usePlayStore = create<PlayState>((set, get) => ({
  plays: [],
  activePlayId: null,

  loadPlays: async () => {
    try {
      const plays = await playTable.orderBy('createdAt').reverse().toArray();
      set({ plays });
    } catch (err) {
      console.error('[playStore] loadPlays failed', err);
    }
  },

  createPlay: async (name, playbookId) => {
    try {
      const now = new Date().toISOString();
      const id = await playTable.add({
        name,
        createdAt: now,
        updatedAt: now,
        team1RosterId: null,
        team2RosterId: null,
        phases: [],
        playbookId,
      });
      await get().loadPlays();
      return id as number;
    } catch (err) {
      console.error('[playStore] createPlay failed', err);
      throw err;
    }
  },

  updatePlay: async (id, patch) => {
    try {
      await playTable.update(id, { ...patch, updatedAt: new Date().toISOString() });
      await get().loadPlays();
    } catch (err) {
      console.error('[playStore] updatePlay failed', err);
      throw err;
    }
  },

  deletePlay: async (id) => {
    try {
      await playTable.delete(id);
      if (get().activePlayId === id) set({ activePlayId: null });
      await get().loadPlays();
    } catch (err) {
      console.error('[playStore] deletePlay failed', err);
    }
  },

  setActivePlay: (id) => set({ activePlayId: id }),
}));
