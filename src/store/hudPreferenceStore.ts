import { create } from 'zustand';
import type { SkinOverride } from '../utils/hudSkin';

const KEY = 'afl.hud.skinOverride';
const ORDER: SkinOverride[] = ['auto', 'B', 'C'];

function initialOverride(): SkinOverride {
  if (typeof window === 'undefined') return 'auto';
  const v = window.localStorage.getItem(KEY);
  return v === 'B' || v === 'C' || v === 'auto' ? v : 'auto';
}

interface HudPreferenceState {
  skinOverride: SkinOverride;
  setSkinOverride: (o: SkinOverride) => void;
  cycleSkinOverride: () => void;
}

export const useHudPreferenceStore = create<HudPreferenceState>((set, get) => ({
  skinOverride: initialOverride(),
  setSkinOverride: (o) => {
    try { window.localStorage.setItem(KEY, o); } catch { /* private mode: keep in-memory */ }
    set({ skinOverride: o });
  },
  cycleSkinOverride: () => {
    const next = ORDER[(ORDER.indexOf(get().skinOverride) + 1) % ORDER.length];
    get().setSkinOverride(next);
  },
}));
