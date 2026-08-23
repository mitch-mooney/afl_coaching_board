import { describe, it, expect, beforeEach } from 'vitest';
import { useModeStore } from '../modeStore';
import { usePlayerStore } from '../playerStore';
import { usePathStore } from '../pathStore';
import { useAnnotationStore } from '../annotationStore';
import { useBallStore } from '../ballStore';
import { useConeStore } from '../coneStore';
import { useHistoryStore } from '../historyStore';
import type { Player } from '../../models/PlayerModel';
import type { MovementPath } from '../../models/PathModel';
import type { Ball } from '../../models/BallModel';
import type { Cone } from '../coneStore';
import type { Annotation } from '../annotationStore';

// Distinctive match-mode board content, so a leak across the switch is visible.
const matchPlayer: Player = {
  id: 'team1-player-1',
  teamId: 'team1',
  position: [3, 0, -4],
  rotation: 0,
  color: '#0066cc',
};
const matchPath: MovementPath = {
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
const matchBall: Ball = { id: 'ball-1', position: [1, 0, 2], color: '#8B4513', size: 0.3 };
const matchCone: Cone = { id: 'cone-1', position: [-5, 0, 5] };
const matchAnnotation: Annotation = {
  id: 'ann-1',
  type: 'arrow',
  points: [[0, 0], [1, 1]],
  color: '#ff0000',
  createdAt: new Date(0),
};

const seedMatchBoard = () => {
  usePlayerStore.getState().setPlayers([matchPlayer]);
  usePathStore.getState().setPaths([matchPath]);
  useBallStore.getState().setBall(matchBall);
  useConeStore.getState().setCones([matchCone]);
  useAnnotationStore.getState().setAnnotations([matchAnnotation]);
};

// Simulate the board being changed while in training mode.
const overwriteBoard = () => {
  usePlayerStore.getState().setPlayers([]);
  usePathStore.getState().setPaths([]);
  useBallStore.getState().setBall({ id: 'ball-2', position: [9, 0, 9], color: '#000', size: 0.5 });
  useConeStore.getState().setCones([{ id: 'cone-2', position: [7, 0, 7] }]);
  useAnnotationStore.getState().setAnnotations([]);
};

beforeEach(() => {
  useModeStore.setState({ mode: 'match', contextSnapshot: null });
  usePlayerStore.getState().setPlayers([]);
  usePathStore.getState().setPaths([]);
  useBallStore.getState().setBall(null);
  useConeStore.getState().setCones([]);
  useAnnotationStore.getState().setAnnotations([]);
  useHistoryStore.getState().clearHistory();
});

describe('modeStore', () => {
  it('round-trips the whole board across match→training→match', () => {
    const { switchMode } = useModeStore.getState();

    seedMatchBoard();
    switchMode('training'); // captures the full match board
    overwriteBoard(); // training-mode edits
    switchMode('match'); // restores the full match board

    expect(usePlayerStore.getState().players).toEqual([matchPlayer]);
    expect(usePathStore.getState().paths).toEqual([matchPath]);
    expect(useBallStore.getState().ball).toEqual(matchBall);
    expect(useConeStore.getState().cones).toEqual([matchCone]);
    expect(useAnnotationStore.getState().annotations).toEqual([matchAnnotation]);
  });

  it('restores paths, ball, and cones that the old partial snapshot leaked', () => {
    const { switchMode } = useModeStore.getState();

    seedMatchBoard();
    switchMode('training');
    // The three slices that were silently dropped by the old ContextSnapshot.
    usePathStore.getState().setPaths([]);
    useBallStore.getState().setBall(null);
    useConeStore.getState().setCones([]);
    switchMode('match');

    expect(usePathStore.getState().paths).toEqual([matchPath]);
    expect(useBallStore.getState().ball).toEqual(matchBall);
    expect(useConeStore.getState().cones).toEqual([matchCone]);
  });

  it('records nothing when a mode reset clears the board', () => {
    // A mode reset is the app writing the board, not the coach editing it, so
    // it leaves no undo entry — and needs no bracket around its clear to say so,
    // because the stores it calls do not record on anyone's behalf.
    seedMatchBoard();

    useModeStore.getState().resetMode();

    expect(useAnnotationStore.getState().annotations).toEqual([]);
    expect(useHistoryStore.getState().past).toHaveLength(0);
  });
});
