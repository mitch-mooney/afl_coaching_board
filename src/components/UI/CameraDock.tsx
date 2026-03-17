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
      <button onClick={switchToBroadcast} className={btnClass(activePovSlot === null)}>
        TV
      </button>
      <button
        onClick={() => setActivePovSlot(1)}
        title={!povPlayer1Id ? 'Click a player to assign POV 1' : undefined}
        className={btnClass(activePovSlot === 1)}
      >
        POV1 {label(povPlayer1Id)}
      </button>
      <button
        onClick={() => setActivePovSlot(2)}
        title={!povPlayer2Id ? 'Click a player to assign POV 2' : undefined}
        className={btnClass(activePovSlot === 2)}
      >
        POV2 {label(povPlayer2Id)}
      </button>
    </div>
  );
}
