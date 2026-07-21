import { useCallback } from 'react';
import { useScenarioStore } from '../store/scenarioStore';
import { usePlayerStore } from '../store/playerStore';
import { usePathStore } from '../store/pathStore';
import { useCameraStore } from '../store/cameraStore';
import { useAnnotationStore } from '../store/annotationStore';

/**
 * usePlaybook - quick-save the current board as a named Play (Scenario).
 *
 * Persists through scenarioStore (the kept `scenarios` table), capturing the
 * live board — players, paths, annotations, camera — as the Play's first phase.
 * (The legacy flat-Playbook table + Supabase upload were retired in §1.8.)
 */
export function usePlaybook() {
  const createScenario = useScenarioStore((s) => s.createScenario);
  const updateScenario = useScenarioStore((s) => s.updateScenario);
  const players = usePlayerStore((state) => state.players);
  const paths = usePathStore((state) => state.paths);
  const { position, target, zoom } = useCameraStore();
  const annotations = useAnnotationStore((state) => state.annotations);

  const saveCurrentScenario = useCallback(
    async (name: string) => {
      const id = await createScenario(name);
      await updateScenario(id, {
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
    [createScenario, updateScenario, players, paths, position, target, zoom, annotations]
  );

  return {
    saveCurrentScenario,
  };
}
