import { create } from 'zustand';
import { Ball, createBall } from '../models/BallModel';

interface BallState {
  ball: Ball | null;
  isBallSelected: boolean;

  // Actions
  initializeBall: (position?: [number, number, number]) => void;
  updateBallPosition: (position: [number, number, number]) => void;
  assignBallToPlayer: (playerId: string | null) => void;
  selectBall: (selected: boolean) => void;
  removeBall: () => void;
  resetBall: () => void;
  getBall: () => Ball | null;
  hasBall: () => boolean;
}

export const useBallStore = create<BallState>((set, get) => ({
  ball: null,
  isBallSelected: false,

  initializeBall: (position = [0, 0.5, 0]) => {
    const ball = createBall(position);
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
    set({ ball, isBallSelected: false });
  },

  getBall: () => {
    return get().ball;
  },

  hasBall: () => {
    return get().ball !== null;
  },
}));
