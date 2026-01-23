import { create } from 'zustand';
import { Player, createTeamPlayers, DEFAULT_TEAM_COLORS } from '../models/PlayerModel';
import { getFormationById } from '../data/formations';

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
  editingPlayerId: string | null;
  showPlayerNames: boolean;

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
  setPlayerName: (playerId: string, name: string) => void;
  togglePlayerNames: () => void;
  importRoster: (names: string[], teamId?: 'team1' | 'team2') => void;
  startEditingPlayerName: (playerId: string) => void;
  stopEditingPlayerName: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  players: [],
  selectedPlayerId: null,
  isUpdating: false,
  isDragging: false,
  editingPlayerId: null,
  showPlayerNames: false,

  initializePlayers: () => {
    const team1Players = createTeamPlayers('team1', DEFAULT_TEAM_COLORS.team1);
    const team2Players = createTeamPlayers('team2', DEFAULT_TEAM_COLORS.team2);

    // Apply Centre Bounce formation by default
    const centreBounce = getFormationById('centre-bounce');

    // Helper function to get fallback position for a player
    const getFallbackPosition = (teamId: 'team1' | 'team2', index: number): [number, number, number] => {
      // Spread 22 players across 4 rows of 6 players (last row has 4)
      const row = Math.floor(index / 6);
      const col = index % 6;
      const xOffset = teamId === 'team1' ? -40 : 40;
      const xSpread = teamId === 'team1' ? 1 : -1;
      return [
        xOffset + (col * 12 * xSpread),
        0,
        -45 + (row * 25),
      ];
    };

    if (centreBounce && centreBounce.positions.length >= 44) {
      // Position players using the Centre Bounce formation
      const positionedTeam1 = team1Players.map((player, index) => {
        const formationPos = centreBounce.positions.find(
          (p) => p.teamId === 'team1' && p.playerNumber === index + 1
        );
        return {
          ...player,
          position: formationPos?.position ?? getFallbackPosition('team1', index),
          rotation: formationPos?.rotation ?? 0,
        };
      });

      const positionedTeam2 = team2Players.map((player, index) => {
        const formationPos = centreBounce.positions.find(
          (p) => p.teamId === 'team2' && p.playerNumber === index + 1
        );
        return {
          ...player,
          position: formationPos?.position ?? getFallbackPosition('team2', index),
          rotation: formationPos?.rotation ?? 0,
        };
      });

      set({ players: [...positionedTeam1, ...positionedTeam2] });
    } else {
      // Fallback to spread grid layout if Centre Bounce not found
      const positionedTeam1 = team1Players.map((player, index) => ({
        ...player,
        position: getFallbackPosition('team1', index),
      }));

      const positionedTeam2 = team2Players.map((player, index) => ({
        ...player,
        position: getFallbackPosition('team2', index),
      }));

      set({ players: [...positionedTeam1, ...positionedTeam2] });
    }
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

  startEditingPlayerName: (playerId) => {
    set({ editingPlayerId: playerId, selectedPlayerId: playerId });
  },

  stopEditingPlayerName: () => {
    set({ editingPlayerId: null });
  },
}));