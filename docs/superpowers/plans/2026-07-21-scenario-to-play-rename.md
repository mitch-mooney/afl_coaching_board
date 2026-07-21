# Scenario → Play Rename (§5a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the `Scenario` domain concept to `Play` across all TypeScript, files, UI copy, and the board route — a pure mechanical rename with no behaviour change and no data migration.

**Architecture:** A rename breaks compilation until complete, so the sweep is **tsc-driven**: rename the definitions (types, store, DB type), then let `tsc --noEmit` enumerate every broken consumer and fix each per the rename map below. The IndexedDB table keeps its name `scenarios`; only code, file names, UI strings, and the client route change. Old `/scenario/:id` links get a back-compat redirect.

**Tech Stack:** React + TypeScript, Zustand stores, Dexie (IndexedDB), react-router-dom, Vite, Vitest.

## Global Constraints

- **Do NOT rename the Dexie table.** The table stays `db.scenarios`; the schema strings in `appDatabase.ts` (v1–v4) and the `tx.table('scenarios')` migration call are unchanged. `playTable` points at `db.scenarios`.
- **Do NOT touch** the IndexedDB name `AFLPlaybookDB`, the cloud `shared_playbooks` table / `playbook_data` column, or the `playbookDB` export name.
- Use `git mv` for file renames so history is tracked.
- Gate: `npx tsc --noEmit` clean AND `npm run build` green before each commit. The full test suite OOMs on Windows — run renamed test files individually, never the whole suite.
- Deliberate identifier renames only — no blind global find-replace (the retained `scenarios` table name and `shared_playbooks` must survive).

---

## Rename Map (authoritative — every identifier)

**Types** (`models/ScenarioModel.ts` → `models/PlayModel.ts`):
- `Scenario` → `Play`
- `ScenarioPhase` → `PlayPhase`
- `LinkedVideoMoment` → unchanged

**Store** (`store/scenarioStore.ts` → `store/playStore.ts`):
- `useScenarioStore` → `usePlayStore`
- `ScenarioState` (interface) → `PlayState`
- `scenarioTable` → `playTable`  (value stays `playbookDB.scenarios`)
- state `scenarios` → `plays`
- state `activeScenarioId` → `activePlayId`
- `loadScenarios` → `loadPlays`
- `createScenario` → `createPlay`
- `updateScenario` → `updatePlay`
- `deleteScenario` → `deletePlay`
- `setActiveScenario` → `setActivePlay`
- log prefix `[scenarioStore]` → `[playStore]`

**DB type** (`store/appDatabase.ts`):
- `scenarios!: Table<Scenario, number>` → `scenarios!: Table<Play, number>` (property/table name `scenarios` KEPT; only the generic type arg changes; import `Play` from `../models/PlayModel`)

**Save handler** (`hooks/usePlaybook.ts` + `components/UI/Toolbar.tsx`):
- `saveCurrentScenario` → `saveCurrentPlay`

**Video link handler** (`components/VideoImport/VideoWorkspace.tsx`):
- `handleLinkToScenario` → `handleLinkToPlay`

**Library component** (`components/UI/ScenarioLibrary.tsx` → `components/UI/PlayLibrary.tsx`):
- `ScenarioLibrary` → `PlayLibrary`

**Route** (`App.tsx` + all `navigate(...)` calls):
- `/scenario/:id` → `/play/:id`; `/scenario/${id}` → `/play/${id}`

**UI copy** (case-preserving): "Scenario" → "Play", "Scenarios" → "Plays", "New Scenario" → "New Play". Locations: `PlayLibrary.tsx`, `HelpScreen.tsx`, `OnboardingTour.tsx`, and any button/label text.

**Local variables** derived from the above (e.g. `activeScenario`, `selectedScenarioId`, `scenario` loop vars) → the `Play` equivalent, wherever tsc or grep surfaces them.

---

## Task 1: The rename sweep

**Files:**
- Rename: `src/models/ScenarioModel.ts` → `src/models/PlayModel.ts`
- Rename: `src/store/scenarioStore.ts` → `src/store/playStore.ts`
- Rename: `src/components/UI/ScenarioLibrary.tsx` → `src/components/UI/PlayLibrary.tsx`
- Rename: `src/store/__tests__/scenarioStore.test.ts` → `src/store/__tests__/playStore.test.ts`
- Rename: `src/models/__tests__/ScenarioModel.test.ts` → `src/models/__tests__/PlayModel.test.ts`
- Modify: `src/store/appDatabase.ts`, `src/components/Layout/MainLayout.tsx`, `src/components/UI/Toolbar.tsx`, `src/hooks/usePlaybook.ts`, `src/store/videoStore.ts`, `src/components/VideoImport/VideoWorkspace.tsx`, `src/components/UI/HelpScreen.tsx`, `src/components/UI/OnboardingTour.tsx`, `src/App.tsx`

