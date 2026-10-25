import { describe, expect, it } from 'vitest';
import resolveConfig from 'tailwindcss/resolveConfig';
import config from '../../../tailwind.config';

// Through Tailwind's own resolver, so the assertions are on what a utility class
// will actually produce, not on how the config file happens to be written.
const theme = resolveConfig(config).theme as unknown as Record<string, Record<string, unknown>>;

describe('the Tailwind theme', () => {
  it('names the six palette colours', () => {
    expect(theme.colors.turf).toBe('#1F3A26');
    expect(theme.colors['turf-lit']).toBe('#2E5534');
    expect(theme.colors.chalk).toBe('#F1EFE6');
    expect(theme.colors.concrete).toBe('#262422');
    expect(theme.colors.steel).toBe('#3B3E41');
    expect(theme.colors.floodlight).toBe('#FFF1C9');
  });

  it('keeps the stock colours the library pages still use', () => {
    // The pages are restyled in later tickets; until then `bg-gray-900` and
    // friends must keep working.
    expect((theme.colors.gray as Record<string, string>)['900']).toBe('#111827');
  });

  it('sets body text in Public Sans, falling back to a system sans', () => {
    const sans = theme.fontFamily.sans as string[];
    expect(sans[0]).toBe('"Public Sans Variable"');
    expect(sans).toContain('system-ui');
    expect(sans[sans.length - 1]).toBe('sans-serif');
  });

  it('sets display text in Big Shoulders Display, falling back to a condensed system face', () => {
    const display = theme.fontFamily.display as string[];
    expect(display[0]).toBe('"Big Shoulders Display Variable"');
    expect(display).toContain('"Arial Narrow"');
    expect(display[display.length - 1]).toBe('sans-serif');
  });

  it('carries the type scale, spacing and radii', () => {
    expect(theme.fontSize.label).toEqual(['12px', { lineHeight: '16px', fontWeight: '600' }]);
    expect(theme.spacing.sm).toBe('8px');
    expect(theme.borderRadius.control).toBe('12px');
  });
});
