import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../playerStore';
import { STANDARD_BOUNDARY, outOfBounds } from '../../utils/fieldGeometry';

beforeEach(() => { usePlayerStore.setState({ labelMode: 'number' }); });

/**
 * The invariant issue #29 settled, stated where it can actually break: a board
 * nobody has touched has nothing outside the Boundary. This is the check the
 * ticket asks for — if it ever fails, something is seeding content off the
 * ground again and the fit readout has gone back to crying wolf.
 */
describe('a freshly seeded board fits Standard ground', () => {
  it('seeds 18 per team', () => {
    usePlayerStore.getState().initializePlayers();
    const { players } = usePlayerStore.getState();

    expect(players.filter((p) => p.teamId === 'team1')).toHaveLength(18);
    expect(players.filter((p) => p.teamId === 'team2')).toHaveLength(18);
  });

  it('reports nothing out of bounds', () => {
    usePlayerStore.getState().initializePlayers();
    const { players } = usePlayerStore.getState();

    const report = outOfBounds(
      { players, paths: [], cones: [], ball: null },
      STANDARD_BOUNDARY,
    );

    expect(report.players).toEqual([]);
    expect(report.count).toBe(0);
  });

  it('numbers each team 1..18, so nothing carries a bench number', () => {
    usePlayerStore.getState().initializePlayers();
    const { players } = usePlayerStore.getState();

    for (const teamId of ['team1', 'team2'] as const) {
      const numbers = players
        .filter((p) => p.teamId === teamId)
        .map((p) => p.number)
        .sort((a, b) => (a ?? 0) - (b ?? 0));
      expect(numbers).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    }
  });
});

describe('labelMode', () => {
  it('defaults to number', () => {
    expect(usePlayerStore.getState().labelMode).toBe('number');
  });

  it('setLabelMode changes mode', () => {
    usePlayerStore.getState().setLabelMode('name');
    expect(usePlayerStore.getState().labelMode).toBe('name');
  });

  it('cycleLabelMode goes number→name→position→number', () => {
    const s = usePlayerStore.getState();
    s.cycleLabelMode();
    expect(usePlayerStore.getState().labelMode).toBe('name');
    s.cycleLabelMode();
    expect(usePlayerStore.getState().labelMode).toBe('position');
    s.cycleLabelMode();
    expect(usePlayerStore.getState().labelMode).toBe('number');
  });
});
