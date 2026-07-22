import { describe, it, expect } from 'vitest';
import { createMovementPath } from '../../models/PathModel';
import { positionsAtProgress, type EntityPath } from '../boardPlayback';

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
