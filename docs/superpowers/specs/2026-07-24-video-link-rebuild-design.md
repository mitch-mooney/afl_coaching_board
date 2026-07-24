# Rebuild video↔play linking — wire the metadata save on import

> **Status:** Design, ready for implementation-plan.
> **Source:** The open product decision left by the R6 architecture waves. **Settled: rebuild.** Video
> linking was severed by a single missing call — importing a video never persists its metadata, so
> `currentSavedVideoId` stays null and every downstream feature is unreachable. This restores the
> feature with the one wired-in call it's missing. Feature fix (not architecture).

## Context — how the feature is broken

The video↔play linking flow is fully built but dead at step 1:

1. `VideoUploader` load handler sets `videoMetadata` + `duration` + `videoElement` + `isLoaded`
   (`VideoUploader.tsx:312–323`) — but never calls `saveVideoMetadata`.
2. `saveVideoMetadata` is the **only** setter of `currentSavedVideoId` (and the only writer of the
   `videos` metadata table). With no caller, `currentSavedVideoId` is permanently null.
3. `VideoWorkspace`'s "Link to Play" reads `currentSavedVideoId` (`VideoWorkspace.tsx:111`) and bails
   with `alert('No video loaded. Import a video first.')` when it's null — so a play can never get a
   `linkedVideoMoment`.
4. Everything gated on that is therefore unreachable: the MainLayout linked-video chip
   (`linkedVideoAvailable = savedVideos.some(…)`), PlayLibrary's linked/board-only filter +
   `videoMetadataExists`, and SharePlayModal's per-Play clip sharing.

`saveVideoMetadata` reads `videoMetadata` + `duration` from the store (both set synchronously at
`VideoUploader.tsx:312–320` just before), writes a `videos` row, sets `currentSavedVideoId`, and
refreshes `savedVideos`. It is already unit-tested in `videoStore.test.ts`. So the fix is to call it.

## Goal

Restore end-to-end (within a session) video↔play linking by persisting video metadata on import, so
`currentSavedVideoId` is set and the downstream features become reachable.

## Non-goals (explicit)

- **Cross-session video storage.** Metadata persists, but the video **blob** is not stored (never
  was — blob persistence was dead code removed in R6 wave 1). Next session the metadata row exists but
  the video must be **re-imported** to play. That session-scoped model is the original design; true
  video persistence is a separate, larger feature.
- **De-duplicating `videos` rows** / adding a delete-metadata UI. Each import appends a row and there
  is no delete action (`deleteVideoMetadata` was removed as dead code in R6 wave 1). Rows accumulate;
  acceptable at this app's scale. Out of scope.
- Any change to the linking UI, the share flow, or the store's `saveVideoMetadata` itself.

---

## Design

### `src/components/VideoImport/VideoUploader.tsx`

In the load handler's `try` block, immediately after the metadata is set (after
`setIsVideoMode(true)`, ~line 323, before the progress reset), add:

```ts
        // Persist the loaded video's metadata so it gets a stable saved id.
        // This sets currentSavedVideoId, which the Video-tab "Link to Play" flow
        // requires; without it, linking always refuses with "No video loaded".
        try {
          await saveVideoMetadata();
        } catch (err) {
          // Non-fatal: the video still plays this session; only its saved id +
          // cross-session metadata row are missing.
          console.error('[VideoUploader] failed to persist video metadata', err);
        }
```

- Add `saveVideoMetadata` to the store-action destructure (`VideoUploader.tsx:236–…`, alongside
  `setVideoMetadata`/`setDuration`/…).
- Add `saveVideoMetadata` to the load handler's `useCallback` dependency array (`~line 346–354`).

`saveVideoMetadata` reads the just-set `videoMetadata`/`duration` via `get()` (Zustand `set` is
synchronous, so they're populated), so no ordering change is needed. The `try/catch` keeps a
persistence failure from breaking the import.

## Testing

- `videoStore.saveVideoMetadata` is already unit-tested (writes a row, sets `currentSavedVideoId`,
  refreshes `savedVideos`) — that coverage stands.
- The wiring is build-verified: `npx tsc --noEmit` + `npm run build` clean.
- No new unit test — the change is one call inside an async DOM load handler with no component-test
  harness (no `renderHook`/RTL in the repo).
- **Manual runtime smoke (the real confirmation, if runnable):** import a video → Video tab → set
  start/end → "Link to Play" now links (no "No video loaded" alert) → Board tab shows the linked-video
  chip → PlayLibrary shows the play under the "linked" filter.

## Risks

- **Duplicate rows on re-import** — noted as an accepted out-of-scope limitation; not breaking.
- **`videoMetadata` null guard** — `saveVideoMetadata` throws if `videoMetadata` is null; here it's set
  two lines earlier, so it won't be, and the `try/catch` covers any surprise.
- **Behaviour change** — this is intentional (a broken feature becomes functional); the only new
  side effect on import is one Dexie row write + `currentSavedVideoId` being set.

## Testing strategy

Feature fix, no TDD (the store action is already tested; the wiring is build-verified). The full
vitest run OOMs on Windows (pre-existing) — run `videoStore.test.ts` targeted to confirm the store
action still passes, plus `tsc` + `build`.
