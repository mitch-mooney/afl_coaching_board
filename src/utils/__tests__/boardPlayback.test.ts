import { describe, it, expect } from 'vitest';
import { createMovementPath } from '../../models/PathModel';
import { createBall } from '../../models/BallModel';
import type { Player } from '../../models/PlayerModel';
import type { BoardSnapshot } from '../boardSnapshot';
import { positionsAtProgress, boardAt, type EntityPath } from '../boardPlayback';

/** Build an EntityPath as a straight line from `from` to `to` over `duration` seconds. */
function entityPath(
  id: string,
  kind: 'player' | 'ball',
  from: [number, number, number],
  to: [number, number, number],
  duration: number,
): EntityPath {
  return { id, kind, path: createMovementPath(id, kind, from, to, duration, `path-${id}`) };
}

describe('positionsAtProgress', () => {
  it('returns nothing when there are no entity paths', () => {
    expect(positionsAtProgress([], 0.5)).toEqual([]);
  });

  it('returns nothing when every path has zero duration', () => {
    const still = entityPath('p1', 'player', [0, 0, 0], [0, 0, 0], 0);
    expect(positionsAtProgress([still], 0.5)).toEqual([]);
  });

  it('clamps progress below 0 to the start and above 1 to the end', () => {
    const p = entityPath('p1', 'player', [0, 0, 0], [10, 0, 0], 2);
    expect(positionsAtProgress([p], -1)[0].position).toEqual([0, 0, 0]);
    expect(positionsAtProgress([p], 2)[0].position).toEqual([10, 0, 0]);
  });

  it('drives the clock by the longest path; shorter paths clamp at their own end', () => {
    const long = entityPath('p1', 'player', [0, 0, 0], [20, 0, 0], 2); // longest → owns [0,1]
    const short = entityPath('b1', 'ball', [0, 0, 0], [10, 0, 0], 1);

    // progress 0.75 → 1.5s of the 2s global clock.
    //   long : local 0.75 → easeInOut(0.75)=0.875 → x = 17.5
    //   short: local min(1, 1.5/1)=1 (clamped) → held at its end, x = 10
    const [longPos, shortPos] = positionsAtProgress([long, short], 0.75);
    expect(longPos.position[0]).toBeCloseTo(17.5, 5);
    expect(shortPos.position[0]).toBeCloseTo(10, 5);

    // and the shorter path keeps holding at its end through the rest of the timeline
    const shortAtEnd = positionsAtProgress([long, short], 1)[1];
    expect(shortAtEnd.position).toEqual([10, 0, 0]);
  });

  it('preserves each entity id, kind, and input order', () => {
    const a = entityPath('p1', 'player', [0, 0, 0], [1, 0, 0], 2);
    const b = entityPath('b1', 'ball', [0, 0, 0], [1, 0, 0], 1);
    const result = positionsAtProgress([a, b], 0.5);
    expect(result.map((r) => [r.id, r.kind])).toEqual([
      ['p1', 'player'],
      ['b1', 'ball'],
    ]);
  });
});

describe('boardAt', () => {
  const mover: Player = { id: 'p1', teamId: 'team1', position: [0, 0, 0], rotation: 0, color: '#fff' };
  const stayer: Player = { id: 'p2', teamId: 'team1', position: [5, 0, 5], rotation: 0, color: '#fff' };
  const moverPath = createMovementPath('p1', 'player', [0, 0, 0], [10, 0, 0], 2, 'path-p1');
  const ballPath = createMovementPath('ball-1', 'ball', [0, 0, 0], [0, 0, 20], 1, 'path-ball');

  // p1 has a path, p2 does not; ball 'ball-1' has a path. Longest path = 2s (p1).
  const board: BoardSnapshot = {
    players: [mover, stayer],
    paths: [moverPath, ballPath],
    annotations: [],
    camera: { position: [1, 2, 3], target: [4, 5, 6], zoom: 2 },
    ball: createBall([0, 0, 0]),
    cones: [{ id: 'c1', position: [8, 0, 8] }],
  };

  it('moves players and the ball to their positions at progress; entities without a path stay put', () => {
    const at1 = boardAt(board, 1);

    // p1 (2s path) reaches its end; ball ('ball-1', 1s path) clamps at its end.
    expect(at1.players.find((p) => p.id === 'p1')!.position).toEqual([10, 0, 0]);
    expect(at1.ball!.position).toEqual([0, 0, 20]);
    // p2 has no path — untouched.
    expect(at1.players.find((p) => p.id === 'p2')!.position).toEqual([5, 0, 5]);
  });

  it('carries paths, annotations, camera, and cones through unchanged', () => {
    const at = boardAt(board, 0.5);

    expect(at.paths).toBe(board.paths);
    expect(at.annotations).toBe(board.annotations);
    expect(at.camera).toBe(board.camera);
    expect(at.cones).toBe(board.cones);
  });

  it('is pure — the input snapshot is not mutated', () => {
    boardAt(board, 1);

    expect(mover.position).toEqual([0, 0, 0]);
    expect(board.ball!.position).toEqual([0, 0, 0]);
  });

  it('leaves the ball null even when a ball path exists', () => {
    const at = boardAt({ ...board, ball: null }, 1);
    expect(at.ball).toBeNull();
  });

  it('at progress 0 every entity is at its path start', () => {
    const at0 = boardAt(board, 0);
    expect(at0.players.find((p) => p.id === 'p1')!.position).toEqual([0, 0, 0]);
    expect(at0.ball!.position).toEqual([0, 0, 0]);
  });
});
