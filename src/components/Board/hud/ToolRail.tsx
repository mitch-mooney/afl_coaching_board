import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useAnimationStore } from '../../../store/animationStore';
import { useAnnotationStore } from '../../../store/annotationStore';
import { usePenStore } from '../../../store/penStore';
import { tipAvailable } from '../../../utils/inputContract';
import { ColourPopover } from './ColourPopover';
import { glass, TEAL } from './podStyles';
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
 * The armed tip is amber, carried over from the retired `AnnotatePalette`; the
 * Mode rail's teal means "this panel is open", which is precisely what a Tool
 * rail button never does.
 *
 * The one exception is the current-colour button at the foot of the rail — see
 * the note on it below. It is not a tip, so playback never disables it.
 *
 * A tip that playback has made unavailable renders faded and refuses the tap.
 * The rail does not decide that itself: it asks `tipAvailable` in the input
 * contract, which is the same predicate `useStrokeAuthoring` consults, so the
 * button's appearance and what a Stroke is actually allowed to do cannot drift
 * apart.
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

/** Separates the seven tips from the colour button, which is not one of them. */
const DIVIDER: CSSProperties = {
  height: 1,
  flexShrink: 0,
  margin: '2px 4px',
  background: '#ffffff22',
};

export function ToolRail() {
  const armedTip = usePenStore((state) => state.armedTip);
  // `armTip` already disarms when the armed tip is re-armed, so one handler
  // covers both taps.
  const armTip = usePenStore((state) => state.armTip);
  const selectedColour = useAnnotationStore((state) => state.selectedColor);
  // Only ever read through `tipAvailable` — the rail knows that playback makes
  // *some* tip unavailable, never which one.
  const isPlaying = useAnimationStore((state) => state.isPlaying);

  // The only state the rail owns. Colour and thickness themselves live in
  // `annotationStore`, where the Stroke-authoring hook already reads them.
  const [colourOpen, setColourOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!colourOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      // Anything inside the rail — including the tips — leaves it open, so the
      // coach can keep arming tips while choosing a colour.
      if (target && railRef.current?.contains(target)) return;
      setColourOpen(false);
    };
    // pointerdown rather than click: a Stroke on the board never produces a
    // click, and the popover should be gone the moment the pen lands. Capture,
    // so a handler that stops propagation cannot strand it open.
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [colourOpen]);

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
      {/* The pill and its popover sit in one row so the popover is laid out
          beside the rail rather than over it, and so a pointer landing anywhere
          in the pair counts as inside. Bottom-aligned: the popover's foot lines
          up with the colour button that opened it. */}
      <div
        ref={railRef}
        style={{ display: 'flex', alignItems: 'flex-end', gap: 10, maxHeight: '100%' }}
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
            // The one predicate. The same value drives the styling, the ARIA
            // state and the handler, so the button cannot look one way and
            // behave the other.
            const available = tipAvailable(tip, { isPlaying });
            return (
              <button
                key={tip}
                type="button"
                // `aria-disabled` rather than the `disabled` attribute: this is a
                // momentary unavailability, and a natively disabled button drops
                // out of the focus order and loses its tooltip — precisely the
                // tooltip that explains why it is unavailable. So the handler
                // does the refusing.
                onClick={() => available && armTip(tip)}
                aria-label={label}
                aria-pressed={armed}
                aria-disabled={!available}
                title={
                  available
                    ? `${label} (${shortcut})`
                    : `${label} — unavailable while an animation plays`
                }
                style={{
                  ...TIP_BUTTON,
                  // Armed styling survives playback, because the tip itself does.
                  background: armed ? '#f59e0b' : 'transparent',
                  color: armed ? '#000' : '#ffffffcc',
                  // Faded, with a not-allowed cursor: a third treatment,
                  // distinct from armed amber and from an unarmed tip, whichever
                  // of the two the unavailable tip happens to be.
                  opacity: available ? 1 : 0.35,
                  cursor: available ? 'pointer' : 'not-allowed',
                }}
              >
                {icon}
              </button>
            );
          })}

          <div aria-hidden style={DIVIDER} />

          {/*
            The current-colour button, rendered in the current colour so the
            coach can read what the next Stroke will be drawn in without opening
            anything.

            It is the single exception to "a Tool rail button arms an instrument
            and never opens a panel", and it is NOT a tip: it sets no tip, clears
            no tip, and neither opening nor using the popover changes what is
            armed. Hence the divider above it, and hence teal rather than the
            tips' amber — amber on this rail means "this tip is armed", and this
            button never arms anything. Teal is the HUD's "this panel is open".
          */}
          <button
            type="button"
            onClick={() => setColourOpen((open) => !open)}
            aria-label="Colour and thickness"
            aria-expanded={colourOpen}
            aria-haspopup="dialog"
            title="Colour and thickness"
            style={{
              ...TIP_BUTTON,
              background: selectedColour,
              border: colourOpen ? `2px solid ${TEAL}` : '2px solid #ffffff44',
            }}
          />
        </div>

        {colourOpen && <ColourPopover />}
      </div>
    </div>
  );
}
