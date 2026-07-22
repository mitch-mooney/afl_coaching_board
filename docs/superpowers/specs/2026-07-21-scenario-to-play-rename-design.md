# Scenario → Play rename (§5a) — design

> **Status:** Approved design, ready for implementation plan.
> **Source:** Lean-scope decision doc §5 ("Play / Playbook" ubiquitous language). This is **§5a** — the mechanical rename only. The net-new Playbook-as-collection model (§5b) is a separate follow-on effort.
> **Branch:** `lean/live-coaching-first`.

## Goal

Land the **Play** ubiquitous language across the code and UI. Today's `Scenario` — the individual saved board (positions, paths, annotations, camera, phases, `linkedVideoMoment`, roster FKs) — becomes `Play`.

This is a **pure mechanical rename**: no behaviour change, no data migration, no new features. A user should see identical behaviour afterwards, except the word "Scenario" is replaced by "Play" in the UI and the board URL is `/play/:id`.

## Scope

### In scope — renamed

| Layer | From → To |
|---|---|
| Model file | `src/models/ScenarioModel.ts` → `src/models/PlayModel.ts` |
| Model types | `Scenario` → `Play`; `ScenarioPhase` → `PlayPhase` (`LinkedVideoMoment` unchanged) |
| Store file | `src/store/scenarioStore.ts` → `src/store/playStore.ts` |
| Store hook | `useScenarioStore` → `usePlayStore` |
| Store actions | `loadScenarios`→`loadPlays`, `createScenario`→`createPlay`, `updateScenario`→`updatePlay`, `deleteScenario`→`deletePlay`, `setActiveScenario`→`setActivePlay` |
| Store state | `scenarios`→`plays`, `activeScenarioId`→`activePlayId` |
| Table handle export | `scenarioTable` → `playTable` (still references `db.scenarios`) |
| DB type | `appDatabase.ts`: `scenarios!: Table<Scenario, number>` → `Table<Play, number>` (table **name** kept `scenarios`) |
| Library component | `src/components/UI/ScenarioLibrary.tsx` → `PlayLibrary.tsx` |
| UI strings | "Scenario"/"Scenarios" → "Play"/"Plays"; "New Scenario" → "New Play" |
| Route | `/scenario/:id` → `/play/:id`, **plus** a redirect route from `/scenario/:id` → `/play/:id` for existing links/bookmarks |
| Consumers (refs, imports, local vars, handlers) | `MainLayout.tsx`, `Toolbar.tsx`, `videoStore.ts`, `VideoWorkspace.tsx` (`handleLinkToScenario`→`handleLinkToPlay`), `HelpScreen.tsx`, `OnboardingTour.tsx`, `usePlaybook.ts` |
| Tests | `store/__tests__/scenarioStore.test.ts` → `playStore.test.ts`; `models/__tests__/ScenarioModel.test.ts` → `PlayModel.test.ts` (+ any `useGestures.test.ts` incidental references) |

### Out of scope — deliberately NOT renamed

- **Dexie table `scenarios`** and the IndexedDB name **`AFLPlaybookDB`** — a storage detail users never see. Renaming the table would require a v5 migration with real data risk; we just preserved the DB byte-identical in §1.8. The `scenarios` table keeps its name and is documented as a legacy storage name; `playTable` points at `db.scenarios`.
- **Cloud `shared_playbooks` table + `playbook_data` column** — external Supabase schema, not part of a client-side rename.
- **`playbookDB` export name** — already a misnomer (it's the app DB handle), but renaming it is orthogonal to Scenario→Play. Left as-is so this stays a clean, single-axis sweep; revisit in §5b or a later pass.
- **§5b Playbook-as-collection model** (playbookId FK on each Play, default "My Plays", library nav Playbook→Plays) — separate effort.

## Data safety

No IndexedDB schema change. The `scenarios` table, its indexes, the `AFLPlaybookDB` name, and the v1–v4 version chain are untouched. Existing saved Plays load exactly as before. Only TypeScript symbols, file names, UI strings, and the client route change.

## Route handling

`App.tsx` currently routes `/scenario/:id` → `MainLayout`. After the rename:
- `/play/:id` → `MainLayout` (primary).
- `/scenario/:id` → redirect to `/play/:id` (preserves the `:id`), so any existing bookmark or in-app link still resolves. Implemented with a small redirect element that reads `useParams` and `<Navigate to={\`/play/${id}\`} replace />`.

Internal navigation (`PlayLibrary` opening a Play, and any `navigate('/scenario/...')`) targets `/play/:id` directly.

## Verification

- `npx tsc --noEmit` clean and `npm run build` green.
- Renamed unit tests pass (`playStore.test.ts`, `PlayModel.test.ts`) run as single files (the full suite OOMs on Windows — known, not a gate).
- Runtime smoke via the browser: Play library loads and lists existing Plays; "New Play" creates one; opening a Play loads the board; the board still auto-saves; visiting an old `/scenario/:id` URL redirects to `/play/:id`.
- No dangling references: `grep -ri "Scenario"` returns only the intentional survivors (the `scenarios` Dexie table name + its comments, and any `shared_playbooks`/cloud references).

## Commit shape

A rename breaks compilation until it is complete, so it can't be sliced into many independently-green commits without temporary alias shims. Land it as one cohesive, tsc-green commit — or at most two if the split stays green (e.g. model + store + db type first, then components + routes + tests). Prefer the smallest number of commits that each build clean.

## Risks & mitigations

- **Missed reference → build break.** Mitigation: tsc is the gate; a full-tree `grep` for `Scenario`/`scenario` after the sweep confirms only intended survivors remain.
- **The word "scenario" appears in unrelated contexts** (e.g. comments, the retained Dexie table). Mitigation: rename by symbol/identifier deliberately, not blind find-replace; review the survivor grep.
- **Old bookmarks break.** Mitigation: the `/scenario/:id` → `/play/:id` redirect route.
- **File renames losing git history.** Mitigation: use `git mv` so renames are tracked.
