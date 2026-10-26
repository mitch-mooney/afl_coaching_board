import { describe, expect, it } from 'vitest';
import mainLayout from '../MainLayout.tsx?raw';

/**
 * A new Play opens straight onto the board (issue #109). The editor used to
 * mount a "Fullscreen telestration mode" announcement that covered the board
 * until the coach dismissed it. The welcome tour stays: the coach kept it.
 */
describe('opening the board', () => {
  it('puts no feature announcement over the board', () => {
    expect(mainLayout).not.toMatch(/FeatureNotification|telestration mode/i);
  });

  it('keeps the welcome tour', () => {
    expect(mainLayout).toMatch(/<OnboardingTour\s*\/>/);
  });
});
