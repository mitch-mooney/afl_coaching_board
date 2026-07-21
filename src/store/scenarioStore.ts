import { create } from 'zustand';
import { playbookDB } from './appDatabase';
import type { Scenario } from '../models/ScenarioModel';

// Export the table reference so tests can clear it directly
export const scenarioTable = playbookDB.scenarios;

interface ScenarioState {
  scenarios: Scenario[];
  activeScenarioId: number | null;
  loadScenarios: () => Promise<void>;
  createScenario: (name: string) => Promise<number>;
  updateScenario: (id: number, patch: Partial<Scenario>) => Promise<void>;
  deleteScenario: (id: number) => Promise<void>;
  setActiveScenario: (id: number | null) => void;
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  scenarios: [],
  activeScenarioId: null,

  loadScenarios: async () => {
    try {
      const scenarios = await scenarioTable.orderBy('createdAt').reverse().toArray();
      set({ scenarios });
    } catch (err) {
      console.error('[scenarioStore] loadScenarios failed', err);
    }
  },

  createScenario: async (name) => {
    try {
      const now = new Date().toISOString();
      const id = await scenarioTable.add({
        name,
        createdAt: now,
        updatedAt: now,
        team1RosterId: null,
        team2RosterId: null,
        phases: [],
      });
      await get().loadScenarios();
      return id as number;
    } catch (err) {
      console.error('[scenarioStore] createScenario failed', err);
      throw err;
    }
  },

  updateScenario: async (id, patch) => {
    try {
      await scenarioTable.update(id, { ...patch, updatedAt: new Date().toISOString() });
      await get().loadScenarios();
    } catch (err) {
      console.error('[scenarioStore] updateScenario failed', err);
      throw err;
    }
  },

  deleteScenario: async (id) => {
    try {
      await scenarioTable.delete(id);
      if (get().activeScenarioId === id) set({ activeScenarioId: null });
      await get().loadScenarios();
    } catch (err) {
      console.error('[scenarioStore] deleteScenario failed', err);
    }
  },

  setActiveScenario: (id) => set({ activeScenarioId: id }),
}));
