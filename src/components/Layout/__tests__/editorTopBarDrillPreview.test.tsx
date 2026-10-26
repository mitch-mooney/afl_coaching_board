import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EditorTopBar } from '../EditorTopBar';
import { usePlayerStore } from '../../../store/playerStore';
import type { Player } from '../../../models/PlayerModel';

// The drill's gold dots are a preview, never board content, so the board
// offers a way to dismiss them rather than to drag them.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ghost: Player = {
  id: 'drill-preview-a-0',
  teamId: 'team1',
  position: [10, 0, 0],
  rotation: 0,
  color: '#0066cc',
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderTopBar(editorTab: 'board' | 'training' = 'board') {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root!.render(
      <EditorTopBar
        editorTab={editorTab}
        mode="training"
        isConePlacementActive={false}
        isMenuOpen={false}
        onBack={() => {}}
        onSelectTab={() => {}}
        onExitConePlacement={() => {}}
        onToggleMenu={() => {}}
      />,
    ),
  );
}

const clearButton = () =>
  Array.from(container!.querySelectorAll('button')).find((b) => b.textContent === 'Clear drill preview');

beforeEach(() => {
  usePlayerStore.setState({ previewPositions: null });
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('the drill preview on the board', () => {
  it('offers no Clear drill preview when there is no preview', () => {
    renderTopBar();
    expect(clearButton()).toBeUndefined();
  });

  it('clears the gold dots from the board', () => {
    usePlayerStore.setState({ previewPositions: [ghost] });
    renderTopBar();

    act(() => clearButton()!.click());

    expect(usePlayerStore.getState().previewPositions).toBeNull();
    expect(clearButton()).toBeUndefined();
  });
});
