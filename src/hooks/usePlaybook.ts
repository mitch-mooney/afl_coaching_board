import { useCallback } from 'react';
import { usePlayStore } from '../store/playStore';
import { usePlaybookStore } from '../store/playbookStore';
import { toPhase } from '../utils/boardSnapshot';
import { capture } from '../utils/boardSnapshotIO';

/**
 * usePlaybook - quick-save the current board as a named Play.
 *
 * Captures the live board through the boardSnapshot module and persists it as
 * the Play's first phase in a single write (createPlay with an initial phase).
 * (The legacy flat-Playbook table + Supabase upload were retired in §1.8.)
 */
export function usePlaybook() {
  const createPlay = usePlayStore((s) => s.createPlay);

  const saveCurrentPlay = useCallback(async (name: string) => {
    const playbookId =
      usePlaybookStore.getState().activePlaybookId ??
      (await usePlaybookStore.getState().ensureDefaultPlaybook());
    const phase = toPhase(capture(), { id: 'phase-1', label: 'Phase 1' });
    return createPlay(name, playbookId, phase);
  }, [createPlay]);

  return {
    saveCurrentPlay,
  };
}
