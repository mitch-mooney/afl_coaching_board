import { create } from 'zustand';
import { playbookDB } from './playbookStore';
import type { TeamRoster, RosterPlayer } from '../models/RosterModel';

export const rosterTable = playbookDB.teamRosters;

// ── PlayHQ parser ──────────────────────────────────────────────────────────────

export function parsePlayHQText(raw: string): RosterPlayer[] {
  const lines = raw.trim().split('\n');
  const players: RosterPlayer[] = [];
  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length < 2 || !cols[1]?.trim()) continue;
    const num = parseInt(cols[0].trim(), 10);
    if (isNaN(num)) continue; // skip header
    let name = cols[1].trim();
    let isCaptain = false;
    let isViceCaptain = false;
    // Handle PlayHQ parenthesised markers: "(c)" / "(vc)"
    if (/\(c\)\s*$/i.test(name)) {
      isCaptain = true;
      name = name.replace(/\s*\(c\)\s*$/i, '').trim();
    }
    if (/\(vc\)\s*$/i.test(name)) {
      isViceCaptain = true;
      name = name.replace(/\s*\(vc\)\s*$/i, '').trim();
    }
    // Handle PlayHQ bare uppercase markers (no parens): "Smith J C" / "Smith J VC"
    if (!isCaptain && /\s+C$/.test(name)) {
      isCaptain = true;
      name = name.replace(/\s+C$/, '').trim();
    }
    if (!isViceCaptain && /\s+VC$/.test(name)) {
      isViceCaptain = true;
      name = name.replace(/\s+VC$/, '').trim();
    }
    players.push({ id: crypto.randomUUID(), number: num, name, isCaptain, isViceCaptain });
  }
  return players;
}

// ── PlayHQ URL fetch (5s timeout, falls back gracefully) ──────────────────────

export async function fetchPlayHQRoster(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── Store ──────────────────────────────────────────────────────────────────────

interface RosterState {
  rosters: TeamRoster[];
  loadRosters: () => Promise<void>;
  createRoster: (teamName: string, players: RosterPlayer[]) => Promise<number>;
  updateRoster: (id: number, patch: Partial<TeamRoster>) => Promise<void>;
  deleteRoster: (id: number) => Promise<void>;
}

export const useRosterStore = create<RosterState>((set, get) => ({
  rosters: [],

  loadRosters: async () => {
    try {
      const rosters = await rosterTable.orderBy('createdAt').reverse().toArray();
      set({ rosters });
    } catch (err) {
      console.error('[rosterStore] loadRosters failed', err);
    }
  },

  createRoster: async (teamName, players) => {
    try {
      const id = await rosterTable.add({ teamName, createdAt: new Date().toISOString(), players });
      await get().loadRosters();
      return id as number;
    } catch (err) {
      console.error('[rosterStore] createRoster failed', err);
      throw err;
    }
  },

  updateRoster: async (id, patch) => {
    try {
      await rosterTable.update(id, patch);
      await get().loadRosters();
    } catch (err) {
      console.error('[rosterStore] updateRoster failed', err);
      throw err;
    }
  },

  deleteRoster: async (id) => {
    try {
      await rosterTable.delete(id);
      await get().loadRosters();
    } catch (err) {
      console.error('[rosterStore] deleteRoster failed', err);
    }
  },
}));
