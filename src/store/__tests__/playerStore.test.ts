import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../playerStore';

beforeEach(() => { usePlayerStore.setState({ labelMode: 'number' }); });

describe('labelMode', () => {
  it('defaults to number', () => {
    expect(usePlayerStore.getState().labelMode).toBe('number');
  });

  it('setLabelMode changes mode', () => {
    usePlayerStore.getState().setLabelMode('name');
    expect(usePlayerStore.getState().labelMode).toBe('name');
  });

  it('cycleLabelMode goes number→name→position→number', () => {
    const s = usePlayerStore.getState();
    s.cycleLabelMode();
    expect(usePlayerStore.getState().labelMode).toBe('name');
    s.cycleLabelMode();
    expect(usePlayerStore.getState().labelMode).toBe('position');
    s.cycleLabelMode();
    expect(usePlayerStore.getState().labelMode).toBe('number');
  });
});
