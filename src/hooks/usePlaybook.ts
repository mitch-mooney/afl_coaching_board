import { useCallback } from 'react';
import { usePlaybookStore } from '../store/playbookStore';
import { usePlayerStore } from '../store/playerStore';
import { useCameraStore } from '../store/cameraStore';
import { useAnnotationStore } from '../store/annotationStore';
import { uploadPlaybook } from '../services/playbookSync';
import { isSupabaseConfigured } from '../lib/supabase';

export function usePlaybook() {
  const { savePlaybook, loadPlaybook: loadPlaybookFromStore } = usePlaybookStore();
  const players = usePlayerStore((state) => state.players);
  const { position, target, zoom } = useCameraStore();
  const annotations = useAnnotationStore((state) => state.annotations);

  const saveCurrentScenario = useCallback(async (name: string, description?: string) => {
    try {
      const playbookData = {
        name,
        description,
        playerPositions: players,
        cameraPosition: position,
        cameraTarget: target,
        cameraZoom: zoom,
        annotations: annotations,
      };
      const id = await savePlaybook(playbookData);
      // Fire-and-forget upload to Supabase if configured
      if (isSupabaseConfigured()) {
        uploadPlaybook({ ...playbookData, id: id as number, createdAt: new Date() });
      }
      return id;
    } catch (error) {
      console.error('Error saving scenario:', error);
      throw error;
    }
  }, [savePlaybook, players, position, target, zoom, annotations]);
  
  const loadScenario = useCallback(async (playbookId: number) => {
    try {
      const playbook = await loadPlaybookFromStore(playbookId);
      if (playbook) {
        // Restore player positions
        usePlayerStore.setState({ players: playbook.playerPositions });
        
        // Restore camera
        useCameraStore.setState({
          position: playbook.cameraPosition,
          target: playbook.cameraTarget,
          zoom: playbook.cameraZoom,
        });
        
        // Restore annotations
        if (playbook.annotations) {
          useAnnotationStore.setState({ annotations: playbook.annotations });
        }
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
      throw error;
    }
  }, [loadPlaybookFromStore]);
  
  return {
    saveCurrentScenario,
    loadScenario,
  };
}
