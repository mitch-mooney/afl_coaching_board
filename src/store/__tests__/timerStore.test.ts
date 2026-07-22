import { describe, it, expect, beforeEach } from 'vitest';
import { useTimerStore } from '../timerStore';
import type { SessionDrill } from '../../models/TrainingSession';

const makeDrill = (id: string): SessionDrill => ({
  drillId: id,
  name: `Drill ${id}`,
  description: 'desc',
  category: 'marking',
  durationSeconds: 300,
  restSeconds: 0,
  playersRequired: 10,
  equipment: [],
  instructions: [],
  difficulty: 'beginner',
});

beforeEach(() => {
  useTimerStore.setState({ sessionDrills: [], currentDrillIndex: 0 });
});

describe('drill queue', () => {
  it('starts empty', () => {
    expect(useTimerStore.getState().sessionDrills).toHaveLength(0);
  });

  it('addDrill appends a drill', () => {
    useTimerStore.getState().addDrill(makeDrill('a'));
    expect(useTimerStore.getState().sessionDrills).toHaveLength(1);
    expect(useTimerStore.getState().sessionDrills[0].drillId).toBe('a');
  });

  it('removeDrill removes by drillId', () => {
    useTimerStore.getState().addDrill(makeDrill('a'));
    useTimerStore.getState().addDrill(makeDrill('b'));
    useTimerStore.getState().removeDrill('a');
    expect(useTimerStore.getState().sessionDrills).toHaveLength(1);
    expect(useTimerStore.getState().sessionDrills[0].drillId).toBe('b');
  });

  it('reorderDrill moves a drill to a new index', () => {
    useTimerStore.getState().addDrill(makeDrill('a'));
    useTimerStore.getState().addDrill(makeDrill('b'));
    useTimerStore.getState().addDrill(makeDrill('c'));
    useTimerStore.getState().reorderDrill('c', 0);
    const ids = useTimerStore.getState().sessionDrills.map(d => d.drillId);
    expect(ids).toEqual(['c', 'a', 'b']);
  });

  it('setDrillRest updates restSeconds for a drill', () => {
    useTimerStore.getState().addDrill(makeDrill('a'));
    useTimerStore.getState().setDrillRest('a', 120);
    expect(useTimerStore.getState().sessionDrills[0].restSeconds).toBe(120);
  });
});
