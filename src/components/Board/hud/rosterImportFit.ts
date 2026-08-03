import { PLAYERS_PER_TEAM } from '../../../models/PlayerModel';

/**
 * Who the import is aimed at, as `importRoster` will actually fill it.
 *
 * `scope` is not derivable from `capacity`: 36 slots mean "both teams, filled in
 * order", and that ordering is what lets a single team sheet spill onto the
 * opposition — a thing a count alone cannot describe.
 */
export interface RosterTarget {
  /** How many players `importRoster` will fill, by index. */
  capacity: number;
  scope: 'team' | 'board';
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
  const heldPerTeam = `The board holds ${PLAYERS_PER_TEAM} per team.`;

  if (nameCount > target.capacity) {
    return `${target.capacity} of ${nameCount} names imported — the board holds ${PLAYERS_PER_TEAM} per team.`;
  }

  if (target.scope === 'board' && nameCount > PLAYERS_PER_TEAM) {
    const spilled = nameCount - PLAYERS_PER_TEAM;
    return `${nameCount} names imported — ${PLAYERS_PER_TEAM} to the first team, ${spilled} onto the second. ${heldPerTeam}`;
  }

  return `${nameCount} player${nameCount === 1 ? '' : 's'} ready to import.`;
}
