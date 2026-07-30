import { describe, it, expect, beforeEach } from 'vitest';
import { usePenStore } from '../penStore';

beforeEach(() => {
  usePenStore.setState({ armedTip: null });
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
