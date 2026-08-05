import { describe, it, expect } from 'vitest';
import { describeOutOfBounds, outOfBoundsSentence } from '../fitReadout';
import type { OutOfBoundsReport } from '../../../../utils/fieldGeometry';

// What the Fit readout says out loud. The football claim: with Saturday's ground
// selected, the readout tells the coach how much of the play is off it — one
// winger a metre out reads differently from half the structure, which is why it
// names kinds and counts rather than raising a warning.

const report = (over: Partial<OutOfBoundsReport> = {}): OutOfBoundsReport => {
  const filled = { players: [], cones: [], paths: [], ball: false, ...over };
  return {
    ...filled,
    count: filled.players.length + filled.cones.length + filled.paths.length + (filled.ball ? 1 : 0),
  };
};

describe('describeOutOfBounds', () => {
  it('names a single player in the singular', () => {
    expect(describeOutOfBounds(report({ players: ['p1'] }))).toBe('1 player');
  });

  it('pluralises a group of the same kind', () => {
    expect(describeOutOfBounds(report({ players: ['p1', 'p2', 'p3', 'p4'] }))).toBe('4 players');
  });

  it('joins two kinds with "and"', () => {
    expect(describeOutOfBounds(report({ players: ['p1', 'p2', 'p3'], paths: ['lead'] }))).toBe(
      '3 players and 1 path',
    );
  });

  it('commas the earlier kinds and reserves "and" for the last', () => {
    expect(
      describeOutOfBounds(report({ players: ['p1'], paths: ['lead'], cones: ['c1', 'c2'] })),
    ).toBe('1 player, 1 path and 2 cones');
  });

  it('lists content in board order — players, paths, cones, then the ball', () => {
    expect(
      describeOutOfBounds(
        report({ players: ['p1'], paths: ['lead'], cones: ['c1'], ball: true }),
      ),
    ).toBe('1 player, 1 path, 1 cone and the ball');
  });

  it('names the ball as a thing rather than a count', () => {
    expect(describeOutOfBounds(report({ ball: true }))).toBe('the ball');
  });

  it('says nothing about a board that fits', () => {
    expect(describeOutOfBounds(report())).toBe('');
  });
});

describe('outOfBoundsSentence', () => {
  it('names the ground the content is outside of', () => {
    expect(outOfBoundsSentence(report({ players: ['p1', 'p2', 'p3', 'p4'] }), 'Jubilee Park')).toBe(
      '4 players are outside Jubilee Park.',
    );
  });

  it('agrees the verb with a single item', () => {
    expect(outOfBoundsSentence(report({ players: ['p1'] }), 'Jubilee Park')).toBe(
      '1 player is outside Jubilee Park.',
    );
  });

  it('agrees the verb with mixed kinds, which are always plural', () => {
    expect(
      outOfBoundsSentence(report({ players: ['p1'], paths: ['lead'] }), 'Jubilee Park'),
    ).toBe('1 player and 1 path are outside Jubilee Park.');
  });

  it('treats the ball on its own as singular', () => {
    expect(outOfBoundsSentence(report({ ball: true }), 'Jubilee Park')).toBe(
      'the ball is outside Jubilee Park.',
    );
  });

  it('falls back to "this ground" when no ground is named', () => {
    // ADR 0002 seeds Standard ground so there is always an Active Venue, but the
    // sentence still has to read as English if a caller hands it nothing.
    expect(outOfBoundsSentence(report({ players: ['p1', 'p2'] }), undefined)).toBe(
      '2 players are outside this ground.',
    );
  });
});
