import Dexie, { Table } from 'dexie';
import type { Player } from '../models/PlayerModel';
import type { Play, PlayPhase } from '../models/PlayModel';
import type { Playbook } from '../models/PlaybookModel';
import type { TeamRoster } from '../models/RosterModel';
import { toPhase } from '../utils/boardSnapshot';
import type { Annotation } from './annotationStore';

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
    },
    { id: 'phase-1', label: 'Phase 1' },
  );
}

class AppDatabase extends Dexie {
  /** Legacy — dead storage, retained only as the v3 migration source. */
  playbooks!: Table<LegacyPlaybook>;
  // Table name kept `scenarios` (legacy storage detail); rows are Plays.
  scenarios!: Table<Play, number>;
  teamRosters!: Table<TeamRoster, number>;
  // Playbook collections (each Play carries a playbookId → one of these).
  playbookCollections!: Table<Playbook, number>;

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
  }
}

const db = new AppDatabase();
export { db as playbookDB };
