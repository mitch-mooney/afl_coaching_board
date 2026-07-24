# R6 Wave — Remove dead video-persistence surface

> **Status:** Design, ready for implementation-plan.
> **Source:** The deferred §7 architecture pass, audit theme **R6** ("video ownership scattered;
> store fuses transport + Dexie + `window.confirm`"). Exploration found the store's persistence
> layer is **mostly post-lean residue with no write path** — the `window.confirm` lives in a dead
> method. This wave removes the verified-dead persistence surface (kills the `window.confirm` by
> deletion, sheds the store's dead Dexie weight). The god-hook and `<video>`-consolidation halves of
> R6 are separate, later waves.

## Context — what the audit + exploration found

`videoStore` (480 lines) is a live transport/source store bolted to a largely-dead Dexie
persistence layer. Live-caller audit (`git grep` across `src`, excluding tests):

| Symbol | Callers |
|---|---|
| transport/source state (`videoFile`, `videoElement`, `currentTime`, `isPlaying`, …) + `clearVideo`/`resetStore` | **live** (VideoWorkspace, PlaybackControls, SharePlayModal, useVideoPlayback) |
| `loadSavedVideos`, `savedVideos` | **live** (MainLayout init) |
| `saveVideoMetadata` | no live caller — **kept** (the intended writer for the `videos` table; its counterpart `loadSavedVideos`/PlayLibrary read are live) |
| `videoDb.videos.get` (PlayLibrary) | **live read** |
| `deleteVideoMetadataWithCascade` (**holds `window.confirm`**) | **none — dead** |
| `deleteVideoMetadata` | test-only |
| `updateVideoMetadata`, `loadVideoSettings` | **none — dead** |
| `saveVideoBlob` / `loadVideoBlob` / `deleteVideoBlob` + the `videoBlobs` table + `PersistedVideoBlob` + `MAX_BLOB_SIZE` | **none — fully dead** (sharing uses `trimAndConvertVideo` on a passed blob, not this table) |
| `playStore.clearVideoLink` / `playsLinkedToVideo` | used **only** by the dead cascade (+ their own tests) |

Every removed symbol was confirmed to have **zero references outside `videoStore.ts`/`playStore.ts`
and their test files**. The `videoBlobId` fields in `PlayModel`/`appDatabase` are a **different**
thing (a column on the `playbooks` table in `AFLPlaybookDB`), unrelated to VideoImportDB's
`videoBlobs` table.

## Goals

1. Delete the verified-dead video-persistence surface, eliminating the `window.confirm`-in-a-store
   smell and the store→`playStore` coupling it created.
2. Keep every live path intact (transport/source/loading state, `loadSavedVideos`/`saveVideoMetadata`,
   the `videos` table, PlayLibrary's read).

## Non-goals (deferred / out of scope)

- The `useVideoPlayback` god-hook decomposition and the 3-`<video>`-element consolidation — later R6 waves.
- Rebuilding the video-metadata **write path** or the video↔play linking feature (a product decision, not this cleanup).
- Removing `saveVideoMetadata`/`loadSavedVideos`/the `videos` table — kept as the live metadata read/write pair.
- Any transport behaviour change.

---

## Design

Pure deletion, in two build-green-between steps.

### 1. `src/store/videoStore.ts`

Remove:
- **Interface + implementation** for the 7 dead actions: `deleteVideoMetadata`,
  `deleteVideoMetadataWithCascade`, `updateVideoMetadata`, `loadVideoSettings`, `saveVideoBlob`,
  `loadVideoBlob`, `deleteVideoBlob`.
- The `PersistedVideoBlob` interface and the `MAX_BLOB_SIZE` constant.
- The `videoBlobs!: Table<PersistedVideoBlob>` field on `VideoDatabase`, and **drop the table** by
  adding a new version after the existing ones:
  ```ts
  this.version(1).stores({ videos: '++id, fileName, createdAt, updatedAt' });
  this.version(2).stores({ videos: '++id, fileName, createdAt, updatedAt', videoBlobs: '++id, videoId' });
  this.version(3).stores({ videoBlobs: null }); // drop the unused blob table
  ```
  (v1/v2 stay as history — Dexie needs the full version chain; `videoBlobs: null` is Dexie's
  explicit table-deletion syntax. `videos` is unchanged, so it need not be re-declared in v3.)
- The `import { usePlayStore } from './playStore';` line (the cascade was its only user — removing it
  also drops a store→store coupling).

Keep the `Table` import (still used by `videos!: Table<PersistedVideoMetadata>`), the `videos` table,
`PersistedVideoMetadata`, `VideoMetadata`, `videoDb` export, and everything else.

### 2. `src/store/playStore.ts`

Remove `clearVideoLink` and `playsLinkedToVideo` (interface + implementation). `playsLinkedToVideo`
is a one-line `plays.filter(p => p.linkedVideoMoment?.videoId === videoId)` selector with no shared
helper; `clearVideoLink` was its only internal user, and the dead cascade was the only external one.
Keep `loadPlays` and all other playStore surface.

### 3. Tests

- `src/store/__tests__/videoStore.test.ts`: in the `Persistence Actions` describe, remove the 5
  `it()` blocks for the deleted actions — `updateVideoMetadata` (×1), `deleteVideoMetadata` (×2),
  `loadVideoSettings` (×2). Keep the `loadSavedVideos` and `saveVideoMetadata` tests. (No blob tests
  exist.)
- `src/store/__tests__/playStore.test.ts`: remove the `describe('clearVideoLink', …)` block.

### Verification

No new tests (deletion slice). After each step:
- `npx tsc --noEmit` clean (catches any missed reference).
- `npm run build` green.
- The surviving suites green: `videoStore.test.ts`, `playStore.test.ts`.
- `git grep` confirms the removed symbols are gone from `src`:
  `deleteVideoMetadataWithCascade`, `saveVideoBlob`, `MAX_BLOB_SIZE`, `window.confirm`,
  `clearVideoLink`, `playsLinkedToVideo`.

## Build sequence (for the plan)

1. **`videoStore` removals** (actions + blob table + types + `usePlayStore` import). After this,
   `playStore.clearVideoLink`/`playsLinkedToVideo` are unused but still valid → build green.
2. **`playStore` removals** (`clearVideoLink` + `playsLinkedToVideo` + their test block).

## Risks

- **Missed reference** → `tsc` catches it (the audit already confirmed none exist outside the two
  stores + tests).
- **Dexie `version(3)` drop** — low risk: the `videoBlobs` table was never written by live code, so
  dropping it loses no real data; existing DBs simply drop the empty/unused table on next open. v1/v2
  are preserved so the version chain stays valid.
- **`saveVideoMetadata` kept though unwired** — deliberate: it is the writer half of the live
  `videos`-table read path, not part of the dead surface; removing it would be a feature-scope call
  (out of scope).

## Testing strategy

Deletion-only — no TDD. The full vitest run OOMs all-at-once on Windows (pre-existing); run
`videoStore` and `playStore` suites **targeted** to confirm the survivors stay green, plus `tsc` +
`build`.
