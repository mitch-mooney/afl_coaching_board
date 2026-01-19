import { create } from 'zustand';
import type { Player } from '../models/PlayerModel';
import type { Annotation } from './annotationStore';

/**
 * Represents a snapshot of the application state at a point in time.
 * Used for undo/redo functionality.
 */
export interface StateSnapshot {
  /** Snapshot of all player positions and rotations */
  players: PlayerSnapshot[];
  /** Snapshot of all annotations */
  annotations: AnnotationSnapshot[];
  /** Timestamp when the snapshot was created */
  timestamp: number;
}

/**
 * Minimal player data needed for history tracking.
 * Only includes data that can be changed by user actions.
 */
export interface PlayerSnapshot {
  id: string;
  position: [number, number, number];
  rotation: number;
}

/**
 * Annotation snapshot for history tracking.
 * Stores the complete annotation data since annotations can be added/removed.
 */
export interface AnnotationSnapshot {
  id: string;
  type: Annotation['type'];
  points: number[][];
  color: string;
  thickness?: number;
  text?: string;
}

interface HistoryState {
  /** Stack of past state snapshots (for undo) */
  past: StateSnapshot[];
  /** Stack of future state snapshots (for redo, populated after undo) */
  future: StateSnapshot[];
  /** Maximum number of history entries to keep */
  maxHistorySize: number;
  /** Whether history recording is currently paused (e.g., during undo/redo operations) */
  isPaused: boolean;

  // Actions
  /** Push a new snapshot onto the history stack */
  pushSnapshot: (snapshot: Omit<StateSnapshot, 'timestamp'>) => void;
  /** Undo to the previous state, returns the state to restore or null if no history */
  undo: () => StateSnapshot | null;
  /** Redo to the next state, returns the state to restore or null if no future states */
  redo: () => StateSnapshot | null;
  /** Clear all history (e.g., when loading a new playbook) */
  clearHistory: () => void;
  /** Check if undo is available */
  canUndo: () => boolean;
  /** Check if redo is available */
  canRedo: () => boolean;
  /** Pause history recording temporarily */
  pauseRecording: () => void;
  /** Resume history recording */
  resumeRecording: () => void;
  /** Get the current history size */
  getHistorySize: () => { past: number; future: number };
}

/** Default maximum history size to prevent memory issues */
const DEFAULT_MAX_HISTORY_SIZE = 50;

/**
 * Creates a player snapshot from a full Player object.
 * Only extracts the mutable properties that can be undone.
 */
export function createPlayerSnapshot(player: Player): PlayerSnapshot {
  return {
    id: player.id,
    position: [...player.position] as [number, number, number],
    rotation: player.rotation,
  };
}

/**
 * Creates an annotation snapshot from a full Annotation object.
 */
export function createAnnotationSnapshot(annotation: Annotation): AnnotationSnapshot {
  return {
    id: annotation.id,
    type: annotation.type,
    points: annotation.points.map(point => [...point]),
    color: annotation.color,
    thickness: annotation.thickness,
    text: annotation.text,
  };
}

/**
 * Creates a complete state snapshot from players and annotations.
 */
export function createStateSnapshot(
  players: Player[],
  annotations: Annotation[]
): Omit<StateSnapshot, 'timestamp'> {
  return {
    players: players.map(createPlayerSnapshot),
    annotations: annotations.map(createAnnotationSnapshot),
  };
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxHistorySize: DEFAULT_MAX_HISTORY_SIZE,
  isPaused: false,

  pushSnapshot: (snapshot) => {
    const { isPaused, maxHistorySize } = get();

    // Don't record history if paused (e.g., during undo/redo operations)
    if (isPaused) {
      return;
    }

    const timestampedSnapshot: StateSnapshot = {
      ...snapshot,
      timestamp: Date.now(),
    };

    set((state) => {
      // Add new snapshot to past, clear future (new action after undo clears redo stack)
      let newPast = [...state.past, timestampedSnapshot];

      // Trim history if it exceeds max size
      if (newPast.length > maxHistorySize) {
        newPast = newPast.slice(newPast.length - maxHistorySize);
      }

      return {
        past: newPast,
        future: [], // Clear redo stack when new action is recorded
      };
    });
  },

  undo: () => {
    const { past, future } = get();

    if (past.length === 0) {
      return null;
    }

    // Get the most recent past state to restore
    const previousState = past[past.length - 1];

    // The current state needs to be saved to future for redo
    // This is handled by the caller - they should push current state to future

    set({
      past: past.slice(0, -1),
      future: [previousState, ...future],
    });

    // Return the state BEFORE the previous action (what we're restoring to)
    // If there's a state before previousState, return it; otherwise return previousState
    if (past.length > 1) {
      return past[past.length - 2];
    }

    // No previous state to restore to - this means we're at the initial state
    return previousState;
  },

  redo: () => {
    const { past, future } = get();

    if (future.length === 0) {
      return null;
    }

    // Get the first future state to restore
    const nextState = future[0];

    set({
      past: [...past, nextState],
      future: future.slice(1),
    });

    return nextState;
  },

  clearHistory: () => {
    set({
      past: [],
      future: [],
    });
  },

  canUndo: () => {
    return get().past.length > 0;
  },

  canRedo: () => {
    return get().future.length > 0;
  },

  pauseRecording: () => {
    set({ isPaused: true });
  },

  resumeRecording: () => {
    set({ isPaused: false });
  },

  getHistorySize: () => {
    const { past, future } = get();
    return { past: past.length, future: future.length };
  },
}));
