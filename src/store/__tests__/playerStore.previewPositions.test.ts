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

  it('movePreviewPosition moves one preview marker and leaves the rest', () => {
    const other: Player = { ...mockPlayer, id: 'p2', position: [5, 0, 5] };
    usePlayerStore.getState().setPreviewPositions([mockPlayer, other]);
    usePlayerStore.getState().movePreviewPosition('p1', [3, 0, -4]);
    const preview = usePlayerStore.getState().previewPositions!;
    expect(preview[0].position).toEqual([3, 0, -4]);
    expect(preview[1].position).toEqual([5, 0, 5]);
  });

  it('movePreviewPosition does nothing when there is no preview', () => {
    usePlayerStore.getState().movePreviewPosition('p1', [3, 0, -4]);
    expect(usePlayerStore.getState().previewPositions).toBeNull();
  });
});
