import { describe, it, expect } from 'vitest';
import { createMovementPath } from '../../models/PathModel';
import { createBall } from '../../models/BallModel';
import type { Player } from '../../models/PlayerModel';
import type { Annotation } from '../../store/annotationStore';
import type { BoardSnapshot } from '../boardSnapshot';
import { withoutPlayers, atFullStrength } from '../boardPlacement';

function player(teamId: Player['teamId'], number: number): Player {
  return {
    id: `${teamId}-player-${number}`,
    teamId,
    position: [number, 0, number],
    rotation: 0,
    color: '#ffffff',
    number,
  };
}

/** `count` players of one team, numbered from `from` upward. */
function side(teamId: Player['teamId'], count: number, from = 1): Player[] {
  return Array.from({ length: count }, (_, i) => player(teamId, from + i));
}

const blue1 = player('team1', 1);
const red1 = player('team2', 1);
const blue1Path = createMovementPath(blue1.id, 'player', [1, 0, 1], [10, 0, 1], 2, 'path-blue1');
const red1Path = createMovementPath(red1.id, 'player', [1, 0, 1], [1, 0, 10], 2, 'path-red1');
const ballPath = createMovementPath('ball-1', 'ball', [0, 0, 0], [0, 0, 20], 1, 'path-ball');
const anAnnotation: Annotation = {
  id: 'a1',
  type: 'arrow',
  points: [[0, 0], [1, 1]],
  color: '#ffff00',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const board: BoardSnapshot = {
  players: [blue1, red1],
  paths: [blue1Path, ballPath, red1Path],
  annotations: [anAnnotation],
  camera: { position: [1, 2, 3], target: [4, 5, 6], zoom: 2 },
  ball: createBall([0, 0.5, 0], { assignedPlayerId: blue1.id }),
  cones: [{ id: 'c1', position: [8, 0, 8] }],
};

describe('withoutPlayers', () => {
  it('removes every player and every path that belongs to a player', () => {
    const cleared = withoutPlayers(board);

    expect(cleared.players).toEqual([]);
    expect(cleared.paths).toEqual([ballPath]);
  });
});

describe('withoutPlayers: what survives', () => {
  it('releases the ball but keeps it on the board', () => {
    const cleared = withoutPlayers(board);

    expect(cleared.ball).not.toBeNull();
    expect(cleared.ball!.assignedPlayerId).toBeUndefined();
    expect(cleared.ball!.position).toEqual([0, 0.5, 0]);
  });

  it('carries annotations, cones and the camera through by reference', () => {
    const cleared = withoutPlayers(board);

    expect(cleared.annotations).toBe(board.annotations);
    expect(cleared.cones).toBe(board.cones);
    expect(cleared.camera).toBe(board.camera);
  });

  it('leaves a null ball null', () => {
    expect(withoutPlayers({ ...board, ball: null }).ball).toBeNull();
  });

  it('is pure: the input snapshot is not mutated', () => {
    withoutPlayers(board);

    expect(board.players).toHaveLength(2);
    expect(board.paths).toHaveLength(3);
    expect(board.ball!.assignedPlayerId).toBe(blue1.id);
  });
});

describe('atFullStrength', () => {
  const withPlayers = (players: Player[]): BoardSnapshot => ({ ...board, players });

  it('is true at 18 and 18', () => {
    expect(atFullStrength(withPlayers([...side('team1', 18), ...side('team2', 18)]))).toBe(true);
  });

  it('is false at 17 and 18', () => {
    expect(atFullStrength(withPlayers([...side('team1', 17), ...side('team2', 18)]))).toBe(false);
  });

  it('is false at 18 and 19: a bench-numbered board is not at full strength', () => {
    expect(atFullStrength(withPlayers([...side('team1', 18), ...side('team2', 19)]))).toBe(false);
  });

  it('is false on an empty board', () => {
    expect(atFullStrength(withPlayers([]))).toBe(false);
  });
});

