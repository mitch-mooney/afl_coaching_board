import { create } from 'zustand';

export interface RotationStep {
  id: string;
  type: 'all' | 'position';
  position?: string;
  targetPosition: string;
}

export interface RotationExercise {
  id: string;
  name: string;
  steps: RotationStep[];
  description?: string;
}

const createId = () => Math.random().toString(36).substring(2, 9);

export interface RotationExerciseState {
  rotationExercise: RotationExercise;
  isRunning: boolean;
  elapsedSeconds: number;
  currentStepIndex: number;
  startExercise: (exercise: RotationExercise) => void;
  pauseExercise: () => void;
  resumeExercise: () => void;
  stopExercise: () => void;
  tick: () => void;
  resetExercise: () => void;
  formatTime: (seconds: number) => string;
  getProgressPercentage: () => number;
  // Builder methods
  setRotationExercise: (exercise: RotationExercise) => void;
  addRotationStep: (type: 'all' | 'position', position?: string) => void;
  updateRotationStep: (index: number, step: Partial<RotationStep>) => void;
  removeRotationStep: (stepId: string) => void;
  moveRotationStep: (fromIndex: number, toIndex: number) => void;
}

const initialExercise: RotationExercise = {
  id: createId(),
  name: 'New Rotation Exercise',
  steps: [],
};

export const useRotationExerciseStore = create<RotationExerciseState>((set, get) => ({
  rotationExercise: initialExercise,
  isRunning: false,
  elapsedSeconds: 0,
  currentStepIndex: 0,

  // Timer methods
  startExercise(exercise: RotationExercise) {
    set({
      rotationExercise: exercise,
      isRunning: true,
      elapsedSeconds: 0,
      currentStepIndex: 0,
    });
  },

  pauseExercise() {
    set({ isRunning: false });
  },

  resumeExercise() {
    set({ isRunning: true });
  },

  stopExercise() {
    set({
      rotationExercise: initialExercise,
      isRunning: false,
      elapsedSeconds: 0,
      currentStepIndex: 0,
    });
  },

  tick() {
    const { isRunning, elapsedSeconds } = get();
    if (!isRunning) return;
    set({ elapsedSeconds: elapsedSeconds + 1 });
  },

  resetExercise() {
    set({
      elapsedSeconds: 0,
      currentStepIndex: 0,
    });
  },

  formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  getProgressPercentage() {
    const { rotationExercise, elapsedSeconds } = get();
    if (rotationExercise.steps.length === 0) return 0;
    return Math.min((elapsedSeconds / (rotationExercise.steps.length * 30)) * 100, 100);
  },

  // Builder methods
  setRotationExercise(exercise: RotationExercise) {
    set({ rotationExercise: exercise });
  },

  addRotationStep(type: 'all' | 'position', position?: string) {
    set((state) => ({
      rotationExercise: {
        ...state.rotationExercise,
        steps: [
          ...state.rotationExercise.steps,
          {
            id: createId(),
            type,
            position,
            targetPosition: '',
          },
        ],
      },
    }));
  },

  updateRotationStep(index: number, step: Partial<RotationStep>) {
    set((state) => ({
      rotationExercise: {
        ...state.rotationExercise,
        steps: state.rotationExercise.steps.map((s, i) =>
          i === index ? { ...s, ...step } : s
        ),
      },
    }));
  },

  removeRotationStep(stepId: string) {
    set((state) => ({
      rotationExercise: {
        ...state.rotationExercise,
        steps: state.rotationExercise.steps.filter((s) => s.id !== stepId),
      },
    }));
  },

  moveRotationStep(fromIndex: number, toIndex: number) {
    set((state) => {
      const steps = [...state.rotationExercise.steps];
      const [removed] = steps.splice(fromIndex, 1);
      steps.splice(toIndex, 0, removed);
      return {
        rotationExercise: {
          ...state.rotationExercise,
          steps,
        },
      };
    });
  },
}));
