# Playbook-collection Data Layer (§5b-i) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a `Playbook` entity that owns Plays via a `playbookId` containment FK, with a Dexie v5 migration that creates a default "My Plays" and back-fills existing Plays into it.

**Architecture:** A new `playbookCollections` Dexie table stores Playbooks; `scenarios` (the Plays table) gains an indexed `playbookId`. A `usePlaybookStore` manages Playbook CRUD, with `ensureDefaultPlaybook()` covering fresh installs (which skip the v5 upgrade). `createPlay` gains a required `playbookId`. No navigation/UI change in this slice.

**Tech Stack:** TypeScript, Zustand, Dexie (IndexedDB), Vitest + fake-indexeddb.

## Global Constraints

- **Additive migration only.** The v5 `.upgrade()` creates a Playbook row and stamps `playbookId` onto existing Plays; it MUST NOT delete or rewrite Play content. Keep `AFLPlaybookDB` name and v1–v4 exactly as-is.
- The legacy `playbooks` table stays untouched (still dead, still the v3 migration source). The new table is `playbookCollections`.
- The `scenarios` Dexie table name is retained (a Play is stored there — decided in §5a).
- Gate: `npx tsc --noEmit` clean AND `npm run build` green before each commit. Full test suite OOMs on Windows — run new/changed test files individually.
- Tests use the real `playbookDB` (fake-indexeddb is loaded globally via `src/test/setup.ts`); clear the relevant tables in `beforeEach`.

---

## Task 1: Playbook model + `playbookId` on Play

**Files:**
- Create: `src/models/PlaybookModel.ts`
- Modify: `src/models/PlayModel.ts`
- Test: `src/models/__tests__/PlaybookModel.test.ts`

**Interfaces:**
- Produces: `Playbook { id?: number; name: string; createdAt: string; updatedAt: string; isDefault?: boolean }`; `Play.playbookId?: number`.

- [ ] **Step 1: Write the failing test**

Create `src/models/__tests__/PlaybookModel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Playbook } from '../PlaybookModel';

describe('PlaybookModel', () => {
  it('Playbook has required fields and an optional default flag', () => {
    const now = new Date().toISOString();
    const p: Playbook = { name: 'My Plays', createdAt: now, updatedAt: now, isDefault: true };
    expect(p.name).toBe('My Plays');
    expect(p.isDefault).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/models/__tests__/PlaybookModel.test.ts 2>&1 | tail -6`
Expected: FAIL — cannot find module `../PlaybookModel`.

- [ ] **Step 3: Create the model**

Create `src/models/PlaybookModel.ts`:

```ts
/**
 * PlaybookModel - a Playbook is a named collection of Plays (containment:
 * each Play carries one playbookId). "My Plays" is the un-deletable default.
 */
export interface Playbook {
  id?: number;          // Dexie auto-increment PK
  name: string;
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
  isDefault?: boolean;  // true for the un-deletable "My Plays"
}
```

- [ ] **Step 4: Add `playbookId` to Play**

In `src/models/PlayModel.ts`, inside `export interface Play`, add after `linkedVideoMoment?: LinkedVideoMoment;`:

```ts
  playbookId?: number;          // FK → Playbook.id; always set post-migration
```

- [ ] **Step 5: Run test + tsc to verify pass**

Run: `npx vitest run src/models/__tests__/PlaybookModel.test.ts 2>&1 | tail -6`
Expected: PASS.
Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done`
Expected: no error lines.

- [ ] **Step 6: Commit**

```bash
git add src/models/PlaybookModel.ts src/models/PlayModel.ts src/models/__tests__/PlaybookModel.test.ts
git commit -m "feat: add Playbook model + playbookId on Play (§5b-i)"
```

---

## Task 2: Dexie v5 — `playbookCollections` table, `playbookId` index, migration

**Files:**
- Modify: `src/store/appDatabase.ts`

**Interfaces:**
- Consumes: `Playbook` (Task 1).
- Produces: `playbookDB.playbookCollections` (Dexie `Table<Playbook, number>`); the `scenarios` table now has a `playbookId` index; existing DBs upgrade to a "My Plays" default with all Plays back-filled.

- [ ] **Step 1: Import Playbook and declare the table field**

In `src/store/appDatabase.ts`, add after the `Play` import:

```ts
import type { Playbook } from '../models/PlaybookModel';
```

Inside the `AppDatabase` class, after `scenarios!: Table<Play, number>;`, add:

```ts
  playbookCollections!: Table<Playbook, number>;
