import type { CSSProperties } from 'react';
import { useAnnotationStore } from '../../../store/annotationStore';
import { usePenStore } from '../../../store/penStore';
import { palette, shadows, withAlpha } from '../../../theme/tokens';
import { glass } from './podStyles';
import { TOOL_RAIL_COLOURS } from './toolRailColours';
import { tipLabel, tipUsesThickness } from './toolRailTips';

/**
 * The colour swatches and the thickness control, opened from the Tool rail's
 * colour button.
 *
 * They sit in a popover rather than on the rail itself for two different
 * reasons: the rail must stay thin to stay always-visible, and thickness is a
 * set-once-and-forget setting that has not earned permanent space beside the
 * Pen tips.
 *
 * Nothing here touches `armTip`. The popover reads the armed tip only to decide
 * whether thickness applies to it — choosing a colour or dragging thickness
 * leaves the armed tip exactly as it was. See the colour button in
 * `ToolRail.tsx` for why that matters.
 *
 * `ToolRail` lays this out to the *right* of the rail's pill so it never covers
 * the tips: the coach keeps arming tips with the popover open, and watches the
 * thickness control appear and disappear as the armed tip changes.
 */

const SWATCH: CSSProperties = {
  height: 34,
  width: '100%',
  borderRadius: 8,
  padding: 0,
  cursor: 'pointer',
  touchAction: 'manipulation',
};

const SECTION_LABEL: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: withAlpha(palette.chalk, 0.67),
};

export function ColourPopover() {
  const selectedColour = useAnnotationStore((state) => state.selectedColor);
  const setSelectedColour = useAnnotationStore((state) => state.setSelectedColor);
  const thickness = useAnnotationStore((state) => state.thickness);
  const setThickness = useAnnotationStore((state) => state.setThickness);
  const armedTip = usePenStore((state) => state.armedTip);

  return (
    <div
      role="dialog"
      aria-label="Colour and thickness"
      style={{
        ...glass,
        borderRadius: 14,
        padding: 12,
        width: 184,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: shadows.raised,
        // The rail's positioned box is pointer-events: none so an invisible
        // full-height strip cannot swallow camera drags. Opt back in here.
        pointerEvents: 'auto',
      }}
    >
      <span style={SECTION_LABEL}>Colour</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {TOOL_RAIL_COLOURS.map((colour) => {
          const selected = selectedColour === colour;
          return (
            <button
              key={colour}
              type="button"
              onClick={() => setSelectedColour(colour)}
              aria-label={`Colour ${colour}`}
              aria-pressed={selected}
              style={{
                ...SWATCH,
                background: colour,
                border: selected
                  ? `2px solid ${palette.floodlight}`
                  : `1px solid ${withAlpha(palette.chalk, 0.27)}`,
              }}
            />
          );
        })}
      </div>

      {tipUsesThickness(armedTip) ? (
        <>
          <span style={SECTION_LABEL}>Thickness</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range"
              min={1}
              max={10}
              value={thickness}
              onChange={(event) => setThickness(Number(event.target.value))}
              aria-label="Line thickness"
              style={{ flex: 1, accentColor: palette.floodlight }}
            />
            <span style={{ fontSize: 11, color: palette.chalk, width: 26, textAlign: 'right' }}>
              {thickness}px
            </span>
          </div>
        </>
      ) : (
        // Hidden rather than disabled, matching what the palette does today. The
        // line is here so the missing control reads as deliberate.
        <span style={{ fontSize: 11, color: withAlpha(palette.chalk, 0.47) }}>
          Thickness does not apply to the {tipLabel(armedTip)} tip.
        </span>
      )}
    </div>
  );
}
