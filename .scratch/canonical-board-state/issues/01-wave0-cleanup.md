# 01 — Wave 0 cleanup: delete verified dead code

**What to build:** The surviving core carries several zero-importer modules and a dead
post-lean export-settings slice that mislead the next edit. Remove them so the codebase
only contains reachable code. No behaviour changes; every build and touched test suite
stays green.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

Spec: `docs/superpowers/specs/2026-07-22-architecture-pass-canonical-board-state.md` (Wave 0).

- [ ] `src/hooks/usePlayerControls.ts` deleted (confirmed no importers — a decoy duplicate of `Player.tsx`'s inline drag).
- [ ] `src/components/TrainingMode/DrillLibrary.tsx` deleted (confirmed no importers — live UI uses the inline drawer in `TrainingSessionEditor`).
- [ ] `src/hooks/useRotationExercise.ts` deleted (dead timer-engine hook). **Do not** touch `rotationExerciseStore`, `RotationExerciseEditor`, or `models/RotationExercise.ts` — those are live-but-broken, out of scope.
- [ ] `videoUtils` export-era symbols removed: `supportsMediaRecorder`, `getSupportedExportFormats`, `createVideoElement`, and the export-only `VideoError` codes — plus their cases in `videoUtils.test.ts`. Confirm each is referenced only by the test file before removing.
- [ ] `videoStore` `ExportSettings` slice removed (`ExportSettings` type, `exportSettings` state, `setExportSettings`, `resetExportSettings`, `DEFAULT_EXPORT_SETTINGS`) **only after** confirming whether it's written into the persisted `PersistedVideoMetadata` row: if persisted, remove with a read-tolerant migration/ignore-on-read; if in-memory only, remove outright. Update `videoStore.test.ts` accordingly.
- [ ] `npm run build` + typecheck clean; `videoUtils` and `videoStore` suites green.

_Note: this ticket and 03 (repoint callers) both touch `videoStore.ts` in different regions (the `ExportSettings` slice vs the `clearVideoLink` cascade). Land one before the other to avoid a trivial merge._
