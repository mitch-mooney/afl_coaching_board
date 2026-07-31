import { describe, it, expect } from 'vitest';
import { TOOL_RAIL_TIPS, tipLabel, tipUsesThickness } from '../toolRailTips';

describe('TOOL_RAIL_TIPS', () => {
  it('carries the six Annotation kinds plus Path, in rail order', () => {
    expect(TOOL_RAIL_TIPS.map((t) => t.tip)).toEqual([
      'line',
      'arrow',
      'circle',
      'rectangle',
      'text',
      'measure',
      'path',
    ]);
  });

  it('lists each tip exactly once', () => {
    const tips = TOOL_RAIL_TIPS.map((t) => t.tip);
    expect(new Set(tips).size).toBe(tips.length);
  });

  it('gives every tip a label, an icon and a shortcut for the tooltip', () => {
    for (const tip of TOOL_RAIL_TIPS) {
      expect(tip.label).not.toBe('');
      expect(tip.icon).not.toBe('');
      expect(tip.shortcut).toMatch(/^[A-Z]$/);
    }
  });

  it('uses a distinct shortcut letter per tip', () => {
    const keys = TOOL_RAIL_TIPS.map((t) => t.shortcut);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('tipUsesThickness', () => {
  it('hides thickness for text and measure, as the palette does today', () => {
    expect(tipUsesThickness('text')).toBe(false);
    expect(tipUsesThickness('measure')).toBe(false);
  });

  it('offers thickness for every other tip', () => {
    for (const { tip } of TOOL_RAIL_TIPS) {
      if (tip === 'text' || tip === 'measure') continue;
      expect(tipUsesThickness(tip)).toBe(true);
    }
  });

  it('offers thickness when no tip is armed', () => {
    expect(tipUsesThickness(null)).toBe(true);
  });
});

describe('tipLabel', () => {
  it('names the armed tip', () => {
    expect(tipLabel('measure')).toBe('Measure');
  });

  it('is empty when no tip is armed', () => {
    expect(tipLabel(null)).toBe('');
  });
});
