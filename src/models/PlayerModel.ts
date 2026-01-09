export interface Player {
  id: string;
  teamId: 'team1' | 'team2';
  position: [number, number, number]; // [x, y, z]
  rotation: number; // Rotation in radians
  color: string;
  number?: number; // Player number
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

// Create initial players for a team
export function createTeamPlayers(
  teamId: 'team1' | 'team2',
  color: string,
  count: number = 18
): Player[] {
  const players: Player[] = [];
  
  for (let i = 0; i < count; i++) {
    players.push({
      id: `${teamId}-player-${i + 1}`,
      teamId,
      position: [0, 0, 0], // Will be positioned on field
      rotation: 0,
      color,
      number: i + 1,
    });
  }
  
  return players;
}
