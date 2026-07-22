# Architecture Pass — Wave 0 (dead code) + Wave 1 (canonical board-state seam)

> **Status:** Design, ready for implementation-plan.
> **Source:** The deferred architecture pass from `docs/lean-scope-decision-doc.md` §7 step 2
> ("run `/improve-codebase-architecture` on the survivors"). A six-subsystem deep-module
> audit ran first; this spec is the first, highest-leverage slice of its findings.
> **Vocabulary:** deep module = a lot of behaviour behind a small interface at a clean seam
> (Ousterhout/Feathers). The recently-built `boardSnapshot` / `boardSnapshotIO` /
> `boardPlayback` cluster and `hudSkin.resolveSkin` are the in-repo models to emulate.

## Context — what the audit found

§7 assumed the architecture pass would run on a frozen survivor set *before* §5/§6. In
practice the team pushed straight through: §5 (Scenario→Play), §6 (Toolbar→GlobalDrawer/HUD),
the board-snapshot module, and a net-new TrainingMode all shipped. So this pass runs on the
**current** whole app.

The debt clusters around one root cause worth fixing first: **there is a genuinely deep,
canonical definition of "the board" (`BoardSnapshot` + `boardSnapshotIO.capture/restore`),
but two other modules reimplement their own partial snapshots instead of using it**, and the
Play persistence table has four independent writers instead of one owning store. This slice
routes everything through the canonical seam and makes `playStore` the sole gateway, then
deletes verified dead code.

Two audit claims were **checked and corrected** before writing this spec:
- `boardSnapshotIO.restore()` leaving camera/ball untouched on `null` is **documented,
  intentional** behaviour (`boardSnapshotIO.ts:29–34`), **not a bug** — dropped from scope.
- The rotation subsystem is **live-but-broken, not dead** (`rotationExerciseStore` +
  `RotationExerciseEditor` render at `TrainingSessionEditor.tsx:523`; `models/RotationExercise.ts`
  is type-referenced by `SessionDrill`). Only `useRotationExercise.ts` is genuinely dead.
  Rotation repair is out of scope (a later TrainingMode wave).

## Goals

1. Delete verified zero-importer dead code (navigability; removes decoys that mislead the next edit).
2. Make `BoardSnapshot` / `boardSnapshotIO` the **single** definition of board state — no module
   defines its own partial board snapshot.
3. Make `playStore` the **single gateway** to the `scenarios` (Plays) table, with board-level verbs
   so components stop reaching into the raw Dexie table and re-assembling `toPhase(capture(), …)`.

## Non-goals (explicitly deferred)

- Expanding **undo/redo** to cover paths / ball / cones / camera (this slice keeps undo's
  lightweight player+annotation shape — see Wave 1(c)).
- Rewriting `historyStore.undo()`'s convoluted `past[length-2]` return logic.
- Any TrainingMode repair (rotation model unification, `timerStore.tick` wiring, session persistence).
- Video ownership refactor, Command registry, `overlayStore`, transport slice — later waves.
- Introducing a DB-injection interface for Dexie (later; keep the singleton for now).

---

## Wave 0 — Delete dead code

All confirmed **zero external importers** by grep. No behavioural change; existing suites must stay green.

| Target | Evidence | Action |
|---|---|---|
| `src/hooks/usePlayerControls.ts` | no importer; a diverging duplicate of `Player.tsx`'s inline drag (a decoy) | delete file |
| `src/components/TrainingMode/DrillLibrary.tsx` | `from '…DrillLibrary'` → no matches; live UI uses the inline drawer in `TrainingSessionEditor` | delete file |
| `src/hooks/useRotationExercise.ts` | no importer (dead timer-engine hook); **keep** the store, editor, and model | delete file |
| `src/utils/videoUtils.ts` → `supportsMediaRecorder`, `getSupportedExportFormats`, `createVideoElement` + export-era `VideoError` codes | referenced only by `videoUtils.test.ts` (post-lean residue of the deleted export/recorder path) | delete the symbols + their tests |
| `src/store/videoStore.ts` → `ExportSettings` type, `exportSettings` state, `setExportSettings`, `resetExportSettings`, `DEFAULT_EXPORT_SETTINGS` | referenced only by the store + `videoStore.test.ts` | delete the slice + its tests — **gated on the persistence check below** |

**ExportSettings persistence check (task, not assumption):** before removing, confirm whether
`exportSettings` is written into the persisted `PersistedVideoMetadata` row in Dexie. If it is,
either (a) drop it with a read-tolerant migration/ignore-on-read, or (b) leave the persisted
column and remove only the live store surface. Do not remove blindly.

**Verification:** `npm run build` + typecheck clean; the four surviving test suites touched
(`videoUtils.test.ts`, `videoStore.test.ts`) updated and green.

---

## Wave 1 — One canonical board-state seam

### 1(a) — `playStore` becomes the single Play-table gateway

**Problem (shallow store / bypassed abstraction).** `playStore` presents CRUD over Plays but is
one of four writers to `playbookDB.scenarios`, and the "capture the live board into a Play" ritual
`toPhase(capture(), { id: 'phase-1', label: 'Phase 1' })` is duplicated across `usePlaybook.ts:21`
(create) and `MainLayout.tsx:181` (update-on-unmount), while `MainLayout.tsx:190` reaches into
`playTable.get()` directly and indexes `phases[0]`.

