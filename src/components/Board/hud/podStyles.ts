import type { CSSProperties } from 'react';
import { palette, radii, shadows, typeStyle, withAlpha } from '../../../theme/tokens';

/**
 * The HUD's shared inline styles, built from the design tokens
 * (`src/theme/tokens.ts`). Nothing here defines a colour of its own.
 *
 * Floodlight is the HUD's one state colour: an armed tip, an open panel, an
 * active view and the focus ring all wear it. Text on a Floodlight fill is
 * Concrete, so a lit control reads as lit rather than as a team colour.
 */

/** The fill of a lit (armed, active, open) control. */
export const LIT: CSSProperties = { background: palette.floodlight, color: palette.concrete };

/** A hairline in Chalk: a control's resting border. */
export const HAIRLINE = `1px solid ${withAlpha(palette.chalk, 0.18)}`;

/** Chalk faded for an unlit control's icon or label. */
export const CHALK_DIM = withAlpha(palette.chalk, 0.75);

/** The surface every floating HUD panel sits on: Concrete over the board, edged in Steel. */
export const glass: CSSProperties = {
  background: withAlpha(palette.concrete, 0.92),
  border: `1px solid ${palette.steel}`,
  color: palette.chalk,
  backdropFilter: 'blur(6px)',
};

export const fanPill: CSSProperties = {
  ...glass,
  ...typeStyle('label'),
  padding: '9px 12px',
  borderRadius: radii.pill,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textAlign: 'left',
};

export const panelPill: CSSProperties = {
  ...typeStyle('label'),
  padding: '8px 10px', borderRadius: radii.chip,
  cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'left', width: '100%',
  border: `1px solid ${palette.steel}`, background: palette.steel, color: palette.chalk,
};

/**
 * How far in from the left edge other HUD surfaces must start to clear the
 * **Tool rail**.
 *
 * The rail sits 8px from the edge and its pill measures 62px wide (48px tip
 * buttons + 6px padding and a 1px border each side), so its right edge is at
 * 70px; the remainder is breathing room.
 *
 * Shared rather than hardcoded per surface because the two have already drifted
 * apart once: the Pods skin's Setup pod sat at `left: 20`, and because its fan
 * expands *upward* through the rail's full height, the rail painted over the
 * left half of nine of the twelve fan items — exactly where each label's text
 * begins. The items stayed clickable, so nothing failed loudly; it just looked
 * broken.
 */
export const TOOL_RAIL_CLEARANCE = 86;

export function podButton(open: boolean): CSSProperties {
  return {
    width: 66, height: 66, borderRadius: 20, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    ...(open ? LIT : { background: withAlpha(palette.concrete, 0.94), color: palette.chalk }),
    border: open ? 'none' : `1px solid ${palette.steel}`, boxShadow: shadows.raised,
  };
}
