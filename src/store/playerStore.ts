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
    // Spreads 22 players across the field in a realistic formation-like pattern
    const getFallbackPosition = (teamId: 'team1' | 'team2', index: number): [number, number, number] => {
      // Team1 on negative X side (defending), Team2 on positive X side
      const teamMultiplier = teamId === 'team1' ? -1 : 1;

      // Define positions for 22 players (18 on-field + 4 interchange)
      const positions: [number, number, number][] = [
        // Defence line (6 players)
        [55, 0, 0],    // Full Back
        [50, 0, -25],  // Back Pocket Left
        [50, 0, 25],   // Back Pocket Right
        [40, 0, 0],    // Centre Half Back
        [40, 0, -35],  // Half Back Flank Left
        [40, 0, 35],   // Half Back Flank Right
        // Midfield (6 players)
        [0, 0, -50],   // Wing Left
        [0, 0, 50],    // Wing Right
        [10, 0, 0],    // Centre
        [5, 0, 0],     // Ruckman
        [10, 0, -15],  // Ruck Rover
        [10, 0, 15],   // Rover
        // Forward line (6 players)
        [-40, 0, 0],   // Centre Half Forward
        [-40, 0, -35], // Half Forward Flank Left
        [-40, 0, 35],  // Half Forward Flank Right
        [-55, 0, 0],   // Full Forward
        [-50, 0, -25], // Forward Pocket Left
        [-50, 0, 25],  // Forward Pocket Right
        // Interchange (4 players - off-field bench area)
        [70, 0, -55],  // Int 1
        [70, 0, -45],  // Int 2
        [70, 0, -35],  // Int 3
        [70, 0, -25],  // Int 4
      ];

      const pos = positions[index] || [0, 0, index * 3];
      return [pos[0] * teamMultiplier, pos[1], pos[2]];
    };

    // Offset for team1 (blue) to make them visible next to team2 (red)
    const TEAM1_Z_OFFSET = 0.5;

    if (centreBounce && centreBounce.positions.length >= 44) {
      // Position players using the Centre Bounce formation
      const positionedTeam1 = team1Players.map((player, index) => {
        const formationPos = centreBounce.positions.find(
          (p) => p.teamId === 'team1' && p.playerNumber === index + 1
        );
        const basePos = formationPos?.position ?? getFallbackPosition('team1', index);
        // Offset blue team by 0.5m in Z direction for visibility
        return {
          ...player,
          position: [basePos[0], basePos[1], basePos[2] + TEAM1_Z_OFFSET] as [number, number, number],
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
      const positionedTeam1 = team1Players.map((player, index) => {
        const basePos = getFallbackPosition('team1', index);
        // Offset blue team by 0.5m in Z direction for visibility
        return {
          ...player,
          position: [basePos[0], basePos[1], basePos[2] + TEAM1_Z_OFFSET] as [number, number, number],
        };
      });

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