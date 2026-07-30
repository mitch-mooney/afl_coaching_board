import { describe, it, expect } from 'vitest';
import { entityAtStrokeStart, pathFromStroke } from '../pathAuthoring';

const player = (id: string, x: number, z: number) =>
  ({ id, type: 'player', position: [x, 0, z] }) as const;

describe('finding the entity a Path stroke belongs to', () => {
  it('claims the player the stroke started on', () => {
    const entities = [player('p1', 10, -20), player('p2', 40, 30)];

    expect(entityAtStrokeStart([10, 0, -20], entities)).toEqual({ id: 'p1', type: 'player' });
  });

  it('produces nothing for a stroke starting on open grass', () => {
    const entities = [player('p1', 10, -20)];

    expect(entityAtStrokeStart([10, 0, 5], entities)).toBeNull();
  });

  it('claims the nearer player when a stroke starts between two', () => {
    const entities = [player('near-miss', 11.5, -20), player('closest', 10.2, -20)];

    expect(entityAtStrokeStart([10, 0, -20], entities)).toEqual({
      id: 'closest',
      type: 'player',
    });
  });
});

describe('turning a Path stroke into a MovementPath', () => {
  const p1 = { id: 'p1', type: 'player' } as const;

  it('times the path from its distance at a running pace, not from the pen', () => {
    // 42m at 6 m/s = 7s. The old drag-time rule gave this stroke the 2s floor,
    // i.e. a 42m run at 21 m/s.
    const path = pathFromStroke(p1, [
      [0, 0, 0],
      [42, 0, 0],
    ]);

    expect(path?.duration).toBeCloseTo(7, 5);
  });
});

describe('pacing a Path stroke evenly along its length', () => {
  const p1 = { id: 'p1', type: 'player' } as const;

  it('spaces keyframes by distance travelled, so pace stays constant', () => {
    // An L: 30m across then 30m down. 60m travelled at 6 m/s = 10s, and the
    // corner sits at the halfway mark by distance, so t=5s.
    const path = pathFromStroke(p1, [
      [0, 0, 0],
      [30, 0, 0],
      [30, 0, 30],
    ]);

    expect(path?.duration).toBeCloseTo(10, 5);
    expect(path?.keyframes.map((k) => k.timestamp)).toEqual([0, 5, 10]);
  });

  it('does not let unevenly spaced pen samples warp the pace', () => {
    // Three samples over 40m, bunched near the start. The bunched sample is 10m
    // in, so t=10/6≈1.67s — an index rule would put it at the midpoint, 3.33s.
    const path = pathFromStroke(p1, [
      [0, 0, 0],
      [10, 0, 0],
      [40, 0, 0],
    ]);

    expect(path?.keyframes.map((k) => k.timestamp)).toEqual([0, 10 / 6, 40 / 6]);
  });
});

describe('rejecting strokes that mean nothing', () => {
  const p1 = { id: 'p1', type: 'player' } as const;

  it('floors a short stroke so it does not animate in a blink', () => {
    // 3m at 6 m/s is 0.5s — too fast to read on the board.
    const path = pathFromStroke(p1, [
      [0, 0, 0],
      [3, 0, 0],
    ]);

    expect(path?.duration).toBeCloseTo(1, 5);
  });

  it('produces nothing from a stroke that barely moved', () => {
    expect(
      pathFromStroke(p1, [
        [0, 0, 0],
        [0.5, 0, 0],
      ])
    ).toBeNull();
  });

  it('produces nothing from a single-point stroke rather than throwing', () => {
    expect(pathFromStroke(p1, [[0, 0, 0]])).toBeNull();
  });
});
