import { create } from 'zustand';
import { useEventStore } from './eventStore';

/**
 * Animation playback speed presets
 */
export type AnimationSpeed = 0.25 | 0.5 | 1 | 1.5 | 2;

/**
 * Animation playback state
 */
export type PlaybackState = 'stopped' | 'playing' | 'paused';

/**
 * Available speed presets with display labels
 */
export const ANIMATION_SPEED_PRESETS: { value: AnimationSpeed; label: string }[] = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

/**
 * Default animation speed
 */
const DEFAULT_SPEED: AnimationSpeed = 1;

/**
 * Default progress (0-1 range)
 */
const DEFAULT_PROGRESS = 0;

interface AnimationState {
  /** Whether the animation is currently playing */
  isPlaying: boolean;
  /** Current playback state (stopped, playing, paused) */
  playbackState: PlaybackState;
  /** Current animation speed multiplier */
  speed: AnimationSpeed;
  /** Current playback progress (0-1 range) */
  progress: number;
  /** Total duration of the current animation in milliseconds */
  duration: number;
  /** Whether an animation is loaded and ready to play */
  hasAnimation: boolean;
  /** Whether the animation should loop when reaching the end */
  loop: boolean;
  /** Whether event mode is active (vs. normal path preview mode) */
  isEventMode: boolean;
  /** Current playback time in milliseconds (used in event mode for scrubbing) */
  currentTime: number;

  // Playback Actions
  /** Start playing the animation */
  play: () => void;
  /** Pause the animation at current position */
  pause: () => void;
  /** Stop the animation and reset to beginning */
  stop: () => void;
  /** Toggle between play and pause states */
  togglePlayback: () => void;

  // Speed Control
  /** Set the animation playback speed */
  setSpeed: (speed: AnimationSpeed) => void;
  /** Cycle through speed presets */
  cycleSpeed: () => void;

  // Progress Control
  /** Set the playback progress (0-1 range) */
  setProgress: (progress: number) => void;
  /** Step forward by a given percentage (0-1 range) */
  stepForward: (amount?: number) => void;
  /** Step backward by a given percentage (0-1 range) */
  stepBackward: (amount?: number) => void;
  /** Jump to the start of the animation */
  jumpToStart: () => void;
  /** Jump to the end of the animation */
  jumpToEnd: () => void;
  /** Jump to a specific time in milliseconds (for event mode scrubbing) */
  jumpToTime: (timeMs: number) => void;

  // Configuration
  /** Set the total duration of the animation */
  setDuration: (duration: number) => void;
  /** Set whether an animation is loaded */
  setHasAnimation: (hasAnimation: boolean) => void;
  /** Set whether the animation should loop */
  setLoop: (loop: boolean) => void;
  /** Toggle loop on/off */
  toggleLoop: () => void;

  // Event Mode Control
  /** Enable event mode for multi-player animation */
  enableEventMode: () => void;
  /** Disable event mode and return to normal path preview */
  disableEventMode: () => void;
  /** Set event mode on or off */
  setEventMode: (enabled: boolean) => void;
  /** Set the current playback time in milliseconds */
  setCurrentTime: (timeMs: number) => void;

  // Reset
  /** Reset animation state to defaults */
  reset: () => void;
}

