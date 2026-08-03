import { PLAYERS_PER_TEAM } from '../../../models/PlayerModel';

/**
 * What the import confirmation says about how many of the pasted names the board
 * can actually take.
 *
 * `importRoster` fills by index, so anything past `capacity` is silently
 * dropped. That was harmless while the board held 22 a side and a PlayHQ team
 * sheet fitted exactly; since the interchange bench was deleted (#29) the last
 * four names of a full sheet land nowhere, and unexplained silence there reads
 * as a truncated paste.
 *
 * Deliberately a statement of fact rather than a warning: nothing has gone
 * wrong, and the coach has no action to take. Same reasoning as the Venue
 * panel's out-of-bounds finding.
 */
export function describeRosterFit(nameCount: number, capacity: number): string {
  if (nameCount > capacity) {
    return `${capacity} of ${nameCount} names imported — the board holds ${PLAYERS_PER_TEAM} per team.`;
  }
  return `${nameCount} player${nameCount === 1 ? '' : 's'} ready to import.`;
}
