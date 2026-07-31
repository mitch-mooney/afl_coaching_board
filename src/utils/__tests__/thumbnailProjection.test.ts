import { describe, it, expect } from 'vitest';
import { projectSnapshot, type ThumbnailViewBox } from '../thumbnailProjection';
import type { BoardSnapshot } from '../boardSnapshot';
import { STANDARD_BOUNDARY } from '../fieldGeometry';
import { createMovementPath } from '../../models/PathModel';
import { createBall } from '../../models/BallModel';
import type { Player } from '../../models/PlayerModel';
import type { MovementPath } from '../../models/PathModel';

const VB: ThumbnailViewBox = { width: 200, height: 164, padding: 12 };

function snapshot(over: Partial<BoardSnapshot> = {}): BoardSnapshot {
  return { players: [], paths: [], annotations: [], camera: null, ball: null, cones: [], ...over };
}

function player(id: string, position: [number, number, number], color = '#fff'): Player {
  return { id, teamId: 'team1', position, rotation: 0, color };
}

describe('projectSnapshot', () => {
  it('places the field oval filling the padded viewBox', () => {
    expect(projectSnapshot(snapshot(), VB, STANDARD_BOUNDARY).field).toEqual({ cx: 100, cy: 82, rx: 88, ry: 70 });
  });

  it('maps the world origin to the viewBox centre', () => {
    const { players } = projectSnapshot(snapshot({ players: [player('p1', [0, 0, 0])] }), VB, STANDARD_BOUNDARY);
    expect(players[0].x).toBeCloseTo(100, 5);
    expect(players[0].y).toBeCloseTo(82, 5);
  });

  it('maps the field extremes to the padded box edges', () => {
    const snap = snapshot({
      players: [player('max', [165 / 2, 0, 135 / 2]), player('min', [-165 / 2, 0, -135 / 2])],
    });
    const { players } = projectSnapshot(snap, VB, STANDARD_BOUNDARY);
    expect([players[0].x, players[0].y]).toEqual([188, 152]);
    expect([players[1].x, players[1].y]).toEqual([12, 12]);
  });

  it('carries each player colour through', () => {
    const { players } = projectSnapshot(snapshot({ players: [player('p1', [0, 0, 0], '#ff0000')] }), VB, STANDARD_BOUNDARY);
    expect(players[0].color).toBe('#ff0000');
  });

  it('yields a null ball when the snapshot has none', () => {
    expect(projectSnapshot(snapshot(), VB, STANDARD_BOUNDARY).ball).toBeNull();
  });

  it('projects the ball when present', () => {
    expect(projectSnapshot(snapshot({ ball: createBall([0, 0.5, 0]) }), VB, STANDARD_BOUNDARY).ball).toEqual({ x: 100, y: 82 });
  });

  it('projects each path with at least two keyframes into a polyline', () => {
    const path = createMovementPath('p1', 'player', [0, 0, 0], [82.5, 0, 67.5], 5, 'path-1');
    const { paths } = projectSnapshot(snapshot({ paths: [path] }), VB, STANDARD_BOUNDARY);
    expect(paths).toHaveLength(1);
    expect(paths[0].points).toEqual([[100, 82], [188, 152]]);
  });

  it('omits a path with fewer than two keyframes', () => {
    const stub: MovementPath = {
      ...createMovementPath('p1', 'player', [0, 0, 0], [1, 0, 1], 5, 'p'),
      keyframes: [{ timestamp: 0, position: [0, 0, 0] }],
    };
    expect(projectSnapshot(snapshot({ paths: [stub] }), VB, STANDARD_BOUNDARY).paths).toEqual([]);
  });
});
