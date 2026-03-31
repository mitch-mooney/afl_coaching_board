import { create } from 'zustand';
import type { SessionDrill } from '../models/TrainingSession';

export interface TimerConfig {
  duration: number; // in seconds
  label: string;
  sound?: string;
}

export interface TimerState {
  timers: {
    drill: TimerConfig | null;
    rest: TimerConfig | null;
    session: TimerConfig | null;
  };
  isActive: boolean;
  remainingSeconds: number;
  currentTimer: 'drill' | 'rest' | 'session' | null;
  elapsedSeconds: number;
  isRunning: boolean;
  sessionDrills: SessionDrill[];
  currentDrillIndex: number;
}

const initialState: TimerState = {
  timers: {
    drill: {
      duration: 300, // 5 minutes default
      label: 'Drill',
      sound: 'tick',
    },
    rest: {
      duration: 120, // 2 minutes default
      label: 'Rest',
      sound: 'chime',
    },
    session: {
      duration: 3600, // 1 hour default
      label: 'Session',
      sound: 'alarm',
    },
  },
  isActive: false,
  remainingSeconds: 0,
  currentTimer: null,
  elapsedSeconds: 0,
  isRunning: false,
  sessionDrills: [],
  currentDrillIndex: 0,
};

export const useTimerStore = create<TimerState & {
  startTimer: (timerType: 'drill' | 'rest' | 'session') => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  setTimerDuration: (timerType: 'drill' | 'rest' | 'session', duration: number) => void;
  setTimerLabel: (timerType: 'drill' | 'rest' | 'session', label: string) => void;
  switchTimer: (timerType: 'drill' | 'rest' | 'session') => void;
  resetTimer: () => void;
  toggleTimer: () => void;
  tick: () => void;
  formatTime: (seconds: number) => string;
  clearSavedElapsed: (timerType: 'drill' | 'rest' | 'session') => void;
  addDrill: (drill: SessionDrill) => void;
  removeDrill: (drillId: string) => void;
  reorderDrill: (drillId: string, newIndex: number) => void;
  setDrillRest: (drillId: string, restSeconds: number) => void;
}>((set, get) => ({
  ...initialState,

  startTimer(timerType: 'drill' | 'rest' | 'session') {
    const { timers } = get();
    const timer = timers[timerType];

    if (!timer) return;

    set({
      isActive: true,
      remainingSeconds: timer.duration,
      elapsedSeconds: 0,
      currentTimer: timerType,
      isRunning: true,
    });
  },

  pauseTimer() {
    set({ isRunning: false });
  },

  resumeTimer() {
    set({ isRunning: true });
  },

  stopTimer() {
    set({
      isRunning: false,
      isActive: false,
      remainingSeconds: 0,
      elapsedSeconds: 0,
      currentTimer: null,
    });
  },

  setTimerDuration(timerType: 'drill' | 'rest' | 'session', duration: number) {
    const { timers } = get();
    set({
      timers: {
        ...timers,
        [timerType]: {
          ...timers[timerType],
          duration,
        },
      },
    });

    // Update remaining time if this timer is active
    if (get().currentTimer === timerType && !get().isRunning) {
      set({ remainingSeconds: duration });
    }
  },

  setTimerLabel(timerType: 'drill' | 'rest' | 'session', label: string) {
    const { timers } = get();
    set({
      timers: {
        ...timers,
        [timerType]: {
          ...timers[timerType],
          label,
        },
      },
    });
  },

  switchTimer(timerType: 'drill' | 'rest' | 'session') {
    const { timers, elapsedSeconds } = get();
    const timer = timers[timerType];

    if (!timer || !timer.duration) return;

    // Save elapsed time for current timer
    if (get().currentTimer) {
      // Store elapsed time in localStorage for persistence across timer switches
      localStorage.setItem(
        `timer_elapsed_${get().currentTimer}`,
        String(elapsedSeconds)
      );
    }

    // Load elapsed time for new timer
    const savedElapsed = localStorage.getItem(`timer_elapsed_${timerType}`);
    const newElapsed = savedElapsed ? parseInt(savedElapsed, 10) : 0;

    set({
      isActive: true,
      remainingSeconds: timer.duration,
      elapsedSeconds: newElapsed,
      currentTimer: timerType,
      isRunning: true,
    });
  },

  resetTimer() {
    const { currentTimer } = get();
    if (!currentTimer) return;

    const { timers } = get();
    const timer = timers[currentTimer];

    if (!timer?.duration) return;

    set({
      remainingSeconds: timer.duration,
      elapsedSeconds: 0,
    });

    localStorage.removeItem(`timer_elapsed_${currentTimer}`);
  },

  toggleTimer() {
    const { isRunning } = get();
    set({ isRunning: !isRunning });
  },

  // This will be called by a useEffect in the UI component
  tick() {
    const { isRunning, currentTimer, remainingSeconds, elapsedSeconds, timers } = get();

    if (!isRunning || !currentTimer) return;

    const newElapsed = elapsedSeconds + 1;
    const newRemaining = remainingSeconds - 1;

    set({
      elapsedSeconds: newElapsed,
      remainingSeconds: newRemaining,
    });

    // Trigger sound when timer reaches 0
    if (newRemaining <= 0) {
      const timerConfig = timers[currentTimer];
      if (timerConfig && timerConfig.sound) {
        // Play sound here using AudioContext
        playTimerSound(timerConfig.sound);
      }
      set({ isRunning: false });
    }
  },

  formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  clearSavedElapsed(timerType: 'drill' | 'rest' | 'session') {
    localStorage.removeItem(`timer_elapsed_${timerType}`);
  },

  addDrill(drill: SessionDrill) {
    set((state) => ({ sessionDrills: [...state.sessionDrills, drill] }));
  },

  removeDrill(drillId: string) {
    set((state) => ({
      sessionDrills: state.sessionDrills.filter((d) => d.drillId !== drillId),
    }));
  },

  reorderDrill(drillId: string, newIndex: number) {
    set((state) => {
      const drills = [...state.sessionDrills];
      const fromIndex = drills.findIndex((d) => d.drillId === drillId);
      if (fromIndex === -1) return {};
      const [removed] = drills.splice(fromIndex, 1);
      drills.splice(newIndex, 0, removed);
      return { sessionDrills: drills };
    });
  },

  setDrillRest(drillId: string, restSeconds: number) {
    set((state) => ({
      sessionDrills: state.sessionDrills.map((d) =>
        d.drillId === drillId ? { ...d, restSeconds } : d
      ),
    }));
  },
}));

// Simple audio helper for timer sounds
const playTimerSound = (type: string) => {
  if (typeof window === 'undefined') return;

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  switch (type) {
    case 'tick':
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      break;
    case 'chime':
      oscillator.frequency.value = 1200;
      oscillator.type = 'sine';
      break;
    case 'alarm':
      oscillator.frequency.value = 600;
      oscillator.type = 'square';
      break;
    default:
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
  }

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};
