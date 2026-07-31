import type { CSSProperties } from 'react';
import { usePenStore } from '../../../store/penStore';
import { glass } from './podStyles';
import { TOOL_RAIL_TIPS } from './toolRailTips';

/**
 * The Tool rail: the always-visible surface that arms a Pen tip.
 *
 * Always-visible is the whole point — arming a tip is never a trip through a
 * menu (`docs/adr/0001-pen-authors-finger-manipulates.md`). A Tool rail button
 * arms an instrument and never opens a panel, which is what separates it from
 * the Mode rail on the opposite edge.
 *
 * It is common to both HUD skins rather than something a skin varies, so
 * `BoardHud` renders it beside whichever skin is resolved and it lands in the
 * same place in each — muscle memory transfers.
 *
 * Left edge, per `docs/adr/0003-tool-rail-on-the-left-mode-rail-on-the-right.md`:
 * the coach is right-handed and rests a hand on the glass, so the palm zone is
 * lower-right. The rail is DOM chrome and the input contract does not protect it
 * from a resting palm — a stray tap here silently re-arms a tip and is not
 * discovered until the next Stroke becomes the wrong thing. So the buttons sit
 * on the far side of the board from the palm, and the group is centred
 * vertically rather than run to the bottom edge where a heel of a hand lands.
 * (Palm rejection itself is out of scope.)
 *
 * The armed tip is amber, matching how `AnnotatePalette` already marks the armed
 * tip; the Mode rail's teal means "this panel is open", which is precisely what
 * a Tool rail button never does.
 */

const TIP_BUTTON: CSSProperties = {
  width: 48,
  height: 48,
  // Without this a short viewport squeezes the column instead of scrolling it,
  // and the tips silently shrink to ~29px — measured. The target size is the
  // point on a device held one-handed, so the rail scrolls and the tips don't move.
  flexShrink: 0,
  borderRadius: 12,
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  lineHeight: 1,
  touchAction: 'manipulation',
};

export function ToolRail() {
  const armedTip = usePenStore((state) => state.armedTip);
  // `armTip` already disarms when the armed tip is re-armed, so one handler
  // covers both taps.
  const armTip = usePenStore((state) => state.armTip);

  return (
    // The positioned box spans the full usable height so the group can centre in
    // it, but it must not eat pointer events: an invisible full-height strip over
    // the left edge would swallow camera drags across the field.
    <div
      style={{
        position: 'absolute',
        left: 0,
        // Clear the editor top bar, and the linked-video bar beneath it.
        top: 'calc(env(safe-area-inset-top, 0px) + 96px)',
        // No tip under the iPad home indicator.
        bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 8,
        zIndex: 30,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          ...glass,
          borderRadius: 16,
          padding: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxHeight: '100%',
          overflowY: 'auto',
          pointerEvents: 'auto',
        }}
      >
        {TOOL_RAIL_TIPS.map(({ tip, label, icon, shortcut }) => {
          const armed = armedTip === tip;
          return (
            <button
              key={tip}
              type="button"
              onClick={() => armTip(tip)}
              aria-label={label}
              aria-pressed={armed}
              title={`${label} (${shortcut})`}
              style={{
                ...TIP_BUTTON,
                background: armed ? '#f59e0b' : 'transparent',
                color: armed ? '#000' : '#ffffffcc',
              }}
            >
              {icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}
