/**
 * The seven Pen tips the Tool rail presents, in rail order.
 *
 * Pure data, deliberately free of React so the ordering can be asserted without
 * a component harness. `ToolRail.tsx` is the only consumer.
 *
 * `AnnotationType` also carries `'magnifying-glass'`, which is not a tip a coach
 * can arm: it is referenced nowhere but its own type declaration — no palette
 * entry, no shortcut, no authoring path. The rail lists the six Annotation kinds
 * that are really authorable plus Path.
 *
 * The shortcut letters mirror `TOOL_SELECTION_MAP` in `hooks/useKeyboardShortcuts.ts`
 * and are surfaced only as tooltip text; the bindings themselves live there.
 */

import type { PenTip } from '../../../utils/inputContract';

export interface ToolRailTip {
  tip: PenTip;
  /** Accessible name, and the tooltip's first half. */
  label: string;
  /** Single glyph shown on the button. */
  icon: string;
  /** The key that arms this tip, for the tooltip. */
  shortcut: string;
}

export const TOOL_RAIL_TIPS: readonly ToolRailTip[] = [
  { tip: 'line', label: 'Line', icon: '─', shortcut: 'L' },
  { tip: 'arrow', label: 'Arrow', icon: '→', shortcut: 'A' },
  { tip: 'circle', label: 'Circle', icon: '○', shortcut: 'C' },
  { tip: 'rectangle', label: 'Rectangle', icon: '▭', shortcut: 'R' },
  { tip: 'text', label: 'Text', icon: 'T', shortcut: 'T' },
  { tip: 'measure', label: 'Measure', icon: '⇔', shortcut: 'M' },
  { tip: 'path', label: 'Path', icon: '🏃', shortcut: 'P' },
] as const;
