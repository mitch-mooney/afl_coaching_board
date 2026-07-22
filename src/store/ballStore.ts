import { create } from 'zustand';
import { Ball, createBall, KickType } from '../models/BallModel';

interface BallState {
  ball: Ball | null;
  isBallSelected: boolean;
  // Ball mode tracking for trajectory animations
  mode: 'assigned' | 'in-flight' | 'idle';
  currentPathId: string | null;
  currentKickType: KickType | null;

  // Actions
  initializeBall: (position?: [number, number, number]) => void;
  setBall: (ball: Ball | null) => void;
  updateBallPosition: (position: [number, number, number]) => void;
  assignBallToPlayer: (playerId: string | null) => void;
  selectBall: (selected: boolean) => void;
  removeBall: () => void;
  resetBall: () => void;
  getBall: () => Ball | null;
  hasBall: () => boolean;
  // Ball trajectory actions
  setBallInFlight: (pathId: string, kickType: KickType) => void;
  setBallIdle: () => void;
}

export const useBallStore = create<BallState>((set, get) => ({
  ball: null,
  isBallSelected: false,
  mode: 'assigned',
  currentPathId: null,
  currentKickType: null,

  initializeBall: (position = [0, 0.5, 0]) => {
    const ball = createBall(position);
    set({ ball, mode: 'assigned', currentPathId: null, currentKickType: null });
  },

  setBall: (ball) => {
    set({ ball });
  },

  updateBallPosition: (position) => {
    set((state) => {
      if (!state.ball) return state;
      return {
        ball: { ...state.ball, position },
      };
    });
  },

  assignBallToPlayer: (playerId) => {
    set((state) => {
      if (!state.ball) return state;
      return {
        ball: { ...state.ball, assignedPlayerId: playerId ?? undefined },
        mode: playerId ? 'assigned' : 'idle',
      };
    });
  },

  selectBall: (selected) => {
    set({ isBallSelected: selected });
  },

  removeBall: () => {
    set({ ball: null, isBallSelected: false });
  },

  resetBall: () => {
    const ball = createBall([0, 0.5, 0]);
    set({ ball, isBallSelected: false, mode: 'assigned', currentPathId: null, currentKickType: null });
  },

  getBall: () => {
    return get().ball;
  },

  hasBall: () => {
    return get().ball !== null;
  },

  setBallInFlight: (pathId, kickType) => {
    set({ mode: 'in-flight', currentPathId: pathId, currentKickType: kickType });
  },

  setBallIdle: () => {
    set({ mode: 'idle', currentPathId: null, currentKickType: null });
  },
}));