**Interfaces:**
- Produces: `usePlayStore` (hook) with `plays`, `activePlayId`, `loadPlays()`, `createPlay(name: string): Promise<number>`, `updatePlay(id: number, patch: Partial<Play>): Promise<void>`, `deletePlay(id: number): Promise<void>`, `setActivePlay(id: number | null)`; `playTable` (Dexie `Table<Play, number>`); types `Play`, `PlayPhase` from `models/PlayModel`; `usePlaybook()` returning `{ saveCurrentPlay }`; `PlayLibrary` component; route `/play/:id`.

- [ ] **Step 1: Rename the five files with git mv**

```bash
git mv src/models/ScenarioModel.ts src/models/PlayModel.ts
git mv src/store/scenarioStore.ts src/store/playStore.ts
git mv src/components/UI/ScenarioLibrary.tsx src/components/UI/PlayLibrary.tsx
git mv src/store/__tests__/scenarioStore.test.ts src/store/__tests__/playStore.test.ts
git mv src/models/__tests__/ScenarioModel.test.ts src/models/__tests__/PlayModel.test.ts
```

- [ ] **Step 2: Rename symbols inside the moved definition files**

In `src/models/PlayModel.ts`: `Scenario` → `Play`, `ScenarioPhase` → `PlayPhase` (interface names + any internal refs; keep `LinkedVideoMoment`).

In `src/store/playStore.ts`: apply the full **Store** section of the rename map (hook, interface, `playTable`, state fields, all five actions, log prefix). Update its import `import type { Scenario } from '../models/ScenarioModel'` → `import type { Play } from '../models/PlayModel'` and `import { playbookDB } from './appDatabase'` (unchanged path). `playTable` value stays `playbookDB.scenarios`.

In `src/components/UI/PlayLibrary.tsx`: rename the component `ScenarioLibrary` → `PlayLibrary`; switch `useScenarioStore`→`usePlayStore` and the action/state names; change `navigate('/scenario/${id}')` → `navigate('/play/${id}')`; UI copy "Scenarios"→"Plays", "New Scenario"→"New Play".

- [ ] **Step 3: Update the DB type**

In `src/store/appDatabase.ts`: change `import type { Scenario }` → `import type { Play } from '../models/PlayModel'` and `scenarios!: Table<Scenario, number>` → `scenarios!: Table<Play, number>`. Leave the `.version(...).stores({...})` schema strings and the `tx.table('scenarios')` migration exactly as-is.

- [ ] **Step 4: Run tsc and fix every reported consumer**

Run: `npx tsc --noEmit 2>&1 | grep -v "npm notice"`
Expected initially: FAIL — errors in `MainLayout.tsx`, `Toolbar.tsx`, `usePlaybook.ts`, `videoStore.ts`, `VideoWorkspace.tsx`, `App.tsx` (missing `useScenarioStore`, `Scenario`, `scenarioTable`, etc.).

Fix each error per the rename map:
- `MainLayout.tsx`: `useScenarioStore`→`usePlayStore`, `scenarioTable`→`playTable`, `Scenario`/`ScenarioPhase` type refs → `Play`/`PlayPhase`, `activeScenarioId`→`activePlayId`, `setActiveScenario`→`setActivePlay`, `updateScenario`→`updatePlay`, `scenarios`→`plays`, local `activeScenario`→`activePlay`. (The `useParams` `id` and the `?loadShared` logic are unchanged.)
- `Toolbar.tsx`: `saveCurrentScenario`→`saveCurrentPlay`.
- `usePlaybook.ts`: `useScenarioStore`→`usePlayStore`, `createScenario`→`createPlay`, `updateScenario`→`updatePlay`, export `saveCurrentScenario`→`saveCurrentPlay`; fix the `Play (Scenario)` comment wording.
- `videoStore.ts`: rename the two `Scenario`/`scenario` references per context (type import and/or field).
- `VideoWorkspace.tsx`: `handleLinkToScenario`→`handleLinkToPlay` and any `Scenario` refs/imports.
- `App.tsx`: `import { ScenarioLibrary }` → `import { PlayLibrary } from './components/UI/PlayLibrary'`; route element `ScenarioLibrary`→`PlayLibrary`; path `/scenario/:id`→`/play/:id`.

Re-run `npx tsc --noEmit` until it reports **zero errors**.

