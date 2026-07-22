import { describe, it, expect } from 'vitest';
import { polar, arcPath } from '../arcGeometry';

describe('arcGeometry', () => {
  it('polar maps 0° to the +x axis', () => {
    const p = polar(60, 60, 46, 0);
    expect(p.x).toBeCloseTo(106);
    expect(p.y).toBeCloseTo(60);
  });

  it('polar maps 90° to +y (SVG y-down)', () => {
    const p = polar(60, 60, 46, 90);
    expect(p.x).toBeCloseTo(60);
    expect(p.y).toBeCloseTo(106);
  });

  it('arcPath sets the large-arc flag when the sweep exceeds 180°', () => {
    const big = arcPath(60, 60, 46, 135, 135 + 270); // 270° sweep
    expect(big).toMatch(/^M /);
    expect(big).toContain('A 46 46 0 1 1'); // large-arc=1, sweep=1
  });

  it('arcPath clears the large-arc flag for a small sweep', () => {
    const small = arcPath(60, 60, 46, 135, 135 + 90); // 90° sweep
    expect(small).toContain('A 46 46 0 0 1'); // large-arc=0
  });
});
