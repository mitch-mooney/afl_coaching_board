import { create } from 'zustand';
import { playbookDB } from './appDatabase';
import type { Play, PlayPhase } from '../models/PlayModel';
import { toPhase, fromPhase } from '../utils/boardSnapshot';
import { capture, restore } from '../utils/boardSnapshotIO';

// Export the table reference so tests can clear it directly.
// (The IndexedDB table keeps its legacy name `scenarios`; a Play is what it stores.)
export const playTable = playbookDB.scenarios;

// The identity of a Play's first (and, today, only) phase. This literal and the
// `phases: [phase]` wrapping around it live HERE and nowhere else — playStore is
// the single gateway that turns the live board into a saved Play and back.
const PHASE_1 = { id: 'phase-1', label: 'Phase 1' } as const;

// Capture the live board as a phase-1 PlayPhase. The one place the capture→wrap
// ritual `toPhase(capture(), PHASE_1)` is spelled out.
const captureAsPhase = (): PlayPhase => toPhase(capture(), PHASE_1);

interface PlayState {
  plays: Play[];
  activePlayId: number | null;
  loadPlays: () => Promise<void>;
  createPlay: (name: string, playbookId: number, initialPhase?: PlayPhase) => Promise<number>;
  /** Create a Play capturing the live board as its phase-1 (no caller assembles toPhase(capture())). */
  createPlayFromBoard: (name: string, playbookId: number) => Promise<number>;
  updatePlay: (id: number, patch: Partial<Play>) => Promise<void>;
  deletePlay: (id: number) => Promise<void>;
  /** Capture the live board and store it as the given Play's phase-1. */
  saveActiveBoard: (id: number) => Promise<void>;
  /** Restore the given Play's phase-1 onto the live board (no-op if it has no phases). */
  loadPlayBoard: (id: number) => Promise<void>;
  /** Thin read of a single Play, for callers that only need to look, not the list. */
  getPlay: (id: number) => Promise<Play | undefined>;
  /** Move every Play in one Playbook to another (used by book delete/merge). */
  reassignBook: (fromId: number, toId: number) => Promise<void>;
  /** Unlink the given video from every Play that references it (video-delete cascade). */
  clearVideoLink: (videoId: number) => Promise<void>;
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

  createPlay: async (name, playbookId, initialPhase) => {
    try {
      const now = new Date().toISOString();
      const id = await playTable.add({
        name,
        createdAt: now,
        updatedAt: now,
        team1RosterId: null,
        team2RosterId: null,
        phases: initialPhase ? [initialPhase] : [],
        playbookId,
      });
      await get().loadPlays();
      return id as number;
    } catch (err) {
      console.error('[playStore] createPlay failed', err);
      throw err;
    }
  },

  createPlayFromBoard: async (name, playbookId) => {
    return get().createPlay(name, playbookId, captureAsPhase());
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

  saveActiveBoard: async (id) => {
    await get().updatePlay(id, { phases: [captureAsPhase()] });
  },

  loadPlayBoard: async (id) => {
    const play = await get().getPlay(id);
    const phase = play?.phases[0];
    if (!phase) return; // nothing saved yet — leave the live board alone
    restore(fromPhase(phase));
  },

  getPlay: async (id) => {
    try {
      return await playTable.get(id);
    } catch (err) {
      console.error('[playStore] getPlay failed', err);
      return undefined;
    }
  },

  reassignBook: async (fromId, toId) => {
    try {
      await playTable.where('playbookId').equals(fromId).modify({ playbookId: toId });
      await get().loadPlays();
    } catch (err) {
      console.error('[playStore] reassignBook failed', err);
      throw err;
    }
  },

  clearVideoLink: async (videoId) => {
    try {
      const linked = (await playTable.toArray()).filter(
        (p) => p.linkedVideoMoment?.videoId === videoId,
      );
      for (const play of linked) {
        if (play.id == null) continue;
        await playTable.update(play.id, {
          linkedVideoMoment: undefined,
          updatedAt: new Date().toISOString(),
        });
      }
      if (linked.length > 0) await get().loadPlays();
    } catch (err) {
      console.error('[playStore] clearVideoLink failed', err);
      throw err;
    }
  },

  setActivePlay: (id) => set({ activePlayId: id }),
}));
