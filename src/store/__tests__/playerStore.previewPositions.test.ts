import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../playerStore';
import type { Player } from '../../models/PlayerModel';

const mockPlayer: Player = {
  id: 'p1', teamId: 'team1', position: [0, 0, 0], rotation: 0, color: '#fff',
};

beforeEach(() => {
  usePlayerStore.setState({ previewPositions: null });
});

describe('previewPositions', () => {
  it('starts as null', () => {
    expect(usePlayerStore.getState().previewPositions).toBeNull();
  });

  it('setPreviewPositions stores players', () => {
    usePlayerStore.getState().setPreviewPositions([mockPlayer]);
    expect(usePlayerStore.getState().previewPositions).toHaveLength(1);
    expect(usePlayerStore.getState().previewPositions![0].id).toBe('p1');
  });

  it('clearPreviewPositions resets to null', () => {
    usePlayerStore.getState().setPreviewPositions([mockPlayer]);
    usePlayerStore.getState().clearPreviewPositions();
    expect(usePlayerStore.getState().previewPositions).toBeNull();
  });
});
