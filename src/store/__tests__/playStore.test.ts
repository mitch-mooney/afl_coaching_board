import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayStore, playTable } from '../playStore';
import { usePlayerStore } from '../playerStore';
import { usePathStore } from '../pathStore';
import { useBallStore } from '../ballStore';
import { useConeStore } from '../coneStore';
import type { Player } from '../../models/PlayerModel';
import type { MovementPath } from '../../models/PathModel';
import type { Ball } from '../../models/BallModel';
import type { Cone } from '../coneStore';

beforeEach(async () => {
  await playTable.clear();
  usePlayStore.setState({ plays: [], activePlayId: null });
});

// Minimal, well-typed board fixtures for gateway round-trip tests.
const seedPlayer: Player = {
  id: 'team1-player-1',
  teamId: 'team1',
  position: [3, 0, -4],
  rotation: 0,
  color: '#0066cc',
};
const seedPath: MovementPath = {
  id: 'path-1',
  entityId: 'team1-player-1',
  entityType: 'player',
  keyframes: [
    { timestamp: 0, position: [3, 0, -4] },
    { timestamp: 2, position: [6, 0, -1] },
  ],
  duration: 2,
  startTimeOffset: 0,
};
const seedBall: Ball = { id: 'ball-1', position: [1, 0, 2], color: '#8B4513', size: 0.3 };
const seedCone: Cone = { id: 'cone-1', position: [-5, 0, 5] };

describe('playStore', () => {
  it('creates a play and persists it', async () => {
    const { createPlay } = usePlayStore.getState();
    const id = await createPlay('Test Play', 1);
    const all = usePlayStore.getState().plays;
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Test Play');
    expect(all[0].playbookId).toBe(1);
    expect(typeof id).toBe('number');
  });

  it('updates a play', async () => {
    const { createPlay, updatePlay } = usePlayStore.getState();
    const id = await createPlay('Original', 1);
    const originalUpdatedAt = usePlayStore.getState().plays[0].updatedAt;
    await updatePlay(id, { name: 'Updated' });
    const updated = usePlayStore.getState().plays[0];
    expect(updated.name).toBe('Updated');
    expect(updated.updatedAt).not.toBe(originalUpdatedAt);
  });

  it('deletes a play', async () => {
    const { createPlay, deletePlay } = usePlayStore.getState();
    const id = await createPlay('To Delete', 1);
    await deletePlay(id);
    expect(usePlayStore.getState().plays).toHaveLength(0);
  });

  it('clears activePlayId when deleting the active play', async () => {
    const { createPlay, deletePlay, setActivePlay } = usePlayStore.getState();
    const id = await createPlay('Active', 1);
    setActivePlay(id);
    expect(usePlayStore.getState().activePlayId).toBe(id);
    await deletePlay(id);
    expect(usePlayStore.getState().activePlayId).toBeNull();
  });

  it('creates a play with an initial phase in a single write', async () => {
    const { createPlay } = usePlayStore.getState();
    const phase = {
      id: 'phase-1',
      label: 'Phase 1',
      playerPositions: [],
      paths: [],
      annotations: [],
      cameraState: null,
    };
    const id = await createPlay('With Phase', 1, phase);
    const play = usePlayStore.getState().plays.find((p) => p.id === id);
    expect(play?.phases).toEqual([phase]);
  });

  it('loads plays from DB', async () => {
    const { createPlay, loadPlays } = usePlayStore.getState();
    await createPlay('Persisted', 1);
    usePlayStore.setState({ plays: [] });
    await loadPlays();
    expect(usePlayStore.getState().plays).toHaveLength(1);
  });

  describe('playsInBook', () => {
    it('returns only the Plays contained in the given Playbook', async () => {
      const { createPlay } = usePlayStore.getState();
      await createPlay('A', 1);
      await createPlay('B', 1);
      await createPlay('Other', 2);

      const inBook1 = usePlayStore.getState().playsInBook(1);
      expect(inBook1).toHaveLength(2);
      expect(inBook1.every((p) => p.playbookId === 1)).toBe(true);
      expect(usePlayStore.getState().playsInBook(2)).toHaveLength(1);
    });

    it('returns an empty list for a Playbook with no Plays', async () => {
      await usePlayStore.getState().createPlay('A', 1);
      expect(usePlayStore.getState().playsInBook(99)).toEqual([]);
    });
  });
});

