import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

beforeEach(() => {
  useUIStore.setState({ editorTab: 'board' });
});

describe('editorTab', () => {
  it('defaults to board', () => {
    expect(useUIStore.getState().editorTab).toBe('board');
  });

  it('setEditorTab switches to video', () => {
    useUIStore.getState().setEditorTab('video');
    expect(useUIStore.getState().editorTab).toBe('video');
  });

  it('setEditorTab switches to training', () => {
    useUIStore.getState().setEditorTab('training');
    expect(useUIStore.getState().editorTab).toBe('training');
  });
});

// The Grounds panel's open state. It was local to `GlobalDrawer` while the drawer
// was the only door into it; the ground popover's **Add a ground** row is a second
// door, and it is nowhere near that component. Held here so the popover can route
// to the panel without the panel moving or being duplicated — the popover routes,
// it never creates.
describe('the Grounds panel', () => {
  beforeEach(() => {
    useUIStore.setState({ showVenue: false });
  });

  it('starts closed', () => {
    expect(useUIStore.getState().showVenue).toBe(false);
  });

  it('opens when a surface routes to it', () => {
    useUIStore.getState().setShowVenue(true);
    expect(useUIStore.getState().showVenue).toBe(true);
  });

  it('closes again', () => {
    useUIStore.getState().setShowVenue(true);
    useUIStore.getState().setShowVenue(false);
    expect(useUIStore.getState().showVenue).toBe(false);
  });
});

describe('overlay counter', () => {
  beforeEach(() => {
    useUIStore.setState({ overlayOpenCount: 0 });
  });

  it('defaults to 0', () => {
    expect(useUIStore.getState().overlayOpenCount).toBe(0);
  });

  it('pushOverlay increments', () => {
    useUIStore.getState().pushOverlay();
    expect(useUIStore.getState().overlayOpenCount).toBe(1);
    useUIStore.getState().pushOverlay();
    expect(useUIStore.getState().overlayOpenCount).toBe(2);
  });

  it('popOverlay decrements', () => {
    useUIStore.getState().pushOverlay();
    useUIStore.getState().pushOverlay();
    useUIStore.getState().popOverlay();
    expect(useUIStore.getState().overlayOpenCount).toBe(1);
  });

  it('popOverlay clamps at 0', () => {
    useUIStore.getState().popOverlay();
    expect(useUIStore.getState().overlayOpenCount).toBe(0);
  });
});
