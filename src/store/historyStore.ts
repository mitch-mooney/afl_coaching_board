import { create } from 'zustand';
import type { BoardSnapshot } from '../utils/boardSnapshot';

/**
 * One recorded **Board edit**: the board before it, the board after it, and
 * the edit's label. Always the whole board — there is no lighter shape for an
 * edit that only touched a player or an annotation — so an entry always
 * restores everything it needs to, and there is no branch to choose between
 * at undo time. See `utils/boardEdit.ts`, the only module that pushes one of
 * these onto `past`, and CONTEXT.md — "Board edit".
 */
export interface HistoryEntry {
  /** The board exactly as it stood before the edit. */
  before: BoardSnapshot;
  /** The board exactly as it stood after the edit — what redo restores. */
  after: BoardSnapshot;
  /** What the edit was, as the domain names it — e.g. "Pull inside boundary". */
  label: string;
  /** When the edit was recorded. */
  timestamp: number;
}

interface HistoryState {
  /** Stack of past edits (for undo) */
  past: HistoryEntry[];
  /** Stack of future edits (for redo, populated after undo) */
  future: HistoryEntry[];
  /** Maximum number of history entries to keep */
  maxHistorySize: number;

  // Actions
  /** Push a new edit onto the history stack. Only `boardEdit.ts` calls this. */
  push: (entry: Omit<HistoryEntry, 'timestamp'>) => void;
  /** Undo to the previous edit, returns the entry to restore or null if no history */
  undo: () => HistoryEntry | null;
  /** Redo to the next edit, returns the entry to restore or null if no future edits */
  redo: () => HistoryEntry | null;
  /**
   * Clear all history. Undo is scoped to the board currently open, so anything
   * that replaces the whole board must call this — `playStore.loadPlayBoard` and
   * the shared-link load in `MainLayout`. Without it, undo restores the previous
   * Play's board onto the one now open.
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
  /** Get the current history size */
  getHistorySize: () => { past: number; future: number };
}

/** Default maximum history size to prevent memory issues */
const DEFAULT_MAX_HISTORY_SIZE = 50;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxHistorySize: DEFAULT_MAX_HISTORY_SIZE,

  push: (entry) => {
    const { maxHistorySize } = get();

    const timestampedEntry: HistoryEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    set((state) => {
      // Add new entry to past, clear future (new action after undo clears redo stack)
      let newPast = [...state.past, timestampedEntry];

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

    // Every entry on `past` records the edit that produced it, so the last
    // entry is exactly the one undoing takes back.
    //
    // This used to return past[length - 2] once the stack was more than one
    // deep, which skipped a step: adding an annotation and then dragging a
    // player meant one undo took the annotation away too. It only looked right
    // with a single entry, where the two expressions coincide.
    const previousEntry = past[past.length - 1];

    set({
      past: past.slice(0, -1),
      future: [previousEntry, ...future],
    });

    return previousEntry;
  },

  redo: () => {
    const { past, future } = get();

    if (future.length === 0) {
      return null;
    }

    // Get the first future entry to restore
    const nextEntry = future[0];

    set({
      past: [...past, nextEntry],
      future: future.slice(1),
    });

    return nextEntry;
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

  getHistorySize: () => {
    const { past, future } = get();
    return { past: past.length, future: future.length };
  },
}));
