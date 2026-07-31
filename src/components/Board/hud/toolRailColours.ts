/**
 * The colours a Stroke can be authored in, in the order the Tool rail's colour
 * popover shows them.
 *
 * Pure data, deliberately free of React, so the list can be asserted without a
 * component harness — same shape as `toolRailTips.ts`.
 *
 * The six values the retired `AnnotatePalette` used to offer. This module is now
 * their only home — the palette that once duplicated them is gone. The default
 * `selectedColor` in `annotationStore` must stay one of these, or the popover
 * would open with no swatch marked selected — asserted in the test beside this
 * file.
 */
export const TOOL_RAIL_COLOURS: readonly string[] = [
  '#ffff00',
  '#ff0000',
  '#0000ff',
  '#00ff00',
  '#ffffff',
  '#000000',
] as const;
