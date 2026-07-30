/**
 * The armed Pen tip — what a Stroke turns into.
 *
 * A *tip* rather than a mode, deliberately: nothing else about the board's
 * behaviour changes when the tip changes, and the tip set spans both the
 * Annotation kinds and Path. See
 * `docs/adr/0001-pen-authors-finger-manipulates.md`.
 */

import { create } from 'zustand';
import type { PenTip } from '../utils/inputContract';

interface PenState {
  /** At most one tip is armed; null means the pen behaves as a pointer. */
  armedTip: PenTip | null;

  /** Arms a tip, or disarms it if it is already the armed one. */
  armTip: (tip: PenTip) => void;
  disarm: () => void;
}

export const usePenStore = create<PenState>((set) => ({
  armedTip: null,

  armTip: (tip) => {
    set((state) => ({ armedTip: state.armedTip === tip ? null : tip }));
  },

  disarm: () => {
    set({ armedTip: null });
  },
}));
