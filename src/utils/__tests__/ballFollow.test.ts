import { describe, it, expect } from 'vitest';
import { heldBallTarget, HELD_BALL_HEIGHT_OFFSET } from '../ballFollow';
import { createMovementPath } from '../../models/PathModel';

describe('heldBallTarget', () => {
  const playerPos: [number, number, number] = [-40, 0, 12];

  it('returns null when the ball is not assigned to a player', () => {
    expect(heldBallTarget(null, undefined)).toBeNull();
    expect(heldBallTarget(undefined, undefined)).toBeNull();
  });

  it('rides the assigned player (lifted by the height offset) when there is no ball path', () => {
    expect(heldBallTarget(playerPos, undefined)).toEqual([
      -40,
      HELD_BALL_HEIGHT_OFFSET,
      12,
    ]);
  });

  it('yields to a drawn ball path (path wins) — returns null', () => {
    const movingPath = createMovementPath('ball-1', 'ball', [0, 0.5, 0], [40, 0.5, 0], 3);
    expect(heldBallTarget(playerPos, movingPath)).toBeNull();
  });

  it('still rides the player when a ball path exists but has no movement', () => {
    const stationaryPath = createMovementPath('ball-1', 'ball', [5, 0.5, 5], [5, 0.5, 5], 3);
    expect(heldBallTarget(playerPos, stationaryPath)).toEqual([
      -40,
      HELD_BALL_HEIGHT_OFFSET,
      12,
    ]);
  });
});
