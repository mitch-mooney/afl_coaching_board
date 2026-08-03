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
  const oneTeam = { capacity: 18, scope: 'team' } as const;
  const wholeBoard = { capacity: 36, scope: 'board' } as const;

  it('reports both numbers when a team sheet overflows one team', () => {
    expect(describeRosterFit(22, oneTeam)).toBe(
      '18 of 22 names imported — the board holds 18 per team.',
    );
  });

  it('reports both numbers when two team sheets overflow the whole board', () => {
    expect(describeRosterFit(44, wholeBoard)).toBe(
      '36 of 44 names imported — the board holds 18 per team.',
    );
  });

  /**
   * The case the board shrinking newly created. A 22-name team sheet used to
   * fill team 1 exactly at 22 a side; at 18 a side it fills team 1 and carries
   * the last four onto the opposition, renaming players the coach never meant
   * to touch. Every name is imported, so a count alone would look fine.
   */
  it('says where the names go when one sheet spills onto the second team', () => {
    expect(describeRosterFit(22, wholeBoard)).toBe(
      '22 names imported — 18 to the first team, 4 onto the second. The board holds 18 per team.',
    );
  });

  it('keeps the singular readable when exactly one name spills', () => {
    expect(describeRosterFit(19, wholeBoard)).toBe(
      '19 names imported — 18 to the first team, 1 onto the second. The board holds 18 per team.',
    );
  });

  it('says nothing about capacity when every name fits', () => {
    expect(describeRosterFit(18, oneTeam)).toBe('18 players ready to import.');
    expect(describeRosterFit(11, oneTeam)).toBe('11 players ready to import.');
    expect(describeRosterFit(18, wholeBoard)).toBe('18 players ready to import.');
  });

  it('keeps the singular readable for a one-name paste', () => {
    expect(describeRosterFit(1, oneTeam)).toBe('1 player ready to import.');
  });
});
