import { useCallback } from 'react';
import { usePlayStore } from '../store/playStore';
import { usePlaybookStore } from '../store/playbookStore';

/**
 * usePlaybook - quick-save the current board as a named Play.
 *
 * Delegates to the playStore gateway (`createPlayFromBoard`), which captures the
 * live board and wraps it as the Play's first phase in a single write. The
 * capture→phase-1 ritual lives inside playStore, not here.
 * (The legacy flat-Playbook table + Supabase upload were retired in §1.8.)
 */
export function usePlaybook() {
  const createPlayFromBoard = usePlayStore((s) => s.createPlayFromBoard);

  const saveCurrentPlay = useCallback(async (name: string) => {
    const playbookId =
      usePlaybookStore.getState().activePlaybookId ??
      (await usePlaybookStore.getState().ensureDefaultPlaybook());
    return createPlayFromBoard(name, playbookId);
  }, [createPlayFromBoard]);

  return {
    saveCurrentPlay,
  };
}
