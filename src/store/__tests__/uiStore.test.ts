import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

beforeEach(() => {
  useUIStore.setState({ boardSubMode: 'setup', editorTab: 'board' });
});

describe('boardSubMode', () => {
  it('defaults to setup', () => {
    expect(useUIStore.getState().boardSubMode).toBe('setup');
  });

  it('toggleBoardSubMode cycles setup→draw→setup', () => {
    useUIStore.getState().toggleBoardSubMode();
    expect(useUIStore.getState().boardSubMode).toBe('draw');
    useUIStore.getState().toggleBoardSubMode();
    expect(useUIStore.getState().boardSubMode).toBe('setup');
  });
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