describe('playStore gateway verbs', () => {
  // Seed the live board stores with distinctive content.
  const seedBoard = () => {
    usePlayerStore.getState().setPlayers([seedPlayer]);
    usePathStore.getState().setPaths([seedPath]);
    useBallStore.getState().setBall(seedBall);
    useConeStore.getState().setCones([seedCone]);
  };
  // Wipe the live board stores so a restore has to do real work.
  const clearBoard = () => {
    usePlayerStore.getState().setPlayers([]);
    usePathStore.getState().setPaths([]);
    useBallStore.getState().setBall(null);
    useConeStore.getState().setCones([]);
  };

  describe('getPlay', () => {
    it('reads a single Play by id', async () => {
      const { createPlay, getPlay } = usePlayStore.getState();
      const id = await createPlay('Readable', 1);
      const play = await getPlay(id);
      expect(play?.name).toBe('Readable');
      expect(play?.id).toBe(id);
    });

    it('returns undefined for a missing id', async () => {
      const play = await usePlayStore.getState().getPlay(9999);
      expect(play).toBeUndefined();
    });
  });

  describe('createPlayFromBoard', () => {
    it('captures the live board into the Play as phase-1', async () => {
      seedBoard();
      const { createPlayFromBoard, getPlay } = usePlayStore.getState();
      const id = await createPlayFromBoard('From Board', 1);
      const play = await getPlay(id);
      expect(play?.phases).toHaveLength(1);
      expect(play?.phases[0].id).toBe('phase-1');
      expect(play?.phases[0].label).toBe('Phase 1');
      expect(play?.phases[0].playerPositions).toEqual([seedPlayer]);
      expect(play?.phases[0].paths).toEqual([seedPath]);
      expect(play?.phases[0].ball).toEqual(seedBall);
      expect(play?.phases[0].cones).toEqual([seedCone]);
    });
  });

  describe('saveActiveBoard / loadPlayBoard round-trip', () => {
    it('saves the live board onto a Play and restores it', async () => {
      const { createPlay, saveActiveBoard, loadPlayBoard, getPlay } = usePlayStore.getState();
      const id = await createPlay('Round Trip', 1);

      seedBoard();
      await saveActiveBoard(id);

      // The board was persisted as the Play's single phase.
      const saved = await getPlay(id);
      expect(saved?.phases).toHaveLength(1);
      expect(saved?.phases[0].playerPositions).toEqual([seedPlayer]);

      // Wipe the live board, then restore it from the Play.
      clearBoard();
      expect(usePlayerStore.getState().players).toEqual([]);

      await loadPlayBoard(id);
      expect(usePlayerStore.getState().players).toEqual([seedPlayer]);
      expect(usePathStore.getState().paths).toEqual([seedPath]);
      expect(useBallStore.getState().ball).toEqual(seedBall);
      expect(useConeStore.getState().cones).toEqual([seedCone]);
    });

    it('loadPlayBoard is a no-op for a Play with no phases', async () => {
      const { createPlay, loadPlayBoard } = usePlayStore.getState();
      const id = await createPlay('Empty', 1);
      seedBoard();
      await loadPlayBoard(id);
      // Board untouched — nothing to restore from an empty Play.
      expect(usePlayerStore.getState().players).toEqual([seedPlayer]);
    });
  });

  describe('reassignBook', () => {
    it('moves every Play from one Playbook to another', async () => {
      const { createPlay, reassignBook } = usePlayStore.getState();
      const a = await createPlay('A', 1);
      const b = await createPlay('B', 1);
      const other = await createPlay('Other', 2);

      await reassignBook(1, 2);

      const { getPlay } = usePlayStore.getState();
      expect((await getPlay(a))?.playbookId).toBe(2);
      expect((await getPlay(b))?.playbookId).toBe(2);
      expect((await getPlay(other))?.playbookId).toBe(2);
      // The in-memory list reflects the move.
      expect(usePlayStore.getState().plays.every((p) => p.playbookId === 2)).toBe(true);
    });
  });

});