export const useAnimationStore = create<AnimationState>((set, get) => ({
  isPlaying: false,
  playbackState: 'stopped',
  speed: DEFAULT_SPEED,
  progress: DEFAULT_PROGRESS,
  duration: 0,
  hasAnimation: false,
  loop: false,
  isEventMode: false,
  currentTime: 0,

  play: () => {
    const { hasAnimation, isEventMode } = get();
    // Check if there's an active event in eventStore
    const hasActiveEvent = useEventStore.getState().activeEventId !== null;
    // In event mode or with an active event, allow playing even without hasAnimation flag
    // since the event itself determines what can be played
    if (!hasAnimation && !isEventMode && !hasActiveEvent) {
      return;
    }

    set({
      isPlaying: true,
      playbackState: 'playing',
    });
  },

  pause: () => {
    const { isPlaying } = get();
    if (!isPlaying) {
      return;
    }

    set({
      isPlaying: false,
      playbackState: 'paused',
    });
  },

  stop: () => {
    set({
      isPlaying: false,
      playbackState: 'stopped',
      progress: DEFAULT_PROGRESS,
      currentTime: 0,
    });
  },

  togglePlayback: () => {
    const { isPlaying, hasAnimation, isEventMode } = get();
    // Check if there's an active event in eventStore
    const hasActiveEvent = useEventStore.getState().activeEventId !== null;

    // If no animation is loaded and not in event mode and no active event, do nothing
    if (!hasAnimation && !isEventMode && !hasActiveEvent) {
      return;
    }

    if (isPlaying) {
      // Currently playing, pause it
      set({
        isPlaying: false,
        playbackState: 'paused',
      });
    } else {
      // Currently paused or stopped, play it
      // If stopped, progress is already at 0, so just start playing
      set({
        isPlaying: true,
        playbackState: 'playing',
      });
    }
  },

  setSpeed: (speed) => {
    set({ speed });
  },

  cycleSpeed: () => {
    const { speed } = get();
    const currentIndex = ANIMATION_SPEED_PRESETS.findIndex((preset) => preset.value === speed);
    const nextIndex = (currentIndex + 1) % ANIMATION_SPEED_PRESETS.length;
    set({ speed: ANIMATION_SPEED_PRESETS[nextIndex].value });
  },

  setProgress: (progress) => {
    // Clamp progress between 0 and 1
    const clampedProgress = Math.max(0, Math.min(1, progress));
    set({ progress: clampedProgress });

    // If we've reached the end and not looping, stop
    if (clampedProgress >= 1) {
      const { loop, isPlaying } = get();
      if (isPlaying) {
        if (loop) {
          // Loop back to start
          set({ progress: 0 });
        } else {
          // Stop at the end
          set({
            isPlaying: false,
            playbackState: 'paused',
            progress: 1,
          });
        }
      }
    }
  },

  stepForward: (amount = 0.05) => {
    const { progress } = get();
    const newProgress = Math.min(1, progress + amount);
    set({ progress: newProgress });
  },

  stepBackward: (amount = 0.05) => {
    const { progress } = get();
    const newProgress = Math.max(0, progress - amount);
    set({ progress: newProgress });
  },

  jumpToStart: () => {
    set({ progress: 0 });
  },

  jumpToEnd: () => {
    set({ progress: 1 });
  },

  jumpToTime: (timeMs) => {
    const { duration } = get();
    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(timeMs, duration));
    set({ currentTime: clampedTime });

    // Also update progress if duration is set
    if (duration > 0) {
      const newProgress = clampedTime / duration;
      set({ progress: Math.max(0, Math.min(1, newProgress)) });
    }
  },

  setDuration: (duration) => {
    set({ duration: Math.max(0, duration) });
  },

  setHasAnimation: (hasAnimation) => {
    set({ hasAnimation });
    // If no animation is set, stop playback
    if (!hasAnimation) {
      set({
        isPlaying: false,
        playbackState: 'stopped',
        progress: 0,
      });
    }
  },

  setLoop: (loop) => {
    set({ loop });
  },

  toggleLoop: () => {
    set((state) => ({ loop: !state.loop }));
  },

  enableEventMode: () => {
    set({ isEventMode: true });
  },

  disableEventMode: () => {
    set({
      isEventMode: false,
      // Stop playback when exiting event mode
      isPlaying: false,
      playbackState: 'stopped',
      currentTime: 0,
    });
  },

  setEventMode: (enabled) => {
    if (enabled) {
      set({ isEventMode: true });
    } else {
      set({
        isEventMode: false,
        isPlaying: false,
        playbackState: 'stopped',
        currentTime: 0,
      });
    }
  },

  setCurrentTime: (timeMs) => {
    const { duration } = get();
    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(timeMs, duration));
    set({ currentTime: clampedTime });
  },

  reset: () => {
    set({
      isPlaying: false,
      playbackState: 'stopped',
      speed: DEFAULT_SPEED,
      progress: DEFAULT_PROGRESS,
      duration: 0,
      hasAnimation: false,
      loop: false,
      isEventMode: false,
      currentTime: 0,
    });
  },
}));

/**
 * Hook to get current playback status as a readable string
 */
export const getPlaybackStatusLabel = (state: AnimationState): string => {
  switch (state.playbackState) {
    case 'playing':
      return `Playing at ${state.speed}x`;
    case 'paused':
      return 'Paused';
    case 'stopped':
    default:
      return 'Stopped';
  }
};

/**
 * Calculate elapsed time from progress and duration
 */
export const getElapsedTime = (progress: number, duration: number): number => {
  return progress * duration;
};

/**
 * Format time in milliseconds to display string (mm:ss.ms)
 */
export const formatAnimationTime = (ms: number): string => {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 100);

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
};
