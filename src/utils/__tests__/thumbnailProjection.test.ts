import { describe, it, expect } from 'vitest';
import { projectSnapshot, THUMBNAIL_VIEWBOX, type ThumbnailViewBox } from '../thumbnailProjection';
import type { BoardSnapshot } from '../boardSnapshot';
import { STANDARD_BOUNDARY, boundaryOf } from '../fieldGeometry';
import { createMovementPath } from '../../models/PathModel';
import { createBall } from '../../models/BallModel';
import type { Player } from '../../models/PlayerModel';
import type { MovementPath } from '../../models/PathModel';

const VB: ThumbnailViewBox = THUMBNAIL_VIEWBOX;

function snapshot(over: Partial<BoardSnapshot> = {}): BoardSnapshot {
  return { players: [], paths: [], annotations: [], camera: null, ball: null, cones: [], ...over };
}

function player(id: string, position: [number, number, number], color = '#fff'): Player {
  return { id, teamId: 'team1', position, rotation: 0, color };
}

// Standard ground fills the padded viewBox edge to edge, with the 12-unit inset
// on all four sides it has always had — the viewBox's interior is 165 : 135, so
// the generic ground letterboxes against nothing. These are the guard that the
// board's own ground still draws as it did before thumbnails knew about Venues.
describe('projectSnapshot', () => {
  it('places the field oval filling the padded viewBox', () => {
    expect(projectSnapshot(snapshot(), VB, STANDARD_BOUNDARY).field).toEqual({ cx: 100, cy: 84, rx: 88, ry: 72 });
  });

  it('maps the world origin to the viewBox centre', () => {
    const { players } = projectSnapshot(snapshot({ players: [player('p1', [0, 0, 0])] }), VB, STANDARD_BOUNDARY);
    expect(players[0].x).toBeCloseTo(100, 5);
    expect(players[0].y).toBeCloseTo(84, 5);
  });

  it('maps the field extremes to the padded box edges', () => {
    const snap = snapshot({
      players: [player('max', [165 / 2, 0, 135 / 2]), player('min', [-165 / 2, 0, -135 / 2])],
    });
    const { players } = projectSnapshot(snap, VB, STANDARD_BOUNDARY);
    expect([players[0].x, players[0].y]).toEqual([188, 156]);
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
    expect(projectSnapshot(snapshot({ ball: createBall([0, 0.5, 0]) }), VB, STANDARD_BOUNDARY).ball).toEqual({ x: 100, y: 84 });
  });

  it('projects each path with at least two keyframes into a polyline', () => {
    const path = createMovementPath('p1', 'player', [0, 0, 0], [82.5, 0, 67.5], 5, 'path-1');
    const { paths } = projectSnapshot(snapshot({ paths: [path] }), VB, STANDARD_BOUNDARY);
    expect(paths).toHaveLength(1);
    expect(paths[0].points).toEqual([[100, 84], [188, 156]]);
  });

  it('omits a path with fewer than two keyframes', () => {
    const stub: MovementPath = {
      ...createMovementPath('p1', 'player', [0, 0, 0], [1, 0, 1], 5, 'p'),
      keyframes: [{ timestamp: 0, position: [0, 0, 0] }],
    };
    expect(projectSnapshot(snapshot({ paths: [stub] }), VB, STANDARD_BOUNDARY).paths).toEqual([]);
  });
});

// The football claim: a narrow ground has to look narrow in the list. Normalising
// each coordinate by the ground's own dimensions — which is what this projection
// used to do — draws every ground as the same rectangle, flattening the one
// difference the coach is scanning the playbook for.

const NARROW = boundaryOf({ boundaryLength: 165, boundaryWidth: 118 });
const WIDE = boundaryOf({ boundaryLength: 165, boundaryWidth: 141 });

describe('projectSnapshot shows the shape of the ground', () => {
  it('draws a narrow ground narrower than a wide one of the same length', () => {
    const narrow = projectSnapshot(snapshot(), VB, NARROW).field;
    const wide = projectSnapshot(snapshot(), VB, WIDE).field;

    expect(narrow.ry / narrow.rx).toBeLessThan(wide.ry / wide.rx);
  });

  it('letterboxes the ground it cannot fill, centred in the box', () => {
    // 141 m is wider than the box's 135 m of vertical room, so the ground shrinks
    // until its width fits and the leftover goes on both ends of the long axis.
    const wide = projectSnapshot(snapshot(), VB, WIDE).field;

    expect(wide.ry).toBeCloseTo(72, 5); // the short axis is what ran out
    expect(wide.rx).toBeLessThan(88); // ...so the long axis no longer reaches the padding
    expect([wide.cx, wide.cy]).toEqual([100, 84]); // equal letterbox at both ends
  });

  it('keeps every ground inside the padded box', () => {
    for (const boundary of [NARROW, WIDE, STANDARD_BOUNDARY]) {
      const { cx, cy, rx, ry } = projectSnapshot(snapshot(), VB, boundary).field;
      expect(cx - rx).toBeGreaterThanOrEqual(VB.padding);
      expect(cx + rx).toBeLessThanOrEqual(VB.width - VB.padding);
      expect(cy - ry).toBeGreaterThanOrEqual(VB.padding);
      expect(cy + ry).toBeLessThanOrEqual(VB.height - VB.padding);
    }
  });

  it('puts a player on the wing of a narrow ground on that ground’s boundary', () => {
    // The dot and the drawn oval come from one scale, so the edge of the ground
    // is the edge of the ground whatever its dimensions.
    const onTheWing = player('winger', [0, 0, 118 / 2]);
    const { field, players } = projectSnapshot(snapshot({ players: [onTheWing] }), VB, NARROW);

    expect(players[0].y).toBeCloseTo(field.cy + field.ry, 5);
  });
});
