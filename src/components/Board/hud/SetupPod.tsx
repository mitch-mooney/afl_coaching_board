import { fanPill, podButton } from './podStyles';
import { useSetupControls } from './useSetupControls';
import { renderAction } from './hudActions';

export function SetupPod({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { actions, modals } = useSetupControls();

  return (
    <>
      <div style={{ position: 'absolute', left: 20, bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column-reverse', alignItems: 'flex-start', gap: 10, zIndex: 30 }}>
        {open && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
            {actions.filter((a) => !a.hidden).map((a) => renderAction(a, fanPill))}
          </div>
        )}
        <button onClick={onToggle} style={podButton(open)}>
          <span style={{ fontSize: 22 }}>{open ? '✕' : '👥'}</span>
          <span style={{ fontSize: 9, fontWeight: 700 }}>SETUP</span>
        </button>
      </div>

      {modals}
    </>
  );
}
