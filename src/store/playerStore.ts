import { create } from 'zustand';
import { Player, createTeamPlayers, DEFAULT_TEAM_COLORS } from '../models/PlayerModel';
import { getFormationById } from '../data/formations';
import { getPositionByCode, NUMBER_TO_POSITION } from '../data/aflPositions';
import { getTeamById } from '../data/aflTeams';

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
  showPositionNames: boolean;
  team1PresetId: string | null;
  team2PresetId: string | null;

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
  setPlayerPosition: (playerId: string, positionName: string | undefined) => void;
  togglePlayerNames: () => void;
  togglePositionNames: () => void;
  importRoster: (names: string[], teamId?: 'team1' | 'team2') => void;
  startEditingPlayerName: (playerId: string) => void;
  stopEditingPlayerName: () => void;
  setTeamPreset: (teamId: 'team1' | 'team2', presetId: string | null) => void;
  /** Auto-assign positions from jersey numbers. Only fills in players with no existing positionName. */
  autoAssignPositions: (teamId?: 'team1' | 'team2') => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  players: [],
  selectedPlayerId: null,
  isUpdating: false,
  isDragging: false,
  editingPlayerId: null,
  showPlayerNames: false,
  showPositionNames: false,
  team1PresetId: null,
  team2PresetId: null,

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

  setPlayerPosition: (playerId, positionName) => {
    set((state) => ({
      players: state.players.map((player) =>
        player.id === playerId ? { ...player, positionName: positionName || undefined } : player
      ),
    }));
  },

  togglePlayerNames: () => {
    set((state) => ({ showPlayerNames: !state.showPlayerNames }));
  },

  togglePositionNames: () => {
    set((state) => ({ showPositionNames: !state.showPositionNames }));
  },

  importRoster: (names, teamId) => {
    set((state) => {
      // Get players to assign names to (filter by team if specified)
      const targetPlayers = teamId
        ? state.players.filter((p) => p.teamId === teamId)
        : state.players;

      // Create a map of player IDs to their new names and positions
      const playerUpdates = new Map<string, { playerName?: string; positionName?: string }>();
      targetPlayers.forEach((player, index) => {
        if (index < names.length) {
          const line = names[index].trim();
          if (!line) return;

          // Parse "Name, POS" format (e.g., "John Smith, FB")
          const commaIndex = line.lastIndexOf(',');
          let name = line;
          let positionName: string | undefined;

          if (commaIndex !== -1) {
            const possiblePos = line.substring(commaIndex + 1).trim().toUpperCase();
            const position = getPositionByCode(possiblePos);
            if (position) {
              name = line.substring(0, commaIndex).trim();
              positionName = position.code;
            }
          }

          playerUpdates.set(player.id, {
            playerName: name || undefined,
            positionName,
          });
        }
      });

      // Update players with new names and positions
      return {
        players: state.players.map((player) => {
          const update = playerUpdates.get(player.id);
          if (update) {
            return {
              ...player,
              playerName: update.playerName,
              ...(update.positionName !== undefined && { positionName: update.positionName }),
            };
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

  autoAssignPositions: (teamId) => {
    set((state) => ({
      players: state.players.map((player) => {
        // Filter by team if specified
        if (teamId && player.teamId !== teamId) return player;
        // Only assign if player has no existing positionName
        if (player.positionName) return player;
        const posCode = player.number !== undefined ? NUMBER_TO_POSITION[player.number] : undefined;
        if (!posCode) return player;
        return { ...player, positionName: posCode };
      }),
    }));
  },

  setTeamPreset: (teamId, presetId) => {
    const preset = presetId ? getTeamById(presetId) : null;
    const presetKey = teamId === 'team1' ? 'team1PresetId' : 'team2PresetId';
    set((state) => ({
      [presetKey]: presetId,
      players: state.players.map((player) => {
        if (player.teamId !== teamId) return player;
        if (preset) {
          return {
            ...player,
            color: preset.primaryColor,
            teamPresetId: preset.id,
          };
        }
        // Reset to default
        return {
          ...player,
          color: DEFAULT_TEAM_COLORS[teamId],
          teamPresetId: undefined,
        };
      }),
    }));
  },
}));