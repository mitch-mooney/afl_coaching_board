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
    if (cols.length < 2) continue;
    const num = parseInt(cols[0].trim(), 10);
    if (isNaN(num)) continue; // skip header
    let name = cols[1].trim();
    let isCaptain = false;
    let isViceCaptain = false;
    if (name.endsWith('(c)')) {
      isCaptain = true;
      name = name.replace(/\s*\(c\)\s*$/, '');
    }
    if (name.endsWith('(vc)')) {
      isViceCaptain = true;
      name = name.replace(/\s*\(vc\)\s*$/, '');
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
    const rosters = await rosterTable.orderBy('createdAt').reverse().toArray();
    set({ rosters });
  },

  createRoster: async (teamName, players) => {
    const id = await rosterTable.add({ teamName, createdAt: new Date().toISOString(), players });
    await get().loadRosters();
    return id as number;
  },

  updateRoster: async (id, patch) => {
    await rosterTable.update(id, patch);
    await get().loadRosters();
  },

  deleteRoster: async (id) => {
    await rosterTable.delete(id);
    await get().loadRosters();
  },
}));
