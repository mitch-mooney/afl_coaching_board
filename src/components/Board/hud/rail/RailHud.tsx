import { useState } from 'react';
import { glass, panelPill, TEAL } from '../podStyles';
import { useSetupControls } from '../useSetupControls';
import { renderAction } from '../hudActions';
import { useCameraControls } from '../useCameraControls';
import { TransportBar } from './TransportBar';

type Mode = 'setup' | 'animate' | 'camera' | null;
const MODES = [
  { key: 'setup', icon: '👥', label: 'Setup' },
  { key: 'animate', icon: '▶', label: 'Animate' },
  { key: 'camera', icon: '🎥', label: 'Camera' },
] as const;

export function RailHud() {
  const [mode, setMode] = useState<Mode>(null); // opens collapsed
  const setup = useSetupControls();
  const camera = useCameraControls();
  const toggle = (m: Exclude<Mode, null>) => setMode((cur) => (cur === m ? null : m));

  return (
    <>
      {/* Mode rail — right edge. It sits opposite the Tool rail deliberately:
          the coach is right-handed and rests their hand on the glass, so the
          palm zone is lower-right, and a stray tap here merely opens a panel
          rather than silently re-arming a Pen tip. See
          `docs/adr/0003-tool-rail-on-the-left-mode-rail-on-the-right.md`. */}
      <div style={{ position:'absolute', top:0, bottom:0, right:0, width:68, ...glass, borderTop:'none', borderBottom:'none', borderRight:'none', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:10, gap:6, zIndex:30 }}>
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <button key={m.key} onClick={() => toggle(m.key)} aria-pressed={active}
              style={{ width:56, height:56, borderRadius:12, border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
                background: active ? `linear-gradient(135deg, ${TEAL}, #0099ff)` : 'transparent', color: active ? '#000' : '#ffffffcc' }}>
              <span style={{ fontSize:20 }}>{m.icon}</span>
              <span style={{ fontSize:9, fontWeight:700 }}>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* contextual overlay panel */}
      {mode && (
        <div style={{ position:'absolute', top:54, right:80, ...glass, borderRadius:14, padding:12, width:250, zIndex:30, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:11, letterSpacing:'0.12em', opacity:0.55 }}>{mode.toUpperCase()}</div>
          {mode === 'setup' && setup.actions.filter((a) => !a.hidden).map((a) => renderAction(a, panelPill))}
          {mode === 'animate' && <TransportBar />}
          {mode === 'camera' && camera.actions.filter((a) => !a.hidden).map((a) => renderAction(a, panelPill))}
        </div>
      )}

      {/* modals live at top level, outside the positioned panel */}
      {setup.modals}
      {camera.modals}
    </>
  );
}
