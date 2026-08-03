import { describe, it, expect } from 'vitest';
import { describeRosterFit } from '../rosterImportFit';

/**
 * `importRoster` fills by index, so names past the board's capacity land
 * nowhere. Before the board was cut to 18 a side (#29) a 22-name PlayHQ team
 * sheet fitted exactly and there was nothing to say; now the last four are
 * dropped, and silence there reads as a truncated paste — sending the coach to
 * look for the problem in their clipboard.
 *
 * Phrased as a fact, not a warning: nothing has gone wrong, the board simply
 * holds 18.
 */
describe('describeRosterFit', () => {
  it('reports both numbers when a team sheet overflows one team', () => {
    expect(describeRosterFit(22, 18)).toBe(
      '18 of 22 names imported — the board holds 18 per team.',
    );
  });

  it('reports both numbers when two team sheets overflow the whole board', () => {
    expect(describeRosterFit(44, 36)).toBe(
      '36 of 44 names imported — the board holds 18 per team.',
    );
  });

  it('says nothing about capacity when every name fits', () => {
    expect(describeRosterFit(18, 18)).toBe('18 players ready to import.');
    expect(describeRosterFit(11, 18)).toBe('11 players ready to import.');
  });

  it('keeps the singular readable for a one-name paste', () => {
    expect(describeRosterFit(1, 18)).toBe('1 player ready to import.');
  });
});
