import { describe, it, expect } from 'vitest';
import { isBlockedByOverlay } from '../useKeyboardShortcuts';

describe('isBlockedByOverlay', () => {
  it('blocks when an overlay is open and neither opt-out is set', () => {
    expect(isBlockedByOverlay(true, false, false)).toBe(true);
  });

  it('does not block when no overlay is open', () => {
    expect(isBlockedByOverlay(false, false, false)).toBe(false);
  });

  it('does not block when the hook globally allows in modal', () => {
    expect(isBlockedByOverlay(true, true, false)).toBe(false);
  });

  it('does not block when the shortcut opts into modal (e.g. Esc)', () => {
    expect(isBlockedByOverlay(true, false, true)).toBe(false);
  });
});
