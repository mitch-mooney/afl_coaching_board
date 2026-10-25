import { describe, expect, it } from 'vitest';
import { palette, withAlpha } from '../tokens';

describe('design tokens', () => {
  it('holds the night-game palette', () => {
    expect(palette).toEqual({
      turf: '#1F3A26',
      turfLit: '#2E5534',
      chalk: '#F1EFE6',
      concrete: '#262422',
      steel: '#3B3E41',
      floodlight: '#FFF1C9',
    });
  });

  it('lays a palette colour over the board at a given opacity', () => {
    expect(withAlpha(palette.concrete, 0.9)).toBe('rgba(38, 36, 34, 0.9)');
    expect(withAlpha(palette.floodlight, 0.4)).toBe('rgba(255, 241, 201, 0.4)');
  });
});