```

- [ ] **Step 2: Add version 5 with the migration**

In the constructor, after the existing `this.version(4)...` block, add:

```ts
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
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done`
Expected: no error lines.
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3`
Expected: `built in …`.

- [ ] **Step 4: Runtime — verify the migration on the real DB**

Reload the app in the browser (the dev server is running). In the console, confirm the upgrade ran against existing data:

```js
const db = (await import('/src/store/appDatabase.ts')).playbookDB;
const books = await db.playbookCollections.toArray();
const plays = await db.scenarios.toArray();
JSON.stringify({
  books: books.map(b => ({ id: b.id, name: b.name, isDefault: b.isDefault })),
  playsWithoutPlaybook: plays.filter(p => p.playbookId == null).length,
  sample: plays.slice(0,3).map(p => ({ name: p.name, playbookId: p.playbookId })),
});
```

Expected: exactly one book `{ name: 'My Plays', isDefault: true }`, `playsWithoutPlaybook: 0`, and each sample Play's `playbookId` equals the "My Plays" id. Watch for Dexie `VersionError`/upgrade errors — there should be none.

- [ ] **Step 5: Commit**

```bash
git add src/store/appDatabase.ts
git commit -m "feat: Dexie v5 — playbookCollections table + playbookId, migrate Plays into 'My Plays' (§5b-i)"
```

---

## Task 3: `usePlaybookStore` with Playbook CRUD

**Files:**
- Create: `src/store/playbookStore.ts`
- Test: `src/store/__tests__/playbookStore.test.ts`

**Interfaces:**
- Consumes: `playbookDB.playbookCollections` + `playbookDB.scenarios` (Task 2), `Playbook` (Task 1).
- Produces: `usePlaybookStore` with state `playbooks: Playbook[]`, `activePlaybookId: number | null` and actions `loadPlaybooks()`, `ensureDefaultPlaybook(): Promise<number>`, `createPlaybook(name: string): Promise<number>`, `renamePlaybook(id: number, name: string): Promise<void>`, `deletePlaybook(id: number): Promise<void>`, `setActivePlaybook(id: number | null)`; plus `export const playbookTable`.

- [ ] **Step 1: Write the failing tests**

Create `src/store/__tests__/playbookStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { usePlaybookStore, playbookTable } from '../playbookStore';
import { playbookDB } from '../appDatabase';

beforeEach(async () => {
  await playbookTable.clear();
  await playbookDB.scenarios.clear();
  usePlaybookStore.setState({ playbooks: [], activePlaybookId: null });
});

describe('playbookStore', () => {
  it('ensureDefaultPlaybook creates "My Plays" once and is idempotent', async () => {
    const { ensureDefaultPlaybook } = usePlaybookStore.getState();
    const id1 = await ensureDefaultPlaybook();
    const id2 = await ensureDefaultPlaybook();
    expect(id1).toBe(id2);
    const all = await playbookTable.toArray();
    expect(all.filter((p) => p.isDefault)).toHaveLength(1);
    expect(all[0].name).toBe('My Plays');
  });

  it('createPlaybook persists and loadPlaybooks returns it', async () => {
    const { createPlaybook, loadPlaybooks } = usePlaybookStore.getState();
    const id = await createPlaybook('Set Plays');
    await loadPlaybooks();
    expect(usePlaybookStore.getState().playbooks.find((p) => p.id === id)?.name).toBe('Set Plays');
  });

  it('renamePlaybook updates name and updatedAt', async () => {
    const { createPlaybook, renamePlaybook } = usePlaybookStore.getState();
    const id = await createPlaybook('Original');
    const before = (await playbookTable.get(id))!.updatedAt;
    await renamePlaybook(id, 'Renamed');
    const after = await playbookTable.get(id);
    expect(after!.name).toBe('Renamed');
    expect(after!.updatedAt).not.toBe(before);
  });

  it('deletePlaybook reassigns its Plays to the default', async () => {
    const { createPlaybook, ensureDefaultPlaybook, deletePlaybook } = usePlaybookStore.getState();
    const defaultId = await ensureDefaultPlaybook();
    const bookId = await createPlaybook('Temp');
    const now = new Date().toISOString();
    const playId = await playbookDB.scenarios.add({
      name: 'P', createdAt: now, updatedAt: now,
      team1RosterId: null, team2RosterId: null, phases: [], playbookId: bookId,
    });
    await deletePlaybook(bookId);
    expect(await playbookTable.get(bookId)).toBeUndefined();
    expect((await playbookDB.scenarios.get(playId))!.playbookId).toBe(defaultId);
  });

  it('deletePlaybook on the default is a no-op', async () => {
    const { ensureDefaultPlaybook, deletePlaybook } = usePlaybookStore.getState();
    const defaultId = await ensureDefaultPlaybook();
    await deletePlaybook(defaultId);
    expect(await playbookTable.get(defaultId)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/__tests__/playbookStore.test.ts 2>&1 | tail -6`
