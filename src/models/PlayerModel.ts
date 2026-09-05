export interface Player {
  id: string;
  teamId: 'team1' | 'team2';
  position: [number, number, number]; // [x, y, z]
  rotation: number; // Rotation in radians
  color: string;
  number?: number; // Player number
  playerName?: string; // Player name for display labels
  positionName?: string; // AFL position code (e.g., 'FB', 'CHB', 'RK')
  teamPresetId?: string; // AFL team preset ID for jersey texture
  skinTone?: 'fair' | 'medium' | 'dark'; // Skin tone for 3D model
}

export interface Team {
  id: 'team1' | 'team2';
  name: string;
  color: string;
  players: Player[];
}

export const DEFAULT_TEAM_COLORS = {
  team1: '#0066cc', // Blue
  team2: '#cc0000', // Red
} as const;

const SKIN_TONES: Array<'fair' | 'medium' | 'dark'> = ['fair', 'fair', 'medium', 'medium', 'dark'];

/**
 * The skin tone a player of this number is seeded with. One rotation, shared
 * by seeding and by Placement, so a placed #4 matches the seeded #4.
 */
export function skinToneFor(number: number): 'fair' | 'medium' | 'dark' {
  return SKIN_TONES[(number - 1) % SKIN_TONES.length];
}

/**
 * The id of a player, from team and number. One form, shared by seeding and by
 * Placement, so a placed #4 has the id a seeded #4 would, and the bench filter
 * in `boardSnapshot` can keep reasoning about the `-19` to `-22` suffixes.
 */
export function playerId(teamId: 'team1' | 'team2', number: number): string {
  return `${teamId}-player-${number}`;
}

/**
 * How many players a team puts on the board.
 *
 * 18 — the side that takes the field, and no more. There is no interchange
 * bench: it used to be four more per team parked outside the boundary, which is
 * why every play reported eight players out of bounds, and issue #29 deleted it
 * rather than exempting it from the readout.
 */
export const PLAYERS_PER_TEAM = 18;

/**
 * Create initial players for a team: 18, all of whom stand on the ground.
 *
 * `number` is the migration handle for plays saved before the bench was deleted
 * — 19 to 22 are exactly the players who no longer exist. Every player who can
 * reach a stored Play is numbered here, and no UI in `src/` edits it.
 */
export function createTeamPlayers(
  teamId: 'team1' | 'team2',
  color: string,
  count: number = PLAYERS_PER_TEAM
): Player[] {
  const players: Player[] = [];

  for (let i = 0; i < count; i++) {
    players.push({
      id: playerId(teamId, i + 1),
      teamId,
      position: [0, 0, 0], // Will be positioned on field
      rotation: 0,
      color,
      number: i + 1,
      skinTone: skinToneFor(i + 1),
    });
  }

  return players;
}
