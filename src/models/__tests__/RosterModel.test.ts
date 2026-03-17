import { describe, it, expect } from 'vitest';
import type { RosterPlayer, TeamRoster } from '../RosterModel';

describe('RosterModel', () => {
  it('RosterPlayer has id, number, name', () => {
    const p: RosterPlayer = { id: 'uuid-1', number: 23, name: 'Smith J' };
    expect(p.id).toBe('uuid-1');
    expect(p.number).toBe(23);
  });

  it('TeamRoster has players array', () => {
    const r: TeamRoster = {
      teamName: 'Hawks',
      createdAt: new Date().toISOString(),
      players: [],
    };
    expect(r.players).toHaveLength(0);
  });
});
