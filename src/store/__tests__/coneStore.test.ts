import { describe, it, expect, beforeEach } from 'vitest';
import { useConeStore } from '../coneStore';

beforeEach(() => {
  useConeStore.setState({ cones: [], isConePlacementActive: false });
});

describe('coneStore', () => {
  it('starts with empty cones', () => {
    expect(useConeStore.getState().cones).toHaveLength(0);
  });

  it('addCone adds a cone with an id', () => {
    useConeStore.getState().addCone([10, 0, 5]);
    const { cones } = useConeStore.getState();
    expect(cones).toHaveLength(1);
    expect(cones[0].position).toEqual([10, 0, 5]);
    expect(typeof cones[0].id).toBe('string');
  });

  it('removeCone removes by id', () => {
    useConeStore.getState().addCone([0, 0, 0]);
    const id = useConeStore.getState().cones[0].id;
    useConeStore.getState().removeCone(id);
    expect(useConeStore.getState().cones).toHaveLength(0);
  });

  it('clearCones empties the array', () => {
    useConeStore.getState().addCone([0, 0, 0]);
    useConeStore.getState().addCone([1, 0, 1]);
    useConeStore.getState().clearCones();
    expect(useConeStore.getState().cones).toHaveLength(0);
  });

  it('setConePlacementActive toggles the flag', () => {
    useConeStore.getState().setConePlacementActive(true);
    expect(useConeStore.getState().isConePlacementActive).toBe(true);
    useConeStore.getState().setConePlacementActive(false);
    expect(useConeStore.getState().isConePlacementActive).toBe(false);
  });
});
