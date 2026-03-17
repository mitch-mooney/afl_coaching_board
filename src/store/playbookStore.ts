import { create } from 'zustand';
import Dexie, { Table, IndexableType } from 'dexie';
import { Player } from '../models/PlayerModel';
import type { Scenario } from '../models/ScenarioModel';
import type { TeamRoster } from '../models/RosterModel';

export interface Playbook {
  id?: number;
  cloudId?: string;
  name: string;
  description?: string;
  createdAt: Date;
  playerPositions: Player[];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraZoom: number;
  annotations?: any[]; // Will be defined when annotations are implemented
  /** ID of an attached video blob in the videoBlobs Dexie table */
  videoBlobId?: number;
}

class PlaybookDatabase extends Dexie {
  playbooks!: Table<Playbook>;
  scenarios!: Table<Scenario, number>;
  teamRosters!: Table<TeamRoster, number>;

  constructor() {
    super('AFLPlaybookDB');
    this.version(1).stores({
      playbooks: '++id, name, createdAt',
    });
    // v2: index videoBlobId so playbooks with video can be queried
    this.version(2).stores({
      playbooks: '++id, name, createdAt, videoBlobId',
    });
    // v3: add scenarios and teamRosters tables; migrate existing playbooks → scenarios
    this.version(3).stores({
      playbooks: '++id, name, createdAt, videoBlobId',
      scenarios: '++id, name, createdAt, updatedAt, team1RosterId, team2RosterId',
      teamRosters: '++id, teamName, createdAt',
    }).upgrade(async (tx) => {
      const playbooks = await tx.table('playbooks').toArray();
      for (const p of playbooks) {
        const createdAt =
          p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt);
        await tx.table('scenarios').add({
          name: p.name,
          createdAt,
          updatedAt: new Date().toISOString(),
          team1RosterId: null,
          team2RosterId: null,
          phases: [
            {
              id: 'phase-1',
              label: 'Phase 1',
              playerPositions: p.playerPositions ?? [],
              paths: [],
              annotations: p.annotations ?? [],
              cameraState: p.cameraPosition && p.cameraTarget
                ? { position: p.cameraPosition, target: p.cameraTarget, zoom: p.cameraZoom ?? 1 }
                : null,
            },
          ],
          videoBlobId: p.videoBlobId,
        });
      }
    });
  }
}

const db = new PlaybookDatabase();
export { db as playbookDB };

interface PlaybookState {
  playbooks: Playbook[];
  currentPlaybook: Playbook | null;
  isLoading: boolean;

  // Actions
  loadPlaybooks: () => Promise<void>;
  savePlaybook: (playbook: Omit<Playbook, 'id' | 'createdAt'>) => Promise<IndexableType>;
  deletePlaybook: (id: number) => Promise<void>;
  loadPlaybook: (id: number) => Promise<Playbook | undefined>;
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
      return playbook;
    } catch (error) {
      console.error('Error loading playbook:', error);
      throw error;
    }
  },
  
  clearCurrentPlaybook: () => {
    set({ currentPlaybook: null });
  },
}));
