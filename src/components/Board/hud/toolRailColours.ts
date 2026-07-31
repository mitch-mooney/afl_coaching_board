/**
 * The colours a Stroke can be authored in, in the order the Tool rail's colour
 * popover shows them.
 *
 * Pure data, deliberately free of React, so the list can be asserted without a
 * component harness — same shape as `toolRailTips.ts`.
 *
 * These are the six values `AnnotatePalette` offers today, copied rather than
 * imported on purpose: the palette is retired in the next ticket and this module
 * is where the list lives afterwards. The default `selectedColor` in
 * `annotationStore` must stay one of these, or the popover would open with no
 * swatch marked selected — asserted in the test beside this file.
 */
export const TOOL_RAIL_COLOURS: readonly string[] = [
  '#ffff00',
  '#ff0000',
  '#0000ff',
  '#00ff00',
  '#ffffff',
  '#000000',
] as const;
