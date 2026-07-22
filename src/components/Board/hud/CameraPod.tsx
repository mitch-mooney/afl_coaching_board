import { useCameraStore } from '../../../store/cameraStore';
import { fanPill, podButton } from './podStyles';
import { renderAction } from './hudActions';
import { useCameraControls } from './useCameraControls';

export function CameraPod({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const activePovSlot = useCameraStore((s) => s.activePovSlot);
  const { actions, modals } = useCameraControls();
  const rightFan: React.CSSProperties = { ...fanPill, textAlign: 'right' };

  return (
    <>
      <div style={{ position: 'absolute', right: 20, bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column-reverse', alignItems: 'flex-end', gap: 10, zIndex: 30 }}>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4, alignItems: 'flex-end' }}>
            {actions.filter((a) => !a.hidden).map((a) => renderAction(a, rightFan))}
          </div>
        )}
        <button onClick={onToggle} style={podButton(open)}>
          <span style={{ fontSize: 22 }}>{open ? '✕' : '🎥'}</span>
          <span style={{ fontSize: 9, fontWeight: 700 }}>{activePovSlot ? 'POV' : 'CAM'}</span>
        </button>
      </div>
      {modals}
    </>
  );
}
