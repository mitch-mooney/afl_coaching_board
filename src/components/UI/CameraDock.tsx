// src/components/UI/CameraDock.tsx
import { useCameraStore } from '../../store/cameraStore';
import { usePlayerStore } from '../../store/playerStore';

export function CameraDock() {
  const { activePovSlot, povPlayer1Id, povPlayer2Id, switchToBroadcast, setActivePovSlot } =
    useCameraStore();
  const players = usePlayerStore((s) => s.players);

  const label = (id: string | null) => {
    if (!id) return '—';
    const p = players.find((pl) => pl.id === id);
    return p?.number ? `#${p.number}` : '•';
  };

  const btnClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
    ${active ? 'bg-amber-500 text-black' : 'bg-black/60 text-white/80 hover:bg-black/80'}`;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex gap-2 z-30"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <button onClick={switchToBroadcast} className={btnClass(activePovSlot === null)} title="Broadcast camera — full-field view">
        Broadcast
      </button>
      <button
        onClick={() => setActivePovSlot(1)}
        title={povPlayer1Id ? `Follow player ${label(povPlayer1Id)} — assign via Camera menu` : 'No player assigned — use Camera › Assign Follow-Cam 1 in the menu'}
        className={btnClass(activePovSlot === 1)}
      >
        Follow-Cam 1{povPlayer1Id ? `: ${label(povPlayer1Id)}` : ' (unset)'}
      </button>
      <button
        onClick={() => setActivePovSlot(2)}
        title={povPlayer2Id ? `Follow player ${label(povPlayer2Id)} — assign via Camera menu` : 'No player assigned — use Camera › Assign Follow-Cam 2 in the menu'}
        className={btnClass(activePovSlot === 2)}
      >
        Follow-Cam 2{povPlayer2Id ? `: ${label(povPlayer2Id)}` : ' (unset)'}
      </button>
    </div>
  );
}
