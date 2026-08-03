import Dexie, { Table } from 'dexie';
import type { Player } from '../models/PlayerModel';
import type { Play, PlayPhase } from '../models/PlayModel';
import type { Playbook } from '../models/PlaybookModel';
import type { TeamRoster } from '../models/RosterModel';
import type { Venue } from '../models/VenueModel';
import { toPhase, withoutInterchangeBench } from '../utils/boardSnapshot';
import type { Annotation } from './annotationStore';
import type { Transaction } from 'dexie';

/**
 * Legacy flat-"Playbook" row shape. The `playbooks` table is dead storage now —
 * kept only so the v3 upgrade (playbooks → scenarios) still has a source table
 * to migrate from. The app no longer reads or writes it directly; the live
 * model is Play (see playStore) plus TeamRoster. (§1.8 retirement.)
 */
export interface LegacyPlaybook {
  id?: number;
  name: string;
  createdAt: Date;
  playerPositions?: Player[];
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  cameraZoom?: number;
  annotations?: unknown[];
  videoBlobId?: number;
}

/**
 * Map a legacy flat playbook row to a Play's first phase. Routed through the
 * shared toPhase adapter so the field-name mapping lives in one place; output is
 * byte-identical to the original inline literal (guarded by a fixture test).
 */
export function legacyRowToPhase(p: LegacyPlaybook): PlayPhase {
  return toPhase(
    {
      players: p.playerPositions ?? [],
      paths: [],
      annotations: (p.annotations ?? []) as Annotation[],
      camera:
        p.cameraPosition && p.cameraTarget
          ? { position: p.cameraPosition, target: p.cameraTarget, zoom: p.cameraZoom ?? 1 }
          : null,
      // Legacy playbooks predate the ball and cones; toPhase omits both keys when
      // empty, so migrated rows keep their byte-identical stored shape.
      ball: null,
      cones: [],
    },
    { id: 'phase-1', label: 'Phase 1' },
  );
}

/**
 * The v7 upgrade: strip the deleted interchange bench (#29) from every stored Play.
 *
 * Changing what a *new* board seeds does nothing for a play already on disk —
 * every play saved to date carries 22 a side with eight at z ≈ 73.5, and a play
 * that is only ever opened would never heal. So the rewrite happens once, here,
 * over every phase of every play.
 *
 * The players are **dropped, not pulled inside the boundary**. Pulling them in
 * would only defer the clutter: eight players nobody asked for, now standing in
 * the way of every drag on every old play.
 *
 * Exported so the migration test can drive it against a scratch database rather
 * than the app's own.
 */
export async function stripInterchangeBench(tx: Transaction): Promise<void> {
  await tx.table('scenarios').toCollection().modify((play: Play) => {
    for (const phase of play.phases ?? []) {
      const players = phase.playerPositions ?? [];
      const kept = withoutInterchangeBench(players);
      // Same list back means no bench to strip. Only assign when it actually
      // changed, so a play already at 18 a side comes through byte-identical
      // rather than being rewritten to an equal-but-new array.
      if (kept !== players) phase.playerPositions = kept;
    }
  });
}

class AppDatabase extends Dexie {
  /** Legacy — dead storage, retained only as the v3 migration source. */
  playbooks!: Table<LegacyPlaybook>;
  // Table name kept `scenarios` (legacy storage detail); rows are Plays.
  scenarios!: Table<Play, number>;
  teamRosters!: Table<TeamRoster, number>;
  // Playbook collections (each Play carries a playbookId → one of these).
  playbookCollections!: Table<Playbook, number>;
  // Grounds the coach has measured. App-wide match context, not Play content.
  venues!: Table<Venue, number>;

  constructor() {
    super('AFLPlaybookDB');
    this.version(1).stores({
      playbooks: '++id, name, createdAt',
    });
    // v2: index videoBlobId so playbooks with video can be queried
    this.version(2).stores({
      playbooks: '++id, name, createdAt, videoBlobId',
    });
    // v3: add scenarios and teamRosters tables; migrate existing playbooks → scenarios
    this.version(3).stores({
      playbooks: '++id, name, createdAt, videoBlobId',
      scenarios: '++id, name, createdAt, updatedAt, team1RosterId, team2RosterId',
      teamRosters: '++id, teamName, createdAt',
    }).upgrade(async (tx) => {
      const playbooks = await tx.table('playbooks').toArray();
      for (const p of playbooks) {
        const createdAt =
          p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt);
        await tx.table('scenarios').add({
          name: p.name,
          createdAt,
          updatedAt: new Date().toISOString(),
          team1RosterId: null,
          team2RosterId: null,
          phases: [legacyRowToPhase(p as LegacyPlaybook)],
          videoBlobId: p.videoBlobId,
        });
      }
    });
    // v4: add linkedVideoMoment support to scenarios (unindexed column — no schema string change needed)
    this.version(4).stores({
      playbooks: '++id, name, createdAt, videoBlobId',
      scenarios: '++id, name, createdAt, updatedAt, team1RosterId, team2RosterId',
      teamRosters: '++id, teamName, createdAt',
    });
    // v5: Playbooks-as-collections. Add the playbookCollections table + a
    // playbookId index on scenarios; create a default "My Plays" and back-fill
    // every existing Play into it. Additive only — Play content is untouched.
    this.version(5).stores({
      playbooks: '++id, name, createdAt, videoBlobId',
      playbookCollections: '++id, name, createdAt',
      scenarios: '++id, name, createdAt, updatedAt, team1RosterId, team2RosterId, playbookId',
      teamRosters: '++id, teamName, createdAt',
    }).upgrade(async (tx) => {
      const now = new Date().toISOString();
      const myPlaysId = await tx.table('playbookCollections').add({
        name: 'My Plays', createdAt: now, updatedAt: now, isDefault: true,
      });
      await tx.table('scenarios').toCollection().modify((p) => {
        p.playbookId = myPlaysId;
      });
    });
    // v6: Venues. Purely additive — a new table and nothing else. Play content is
    // untouched and needs no migration: positions were always absolute metres, and
    // that meaning is unchanged by grounds becoming variable. The seeded "Standard
    // ground" is created lazily by venueStore rather than here, so the seeding rule
    // lives in one place instead of being split between a migration and a store.
    this.version(6).stores({
      playbooks: '++id, name, createdAt, videoBlobId',
      playbookCollections: '++id, name, createdAt',
      scenarios: '++id, name, createdAt, updatedAt, team1RosterId, team2RosterId, playbookId',
      teamRosters: '++id, teamName, createdAt',
      venues: '++id, name, createdAt',
    });
    // v7: delete the interchange bench. The schema is unchanged — this bump
    // exists only to rewrite Play content, stripping the four players per team
    // that stood outside the Boundary and made out of bounds report 8 forever.
    // See stripInterchangeBench above, and issue #29 for why they are deleted
    // rather than exempted.
    this.version(7).stores({
      playbooks: '++id, name, createdAt, videoBlobId',
      playbookCollections: '++id, name, createdAt',
      scenarios: '++id, name, createdAt, updatedAt, team1RosterId, team2RosterId, playbookId',
      teamRosters: '++id, teamName, createdAt',
      venues: '++id, name, createdAt',
    }).upgrade(stripInterchangeBench);
  }
}

const db = new AppDatabase();
export { db as playbookDB };
