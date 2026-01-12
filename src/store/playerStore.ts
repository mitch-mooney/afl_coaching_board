import { create } from 'zustand';
import { Player, createTeamPlayers, DEFAULT_TEAM_COLORS } from '../models/PlayerModel';

interface PlayerState {
  players: Player[];
  selectedPlayerId: string | null;
  showPlayerNames: boolean;

  // Actions
  initializePlayers: () => void;
  updatePlayerPosition: (playerId: string, position: [number, number, number]) => void;
  updatePlayerRotation: (playerId: string, rotation: number) => void;
  selectPlayer: (playerId: string | null) => void;
  resetPlayers: () => void;
  getPlayer: (playerId: string) => Player | undefined;
  getTeamPlayers: (teamId: 'team1' | 'team2') => Player[];
  setPlayerName: (playerId: string, name: string) => void;
  togglePlayerNames: () => void;
  importRoster: (names: string[], teamId?: 'team1' | 'team2') => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  players: [],
  selectedPlayerId: null,
  showPlayerNames: false,

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

  setPlayerName: (playerId, name) => {
    set((state) => ({
      players: state.players.map((player) =>
        player.id === playerId ? { ...player, playerName: name || undefined } : player
      ),
    }));
  },

  togglePlayerNames: () => {
    set((state) => ({ showPlayerNames: !state.showPlayerNames }));
  },

  importRoster: (names, teamId) => {
    set((state) => {
      // Get players to assign names to (filter by team if specified)
      const targetPlayers = teamId
        ? state.players.filter((p) => p.teamId === teamId)
        : state.players;

      // Create a map of player IDs to their new names
      const playerIdToName = new Map<string, string | undefined>();
      targetPlayers.forEach((player, index) => {
        if (index < names.length) {
          const name = names[index].trim();
          // Store undefined for empty names (same behavior as setPlayerName)
          playerIdToName.set(player.id, name || undefined);
        }
      });

      // Update players with new names
      return {
        players: state.players.map((player) => {
          if (playerIdToName.has(player.id)) {
            return { ...player, playerName: playerIdToName.get(player.id) };
          }
          return player;
        }),
      };
    });
  },
}));
