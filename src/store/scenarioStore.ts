import { create } from 'zustand';
import { playbookDB } from './playbookStore';
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
    const scenarios = await scenarioTable.orderBy('createdAt').reverse().toArray();
    set({ scenarios });
  },

  createScenario: async (name) => {
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
  },

  updateScenario: async (id, patch) => {
    await scenarioTable.update(id, { ...patch, updatedAt: new Date().toISOString() });
    await get().loadScenarios();
  },

  deleteScenario: async (id) => {
    await scenarioTable.delete(id);
    await get().loadScenarios();
    if (get().activeScenarioId === id) set({ activeScenarioId: null });
  },

  setActiveScenario: (id) => set({ activeScenarioId: id }),
}));
