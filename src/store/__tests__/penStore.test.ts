import { describe, it, expect, beforeEach } from 'vitest';
import { usePenStore } from '../penStore';

beforeEach(() => {
  usePenStore.setState({ armedTip: null, armedPlacement: null });
});

describe('arming a Pen tip', () => {
  it('starts with no tip armed, so the pen is a pointer', () => {
    expect(usePenStore.getState().armedTip).toBeNull();
  });

  it('arms a tip', () => {
    usePenStore.getState().armTip('arrow');
    expect(usePenStore.getState().armedTip).toBe('arrow');
  });

  it('replaces the armed tip rather than stacking, since only one can be armed', () => {
    usePenStore.getState().armTip('arrow');
    usePenStore.getState().armTip('path');
    expect(usePenStore.getState().armedTip).toBe('path');
  });

  it('disarms back to a pointer', () => {
    usePenStore.getState().armTip('path');
    usePenStore.getState().disarm();
    expect(usePenStore.getState().armedTip).toBeNull();
  });

  it('treats arming the already-armed tip as a toggle off', () => {
    usePenStore.getState().armTip('measure');
    usePenStore.getState().armTip('measure');
    expect(usePenStore.getState().armedTip).toBeNull();
  });
});

describe('arming a Placement', () => {
  it('starts with no Placement armed', () => {
    expect(usePenStore.getState().armedPlacement).toBeNull();
  });

  it('arms a Placement for a team', () => {
    usePenStore.getState().armPlacement('team1');
    expect(usePenStore.getState().armedPlacement).toBe('team1');
  });

  it('switches team rather than stacking, since only one can be armed', () => {
    usePenStore.getState().armPlacement('team1');
    usePenStore.getState().armPlacement('team2');
    expect(usePenStore.getState().armedPlacement).toBe('team2');
  });

  it('treats arming the already-armed Placement as a toggle off', () => {
    usePenStore.getState().armPlacement('team2');
    usePenStore.getState().armPlacement('team2');
    expect(usePenStore.getState().armedPlacement).toBeNull();
  });
});

describe('one instrument at a time', () => {
  it('arming a Placement clears the armed tip', () => {
    usePenStore.getState().armTip('arrow');
    usePenStore.getState().armPlacement('team1');
    expect(usePenStore.getState().armedTip).toBeNull();
    expect(usePenStore.getState().armedPlacement).toBe('team1');
  });

  it('arming a tip clears the armed Placement', () => {
    usePenStore.getState().armPlacement('team1');
    usePenStore.getState().armTip('path');
    expect(usePenStore.getState().armedPlacement).toBeNull();
    expect(usePenStore.getState().armedTip).toBe('path');
  });

  it('toggling a tip off leaves nothing armed', () => {
    usePenStore.getState().armTip('arrow');
    usePenStore.getState().armTip('arrow');
    expect(usePenStore.getState().armedTip).toBeNull();
    expect(usePenStore.getState().armedPlacement).toBeNull();
  });

  it('disarm clears both', () => {
    usePenStore.getState().armPlacement('team2');
    usePenStore.getState().disarm();
    expect(usePenStore.getState().armedPlacement).toBeNull();
    expect(usePenStore.getState().armedTip).toBeNull();
  });
});

describe('disarmPlacement', () => {
  it('clears the Placement and leaves the tip alone', () => {
    usePenStore.getState().armTip('arrow');
    usePenStore.getState().disarmPlacement();
    expect(usePenStore.getState().armedTip).toBe('arrow');
    expect(usePenStore.getState().armedPlacement).toBeNull();

    usePenStore.getState().armPlacement('team2');
    usePenStore.getState().disarmPlacement();
    expect(usePenStore.getState().armedPlacement).toBeNull();
    expect(usePenStore.getState().armedTip).toBeNull();
  });
});