**Design.** Give `playStore` the board-level verbs and own the phase-identity + `phases:[]` wrapping:

- `saveActiveBoard(id)` — `capture()` → `toPhase(…, phase-1)` → `updatePlay(id, { phases: [phase] })`.
  Replaces `MainLayout`'s hand-built autosave.
- `loadPlayBoard(id)` — `getPlay(id)` → `restore(fromPhase(play.phases[0]))`. Replaces
  `MainLayout`'s `playTable.get(...).then(...)`.
- `getPlay(id)` — thin read used by `sharingService` instead of `playbookDB.scenarios.get`.
- Create path: keep `createPlay` capturing internally (so `usePlaybook` stops importing
  `capture`/`toPhase`); the `phase-1` identity literal lives **only** in `playStore`.
- `reassignBook(fromId, toId)` — absorbs `playbookStore.ts:60,101`'s
  `scenarios.where('playbookId').modify(...)`.
- `clearVideoLink(videoId)` — absorbs `videoStore.ts:403,423`'s cascade-unlink on video delete.
- (Lower priority within 1(a)) `playsInBook(playbookId)` selector so `PlayLibrary` /
  `PlaybookLibrary` stop filtering/regrouping the global list client-side.

**Result.** No component imports `playTable`, `capture`, or `toPhase`. The `phases[0]` /
phase-identity knowledge is private to `playStore`. `playTable` stays exported **for tests only**.
`playbookStore` / `videoStore` / `sharingService` call `playStore` actions, not raw Dexie.

**Deletion test.** Deleting `usePlaybook.saveCurrentPlay` today leaves the identical four lines in
`MainLayout`'s unmount effect — proof the abstraction is missing, not hypothetical.

**Testability.** `playStore` tests already clear `playTable` directly; add unit tests for
`saveActiveBoard`/`loadPlayBoard` round-trip, `reassignBook`, `clearVideoLink`, `getPlay`.

### 1(b) — `modeStore` routes through `boardSnapshotIO`

**Problem (duplicated partial snapshot).** `modeStore.saveContext/restoreContext`
(`modeStore.ts:26–44`) snapshot **only players + annotations**. Switching match↔training therefore
does not round-trip paths, ball, cones, or camera — they leak across the switch.

**Design.** Replace `ContextSnapshot` with `BoardSnapshot`; `saveContext` → `capture()`,
`restoreContext` → `restore()`. One board definition; the switch preserves the whole board.

**Testability.** Add a `modeStore` test: seed players + a path + a moved ball + cones, switch
match→training→match, assert the full board is intact.

### 1(c) — `historyStore` minimal undo fix (annotations)

**Problem (broken invariant).** `Player.tsx:348` and `Ball.tsx:165` call
`pushSnapshot({ …, annotations: [] })` — annotations are hardcoded empty, so an annotation change
is never recorded, and `useBoardUndo` (`useBoardUndo.ts:18–23`) applies only `players`.

**Design (minimal — keep the lightweight player+annotation snapshot shape):**
- At the two `pushSnapshot` sites, pass the **real** current annotations
  (`useAnnotationStore.getState().annotations` via `createStateSnapshot`).
- Record a history snapshot on annotation **mutations** (add / remove / clear) so those actions are
  undoable — added in `annotationStore` (or its interaction hook), respecting `isPaused`.
- `useBoardUndo` also restores annotations: `setAnnotations(snapshot.annotations)` alongside the
  existing player restore.

**Out of scope (kept explicit):** paths/ball/cones/camera stay outside undo; `undo()`'s stack-return
logic is untouched.

**Testability.** `historyStore` / `useBoardUndo` test: add an annotation → undo → annotation gone;
move a player → undo → player restored (regression); annotation + player interleaved.

---

## Build sequence (for the plan)

1. **Wave 0 deletions** — momentum + shrink surface. Each deletion its own tiny commit; build green after each. (ExportSettings last, after its persistence check.)
2. **1(a) gateway** — add `playStore` verbs + tests → repoint `usePlaybook`, `MainLayout`, `sharingService`, `playbookStore`, `videoStore` → confirm no component imports `playTable`/`capture`/`toPhase`.
3. **1(b) modeStore** — swap to `boardSnapshotIO` + round-trip test.
4. **1(c) undo** — annotation recording + restore + test.

Independent enough to land as separate commits; 1(a) is the largest and should be split (add-verbs-with-tests, then repoint-callers).

## Risks

- **1(a) blast radius** is the widest (5 files repointed). Mitigate: add the new `playStore` verbs
  **with tests first**, then repoint callers one at a time, build-green between each.
- **1(b)** changes match↔training switch behaviour (now full-board) — that is the intended fix, but
  confirm no code relied on the old paths/ball/cones-persist-across-switch quirk.
- **ExportSettings** removal is the one Wave 0 item with a persistence footgun — gated above.

## Testing strategy

TDD per repo discipline. Every Wave 1 sub-item ships with a failing-first unit test. Full-suite
note: the suite OOMs running all-at-once on Windows (pre-existing) — run the touched suites
targeted (`playStore`, `modeStore`, `historyStore`/undo, `videoStore`, `videoUtils`).
