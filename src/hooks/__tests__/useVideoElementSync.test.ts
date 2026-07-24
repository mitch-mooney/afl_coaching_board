import { describe, it, expect, vi } from 'vitest';
import { syncVideoElement, type VideoSyncState } from '../useVideoElementSync';

function mockEl(overrides: Partial<HTMLVideoElement> = {}): HTMLVideoElement {
  return {
    src: '',
    paused: true,
    currentTime: 0,
    volume: 1,
    muted: false,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    ...overrides,
  } as unknown as HTMLVideoElement;
}

const base: VideoSyncState = { src: '', isPlaying: false, currentTime: 0, volume: 1, isMuted: false };

describe('syncVideoElement', () => {
  it('sets src only when it differs', () => {
    const el = mockEl({ src: 'a' });
    syncVideoElement(el, { ...base, src: 'b' });
    expect(el.src).toBe('b');

    const el2 = mockEl({ src: 'a' });
    syncVideoElement(el2, { ...base, src: 'a' });
    expect(el2.src).toBe('a');
  });

  it('does not set src when the target src is empty', () => {
    const el = mockEl({ src: 'a' });
    syncVideoElement(el, { ...base, src: '' });
    expect(el.src).toBe('a');
  });

  it('plays when target is playing and the element is paused', () => {
    const el = mockEl({ paused: true });
    syncVideoElement(el, { ...base, isPlaying: true });
    expect(el.play).toHaveBeenCalledOnce();
    expect(el.pause).not.toHaveBeenCalled();
  });

  it('pauses when target is not playing and the element is playing', () => {
    const el = mockEl({ paused: false });
    syncVideoElement(el, { ...base, isPlaying: false });
    expect(el.pause).toHaveBeenCalledOnce();
    expect(el.play).not.toHaveBeenCalled();
  });

  it('does nothing to play/pause when already in the target play state', () => {
    const playing = mockEl({ paused: false });
    syncVideoElement(playing, { ...base, isPlaying: true });
    expect(playing.play).not.toHaveBeenCalled();
    expect(playing.pause).not.toHaveBeenCalled();

    const pausedEl = mockEl({ paused: true });
    syncVideoElement(pausedEl, { ...base, isPlaying: false });
    expect(pausedEl.play).not.toHaveBeenCalled();
    expect(pausedEl.pause).not.toHaveBeenCalled();
  });

  it('seeks only when drift exceeds 0.5s', () => {
    const drifted = mockEl({ currentTime: 0 });
    syncVideoElement(drifted, { ...base, currentTime: 5 });
    expect(drifted.currentTime).toBe(5);

    const close = mockEl({ currentTime: 5 });
    syncVideoElement(close, { ...base, currentTime: 5.3 });
    expect(close.currentTime).toBe(5);
  });

  it('always applies volume and mute', () => {
    const el = mockEl({ volume: 1, muted: false });
    syncVideoElement(el, { ...base, volume: 0.5, isMuted: true });
    expect(el.volume).toBe(0.5);
    expect(el.muted).toBe(true);
  });
});
