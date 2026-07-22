import { describe, it, expect } from 'vitest';
import { resolveSkin } from '../hudSkin';

describe('resolveSkin', () => {
  it('override B always forces B', () => {
    expect(resolveSkin('B', false, true)).toBe('B');
    expect(resolveSkin('B', true, true)).toBe('B');
  });
  it('override C always forces C', () => {
    expect(resolveSkin('C', true, false)).toBe('C');
    expect(resolveSkin('C', false, false)).toBe('C');
  });
  it('auto → B only when fine pointer AND desktop width', () => {
    expect(resolveSkin('auto', true, false)).toBe('B');
  });
  it('auto → C for a coarse pointer at any width (tablet in landscape)', () => {
    expect(resolveSkin('auto', true, true)).toBe('C');
  });
  it('auto → C for a fine pointer on a narrow screen (small laptop window)', () => {
    expect(resolveSkin('auto', false, false)).toBe('C');
  });
  it('auto → C for coarse + narrow', () => {
    expect(resolveSkin('auto', false, true)).toBe('C');
  });
});
