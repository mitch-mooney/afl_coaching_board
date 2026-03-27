import { describe, it, expect, beforeEach } from 'vitest';
import { useScenarioStore, scenarioTable } from '../scenarioStore';

beforeEach(async () => {
  await scenarioTable.clear();
  useScenarioStore.setState({ scenarios: [], activeScenarioId: null });
});

describe('scenarioStore', () => {
  it('creates a scenario and persists it', async () => {
    const { createScenario } = useScenarioStore.getState();
    const id = await createScenario('Test Scenario');
    const all = useScenarioStore.getState().scenarios;
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Test Scenario');
    expect(typeof id).toBe('number');
  });

  it('updates a scenario', async () => {
    const { createScenario, updateScenario } = useScenarioStore.getState();
    const id = await createScenario('Original');
    const originalUpdatedAt = useScenarioStore.getState().scenarios[0].updatedAt;
    await updateScenario(id, { name: 'Updated' });
    const updated = useScenarioStore.getState().scenarios[0];
    expect(updated.name).toBe('Updated');
    expect(updated.updatedAt).not.toBe(originalUpdatedAt);
  });

  it('deletes a scenario', async () => {
    const { createScenario, deleteScenario } = useScenarioStore.getState();
    const id = await createScenario('To Delete');
    await deleteScenario(id);
    expect(useScenarioStore.getState().scenarios).toHaveLength(0);
  });

  it('clears activeScenarioId when deleting the active scenario', async () => {
    const { createScenario, deleteScenario, setActiveScenario } = useScenarioStore.getState();
    const id = await createScenario('Active');
    setActiveScenario(id);
    expect(useScenarioStore.getState().activeScenarioId).toBe(id);
    await deleteScenario(id);
    expect(useScenarioStore.getState().activeScenarioId).toBeNull();
  });

  it('loads scenarios from DB', async () => {
    const { createScenario, loadScenarios } = useScenarioStore.getState();
    await createScenario('Persisted');
    useScenarioStore.setState({ scenarios: [] });
    await loadScenarios();
    expect(useScenarioStore.getState().scenarios).toHaveLength(1);
  });
});
