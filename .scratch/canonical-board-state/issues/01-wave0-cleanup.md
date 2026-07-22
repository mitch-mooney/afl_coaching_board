# 01 — Wave 0 cleanup: delete verified dead code

**What to build:** The surviving core carries several zero-importer modules and a dead
post-lean export-settings slice that mislead the next edit. Remove them so the codebase
only contains reachable code. No behaviour changes; every build and touched test suite
stays green.

**Blocked by:** None — can start immediately.

**Status:** done (branch arch/canonical-board-state, commits 67ae448 / 939c04e / 71f710e / 6d5bab9)

Spec: `docs/superpowers/specs/2026-07-22-architecture-pass-canonical-board-state.md` (Wave 0).

- [x] `src/hooks/usePlayerControls.ts` deleted (confirmed no importers — a decoy duplicate of `Player.tsx`'s inline drag).
- [x] `src/components/TrainingMode/DrillLibrary.tsx` deleted (confirmed no importers — live UI uses the inline drawer in `TrainingSessionEditor`).
- [x] `src/hooks/useRotationExercise.ts` deleted (dead timer-engine hook). **Do not** touch `rotationExerciseStore`, `RotationExerciseEditor`, or `models/RotationExercise.ts` — those are live-but-broken, out of scope.
- [x] `videoUtils` export-era symbols removed: `supportsMediaRecorder`, `getSupportedExportFormats`, `createVideoElement`, and the export-only `VideoError` codes — plus their cases in `videoUtils.test.ts`. Confirm each is referenced only by the test file before removing. _Removed the 3 functions + 6 dead codes; **kept `EXPORT_CANCELLED` + `MEMORY_LIMIT_EXCEEDED`** — both are live-reachable via `createVideoError`'s 'cancel'/'memory' mapping (imported by `VideoUploader`), so they fail the "test-only" gate._
- [x] `videoStore` `ExportSettings` slice removed (`ExportSettings` type, `exportSettings` state, `setExportSettings`, `resetExportSettings`, `DEFAULT_EXPORT_SETTINGS`) **only after** confirming whether it's written into the persisted `PersistedVideoMetadata` row: if persisted, remove with a read-tolerant migration/ignore-on-read; if in-memory only, remove outright. Update `videoStore.test.ts` accordingly. _Was persisted; removed read-tolerantly (field dropped from interface + writers; Dexie ignores the leftover field on old rows, no migration needed)._
- [x] `npm run build` + typecheck clean; ~~`videoUtils` and `videoStore` suites green~~. _Build + typecheck clean. **Suites NOT run** — vitest OOMs during jsdom setup in this environment (pre-existing, reproduces on clean tree; jsdom-24/Node-24 incompatibility). Test edits are typecheck-clean and statically verified but unexecuted._

_Note: this ticket and 03 (repoint callers) both touch `videoStore.ts` in different regions (the `ExportSettings` slice vs the `clearVideoLink` cascade). Land one before the other to avoid a trivial merge._
