import { useState } from 'react';
import { typeStyle, withAlpha, palette } from '../../../../theme/tokens';
import { CHALK_DIM, glass, LIT, panelPill } from '../podStyles';
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
                ...(active ? LIT : { background: 'transparent', color: CHALK_DIM }) }}>
              <span style={{ fontSize:20 }}>{m.icon}</span>
              <span style={{ ...typeStyle('label'), fontSize:10 }}>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* contextual overlay panel */}
      {mode && (
        <div style={{ position:'absolute', top:54, right:80, ...glass, borderRadius:14, padding:12, width:250, zIndex:30, display:'flex', flexDirection:'column', gap:10 }}>
          {/* Sentence case, in the display face: the panel's title, not a shouted label. */}
          <div style={{ ...typeStyle('title'), color:withAlpha(palette.chalk, 0.8) }}>{MODES.find((m) => m.key === mode)?.label}</div>
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
