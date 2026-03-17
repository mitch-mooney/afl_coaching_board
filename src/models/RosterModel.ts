export interface RosterPlayer {
  id: string;             // stable UUID (crypto.randomUUID)
  number: number;
  name: string;
  position?: string;      // AFL position code e.g. 'CHF'
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

export interface TeamRoster {
  id?: number;            // Dexie auto-increment
  teamName: string;
  createdAt: string;
  players: RosterPlayer[];
}
