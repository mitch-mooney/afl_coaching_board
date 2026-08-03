import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import { legacyRowToPhase, stripInterchangeBench, type LegacyPlaybook } from '../appDatabase';

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

/**
 * The v7 upgrade strips the deleted interchange bench (#29) from every stored
 * play. Unlike v6 this one *does* rewrite Play content, so what it must not do
 * is as important as what it must: only players numbered 19–22 go, every other
 * player keeps their exact coordinates, and phases beyond the first are rewritten
 * too — a play whose bench survives in phase 3 still reports 8 out of bounds the
 * moment the coach steps to it.
 *
 * As with v6, the schema strings are restated rather than imported: a test that
 * read them from appDatabase would agree with any future edit, destructive ones
 * included.
 */
describe('v7 (delete the interchange bench) upgrade', () => {
  const V6_STORES = {
    playbooks: '++id, name, createdAt, videoBlobId',
    playbookCollections: '++id, name, createdAt',
    scenarios: '++id, name, createdAt, updatedAt, team1RosterId, team2RosterId, playbookId',
    teamRosters: '++id, teamName, createdAt',
    venues: '++id, name, createdAt',
  };

  /** A 22-a-side phase exactly as plays were stored before this change. */
  const phaseWithBench = (id: string) => ({
    id,
    label: id,
    playerPositions: [
      ...(['team1', 'team2'] as const).flatMap((teamId) =>
        Array.from({ length: 22 }, (_, i) => ({
          id: `${teamId}-player-${i + 1}`,
          teamId,
          // The bench sat at z ≈ 73.5, outside every realistic boundary.
          position: (i < 18 ? [i, 0, i - 9] : [-25 + (i - 18) * 6, 0, 73.5]) as
            [number, number, number],
          rotation: 0,
          color: '#fff',
          number: i + 1,
        })),
      ),
    ],
    paths: [],
    annotations: [],
    cameraState: null,
  });

  it('drops players 19–22 from every phase, leaving the other 36 untouched', async () => {
    const dbName = `BenchProbe_${Math.floor(performance.now() * 1000)}`;
    const now = '2026-01-01T00:00:00.000Z';

    const v6 = new Dexie(dbName);
    v6.version(6).stores(V6_STORES);
    await v6.open();
    const playId = await v6.table('scenarios').add({
      name: 'Corridor Entry', createdAt: now, updatedAt: now,
      team1RosterId: null, team2RosterId: null, playbookId: 1,
      phases: [phaseWithBench('phase-1'), phaseWithBench('phase-2')],
    });
    v6.close();

    const v7 = new Dexie(dbName);
    v7.version(6).stores(V6_STORES);
    v7.version(7).stores(V6_STORES).upgrade(stripInterchangeBench);
    await v7.open();

    expect(v7.verno).toBe(7);
    const play = await v7.table('scenarios').get(playId);

    for (const phase of play.phases) {
      expect(phase.playerPositions).toHaveLength(36);
      expect(phase.playerPositions.filter((p: { number: number }) => p.number > 18)).toEqual([]);
      // Nobody left is off the ground: the bench was the only thing out there.
      expect(phase.playerPositions.every((p: { position: number[] }) => p.position[2] < 70)).toBe(true);
    }
    // An untouched survivor keeps their exact coordinates — this rewrites the
    // roster, not the play.
    const first = play.phases[0].playerPositions[0];
    expect(first.id).toBe('team1-player-1');
    expect(first.position).toEqual([0, 0, -9]);

    v7.close();
    await Dexie.delete(dbName);
  });

  it('leaves a play that never had a bench byte-identical', async () => {
    const dbName = `BenchProbeClean_${Math.floor(performance.now() * 1000)}`;
    const now = '2026-01-01T00:00:00.000Z';
    const cleanPhase = {
      id: 'phase-1', label: 'Phase 1',
      playerPositions: [
        { id: 'team1-player-1', teamId: 'team1', position: [12, 0, -34], rotation: 0, color: '#fff', number: 1 },
      ],
      paths: [], annotations: [], cameraState: null,
    };

    const v6 = new Dexie(dbName);
    v6.version(6).stores(V6_STORES);
    await v6.open();
    const playId = await v6.table('scenarios').add({
      name: 'Already Clean', createdAt: now, updatedAt: now,
      team1RosterId: null, team2RosterId: null, playbookId: 1,
      phases: [cleanPhase],
    });
    v6.close();

    const v7 = new Dexie(dbName);
    v7.version(6).stores(V6_STORES);
    v7.version(7).stores(V6_STORES).upgrade(stripInterchangeBench);
    await v7.open();

    expect((await v7.table('scenarios').get(playId)).phases).toEqual([cleanPhase]);

    v7.close();
    await Dexie.delete(dbName);
  });
});
