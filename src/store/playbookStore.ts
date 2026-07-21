import { create } from 'zustand';
import { playbookDB } from './appDatabase';
import type { Playbook } from '../models/PlaybookModel';

// The Playbook collection table (distinct from the legacy dead `playbooks` table).
export const playbookTable = playbookDB.playbookCollections;

interface PlaybookState {
  playbooks: Playbook[];
  activePlaybookId: number | null;
  loadPlaybooks: () => Promise<void>;
  ensureDefaultPlaybook: () => Promise<number>;
  createPlaybook: (name: string) => Promise<number>;
  renamePlaybook: (id: number, name: string) => Promise<void>;
  deletePlaybook: (id: number) => Promise<void>;
  setActivePlaybook: (id: number | null) => void;
}

export const usePlaybookStore = create<PlaybookState>((set, get) => ({
  playbooks: [],
  activePlaybookId: null,

  loadPlaybooks: async () => {
    try {
      const playbooks = await playbookTable.orderBy('createdAt').toArray();
      set({ playbooks });
    } catch (err) {
      console.error('[playbookStore] loadPlaybooks failed', err);
    }
  },

  ensureDefaultPlaybook: async () => {
    const all = await playbookTable.toArray();
    const existing = all.find((p) => p.isDefault) ?? all.find((p) => p.name === 'My Plays');
    if (existing?.id != null) return existing.id;
    const now = new Date().toISOString();
    const id = (await playbookTable.add({
      name: 'My Plays', isDefault: true, createdAt: now, updatedAt: now,
    })) as number;
    await get().loadPlaybooks();
    return id;
  },

  createPlaybook: async (name) => {
    const now = new Date().toISOString();
    const id = (await playbookTable.add({ name, createdAt: now, updatedAt: now })) as number;
    await get().loadPlaybooks();
    return id;
  },

  renamePlaybook: async (id, name) => {
    await playbookTable.update(id, { name, updatedAt: new Date().toISOString() });
    await get().loadPlaybooks();
  },

  deletePlaybook: async (id) => {
    const target = await playbookTable.get(id);
    if (!target || target.isDefault) return; // never delete the "My Plays" safety net
    const defaultId = await get().ensureDefaultPlaybook();
    // Reassign this Playbook's Plays to the default (requires the playbookId index).
    await playbookDB.scenarios.where('playbookId').equals(id).modify({ playbookId: defaultId });
    await playbookTable.delete(id);
    if (get().activePlaybookId === id) set({ activePlaybookId: null });
    await get().loadPlaybooks();
  },

  setActivePlaybook: (id) => set({ activePlaybookId: id }),
}));
