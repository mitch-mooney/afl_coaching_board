import { useState } from 'react';
import { useCameraStore } from '../../../store/cameraStore';
import { usePlayerStore } from '../../../store/playerStore';
import { fanPill, podButton } from './podStyles';
import { PovSelectModal } from './PovSelectModal';

export function CameraPod({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { activePovSlot, povPlayer1Id, povPlayer2Id, switchToBroadcast, setPresetView, resetCamera, setActivePovSlot } = useCameraStore();
  const players = usePlayerStore((s) => s.players);
  const [assignSlot, setAssignSlot] = useState<1 | 2 | null>(null);

  const label = (id: string | null) => {
    if (!id) return 'unset';
    const p = players.find((pl) => pl.id === id);
    return p?.number ? `#${p.number}` : '•';
  };
  const rightFan: React.CSSProperties = { ...fanPill, textAlign: 'right' };

  return (
    <>
      <div style={{ position: 'absolute', right: 20, bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column-reverse', alignItems: 'flex-end', gap: 10, zIndex: 30 }}>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4, alignItems: 'flex-end' }}>
            <button style={rightFan} onClick={switchToBroadcast}>📺 Broadcast</button>
            <button style={rightFan} onClick={() => setPresetView('top')}>Top</button>
            <button style={rightFan} onClick={() => setPresetView('sideline')}>Sideline</button>
            <button style={rightFan} onClick={() => setPresetView('end-to-end')}>End-to-end</button>
            <button style={rightFan} onClick={resetCamera}>Reset camera</button>
            <button style={rightFan} onClick={() => setActivePovSlot(1)}>👁 POV {label(povPlayer1Id)}</button>
            <button style={rightFan} onClick={() => setActivePovSlot(2)}>👁 POV {label(povPlayer2Id)}</button>
            <button style={rightFan} onClick={() => setAssignSlot(1)}>Assign POV #1</button>
            <button style={rightFan} onClick={() => setAssignSlot(2)}>Assign POV #2</button>
          </div>
        )}
        <button onClick={onToggle} style={podButton(open)}>
          <span style={{ fontSize: 22 }}>{open ? '✕' : '🎥'}</span>
          <span style={{ fontSize: 9, fontWeight: 700 }}>{activePovSlot ? 'POV' : 'CAM'}</span>
        </button>
      </div>
      <PovSelectModal open={assignSlot !== null} povSlot={assignSlot ?? 1} onClose={() => setAssignSlot(null)} />
    </>
  );
}
