import { create } from 'zustand';
import { Player, createTeamPlayers, DEFAULT_TEAM_COLORS } from '../models/PlayerModel';

export interface PlayerUpdate {
  playerId: string;
  position: [number, number, number];
  rotation?: number;
}

interface PlayerState {
  players: Player[];
  selectedPlayerId: string | null;
  /** Flag to track if a batch update is currently in progress */
  isUpdating: boolean;
  /** Flag to track if any player is currently being dragged */
  isDragging: boolean;

  // Actions
  initializePlayers: () => void;
  updatePlayerPosition: (playerId: string, position: [number, number, number]) => void;
  updatePlayerRotation: (playerId: string, rotation: number) => void;
  updateMultiplePlayers: (updates: PlayerUpdate[]) => void;
  selectPlayer: (playerId: string | null) => void;
  resetPlayers: () => void;
  getPlayer: (playerId: string) => Player | undefined;
  getTeamPlayers: (teamId: 'team1' | 'team2') => Player[];
  /** Set the global dragging state */
  setDragging: (isDragging: boolean) => void;
  /** Check if safe to apply formation (not dragging or updating) */
  canApplyFormation: () => boolean;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  players: [],
  selectedPlayerId: null,
  isUpdating: false,
  isDragging: false,

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

  updateMultiplePlayers: (updates) => {
    // Set updating flag before starting
    set({ isUpdating: true });

    try {
      set((state) => {
        // Create a map for O(1) lookup of updates by playerId
        const updateMap = new Map(
          updates.map((update) => [update.playerId, update])
        );

        return {
          players: state.players.map((player) => {
            const update = updateMap.get(player.id);
            if (update) {
              return {
                ...player,
                position: update.position,
                ...(update.rotation !== undefined && { rotation: update.rotation }),
              };
            }
            return player;
          }),
          isUpdating: false,
        };
      });
    } catch {
      // Ensure flag is cleared even on error
      set({ isUpdating: false });
    }
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

  setDragging: (isDragging) => {
    set({ isDragging });
  },

  canApplyFormation: () => {
    const state = get();
    // Prevent formation application if currently updating or dragging
    return !state.isUpdating && !state.isDragging;
  },
}));
