import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../../store/playerStore';
import { usePathStore } from '../../store/pathStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { useCameraStore } from '../../store/cameraStore';
import { useBallStore } from '../../store/ballStore';
import { useConeStore } from '../../store/coneStore';
import { useHistoryStore } from '../../store/historyStore';
import { editBoard, beginEdit } from '../boardEdit';
import type { Player } from '../../models/PlayerModel';

const aPlayer: Player = {
  id: 'team1-player-1',
  teamId: 'team1',
  position: [0, 0, 0],
  rotation: 0,
  color: '#0066cc',
};

beforeEach(() => {
  usePlayerStore.setState({ players: [aPlayer] });
  usePathStore.setState({ paths: [] });
  useAnnotationStore.setState({ annotations: [] });
  useCameraStore.setState({ position: [0, 0, 0], target: [0, 0, 0], zoom: 1 });
  useBallStore.setState({ ball: null });
  useConeStore.setState({ cones: [] });
  useHistoryStore.getState().clearHistory();
});

describe('editBoard — atomic edits', () => {
  it('records one entry for a mutation that changes the board', () => {
    editBoard('Move player', () => {
      usePlayerStore.getState().updatePlayerPosition('team1-player-1', [5, 0, 5]);
    });

    expect(useHistoryStore.getState().past).toHaveLength(1);
    const [entry] = useHistoryStore.getState().past;
    expect(entry.label).toBe('Move player');
    expect(entry.before.players[0].position).toEqual([0, 0, 0]);
    expect(entry.after.players[0].position).toEqual([5, 0, 5]);
  });

  it('records nothing when the mutation changes nothing', () => {
    editBoard('No-op', () => {
      usePlayerStore.getState().updatePlayerPosition('team1-player-1', [0, 0, 0]);
    });

    expect(useHistoryStore.getState().past).toHaveLength(0);
  });

  it('records nothing when the mutation is called but reverses itself', () => {
    editBoard('Place then remove cone', () => {
      useConeStore.getState().addCone([1, 0, 1]);
      const [cone] = useConeStore.getState().cones;
      useConeStore.getState().removeCone(cone.id);
    });

    expect(useHistoryStore.getState().past).toHaveLength(0);
  });
});

describe('beginEdit — gesture edits', () => {
  it('records one entry across many writes between begin and commit', () => {
    const edit = beginEdit('Move player');
    usePlayerStore.getState().updatePlayerPosition('team1-player-1', [1, 0, 1]);
    usePlayerStore.getState().updatePlayerPosition('team1-player-1', [2, 0, 2]);
    usePlayerStore.getState().updatePlayerRotation('team1-player-1', 1.5);
    edit.commit();

    expect(useHistoryStore.getState().past).toHaveLength(1);
    const [entry] = useHistoryStore.getState().past;
    expect(entry.before.players[0].position).toEqual([0, 0, 0]);
    expect(entry.after.players[0].position).toEqual([2, 0, 2]);
    expect(entry.after.players[0].rotation).toBe(1.5);
  });

  it('records nothing when a gesture commits with no net change', () => {
    const edit = beginEdit('Drag that ends where it started');
    usePlayerStore.getState().updatePlayerPosition('team1-player-1', [9, 0, 9]);
    usePlayerStore.getState().updatePlayerPosition('team1-player-1', [0, 0, 0]);
    edit.commit();

    expect(useHistoryStore.getState().past).toHaveLength(0);
  });

  it('is a no-op if commit is called again', () => {
    const edit = beginEdit('Move player');
    usePlayerStore.getState().updatePlayerPosition('team1-player-1', [1, 0, 1]);
    edit.commit();
    usePlayerStore.getState().updatePlayerPosition('team1-player-1', [2, 0, 2]);
    edit.commit();

    // The second commit must not fold the further move into the first entry,
    // nor push a second one of its own — it belongs to nothing, having
    // already committed once.
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().past[0].after.players[0].position).toEqual([1, 0, 1]);
  });
});

describe('nested edits fold into the outermost', () => {
  it('an atomic edit begun while a gesture is open folds into it', () => {
    const gesture = beginEdit('Drag with a second finger');
    usePlayerStore.getState().updatePlayerPosition('team1-player-1', [3, 0, 3]);

    // A second, atomic edit lands mid-gesture — e.g. a pod tapped with a
    // second finger while the first still holds the player.
    editBoard('Rotate player', () => {
      usePlayerStore.getState().updatePlayerRotation('team1-player-1', 2);
    });

    gesture.commit();

    // One entry, not two, and its before-board predates both edits.
    expect(useHistoryStore.getState().past).toHaveLength(1);
    const [entry] = useHistoryStore.getState().past;
    expect(entry.before.players[0].position).toEqual([0, 0, 0]);
    expect(entry.before.players[0].rotation).toBe(0);
    expect(entry.after.players[0].position).toEqual([3, 0, 3]);
    expect(entry.after.players[0].rotation).toBe(2);
  });

  it('a gesture begun while another gesture is open folds into it', () => {
    const outer = beginEdit('Outer gesture');
    usePlayerStore.getState().updatePlayerPosition('team1-player-1', [1, 0, 1]);

    const inner = beginEdit('Inner gesture');
    usePlayerStore.getState().updatePlayerPosition('team1-player-1', [2, 0, 2]);
    inner.commit();

    outer.commit();

    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().past[0].after.players[0].position).toEqual([2, 0, 2]);
  });

  it('an atomic edit begun inside another atomic edit\'s mutation folds into it', () => {
    editBoard('Outer', () => {
      usePlayerStore.getState().updatePlayerPosition('team1-player-1', [1, 0, 1]);
      editBoard('Inner', () => {
        usePlayerStore.getState().updatePlayerPosition('team1-player-1', [2, 0, 2]);
      });
    });

    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().past[0].label).toBe('Outer');
    expect(useHistoryStore.getState().past[0].after.players[0].position).toEqual([2, 0, 2]);
  });
});
