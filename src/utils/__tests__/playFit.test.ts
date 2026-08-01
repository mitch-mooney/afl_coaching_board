import { describe, it, expect } from 'vitest';
import { playFitsBoundary } from '../playFit';
import { STANDARD_BOUNDARY, boundaryOf } from '../fieldGeometry';
import type { Play, PlayPhase } from '../../models/PlayModel';
import type { Player } from '../../models/PlayerModel';
import type { MovementPath } from '../../models/PathModel';

// The football claim: with Saturday's ground selected, the list says which of
// these plays does not fit it — the same question the board answers for the open
// Play, asked of the whole playbook at once.

const TIGHT = boundaryOf({ boundaryLength: 150, boundaryWidth: 110 });

const playerAt = (id: string, x: number, z: number): Player => ({
  id,
  teamId: 'team1',
  position: [x, 0, z],
  rotation: 0,
  color: '#0066cc',
});

const pathThrough = (id: string, ...points: Array<[number, number]>): MovementPath => ({
  id,
  entityId: 'team1-player-1',
  entityType: 'player',
  keyframes: points.map(([x, z], i) => ({
    timestamp: i,
    position: [x, 0, z] as [number, number, number],
  })),
  duration: points.length - 1,
  startTimeOffset: 0,
});

const phase = (over: Partial<PlayPhase> = {}): PlayPhase => ({
  id: 'phase-1',
  label: 'Phase 1',
  playerPositions: [],
  paths: [],
  annotations: [],
  cameraState: null,
  ...over,
});

const play = (...phases: PlayPhase[]): Play => ({
  name: 'Centre bounce press',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  team1RosterId: null,
  team2RosterId: null,
  phases,
});

describe('playFitsBoundary', () => {
  it('fits a play whose whole structure is inside the ground', () => {
    const structure = play(phase({ playerPositions: [playerAt('p1', 0, 0), playerAt('p2', 40, 30)] }));

    expect(playFitsBoundary(structure, TIGHT)).toBe(true);
  });

  it('does not fit when a winger who fits the standard ground is off a tighter one', () => {
    const structure = play(phase({ playerPositions: [playerAt('winger', 0, 60)] }));

    expect(playFitsBoundary(structure, STANDARD_BOUNDARY)).toBe(true);
    expect(playFitsBoundary(structure, TIGHT)).toBe(false);
  });

  it('does not fit when a lead runs off the ground, though every player starts on it', () => {
    // The case the list exists to catch: standing still it looks fine, and only
    // fails the moment the coach presses play in front of the team.
    const structure = play(phase({
      playerPositions: [playerAt('half-forward', 20, 0)],
      paths: [pathThrough('lead', [20, 0], [20, 60])],
    }));

    expect(playFitsBoundary(structure, TIGHT)).toBe(false);
  });

  it('does not fit when a later phase strays, not just the one the thumbnail draws', () => {
    const structure = play(
      phase({ id: 'phase-1', playerPositions: [playerAt('p1', 0, 0)] }),
      phase({ id: 'phase-2', playerPositions: [playerAt('p1', 0, 60)] }),
    );

    expect(playFitsBoundary(structure, TIGHT)).toBe(false);
  });

  it('still fits when an Annotation points well off the ground', () => {
    // Inert markup may point off-ground on purpose — an arrow drawn from where
    // the interchange bench would be is not a play that does not fit.
    const structure = play(phase({
      playerPositions: [playerAt('p1', 0, 0)],
      annotations: [{ id: 'a1', type: 'arrow', points: [[0, 0, 90], [10, 0, 90]], color: '#ff0', createdAt: new Date(0) }],
    }));

    expect(playFitsBoundary(structure, TIGHT)).toBe(true);
  });

  it('fits an empty play, which has nothing to be outside anything', () => {
    expect(playFitsBoundary(play(), TIGHT)).toBe(true);
  });
});
