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
});
