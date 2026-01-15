import { create } from 'zustand';
import { MovementPath } from '../models/PathModel';
import { getPositionAtProgress, getPositionAtProgressWithEasing, easeInOut } from '../utils/pathAnimation';

interface AnimationState {
  // Playback state
  isPlaying: boolean;
  progress: number; // 0 to 1
  speed: number; // Playback speed multiplier (1.0 = normal)
  duration: number; // Total animation duration in seconds

  // Actions - Playback controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlay: () => void;
  setProgress: (progress: number) => void;
  setSpeed: (speed: number) => void;
  setDuration: (duration: number) => void;

  // Actions - Animation frame update
  tick: (deltaTime: number) => void;

  // Getters - Path interpolation
  getPositionForPath: (path: MovementPath, useEasing?: boolean) => [number, number, number];
  getProgress: () => number;
  isAnimating: () => boolean;
}

// Animation defaults
const ANIMATION_DEFAULTS = {
  speed: 1.0,
  duration: 5.0, // 5 second default animation
  minSpeed: 0.1,
  maxSpeed: 5.0,
} as const;

export const useAnimationStore = create<AnimationState>((set, get) => ({
  isPlaying: false,
  progress: 0,
  speed: ANIMATION_DEFAULTS.speed,
  duration: ANIMATION_DEFAULTS.duration,

  // Playback controls
  play: () => {
    set({ isPlaying: true });
  },

  pause: () => {
    set({ isPlaying: false });
  },

  stop: () => {
    set({ isPlaying: false, progress: 0 });
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  setProgress: (progress) => {
    // Clamp progress between 0 and 1
    const clampedProgress = Math.max(0, Math.min(1, progress));
    set({ progress: clampedProgress });
  },

  setSpeed: (speed) => {
    // Clamp speed to valid range
    const clampedSpeed = Math.max(
      ANIMATION_DEFAULTS.minSpeed,
      Math.min(ANIMATION_DEFAULTS.maxSpeed, speed)
    );
    set({ speed: clampedSpeed });
  },

  setDuration: (duration) => {
    // Ensure positive duration
    const validDuration = Math.max(0.1, duration);
    set({ duration: validDuration });
  },

  // Animation frame update - called each frame during playback
  tick: (deltaTime) => {
    const state = get();
    if (!state.isPlaying) return;

    // Calculate progress increment based on delta time, speed, and duration
    const progressIncrement = (deltaTime * state.speed) / state.duration;
    const newProgress = state.progress + progressIncrement;

    if (newProgress >= 1) {
      // Animation complete - stop at end
      set({ progress: 1, isPlaying: false });
    } else {
      set({ progress: newProgress });
    }
  },

  // Get interpolated position for a path at current progress
  getPositionForPath: (path, useEasing = true) => {
    const { progress } = get();

    if (useEasing) {
      return getPositionAtProgressWithEasing(path, progress, easeInOut);
    }
    return getPositionAtProgress(path, progress);
  },

  // Getters
  getProgress: () => {
    return get().progress;
  },

  isAnimating: () => {
    return get().isPlaying;
  },
}));
