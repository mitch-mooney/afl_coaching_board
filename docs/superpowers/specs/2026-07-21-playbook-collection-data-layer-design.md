# Playbook-collection data layer (§5b-i) — design

> **Status:** Approved design, ready for implementation plan.
> **Source:** Lean-scope decision doc §5 ("Playbook = a named collection of Plays, built via containment"). This is **§5b-i** — the data layer only. The navigation UI (Playbook library screen, `/playbook/:id`, filtering, board-button wiring) is **§5b-ii**, a separate follow-on.
> **Branch:** `lean/live-coaching-first`. Builds on §5a (Scenario→Play rename).

## Goal

Introduce the **Playbook** as a named collection of Plays, via **containment**: each Play carries exactly one `playbookId`. A default **"My Plays"** Playbook always exists so quick-save and migration are frictionless. Existing Plays migrate into "My Plays" with no data loss.

This slice delivers the **data layer** — model, Dexie v5 schema + migration, and the Playbook store — with no user-visible navigation change yet. After it, every Play has a parent Playbook and the store can manage Playbooks; the library screen still lists all Plays as before.

## Scope

### In scope
- `models/PlaybookModel.ts` — the `Playbook` entity.
- `models/PlayModel.ts` — add `playbookId?: number` to `Play`.
- `store/appDatabase.ts` — Dexie **v5**: new `playbookCollections` table, `playbookId` index on `scenarios`, and the upgrade that creates "My Plays" and back-fills existing Plays.
- `store/playbookStore.ts` — new `usePlaybookStore` with Playbook CRUD + `ensureDefaultPlaybook`.
- `store/playStore.ts` — `createPlay` gains a `playbookId` parameter.
- `hooks/usePlaybook.ts` — `saveCurrentPlay` passes a `playbookId`.
- `store/__tests__/playbookStore.test.ts` — store behaviour tests.

### Out of scope (→ §5b-ii)
- The Playbook-library landing screen, `/playbook/:id` route, filtering the Play library by playbook, and wiring the board's dead "📚 Playbooks" button.
- Whole-Playbook sharing and "duplicate Play into another Playbook" (deferred per the decision doc).

## Data model

```ts
// models/PlaybookModel.ts
export interface Playbook {
  id?: number;          // Dexie auto-increment PK
  name: string;
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
  isDefault?: boolean;  // true for the un-deletable "My Plays"
}
```

```ts
// models/PlayModel.ts — Play gains:
playbookId?: number;    // FK → Playbook.id; always set post-migration
```

`playbookId` is optional in the type (defensive — old code paths and the brief window before `ensureDefaultPlaybook` runs), but every Play has one in practice.

## Dexie v5 (appDatabase.ts)

Add a class field and a version 5. The legacy `playbooks` table and `teamRosters` are carried through unchanged; `scenarios` gains an indexed `playbookId`.

```ts
playbookCollections!: Table<Playbook, number>;

// in constructor, after v4:
this.version(5).stores({
  playbooks: '++id, name, createdAt, videoBlobId',                       // legacy, unchanged
  playbookCollections: '++id, name, createdAt',                          // NEW
  scenarios: '++id, name, createdAt, updatedAt, team1RosterId, team2RosterId, playbookId', // + playbookId
  teamRosters: '++id, teamName, createdAt',
}).upgrade(async (tx) => {
  const now = new Date().toISOString();
  const myPlaysId = await tx.table('playbookCollections').add({
    name: 'My Plays', createdAt: now, updatedAt: now, isDefault: true,
  });
  await tx.table('scenarios').toCollection().modify((p) => { p.playbookId = myPlaysId; });
});
```

**Migration safety:** the upgrade only adds a collection and stamps a `playbookId` onto existing Plays — it never deletes or rewrites Play content. `AFLPlaybookDB` name and v1–v4 are unchanged.

## Fresh-install safety

Fresh databases open directly at v5 and do **not** run `.upgrade()`, so they have no "My Plays". `ensureDefaultPlaybook()` closes that gap:

```
ensureDefaultPlaybook(): Promise<number>
  - find a collection with isDefault === true (fallback: name === 'My Plays')
  - if found, return its id
  - else create { name: 'My Plays', isDefault: true, createdAt/updatedAt: now } and return the new id
  - idempotent: concurrent/repeat calls converge on one default
```

Called on app load (in §5b-ii the Playbook library calls it; for §5b-i it's exercised by `saveCurrentPlay` and tests).

## Store — store/playbookStore.ts

`usePlaybookStore` (the name is free again — the legacy `usePlaybookStore` was deleted in §1.8):

```
state:
  playbooks: Playbook[]
  activePlaybookId: number | null

export const playbookTable = playbookDB.playbookCollections;

actions:
  loadPlaybooks(): Promise<void>                      // order by createdAt
  ensureDefaultPlaybook(): Promise<number>            // see above
  createPlaybook(name: string): Promise<number>       // returns new id
  renamePlaybook(id: number, name: string): Promise<void>
  deletePlaybook(id: number): Promise<void>           // see delete rule
  setActivePlaybook(id: number | null): void
```

**Delete rule:** `deletePlaybook(id)` first checks the target's `isDefault`; if true it is a no-op (the "My Plays" safety net can't be deleted). Otherwise it **reassigns** every Play with that `playbookId` to the default Playbook (via `playTable.where('playbookId').equals(id).modify(...)`), then deletes the Playbook. No Play is ever lost.

## Play integration

- `playStore.createPlay(name: string, playbookId: number): Promise<number>` — the new required `playbookId` is written onto the created Play.
- `hooks/usePlaybook.ts` `saveCurrentPlay(name)` — resolves a target Playbook (`usePlaybookStore.getState().activePlaybookId ?? await ensureDefaultPlaybook()`) and passes it to `createPlay`.

`loadPlays` is unchanged in this slice (still lists all Plays); filtering by Playbook arrives with the navigation in §5b-ii.

## Verification

- `npx tsc --noEmit` clean; `npm run build` green.
- `store/__tests__/playbookStore.test.ts` (run as a single file — full suite OOMs on Windows) covering:
  - `ensureDefaultPlaybook` creates "My Plays" once and is idempotent (second call returns the same id, no duplicate).
  - `createPlaybook` persists and `loadPlaybooks` returns it.
  - `renamePlaybook` updates the name and bumps `updatedAt`.
  - `deletePlaybook` on a normal Playbook reassigns its Plays to the default and removes the Playbook.
  - `deletePlaybook` on the default (`isDefault`) is a no-op.
- Runtime smoke: reload the app; confirm (via the store on `window` or console) that a "My Plays" collection exists and every existing Play has a `playbookId` pointing at it; creating a Play still works and lands in "My Plays". No console errors; the existing Play library still renders.

## Risks & mitigations

- **Dexie upgrade correctness** (the one irreversible-ish step). Mitigation: the upgrade only *adds* — a collection row and a `playbookId` field; it never mutates Play content, so a mistake can't corrupt saved boards. Verified at runtime against the real existing DB before committing.
- **Fresh installs missing the default.** Mitigation: `ensureDefaultPlaybook()` on load + before any `createPlay`.
- **Duplicate defaults** (e.g. upgrade ran AND ensureDefault ran). Mitigation: `ensureDefaultPlaybook` looks up an existing default first and only creates when none exists.
- **`createPlay` signature change** ripples to callers. Mitigation: tsc enumerates every caller (only `usePlaybook` and tests today).
