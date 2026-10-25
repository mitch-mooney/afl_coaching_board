import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useSetupControls } from '../useSetupControls';
import type { HudAction } from '../hudActions';

// The Setup action list is the one list both HUD skins render, the Setup pod
// and the Rail's Setup panel, so asserting on it covers both.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function setupActions(): HudAction[] {
  let actions: HudAction[] = [];
  function Probe() {
    actions = useSetupControls().actions;
    return null;
  }
  container = document.createElement('div');
  root = createRoot(container);
  act(() => root!.render(<Probe />));
  return actions;
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container = null;
});

describe('the Setup action list', () => {
  it('no longer offers Undo, which lives on the Tool rail', () => {
    const actions = setupActions();
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.map((a) => a.key)).not.toContain('undo');
  });
});