- [ ] **Step 5: Update UI copy in Help / Onboarding**

In `src/components/UI/HelpScreen.tsx` and `src/components/UI/OnboardingTour.tsx`: replace user-visible "scenario"/"Scenario"/"Scenarios" copy with the "play"/"Play"/"Plays" equivalent (case-preserving). These are strings, not identifiers — tsc won't flag them, so edit them explicitly.

- [ ] **Step 6: Update the two renamed test files**

In `src/store/__tests__/playStore.test.ts`: `useScenarioStore`→`usePlayStore`, `createScenario`→`createPlay`, `loadScenarios`→`loadPlays`, `scenarioTable`→`playTable`, and any `Scenario` type import → `Play`.
In `src/models/__tests__/PlayModel.test.ts`: `Scenario`→`Play`, `ScenarioPhase`→`PlayPhase`, import path → `../PlayModel`.

- [ ] **Step 7: Run tsc + build + the renamed tests**

Run: `npx tsc --noEmit 2>&1 | grep -v "npm notice" | grep -iE "error" ; echo done`
Expected: no `error` lines.

Run: `npx vitest run src/store/__tests__/playStore.test.ts src/models/__tests__/PlayModel.test.ts 2>&1 | tail -8`
Expected: all tests PASS.

Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3`
Expected: `built in …` with no error lines.

- [ ] **Step 8: Confirm only intended "scenario" survivors remain**

Run: `grep -rniE "scenario" src/ | grep -viE "scenarios('|\")|tx.table\('scenarios'\)|table.*scenarios|legacy" | grep -vi "shared_playbooks"`
Expected: only the `appDatabase.ts` Dexie table name `scenarios` (in the schema strings / migration) and its explanatory comments. Any other hit is a missed rename — fix it and re-run Step 7.

- [ ] **Step 9: Runtime smoke test**

Reload the app at `/` (Play library). Confirm: the library header reads "Plays", existing Plays list, "New Play" creates one, clicking a Play navigates to `/play/:id` and loads the board, and the board still functions (drag a player, it persists). Watch the console for new errors.

- [ ] **Step 10: Commit**

```bash
git add -A -- src/
git commit -m "lean: rename Scenario → Play across code, UI, and route (§5a)"
```

---

## Task 2: Back-compat redirect for old `/scenario/:id` links

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: route `/play/:id` from Task 1.

- [ ] **Step 1: Add a redirect route**

In `src/App.tsx`, add a small redirect component and route so old links resolve. Add above the `/play/:id` route:

```tsx
function ScenarioRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/play/${id ?? ''}`} replace />;
}
```

```tsx
<Route path="/scenario/:id" element={<ScenarioRedirect />} />
```

Ensure `useParams` is imported from `react-router-dom` (add to the existing import).

- [ ] **Step 2: Run tsc + build**

Run: `npx tsc --noEmit 2>&1 | grep -iE "error" ; echo done`
Expected: no `error` lines.
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3`
Expected: `built in …`.

- [ ] **Step 3: Runtime smoke — old URL redirects**

Navigate the browser to `/scenario/1`. Confirm the URL becomes `/play/1` and the board loads.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "lean: redirect legacy /scenario/:id to /play/:id (§5a)"
```

---

## Self-Review

**Spec coverage:**
- Rename types/model → Task 1 Steps 1-2. ✓
- Rename store → Task 1 Steps 1-2, 4. ✓
- DB type change, table name kept → Task 1 Step 3 + Global Constraints. ✓
- Library component + UI strings → Task 1 Steps 2, 5. ✓
- Route `/play/:id` + redirect → Task 1 Step 4 (route), Task 2 (redirect). ✓
- Consumers (MainLayout/Toolbar/videoStore/VideoWorkspace/HelpScreen/OnboardingTour/usePlaybook) → Task 1 Steps 4-5. ✓
- Tests renamed → Task 1 Step 6. ✓
- Out-of-scope survivors (table name, shared_playbooks, playbookDB) → Global Constraints + Step 8 grep. ✓
- Data safety (no migration) → Global Constraints (no schema change). ✓
- Verification (tsc/build/tests/runtime/grep) → Task 1 Steps 7-9, Task 2 Steps 2-3. ✓

**Placeholder scan:** No TBD/TODO; every step names exact identifiers, commands, and expected output. ✓

**Type consistency:** `usePlayStore` / `playTable` / `Play` / `PlayPhase` / `createPlay` / `updatePlay` / `deletePlay` / `setActivePlay` / `saveCurrentPlay` / `handleLinkToPlay` / `PlayLibrary` used identically in the map, the Interfaces blocks, and every step. ✓
