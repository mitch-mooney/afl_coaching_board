import { describe, it, expect } from 'vitest';
import { TOOL_RAIL_TIPS } from '../toolRailTips';

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
