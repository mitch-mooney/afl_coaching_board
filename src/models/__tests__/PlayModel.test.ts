import { describe, it, expect } from 'vitest';
import type { Play, PlayPhase } from '../PlayModel';

describe('PlayModel', () => {
  it('Play has required fields', () => {
    const p: Play = {
      name: 'Centre bounce press',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      team1RosterId: null,
      team2RosterId: null,
      phases: [],
    };
    expect(p.name).toBe('Centre bounce press');
    expect(p.phases).toHaveLength(0);
  });

  it('PlayPhase has required fields', () => {
    const p: PlayPhase = {
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
