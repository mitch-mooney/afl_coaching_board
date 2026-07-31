import { describe, it, expect } from 'vitest';
import { authoringIntent, tipAvailable } from '../inputContract';
import { TOOL_RAIL_TIPS } from '../../components/Board/hud/toolRailTips';

/**
 * Every armable tip that is not Path, derived from the rail's own list — pure
 * data, no React — so a tip added to the rail later cannot quietly escape the
 * "every Annotation tip keeps working" claim below.
 */
const ANNOTATION_TIPS = TOOL_RAIL_TIPS.map(({ tip }) => tip).filter((tip) => tip !== 'path');

describe('the input contract', () => {
  it('has a finger manipulate even when a tip is armed', () => {
    expect(authoringIntent({ pointerType: 'touch', armedTip: 'arrow' })).toBe('manipulate');
  });

  it('has a pen with no tip armed behave as a finger', () => {
    expect(authoringIntent({ pointerType: 'pen', armedTip: null })).toBe('manipulate');
  });

  it('has a pen with a tip armed author', () => {
    expect(authoringIntent({ pointerType: 'pen', armedTip: 'arrow' })).toBe('author');
  });

  it('has a mouse with a tip armed author, so the desktop board still draws', () => {
    expect(authoringIntent({ pointerType: 'mouse', armedTip: 'arrow', button: 0 })).toBe('author');
  });

  // The camera gates its left mouse button on this row: with nothing armed the
  // button must fall back to orbit. See
  // `docs/adr/0004-camera-control-is-gated-per-pointer-type.md`.
  it('has a mouse with no tip armed manipulate, so an unarmed left-drag still orbits', () => {
    expect(authoringIntent({ pointerType: 'mouse', armedTip: null })).toBe('manipulate');
  });

  it('authors from any armed tip, including Path, since the contract never asks which', () => {
    expect(authoringIntent({ pointerType: 'pen', armedTip: 'path' })).toBe('author');
  });

  it('never authors from a non-primary mouse button, so right-drag still rotates', () => {
    expect(authoringIntent({ pointerType: 'mouse', armedTip: 'line', button: 2 })).toBe(
      'manipulate'
    );
  });
});

describe('tip availability during playback', () => {
  // A Path Stroke writes to the state playback is reading and claims its entity
  // by proximity, so mid-animation it would attach to whatever happened to be
  // nearby. Annotations are inert markup and are not affected.
  it('makes the Path tip unavailable while an animation plays', () => {
    expect(tipAvailable('path', { isPlaying: true })).toBe(false);
  });

  it('makes the Path tip available again once playback stops', () => {
    expect(tipAvailable('path', { isPlaying: false })).toBe(true);
  });

  it.each(ANNOTATION_TIPS)('leaves the %s tip available while an animation plays', (tip) => {
    expect(tipAvailable(tip, { isPlaying: true })).toBe(true);
  });

  it.each(ANNOTATION_TIPS)('leaves the %s tip available when playback is stopped', (tip) => {
    expect(tipAvailable(tip, { isPlaying: false })).toBe(true);
  });
});
