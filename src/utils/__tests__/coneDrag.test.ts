import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../../store/playerStore';
import { usePathStore } from '../../store/pathStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { useCameraStore } from '../../store/cameraStore';
import { useBallStore } from '../../store/ballStore';
import { useConeStore } from '../../store/coneStore';
import { useHistoryStore } from '../../store/historyStore';
import { undoBoard } from '../../hooks/useBoardUndo';
import { beginConeDrag, conePointerIntent } from '../coneDrag';
import { isPointInField } from '../fieldGeometry';

beforeEach(() => {
  usePlayerStore.setState({ players: [] });
  usePathStore.setState({ paths: [] });
  useAnnotationStore.setState({ annotations: [] });
  useCameraStore.setState({ position: [0, 0, 0], target: [0, 0, 0], zoom: 1 });
  useBallStore.setState({ ball: null });
  useConeStore.setState({
    cones: [
      { id: 'a', position: [0, 0, 0] },
      { id: 'b', position: [10, 0, 10] },
    ],
    isConePlacementActive: false,
  });
  useHistoryStore.getState().clearHistory();
});

const positionOf = (id: string) => useConeStore.getState().cones.find((c) => c.id === id)!.position;

const BOUNDARY = { semiX: 80, semiZ: 60 };

describe('beginConeDrag — a cone drag is one Board edit', () => {
  it('leaves the cone where it is when the finger lands, wherever on the cone it lands', () => {
    // The finger lands on the cone's body, whose ray meets the ground a little
    // way from the cone's base. A tap must not nudge the cone there.
    const drag = beginConeDrag('a', BOUNDARY);
    drag.moveTo([1.5, -0.8]);
    drag.commit();

    expect(positionOf('a')).toEqual([0, 0, 0]);
    expect(useHistoryStore.getState().past).toHaveLength(0);
  });

  it('moves the cone by as far as the finger travels and records one entry when it lifts', () => {
    const drag = beginConeDrag('a', BOUNDARY);
    drag.moveTo([1, 1]);
    drag.moveTo([4, 5]);
    drag.moveTo([7, -1]);

    expect(positionOf('a')).toEqual([6, 0, -2]);
    expect(useHistoryStore.getState().past).toHaveLength(0);

    drag.commit();

    const { past } = useHistoryStore.getState();
    expect(past).toHaveLength(1);
    expect(past[0].label).toBe('Move cone');
  });

  it('is undone in one step, putting the cone back where the drag began', () => {
    const drag = beginConeDrag('a', BOUNDARY);
    drag.moveTo([0, 0]);
    drag.moveTo([3, 4]);
    drag.moveTo([6, -2]);
    drag.commit();

    undoBoard();

    expect(positionOf('a')).toEqual([0, 0, 0]);
    expect(positionOf('b')).toEqual([10, 0, 10]);
  });

  it('keeps the cone inside the Boundary however far the finger goes', () => {
    const drag = beginConeDrag('a', BOUNDARY);
    drag.moveTo([0, 0]);
    drag.moveTo([500, 0]);

    const [x, , z] = positionOf('a');
    expect(isPointInField(x, z, BOUNDARY)).toBe(true);
    expect(x).toBeGreaterThan(75); // at the boundary's edge, not left behind
    expect(z).toBeCloseTo(0);
  });

  it('records nothing for a drag that ends where it began', () => {
    const drag = beginConeDrag('a', BOUNDARY);
    drag.moveTo([2, 2]);
    drag.moveTo([5, 6]);
    drag.moveTo([2, 2]);
    drag.commit();

    expect(useHistoryStore.getState().past).toHaveLength(0);
  });
});

describe('conePointerIntent — what a hand landing on a cone does', () => {
  it('has a finger drag the cone', () => {
    expect(conePointerIntent({ pointerType: 'touch', armedTip: null, coneSetupActive: false })).toBe('drag');
  });

  it('has a finger drag the cone even with a tip armed, since a finger never authors', () => {
    expect(conePointerIntent({ pointerType: 'touch', armedTip: 'arrow', coneSetupActive: false })).toBe('drag');
  });

  it('leaves the cone alone under a pen with a tip armed, so the Stroke draws over it', () => {
    expect(conePointerIntent({ pointerType: 'pen', armedTip: 'arrow', coneSetupActive: false })).toBe('none');
  });

  it('has a pen with nothing armed drag the cone, as a finger would', () => {
    expect(conePointerIntent({ pointerType: 'pen', armedTip: null, coneSetupActive: false })).toBe('drag');
  });

  it('does not drag on a secondary mouse button', () => {
    expect(conePointerIntent({ pointerType: 'mouse', armedTip: null, button: 2, coneSetupActive: false })).toBe('none');
  });

  it('makes a tap a removal only while cone setup is armed, for every pointer', () => {
    for (const pointerType of ['touch', 'pen', 'mouse']) {
      expect(conePointerIntent({ pointerType, armedTip: null, coneSetupActive: true })).toBe('remove');
    }
  });
});
