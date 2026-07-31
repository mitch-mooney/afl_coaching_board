import { describe, it, expect } from 'vitest';
import { validateBoundaryDimensions } from '../VenueModel';

/**
 * A coach types these numbers in after pacing out a ground, so the rules are
 * deliberately lopsided: reject only what cannot be a football ground, warn about
 * what is merely unusual, and never block a measurement we cannot second-guess.
 */

describe('validateBoundaryDimensions', () => {
  it('accepts an ordinary community ground without comment', () => {
    expect(validateBoundaryDimensions({ boundaryLength: 160, boundaryWidth: 130 })).toEqual({
      ok: true,
    });
  });

  it('accepts Standard ground', () => {
    expect(validateBoundaryDimensions({ boundaryLength: 165, boundaryWidth: 135 })).toEqual({
      ok: true,
    });
  });

  it('rejects a ground entered wider than it is long — the transposed-measurement case', () => {
    const result = validateBoundaryDimensions({ boundaryLength: 130, boundaryWidth: 160 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/longer than it is wide/i);
  });

  it('rejects a square ground — width equal to length is the same mistake', () => {
    expect(validateBoundaryDimensions({ boundaryLength: 150, boundaryWidth: 150 }).ok).toBe(false);
  });

  it('rejects non-positive dimensions', () => {
    expect(validateBoundaryDimensions({ boundaryLength: 0, boundaryWidth: 0 }).ok).toBe(false);
    expect(validateBoundaryDimensions({ boundaryLength: 160, boundaryWidth: -10 }).ok).toBe(false);
  });

  it('rejects a dimension that is not a number', () => {
    expect(validateBoundaryDimensions({ boundaryLength: NaN, boundaryWidth: 130 }).ok).toBe(false);
  });

  it('warns about a very short ground but still accepts it', () => {
    const result = validateBoundaryDimensions({ boundaryLength: 110, boundaryWidth: 95 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warning).toMatch(/unusual/i);
  });

  it('warns about a very narrow ground but still accepts it', () => {
    const result = validateBoundaryDimensions({ boundaryLength: 160, boundaryWidth: 85 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warning).toBeTruthy();
  });

  it('warns about an implausibly large ground but still accepts it', () => {
    const result = validateBoundaryDimensions({ boundaryLength: 260, boundaryWidth: 180 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warning).toBeTruthy();
  });

  it('accepts the extremes of the plausible range without warning', () => {
    expect(validateBoundaryDimensions({ boundaryLength: 120, boundaryWidth: 90 })).toEqual({ ok: true });
    expect(validateBoundaryDimensions({ boundaryLength: 200, boundaryWidth: 170 })).toEqual({ ok: true });
  });
});
