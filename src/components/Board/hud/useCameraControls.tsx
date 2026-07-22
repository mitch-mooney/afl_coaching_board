import { useState } from 'react';
import { useCameraStore } from '../../../store/cameraStore';
import { usePlayerStore } from '../../../store/playerStore';
import { PovSelectModal } from './PovSelectModal';
import type { HudAction, HudControls } from './useSetupControls';

export function useCameraControls(): HudControls {
  const { povPlayer1Id, povPlayer2Id, switchToBroadcast, setPresetView, resetCamera, setActivePovSlot } =
    useCameraStore();
  const players = usePlayerStore((s) => s.players);
  const [assignSlot, setAssignSlot] = useState<1 | 2 | null>(null);

  const label = (id: string | null) => {
    if (!id) return 'unset';
    const p = players.find((pl) => pl.id === id);
    return p?.number ? `#${p.number}` : '•';
  };

  const actions: HudAction[] = [
    { key: 'broadcast', label: '📺 Broadcast', onClick: switchToBroadcast },
    { key: 'top', label: 'Top', onClick: () => setPresetView('top') },
    { key: 'sideline', label: 'Sideline', onClick: () => setPresetView('sideline') },
    { key: 'end-to-end', label: 'End-to-end', onClick: () => setPresetView('end-to-end') },
    { key: 'reset-camera', label: 'Reset camera', onClick: resetCamera },
    { key: 'pov1', label: `👁 POV ${label(povPlayer1Id)}`, onClick: () => setActivePovSlot(1) },
    { key: 'pov2', label: `👁 POV ${label(povPlayer2Id)}`, onClick: () => setActivePovSlot(2) },
    { key: 'assign-pov1', label: 'Assign POV #1', onClick: () => setAssignSlot(1) },
    { key: 'assign-pov2', label: 'Assign POV #2', onClick: () => setAssignSlot(2) },
  ];

  const modals = <PovSelectModal open={assignSlot !== null} povSlot={assignSlot ?? 1} onClose={() => setAssignSlot(null)} />;

  return { actions, modals };
}
