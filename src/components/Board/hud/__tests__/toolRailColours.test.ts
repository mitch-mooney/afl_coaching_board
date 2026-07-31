import { describe, it, expect } from 'vitest';
import { useAnnotationStore } from '../../../../store/annotationStore';
import { TOOL_RAIL_COLOURS } from '../toolRailColours';

describe('TOOL_RAIL_COLOURS', () => {
  it('offers six distinct colours', () => {
    expect(TOOL_RAIL_COLOURS).toHaveLength(6);
    expect(new Set(TOOL_RAIL_COLOURS).size).toBe(TOOL_RAIL_COLOURS.length);
  });

  it('is all six-digit hex, so a swatch and the rail button can render it directly', () => {
    for (const colour of TOOL_RAIL_COLOURS) {
      expect(colour).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("offers the store's default colour, so the popover opens with a swatch selected", () => {
    expect(TOOL_RAIL_COLOURS).toContain(useAnnotationStore.getState().selectedColor);
  });
});