Expected: FAIL — cannot find module `../playbookStore`.

- [ ] **Step 3: Implement the store**

Create `src/store/playbookStore.ts`:

```ts
import { create } from 'zustand';
import { playbookDB } from './appDatabase';
import type { Playbook } from '../models/PlaybookModel';

// The Playbook collection table (distinct from the legacy dead `playbooks` table).
export const playbookTable = playbookDB.playbookCollections;

interface PlaybookState {
  playbooks: Playbook[];
  activePlaybookId: number | null;
  loadPlaybooks: () => Promise<void>;
  ensureDefaultPlaybook: () => Promise<number>;
  createPlaybook: (name: string) => Promise<number>;
  renamePlaybook: (id: number, name: string) => Promise<void>;
  deletePlaybook: (id: number) => Promise<void>;
  setActivePlaybook: (id: number | null) => void;
}

export const usePlaybookStore = create<PlaybookState>((set, get) => ({
  playbooks: [],
  activePlaybookId: null,

  loadPlaybooks: async () => {
    try {
      const playbooks = await playbookTable.orderBy('createdAt').toArray();
      set({ playbooks });
    } catch (err) {
      console.error('[playbookStore] loadPlaybooks failed', err);
    }
  },

  ensureDefaultPlaybook: async () => {
    const all = await playbookTable.toArray();
    const existing = all.find((p) => p.isDefault) ?? all.find((p) => p.name === 'My Plays');
    if (existing?.id != null) return existing.id;
    const now = new Date().toISOString();
    const id = (await playbookTable.add({
      name: 'My Plays', isDefault: true, createdAt: now, updatedAt: now,
    })) as number;
    await get().loadPlaybooks();
    return id;
  },

  createPlaybook: async (name) => {
    const now = new Date().toISOString();
    const id = (await playbookTable.add({ name, createdAt: now, updatedAt: now })) as number;
    await get().loadPlaybooks();
    return id;
  },

  renamePlaybook: async (id, name) => {
    await playbookTable.update(id, { name, updatedAt: new Date().toISOString() });
    await get().loadPlaybooks();
  },

  deletePlaybook: async (id) => {
    const target = await playbookTable.get(id);
    if (!target || target.isDefault) return; // never delete the "My Plays" safety net
    const defaultId = await get().ensureDefaultPlaybook();
    // Reassign this Playbook's Plays to the default (requires the playbookId index).
    await playbookDB.scenarios.where('playbookId').equals(id).modify({ playbookId: defaultId });
    await playbookTable.delete(id);
    if (get().activePlaybookId === id) set({ activePlaybookId: null });
    await get().loadPlaybooks();
  },

  setActivePlaybook: (id) => set({ activePlaybookId: id }),
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/__tests__/playbookStore.test.ts 2>&1 | tail -8`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/playbookStore.ts src/store/__tests__/playbookStore.test.ts
git commit -m "feat: usePlaybookStore — Playbook CRUD + ensureDefaultPlaybook (§5b-i)"
```

---

## Task 4: Wire `playbookId` into Play creation

**Files:**
- Modify: `src/store/playStore.ts`, `src/hooks/usePlaybook.ts`, `src/components/UI/PlayLibrary.tsx`
- Test: `src/store/__tests__/playStore.test.ts`

**Interfaces:**
- Consumes: `usePlaybookStore.ensureDefaultPlaybook` / `activePlaybookId` (Task 3).
- Produces: `createPlay(name: string, playbookId: number): Promise<number>`.

- [ ] **Step 1: Update the failing test first**

In `src/store/__tests__/playStore.test.ts`, update every `createPlay('X')` call to pass a playbook id, e.g. `createPlay('Test Play', 1)`. Concretely, change each of these calls to add `, 1` as the second argument: the calls in "creates a play", "updates a play" (`createPlay('Original', 1)`), "deletes a play" (`createPlay('To Delete', 1)`), "clears activePlayId…" (`createPlay('Active', 1)`), and "loads plays from DB" (`createPlay('Persisted', 1)`). Also assert the id is stored — add to the first test after the existing asserts:

```ts
    expect(all[0].playbookId).toBe(1);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/playStore.test.ts 2>&1 | tail -8`
Expected: FAIL — `createPlay` expects 2 args / `playbookId` is undefined on the stored Play (depending on tsc vs runtime; a type error or the new assertion failing).

- [ ] **Step 3: Add the `playbookId` parameter to `createPlay`**

In `src/store/playStore.ts`, change the `PlayState` signature:

```ts
  createPlay: (name: string, playbookId: number) => Promise<number>;
