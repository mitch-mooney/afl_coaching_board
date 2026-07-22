import { create } from 'zustand';
import { playbookDB } from './appDatabase';
import { usePlayStore } from './playStore';
import type { Playbook } from '../models/PlaybookModel';

// The Playbook collection table (distinct from the legacy dead `playbooks` table).
export const playbookTable = playbookDB.playbookCollections;

// Coalesces concurrent ensureDefaultPlaybook() calls (e.g. React StrictMode's
// double-invoked mount effect, or a library mount racing a quick-save) onto a
// single check-then-create, so the "My Plays" default is never created twice.
let ensureDefaultInFlight: Promise<number> | null = null;

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
    // Coalesce concurrent callers onto one in-flight resolution (fixes the
    // check-then-add race that could create duplicate "My Plays" defaults).
    if (ensureDefaultInFlight) return ensureDefaultInFlight;
    ensureDefaultInFlight = (async () => {
      try {
        const all = await playbookTable.toArray();
        // Only the isDefault flag marks the default; fall back to the "My Plays"
        // name solely when no flagged default exists at all.
        const flagged = all.filter((p) => p.isDefault);
        const pool = flagged.length > 0 ? flagged : all.filter((p) => p.name === 'My Plays');
        // Deterministic survivor: earliest created (id tie-break).
        pool.sort((a, b) =>
          a.createdAt === b.createdAt ? (a.id ?? 0) - (b.id ?? 0) : a.createdAt < b.createdAt ? -1 : 1,
        );

        if (pool.length > 0 && pool[0].id != null) {
          const survivor = pool[0];
          // Self-heal any pre-existing duplicate defaults: move their Plays onto
          // the survivor and delete the extras, so the library shows one "My Plays".
          const dupes = pool.slice(1).filter((p) => p.id != null);
          if (dupes.length > 0) {
            for (const dupe of dupes) {
              await usePlayStore.getState().reassignBook(dupe.id!, survivor.id!);
              await playbookTable.delete(dupe.id!);
            }
          }
          if (!survivor.isDefault) {
            await playbookTable.update(survivor.id!, { isDefault: true });
          }
          if (dupes.length > 0 || !survivor.isDefault) await get().loadPlaybooks();
          return survivor.id!;
        }

        const now = new Date().toISOString();
        const id = (await playbookTable.add({
          name: 'My Plays', isDefault: true, createdAt: now, updatedAt: now,
        })) as number;
        await get().loadPlaybooks();
        return id;
      } finally {
        ensureDefaultInFlight = null;
      }
    })();
    return ensureDefaultInFlight;
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
    await usePlayStore.getState().reassignBook(id, defaultId);
    await playbookTable.delete(id);
    if (get().activePlaybookId === id) set({ activePlaybookId: null });
    await get().loadPlaybooks();
  },

  setActivePlaybook: (id) => set({ activePlaybookId: id }),
}));
