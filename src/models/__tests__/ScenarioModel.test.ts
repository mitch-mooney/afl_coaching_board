import { describe, it, expect } from 'vitest';
import type { Scenario, ScenarioPhase } from '../ScenarioModel';

describe('ScenarioModel', () => {
  it('Scenario has required fields', () => {
    const s: Scenario = {
      name: 'Centre bounce press',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      team1RosterId: null,
      team2RosterId: null,
      phases: [],
    };
    expect(s.name).toBe('Centre bounce press');
    expect(s.phases).toHaveLength(0);
  });

  it('ScenarioPhase has required fields', () => {
    const p: ScenarioPhase = {
      id: 'phase-1',
      label: 'Phase 1',
      playerPositions: [],
      paths: [],
      annotations: [],
      cameraState: null,
    };
    expect(p.id).toBe('phase-1');
  });
});
