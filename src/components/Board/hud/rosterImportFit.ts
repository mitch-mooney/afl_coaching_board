/**
 * Who the import is aimed at, as `importRoster` will actually fill it.
 *
 * `scope` is not derivable from `capacity`: 36 slots mean "both teams, filled in
 * order", and that ordering is what lets a single team sheet spill onto the
 * opposition — a thing a count alone cannot describe.
 *
 * `perTeam` is counted off the board rather than read from the 18 constant,
 * because a board the coach placed by hand can hold fewer (#81). It is what
 * the trailing sentence states and where a board-scoped import spills.
 */
export interface RosterTarget {
  /** How many players `importRoster` will fill, by index. */
  capacity: number;
  scope: 'team' | 'board';
  /** How many players the first team holds on this board. */
  perTeam: number;
}

/**
 * What the import confirmation says about where the pasted names will land.
 *
 * `importRoster` fills by index, and since the interchange bench was deleted
 * (#29) the board holds 18 a side rather than 22. That makes a standard 22-name
 * PlayHQ team sheet no longer fit a team, in two different ways:
 *
 * - Aimed at **one team**, the last four names land nowhere. Silence there reads
 *   as a truncated paste, sending the coach to look in their clipboard.
 * - Aimed at **the whole board** — the default — all 22 are imported, but the
 *   last four carry onto the opposition and rename players the coach never meant
 *   to touch. This one is worse for being invisible: every name did import, so a
 *   bare count looks entirely correct.
 *
 * Deliberately a statement of fact rather than a warning: nothing has gone
 * wrong, and the coach can act on it or not. Same reasoning as the Venue panel's
 * out-of-bounds finding.
 */
export function describeRosterFit(nameCount: number, target: RosterTarget): string {
  const { capacity, scope, perTeam } = target;
  const heldPerTeam = `The board holds ${perTeam} per team.`;

  if (nameCount > capacity) {
    return `${capacity} of ${nameCount} names imported — the board holds ${perTeam} per team.`;
  }

  if (scope === 'board' && nameCount > perTeam) {
    const spilled = nameCount - perTeam;
    return `${nameCount} names imported — ${perTeam} to the first team, ${spilled} onto the second. ${heldPerTeam}`;
  }

  return `${nameCount} player${nameCount === 1 ? '' : 's'} ready to import.`;
}
