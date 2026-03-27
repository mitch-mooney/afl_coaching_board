import { describe, it, expect, beforeEach } from 'vitest';
import { useRosterStore, rosterTable, parsePlayHQText } from '../rosterStore';

beforeEach(async () => {
  await rosterTable.clear();
  useRosterStore.setState({ rosters: [] });
});

const SAMPLE = `#\tPlayers\tPP\tG
23\tSmith J (c)\t3\t2
7\tJones M (vc)\t2\t1
15\tBrown K\t4\t0`;

describe('parsePlayHQText', () => {
  it('parses three players from sample', () => {
    const players = parsePlayHQText(SAMPLE);
    expect(players).toHaveLength(3);
  });

  it('parses number and name', () => {
    const players = parsePlayHQText(SAMPLE);
    expect(players[0].number).toBe(23);
    expect(players[0].name).toBe('Smith J');
  });

  it('detects captain marker', () => {
    const players = parsePlayHQText(SAMPLE);
    expect(players[0].isCaptain).toBe(true);
    expect(players[1].isViceCaptain).toBe(true);
    expect(players[1].name).toBe('Jones M');
    expect(players[2].isCaptain).toBeFalsy();
  });

  it('assigns unique string UUIDs', () => {
    const players = parsePlayHQText(SAMPLE);
    const ids = players.map((p) => p.id);
    expect(new Set(ids).size).toBe(3);
    expect(typeof ids[0]).toBe('string');
  });

  it('ignores header row', () => {
    const players = parsePlayHQText(SAMPLE);
    expect(players.every((p) => !isNaN(p.number))).toBe(true);
  });
});

describe('rosterStore CRUD', () => {
  it('creates and loads a roster', async () => {
    const { createRoster, loadRosters } = useRosterStore.getState();
    await createRoster('Hawks', []);
    await loadRosters();
    expect(useRosterStore.getState().rosters[0].teamName).toBe('Hawks');
  });

  it('deletes a roster', async () => {
    const { createRoster, deleteRoster } = useRosterStore.getState();
    const id = await createRoster('Swans', []);
    await deleteRoster(id);
    expect(useRosterStore.getState().rosters).toHaveLength(0);
  });
});
