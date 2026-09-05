/**
 * The armed instrument — what the next Stroke, or the next tap on grass,
 * turns into.
 *
 * Two kinds of instrument, one at a time. A Pen *tip* is what a Stroke becomes;
 * it is a tip rather than a mode, deliberately, because nothing else about the
 * board's behaviour changes when the tip changes, and the tip set spans both the
 * Annotation kinds and Path. See
 * `docs/adr/0001-pen-authors-finger-manipulates.md`.
 *
 * A *Placement* is armed for a team, and while it is armed a tap on grass puts
 * a player of that team there. It is not a Pen tip and `PenTip` is not widened:
 * placing an object is a pointer job, the same reasoning that keeps cone
 * placement outside the input contract, so Placement accepts a finger, a Pencil
 * and a mouse alike.
 *
 * Arming either kind disarms the other. That exclusion is what guarantees one
 * tap can never both draw and place.
 */

import { create } from 'zustand';
import type { Player } from '../models/PlayerModel';
import type { PenTip } from '../utils/inputContract';

interface PenState {
  /** At most one tip is armed; null means the pen behaves as a pointer. */
  armedTip: PenTip | null;
  /** The team a tap on grass places for, or null when no Placement is armed. */
  armedPlacement: Player['teamId'] | null;

  /** Arms a tip, or disarms it if it is already the armed one. Clears any Placement. */
  armTip: (tip: PenTip) => void;
  /** Arms Placement for a team, or disarms it if that team is already armed. Clears any tip. */
  armPlacement: (teamId: Player['teamId']) => void;
  /** Clears both kinds. */
  disarm: () => void;
}

export const usePenStore = create<PenState>((set) => ({
  armedTip: null,
  armedPlacement: null,

  armTip: (tip) => {
    set((state) => ({
      armedTip: state.armedTip === tip ? null : tip,
      armedPlacement: null,
    }));
  },

  armPlacement: (teamId) => {
    set((state) => ({
      armedPlacement: state.armedPlacement === teamId ? null : teamId,
      armedTip: null,
    }));
  },

  disarm: () => {
    set({ armedTip: null, armedPlacement: null });
  },
}));
