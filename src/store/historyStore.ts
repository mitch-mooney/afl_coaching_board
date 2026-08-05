import { create } from 'zustand';
import type { Player } from '../models/PlayerModel';
import type { Annotation } from './annotationStore';
import type { BoardSnapshot } from '../utils/boardSnapshot';

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
  /**
   * The whole board this edit was made against, recorded only by edits that
   * reach past players and annotations — today that is Pull inside boundary,
   * which also moves the ball, cones and path keyframes. Absent on an ordinary
   * drag or annotation change, which the two fields above already describe in
   * full. See `useBoardUndo.restoreBoardSnapshot`, which prefers it when present.
   */
  board?: BoardSnapshot;
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
  /**
   * Clear all history. Undo is scoped to the board currently open, so anything
   * that replaces the whole board must call this — `playStore.loadPlayBoard` and
   * the shared-link load in `MainLayout`. Without it, undo restores the previous
   * Play's players and annotations onto the one now open.
   *
   * Deliberately NOT called on save: a coach who saves and then mis-drags still
   * needs their way back. And not (yet) on `modeStore.switchMode`, which
   * round-trips the board rather than replacing it — same class of bug, open
   * question, tracked separately.
   */
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
 * Rehydrates a full Annotation from a history snapshot.
 * The snapshot deliberately omits non-undoable metadata (createdAt, magnify
 * params), so those are reset — undo restores geometry + style, not identity.
 */
export function annotationFromSnapshot(snapshot: AnnotationSnapshot): Annotation {
  return {
    id: snapshot.id,
    type: snapshot.type,
    points: snapshot.points.map(point => [...point]),
    color: snapshot.color,
    thickness: snapshot.thickness,
    text: snapshot.text,
    createdAt: new Date(),
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

    // Every entry on `past` is the board as it stood *before* one edit, so the
    // last entry is exactly what undoing that edit restores.
    //
    // This used to return past[length - 2] once the stack was more than one
    // deep, which skipped a step: adding an annotation and then dragging a
    // player meant one undo took the annotation away too. It only looked right
    // with a single entry, where the two expressions coincide.
    const previousState = past[past.length - 1];

    set({
      past: past.slice(0, -1),
      future: [previousState, ...future],
    });

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
