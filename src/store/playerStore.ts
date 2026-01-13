import { create } from 'zustand';
import { Player, createTeamPlayers, DEFAULT_TEAM_COLORS } from '../models/PlayerModel';
import {
  useHistoryStore,
  createStateSnapshot,
  type PlayerSnapshot,
} from './historyStore';
import { useAnnotationStore } from './annotationStore';

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
  /** Restore player state from a history snapshot (for undo/redo) */
  restoreFromSnapshot: (snapshots: PlayerSnapshot[]) => void;
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
    const { players } = get();
    const historyStore = useHistoryStore.getState();
    const annotationStore = useAnnotationStore.getState();

    // Push current state to history before making the change
    if (!historyStore.isPaused) {
      historyStore.pushSnapshot(
        createStateSnapshot(players, annotationStore.annotations)
      );
    }

    set((state) => ({
      players: state.players.map((player) =>
        player.id === playerId ? { ...player, position } : player
      ),
    }));
  },

  updatePlayerRotation: (playerId, rotation) => {
    const { players } = get();
    const historyStore = useHistoryStore.getState();
    const annotationStore = useAnnotationStore.getState();

    // Push current state to history before making the change
    if (!historyStore.isPaused) {
      historyStore.pushSnapshot(
        createStateSnapshot(players, annotationStore.annotations)
      );
    }

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

  restoreFromSnapshot: (snapshots) => {
    set((state) => ({
      players: state.players.map((player) => {
        const snapshot = snapshots.find((s) => s.id === player.id);
        if (snapshot) {
          return {
            ...player,
            position: [...snapshot.position] as [number, number, number],
            rotation: snapshot.rotation,
          };
        }
        return player;
      }),
    }));
  },
}));