```

and the implementation:

```ts
  createPlay: async (name, playbookId) => {
    try {
      const now = new Date().toISOString();
      const id = await playTable.add({
        name,
        createdAt: now,
        updatedAt: now,
        team1RosterId: null,
        team2RosterId: null,
        phases: [],
        playbookId,
      });
      await get().loadPlays();
      return id as number;
    } catch (err) {
      console.error('[playStore] createPlay failed', err);
      throw err;
    }
  },
```

- [ ] **Step 4: Resolve a playbookId in the two callers**

In `src/hooks/usePlaybook.ts`, add the import and resolve the target Playbook inside `saveCurrentPlay`:

```ts
import { usePlaybookStore } from '../store/playbookStore';
```

Change the body of `saveCurrentPlay` so the first line becomes:

```ts
      const playbookId =
        usePlaybookStore.getState().activePlaybookId ??
        (await usePlaybookStore.getState().ensureDefaultPlaybook());
      const id = await createPlay(name, playbookId);
```

(Leave the rest — the `updatePlay(id, { phases: [...] })` call and the return — unchanged.)

In `src/components/UI/PlayLibrary.tsx`, add the import:

```ts
import { usePlaybookStore } from '../../store/playbookStore';
```

and change `handleNew`:

```ts
  const handleNew = async () => {
    const playbookId = await usePlaybookStore.getState().ensureDefaultPlaybook();
    const id = await createPlay('New Play', playbookId);
    navigate(`/play/${id}`);
  };
```

- [ ] **Step 5: Run tests + tsc + build**

Run: `npx vitest run src/store/__tests__/playStore.test.ts src/store/__tests__/playbookStore.test.ts 2>&1 | tail -8`
Expected: all PASS.
Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done`
Expected: no error lines.
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3`
Expected: `built in …`.

- [ ] **Step 6: Runtime smoke**

Reload the app. Create a new Play via "New Play"; confirm it opens the board (`/play/:id`). In the console, confirm the new Play has a `playbookId` matching "My Plays":

```js
const db = (await import('/src/store/appDatabase.ts')).playbookDB;
const plays = await db.scenarios.orderBy('createdAt').reverse().toArray();
const books = await db.playbookCollections.toArray();
JSON.stringify({ newest: plays[0] && { name: plays[0].name, playbookId: plays[0].playbookId }, myPlaysId: books.find(b => b.isDefault)?.id });
```

Expected: `newest.playbookId === myPlaysId`. No console errors.

- [ ] **Step 7: Commit**

```bash
git add src/store/playStore.ts src/hooks/usePlaybook.ts src/components/UI/PlayLibrary.tsx src/store/__tests__/playStore.test.ts
git commit -m "feat: create Plays inside a Playbook (createPlay playbookId) (§5b-i)"
```

---

## Self-Review

**Spec coverage:**
- Playbook entity → Task 1. ✓
- `playbookId` on Play → Task 1. ✓
- Dexie v5 table + index + migration → Task 2. ✓
- `ensureDefaultPlaybook` (fresh-install safety) → Task 3. ✓
- Playbook store CRUD + delete-reassign + default-undeletable → Task 3 (impl + 5 tests). ✓
- `createPlay(name, playbookId)` + `saveCurrentPlay` integration → Task 4. ✓
- Migration runtime verification → Task 2 Step 4; creation runtime smoke → Task 4 Step 6. ✓
- Out-of-scope nav (library screen / routing / filtering / board button) → not present. ✓

**Placeholder scan:** No TBD/TODO; every step has concrete code, commands, and expected output. ✓

**Type consistency:** `usePlaybookStore` / `playbookTable` / `Playbook` / `ensureDefaultPlaybook` / `createPlaybook` / `renamePlaybook` / `deletePlaybook` / `playbookId` / `createPlay(name, playbookId)` used identically across the Interfaces blocks, the store impl, and every caller (usePlaybook, PlayLibrary, tests). ✓
