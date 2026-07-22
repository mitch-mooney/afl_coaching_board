import { describe, it, expect } from 'vitest';
import { legacyRowToPhase, type LegacyPlaybook } from '../appDatabase';

/**
 * Guards that routing the v3 (playbooks → scenarios) migration through the shared
 * toPhase adapter produces output byte-identical to the original inline literal.
 * The expected objects below are the OLD literal's output, written by hand — an
 * independent source of truth, not derived from legacyRowToPhase.
 */
describe('legacyRowToPhase — byte-identical to the original v3 migration literal', () => {
  it('maps a row with camera exactly as the old literal did', () => {
    const row: LegacyPlaybook = {
      id: 1,
      name: 'Old Play',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      playerPositions: [
        { id: 'team1-player-1', teamId: 'team1', position: [1, 0, 2], rotation: 0, color: '#fff' },
      ],
      cameraPosition: [10, 20, 30],
      cameraTarget: [0, 0, 0],
      cameraZoom: 1.5,
      annotations: [{ id: 'a1', type: 'arrow' }],
    };

    expect(legacyRowToPhase(row)).toEqual({
      id: 'phase-1',
      label: 'Phase 1',
      playerPositions: [
        { id: 'team1-player-1', teamId: 'team1', position: [1, 0, 2], rotation: 0, color: '#fff' },
      ],
      paths: [],
      annotations: [{ id: 'a1', type: 'arrow' }],
      cameraState: { position: [10, 20, 30], target: [0, 0, 0], zoom: 1.5 },
    });
  });

  it('defaults cameraZoom to 1 when the legacy row omits it', () => {
    const row: LegacyPlaybook = {
      name: 'No Zoom',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      cameraPosition: [1, 2, 3],
      cameraTarget: [4, 5, 6],
    };

    expect(legacyRowToPhase(row).cameraState).toEqual({
      position: [1, 2, 3],
      target: [4, 5, 6],
      zoom: 1,
    });
  });

  it('yields a null cameraState and empty slices for a bare row', () => {
    const row: LegacyPlaybook = { name: 'Bare', createdAt: new Date('2025-01-01T00:00:00.000Z') };

    expect(legacyRowToPhase(row)).toEqual({
      id: 'phase-1',
      label: 'Phase 1',
      playerPositions: [],
      paths: [],
      annotations: [],
      cameraState: null,
    });
  });
});
