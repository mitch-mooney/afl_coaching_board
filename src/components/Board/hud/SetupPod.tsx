import { fanPill, podButton, TOOL_RAIL_CLEARANCE } from './podStyles';
import { useSetupControls } from './useSetupControls';
import { renderAction } from './hudActions';

export function SetupPod({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { actions, modals } = useSetupControls();

  return (
    <>
      {/* Starts clear of the Tool rail on the left edge: the fan expands upward
          through the rail's full height, so anything nearer the edge has its
          labels painted over. */}
      <div style={{ position: 'absolute', left: TOOL_RAIL_CLEARANCE, bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column-reverse', alignItems: 'flex-start', gap: 10, zIndex: 30 }}>
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
