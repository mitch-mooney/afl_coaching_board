import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ToolRail } from '../ToolRail';
import { useHistoryStore } from '../../../../store/historyStore';
import { useAnnotationStore } from '../../../../store/annotationStore';
import { usePenStore } from '../../../../store/penStore';
import { editBoard } from '../../../../utils/boardEdit';

// Undo at the foot of the Tool rail (issue #93): an action, not an instrument,
// set apart from the instruments by a divider. Asserted on the rendered rail,
// the surface the coach actually taps.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const arrow = () => ({
  type: 'arrow' as const,
  points: [[0, 0], [1, 1]],
  color: '#ff0000',
});

const addAnnotationEdit = () =>
  act(() => {
    editBoard('Add annotation', () => {
      useAnnotationStore.getState().addAnnotation(arrow());
    });
  });

const undoButton = () => container.querySelector<HTMLButtonElement>('button[aria-label="Undo"]');

beforeEach(() => {
  useAnnotationStore.getState().setAnnotations([]);
  useHistoryStore.getState().clearHistory();
  usePenStore.setState({ armedTip: null, armedPlacement: null });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ToolRail />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('Undo on the Tool rail', () => {
  it('is the last control on the rail, below a divider', () => {
    const button = undoButton();
    expect(button).not.toBeNull();
    const column = button!.parentElement!;
    expect(column.lastElementChild).toBe(button);
    const before = button!.previousElementSibling as HTMLElement;
    expect(before.tagName).toBe('DIV');
    expect(before.getAttribute('aria-hidden')).not.toBeNull();
  });

  it('is disabled when there is nothing to undo, and enabled after a Board edit', () => {
    expect(undoButton()!.getAttribute('aria-disabled')).toBe('true');
    addAnnotationEdit();
    expect(undoButton()!.getAttribute('aria-disabled')).toBe('false');
  });

  it('undoes the last Board edit when tapped', () => {
    addAnnotationEdit();
    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
    act(() => undoButton()!.click());
    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
    expect(undoButton()!.getAttribute('aria-disabled')).toBe('true');
  });

  it('leaves the armed tip armed', () => {
    act(() => usePenStore.getState().armTip('arrow'));
    addAnnotationEdit();
    act(() => undoButton()!.click());
    expect(usePenStore.getState().armedTip).toBe('arrow');
  });

  it('leaves an armed Placement armed', () => {
    act(() => usePenStore.getState().armPlacement('team2'));
    addAnnotationEdit();
    act(() => undoButton()!.click());
    expect(usePenStore.getState().armedPlacement).toBe('team2');
  });
});
