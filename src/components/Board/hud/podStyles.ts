import type { CSSProperties } from 'react';
import { palette, radii, typeStyle, withAlpha } from '../../../theme/tokens';

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

/**
 * How far in from the right edge other HUD surfaces must start to clear the
 * **View column**, the Tool rail's mirror.
 *
 * The column sits 8px from the edge and its pill measures 70px wide (56px view
 * buttons + 6px padding and a 1px border each side), so its left edge is 78px
 * in; the remainder is breathing room, as on the left.
 */
export const VIEW_COLUMN_CLEARANCE = 86;

/**
 * Where the two side columns start: below the editor top bar and the
 * linked-video bar beneath it, whether or not the Play has one. Unanchored
 * chrome clears that bar unconditionally (ADR 0003's amendment), and the View
 * column shares the line so its top always equals the Tool rail's.
 */
export const SIDE_COLUMN_TOP = 'calc(env(safe-area-inset-top, 0px) + 96px)';

/** Where the chrome's foot sits: clear of the iPad home indicator. */
export const CHROME_BOTTOM = 'calc(0.75rem + env(safe-area-inset-bottom, 0px))';

/** The smallest a chrome control may be on a finger device, in CSS px (44 pt). */
export const MIN_TARGET = 44;

/** A Setup sheet action: Chalk on Steel, at least a finger tall. */
export const sheetPill: CSSProperties = {
  ...typeStyle('label'),
  minHeight: MIN_TARGET,
  padding: '8px 12px',
  borderRadius: radii.chip,
  cursor: 'pointer',
  textAlign: 'left',
  border: `1px solid ${palette.steel}`,
  background: palette.steel,
  color: palette.chalk,
};

