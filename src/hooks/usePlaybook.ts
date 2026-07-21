import { useCallback } from 'react';
import { usePlayStore } from '../store/playStore';
import { usePlayerStore } from '../store/playerStore';
import { usePathStore } from '../store/pathStore';
import { useCameraStore } from '../store/cameraStore';
import { useAnnotationStore } from '../store/annotationStore';

/**
 * usePlaybook - quick-save the current board as a named Play.
 *
 * Persists through playStore (the kept `scenarios` table), capturing the live
 * board — players, paths, annotations, camera — as the Play's first phase.
 * (The legacy flat-Playbook table + Supabase upload were retired in §1.8.)
 */
export function usePlaybook() {
  const createPlay = usePlayStore((s) => s.createPlay);
  const updatePlay = usePlayStore((s) => s.updatePlay);
  const players = usePlayerStore((state) => state.players);
  const paths = usePathStore((state) => state.paths);
  const { position, target, zoom } = useCameraStore();
  const annotations = useAnnotationStore((state) => state.annotations);

  const saveCurrentPlay = useCallback(
    async (name: string) => {
      const id = await createPlay(name);
      await updatePlay(id, {
        phases: [
          {
            id: 'phase-1',
            label: 'Phase 1',
            playerPositions: players,
            paths,
            annotations: annotations as unknown[],
            cameraState: { position, target, zoom },
          },
        ],
      });
      return id;
    },
    [createPlay, updatePlay, players, paths, position, target, zoom, annotations]
  );

  return {
    saveCurrentPlay,
  };
}
