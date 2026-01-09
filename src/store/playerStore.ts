import { create } from 'zustand';
import { Player, createTeamPlayers, DEFAULT_TEAM_COLORS } from '../models/PlayerModel';

interface PlayerState {
  players: Player[];
  selectedPlayerId: string | null;
  
  // Actions
  initializePlayers: () => void;
  updatePlayerPosition: (playerId: string, position: [number, number, number]) => void;
  updatePlayerRotation: (playerId: string, rotation: number) => void;
  selectPlayer: (playerId: string | null) => void;
  resetPlayers: () => void;
  getPlayer: (playerId: string) => Player | undefined;
  getTeamPlayers: (teamId: 'team1' | 'team2') => Player[];
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  players: [],
  selectedPlayerId: null,
  
  initializePlayers: () => {
    const team1Players = createTeamPlayers('team1', DEFAULT_TEAM_COLORS.team1);
    const team2Players = createTeamPlayers('team2', DEFAULT_TEAM_COLORS.team2);
    
    // Position players in initial formation (spread across field)
    const positionedTeam1 = team1Players.map((player, index) => ({
      ...player,
      position: [
        -30 + (index % 6) * 10,
        0,
        -40 + Math.floor(index / 6) * 20,
      ] as [number, number, number],
    }));
    
    const positionedTeam2 = team2Players.map((player, index) => ({
      ...player,
      position: [
        30 - (index % 6) * 10,
        0,
        -40 + Math.floor(index / 6) * 20,
      ] as [number, number, number],
    }));
    
    set({ players: [...positionedTeam1, ...positionedTeam2] });
  },
  
  updatePlayerPosition: (playerId, position) => {
    set((state) => ({
      players: state.players.map((player) =>
        player.id === playerId ? { ...player, position } : player
      ),
    }));
  },
  
  updatePlayerRotation: (playerId, rotation) => {
    set((state) => ({
      players: state.players.map((player) =>
        player.id === playerId ? { ...player, rotation } : player
      ),
    }));
  },
  
  selectPlayer: (playerId) => {
    set({ selectedPlayerId: playerId });
  },
  
  resetPlayers: () => {
    get().initializePlayers();
  },
  
  getPlayer: (playerId) => {
    return get().players.find((p) => p.id === playerId);
  },
  
  getTeamPlayers: (teamId) => {
    return get().players.filter((p) => p.teamId === teamId);
  },
}));
