import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import { legacyRowToPhase, type LegacyPlaybook } from '../appDatabase';

/**
 * Guards that routing the v3 (playbooks → scenarios) migration through the shared
 * toPhase adapter produces output byte-identical to the original inline literal.
 * The expected objects below are the OLD literal's output, written by hand — an
 * independent source of truth, not derived from legacyRowToPhase.
 */
describe('legacyRowToPhase — byte-identical to the original v3 migration literal', () => {
  it('maps a row with camera exactly as the old literal did', () => {
    const row: LegacyPlaybook = {
      id: 1,
      name: 'Old Play',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      playerPositions: [
        { id: 'team1-player-1', teamId: 'team1', position: [1, 0, 2], rotation: 0, color: '#fff' },
      ],
      cameraPosition: [10, 20, 30],
      cameraTarget: [0, 0, 0],
      cameraZoom: 1.5,
      annotations: [{ id: 'a1', type: 'arrow' }],
    };

    expect(legacyRowToPhase(row)).toEqual({
      id: 'phase-1',
      label: 'Phase 1',
      playerPositions: [
        { id: 'team1-player-1', teamId: 'team1', position: [1, 0, 2], rotation: 0, color: '#fff' },
      ],
      paths: [],
      annotations: [{ id: 'a1', type: 'arrow' }],
      cameraState: { position: [10, 20, 30], target: [0, 0, 0], zoom: 1.5 },
    });
  });

  it('defaults cameraZoom to 1 when the legacy row omits it', () => {
    const row: LegacyPlaybook = {
      name: 'No Zoom',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      cameraPosition: [1, 2, 3],
      cameraTarget: [4, 5, 6],
    };

    expect(legacyRowToPhase(row).cameraState).toEqual({
      position: [1, 2, 3],
      target: [4, 5, 6],
      zoom: 1,
    });
  });

  it('yields a null cameraState and empty slices for a bare row', () => {
    const row: LegacyPlaybook = { name: 'Bare', createdAt: new Date('2025-01-01T00:00:00.000Z') };

    expect(legacyRowToPhase(row)).toEqual({
      id: 'phase-1',
      label: 'Phase 1',
      playerPositions: [],
      paths: [],
      annotations: [],
      cameraState: null,
    });
  });
});

/**
 * The v6 upgrade adds the Venues table. It is purely additive — Play coordinates
 * were always absolute metres and that meaning is unchanged by grounds becoming
 * variable — so the thing worth guarding is that data written *before* the bump
 * survives it. That means genuinely writing at v5 and reopening at v6, not writing
 * fresh rows into an already-upgraded database.
 *
 * The schema strings are restated here on purpose: a test that imported them from
 * appDatabase would agree with any future edit, including a destructive one.
 */
describe('v6 (Venues) upgrade', () => {
  const V5_STORES = {
    playbooks: '++id, name, createdAt, videoBlobId',
    playbookCollections: '++id, name, createdAt',
    scenarios: '++id, name, createdAt, updatedAt, team1RosterId, team2RosterId, playbookId',
    teamRosters: '++id, teamName, createdAt',
  };
  const V6_STORES = { ...V5_STORES, venues: '++id, name, createdAt' };

  it('leaves Plays and Playbooks written at v5 readable and unchanged', async () => {
    const dbName = `MigrationProbe_${Math.floor(performance.now() * 1000)}`;
    const now = '2026-01-01T00:00:00.000Z';

    const v5 = new Dexie(dbName);
    v5.version(5).stores(V5_STORES);
    await v5.open();
    const bookId = await v5.table('playbookCollections').add({
      name: 'My Plays', isDefault: true, createdAt: now, updatedAt: now,
    });
    const playId = await v5.table('scenarios').add({
      name: 'Corridor Entry', createdAt: now, updatedAt: now,
      team1RosterId: null, team2RosterId: null, playbookId: bookId,
      phases: [{ id: 'phase-1', label: 'Phase 1', playerPositions: [
        { id: 'team1-player-1', teamId: 'team1', position: [12, 0, -34], rotation: 0, color: '#fff' },
      ], paths: [], annotations: [], cameraState: null }],
    });
    v5.close();

    const v6 = new Dexie(dbName);
    v6.version(5).stores(V5_STORES);
    v6.version(6).stores(V6_STORES);
    await v6.open();

    expect(v6.verno).toBe(6);
    // The new table exists and starts empty — Standard ground is seeded by
    // venueStore, not by the migration.
    expect(await v6.table('venues').count()).toBe(0);

    const play = await v6.table('scenarios').get(playId);
    expect(play.name).toBe('Corridor Entry');
    expect(play.playbookId).toBe(bookId);
    // The coordinates are the point: absolute metres, byte-identical across the bump.
    expect(play.phases[0].playerPositions[0].position).toEqual([12, 0, -34]);
    expect((await v6.table('playbookCollections').get(bookId)).name).toBe('My Plays');

    v6.close();
    await Dexie.delete(dbName);
  });
});
