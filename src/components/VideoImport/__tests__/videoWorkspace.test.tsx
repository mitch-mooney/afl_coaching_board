import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VideoWorkspace } from '../VideoWorkspace';
import { useVideoStore } from '../../../store/videoStore';
import { useUIStore } from '../../../store/uiStore';

// The Video tab is where Link Video Moment lands (issue #108). With no video
// loaded it used to render nothing at all, which on the device is a blank
// white screen with no way forward and no way back.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const button = (name: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name,
  ) ?? null;

beforeEach(() => {
  useVideoStore.setState({ isLoaded: false });
  useUIStore.setState({ editorTab: 'video' });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<VideoWorkspace />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('the Video tab with no video loaded', () => {
  it('offers a way to choose a video', () => {
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
    expect(button('Browse files')).not.toBeNull();
  });

  it('lets the coach back out to the board', () => {
    const back = button('Back to board');
    expect(back).not.toBeNull();
    act(() => back!.click());
    expect(useUIStore.getState().editorTab).toBe('board');
  });
});
