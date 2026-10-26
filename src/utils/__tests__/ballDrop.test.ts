import { describe, it, expect } from 'vitest';
import { createMovementPath } from '../../models/PathModel';
import { createBall } from '../../models/BallModel';
import type { Player } from '../../models/PlayerModel';
import type { Annotation } from '../../store/annotationStore';
import type { BoardSnapshot } from '../boardSnapshot';
import { dropBall } from '../ballDrop';

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

const blue1 = player('team1', 1);
const red1 = player('team2', 1);
const blue1Path = createMovementPath(blue1.id, 'player', [1, 0, 1], [10, 0, 1], 2, 'path-blue1');
const ballPath = createMovementPath('ball-1', 'ball', [0, 0, 0], [0, 0, 20], 1, 'path-ball');
const anAnnotation: Annotation = {
  id: 'a1',
  type: 'arrow',
  points: [[0, 0], [1, 1]],
  color: '#ffff00',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

/** A board whose ball is loose at the centre. */
const looseBoard: BoardSnapshot = {
  players: [blue1, red1],
  paths: [blue1Path, ballPath],
  annotations: [anAnnotation],
  camera: { position: [1, 2, 3], target: [4, 5, 6], zoom: 2 },
  ball: createBall([0, 0.5, 0]),
  cones: [{ id: 'c1', position: [8, 0, 8] }],
  team2Guernsey: 'auto',
};

/** The same board with blue #1 carrying the ball. */
const heldBoard: BoardSnapshot = {
  ...looseBoard,
  ball: createBall([1, 0.78, 1], { assignedPlayerId: blue1.id }),
};

describe('dropBall', () => {
  it('makes the player under the pointer the carrier', () => {
    const dropped = dropBall(looseBoard, [2, 0.28, 2], blue1.id);

    expect(dropped.ball!.assignedPlayerId).toBe(blue1.id);
  });

  it('leaves the ball loose at the release point when it lands on no player', () => {
    const dropped = dropBall(looseBoard, [12, 0.28, -4], null);

    expect(dropped.ball!.assignedPlayerId).toBeUndefined();
    expect(dropped.ball!.position).toEqual([12, 0.28, -4]);
  });

  it('releases the carrier when a held ball is dropped on grass', () => {
    const dropped = dropBall(heldBoard, [12, 0.28, -4], null);

    expect(dropped.ball!.assignedPlayerId).toBeUndefined();
    expect(dropped.ball!.position).toEqual([12, 0.28, -4]);
  });

  it('hands a held ball over when it is dropped on a different player', () => {
    const dropped = dropBall(heldBoard, [1, 0.28, 1], red1.id);

    expect(dropped.ball!.assignedPlayerId).toBe(red1.id);
  });

  it('returns the same snapshot by reference when a held ball is dropped back on its carrier', () => {
    expect(dropBall(heldBoard, [1.2, 0.28, 0.9], blue1.id)).toBe(heldBoard);
  });

  it('carries players, paths, annotations and cones through by reference', () => {
    for (const dropped of [
      dropBall(looseBoard, [2, 0.28, 2], blue1.id),
      dropBall(heldBoard, [12, 0.28, -4], null),
      dropBall(heldBoard, [1, 0.28, 1], red1.id),
    ]) {
      expect(dropped.players).toBe(looseBoard.players);
      expect(dropped.paths).toBe(looseBoard.paths);
      expect(dropped.annotations).toBe(looseBoard.annotations);
      expect(dropped.cones).toBe(looseBoard.cones);
    }
  });

  it('returns the same snapshot when the board has no ball', () => {
    const noBall = { ...looseBoard, ball: null };

    expect(dropBall(noBall, [2, 0.28, 2], blue1.id)).toBe(noBall);
  });
});
