# R6 Remove Dead Video-Persistence Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the verified-dead video-persistence surface from `videoStore` (and the `playStore` methods it orphans), removing the `window.confirm`-in-a-store smell and shedding the store's dead Dexie weight — with no functional change.

**Architecture:** Pure deletion in two build-green-between steps: (1) remove `videoStore`'s 7 dead persistence actions + the `videoBlobs` table/type/const + the `usePlayStore` import; (2) remove `playStore.clearVideoLink`/`playsLinkedToVideo` (orphaned once the cascade is gone). Live paths (transport/source state, `loadSavedVideos`, `saveVideoMetadata`, the `videos` table, PlayLibrary's read) stay.

**Tech Stack:** TypeScript, Zustand, Dexie, Vitest (jsdom env).

## Global Constraints

- **Verified dead-code removal — no functional change.** Every removed symbol was grep-confirmed to have zero references outside `videoStore.ts`/`playStore.ts` and their test files.
- **Keep the live surface:** all transport/source/loading state + actions, `clearVideo`, `resetStore`, `loadSavedVideos`, `saveVideoMetadata`, `savedVideos`, `isPersisting`, `videoDb`, the `videos` table, `PersistedVideoMetadata`, `VideoMetadata`. Do NOT remove these.
- **Dexie version chain is append-only:** keep `version(1)` and `version(2)` exactly as they are (history); add `version(3).stores({ videoBlobs: null })` to drop the unused table. Never edit a past version's `.stores()`.
- **`videoBlobId` ≠ `videoBlobs`:** the `videoBlobId` fields in `PlayModel.ts`/`appDatabase.ts` are a column on the `playbooks` table in a DIFFERENT database — do not touch them.
- **Full vitest run OOMs on Windows** (pre-existing) — run `videoStore` + `playStore` suites targeted; verify with `npx tsc --noEmit` + `npm run build`.
- **Commit footer:** end each commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Remove dead persistence from `videoStore`

**Files:**
- Modify: `src/store/videoStore.ts`
- Test: `src/store/__tests__/videoStore.test.ts` (remove 5 `it()` blocks)

**Interfaces:**
- Produces: a `videoStore` whose `VideoState` no longer declares `deleteVideoMetadata`, `deleteVideoMetadataWithCascade`, `updateVideoMetadata`, `loadVideoSettings`, `saveVideoBlob`, `loadVideoBlob`, `deleteVideoBlob`; no `PersistedVideoBlob`/`MAX_BLOB_SIZE`; `videoBlobs` table dropped.

- [ ] **Step 1: Remove the `usePlayStore` import**

Delete this line (near the top, ~line 3):
```ts
import { usePlayStore } from './playStore';
```

- [ ] **Step 2: Remove the `PersistedVideoBlob` interface + `MAX_BLOB_SIZE`**

Delete the `PersistedVideoBlob` interface block (~lines 35–44):
```ts
/**
 * Stored video blob entry for attaching clips to playbooks
 */
export interface PersistedVideoBlob {
  id?: number;
  videoId: string; // opaque key (e.g. playbook name + timestamp)
  blob: Blob;
  mimeType: string;
  createdAt: Date;
}
```
Delete the constant (~line 46):
```ts
const MAX_BLOB_SIZE = 50 * 1024 * 1024; // 50 MB
```

- [ ] **Step 3: Drop the `videoBlobs` table from `VideoDatabase`**

Remove the `videoBlobs` field declaration (~line 53):
```ts
  videoBlobs!: Table<PersistedVideoBlob>;
```
In the constructor, leave `version(1)` and `version(2)` unchanged and add `version(3)` to drop the table:
```ts
    this.version(1).stores({
      videos: '++id, fileName, createdAt, updatedAt',
    });
    this.version(2).stores({
      videos: '++id, fileName, createdAt, updatedAt',
      videoBlobs: '++id, videoId',
    });
    this.version(3).stores({
      videoBlobs: null, // drop the unused blob table
    });
```

- [ ] **Step 4: Remove the 7 dead action declarations from the `VideoState` interface**

Delete these interface lines:
```ts
  updateVideoMetadata: (id: number) => Promise<void>;
  deleteVideoMetadata: (id: number) => Promise<void>;
  deleteVideoMetadataWithCascade: (id: number) => Promise<'deleted' | 'cancelled' | 'error'>;
  loadVideoSettings: (id: number) => Promise<void>;
```
```ts
  saveVideoBlob: (videoId: string, blob: Blob) => Promise<number>;
  loadVideoBlob: (videoId: string) => Promise<PersistedVideoBlob | undefined>;
  deleteVideoBlob: (id: number) => Promise<void>;
```
(Keep `loadSavedVideos` and `saveVideoMetadata`. The `// Actions - Video blob storage` comment above the blob declarations can be removed too.)

- [ ] **Step 5: Remove the 7 dead action implementations**

In the store body, delete the implementations of `updateVideoMetadata` (~lines 328–343),
`deleteVideoMetadata` (~lines 345–359), `deleteVideoMetadataWithCascade` (~lines 361–407, **this is
the one holding `window.confirm`**), `loadVideoSettings` (~lines 409–426), and the three blob
actions `saveVideoBlob`/`loadVideoBlob`/`deleteVideoBlob` (~lines 428–449, including the
`// Actions - Video blob storage` comment). Keep `loadSavedVideos` and `saveVideoMetadata` intact.

- [ ] **Step 6: Remove the dead-action tests**

In `src/store/__tests__/videoStore.test.ts`, inside the `describe('Persistence Actions', …)` block,
delete these 5 `it()` blocks:
- `it('updateVideoMetadata should update existing record', …)`
- `it('deleteVideoMetadata should remove record from database', …)`
- `it('deleteVideoMetadata should clear currentSavedVideoId if deleted record was current', …)`
- `it('loadVideoSettings should select the saved video by id', …)`
- `it('loadVideoSettings should throw error for non-existent id', …)`

Keep the `loadSavedVideos` and `saveVideoMetadata` tests in that block.

- [ ] **Step 7: Typecheck + build + targeted tests**

Run: `npx tsc --noEmit` → clean.

Run: `npx vitest run src/store/__tests__/videoStore.test.ts` → green (survivors pass).

Run: `git grep -n "deleteVideoMetadataWithCascade\|saveVideoBlob\|loadVideoBlob\|deleteVideoBlob\|MAX_BLOB_SIZE\|PersistedVideoBlob\|updateVideoMetadata\|loadVideoSettings\|window.confirm" src/store/videoStore.ts`
Expected: no matches.

Run: `npm run build` → `✓ built`.

- [ ] **Step 8: Commit**

```bash
git add src/store/videoStore.ts src/store/__tests__/videoStore.test.ts
git commit -m "refactor: remove dead video-persistence surface from videoStore

Deletes the zero-caller deleteVideoMetadataWithCascade (and its window.confirm),
deleteVideoMetadata, updateVideoMetadata, loadVideoSettings, and the unused
videoBlobs table + blob actions/types. Live transport + loadSavedVideos/
saveVideoMetadata + the videos table are unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Remove orphaned `clearVideoLink`/`playsLinkedToVideo` from `playStore`

**Files:**
- Modify: `src/store/playStore.ts`
- Test: `src/store/__tests__/playStore.test.ts` (remove the `clearVideoLink` describe block)

**Interfaces:**
- Consumes: nothing (Task 1 removed the only external caller, the video cascade).
- Produces: a `playStore` without `clearVideoLink`/`playsLinkedToVideo`.

- [ ] **Step 1: Remove the interface declarations**

In `playStore.ts`, delete these two interface lines (~lines 38 and 40):
```ts
  clearVideoLink: (videoId: number) => Promise<void>;
```
```ts
  playsLinkedToVideo: (videoId: number) => Play[];
```

- [ ] **Step 2: Remove the implementations**

Delete the `clearVideoLink` implementation (~lines 133–148):
```ts
  clearVideoLink: async (videoId) => {
    try {
      const linked = get().playsLinkedToVideo(videoId);
      // ...
    } catch (err) {
      console.error('[playStore] clearVideoLink failed', err);
    }
  },
```
Delete the `playsLinkedToVideo` selector (~lines 150–151):
```ts
  playsLinkedToVideo: (videoId) =>
    get().plays.filter((p) => p.linkedVideoMoment?.videoId === videoId),
```
(Match on the quoted code; remove both entirely. Keep `loadPlays` and everything else.)

- [ ] **Step 3: Remove the `clearVideoLink` test block**

In `src/store/__tests__/playStore.test.ts`, delete the entire `describe('clearVideoLink', () => { … })`
block (starts ~line 218). Keep all other playStore tests.

- [ ] **Step 4: Typecheck + build + targeted tests**

Run: `npx tsc --noEmit` → clean.

Run: `npx vitest run src/store/__tests__/playStore.test.ts` → green.

Run: `git grep -n "clearVideoLink\|playsLinkedToVideo" src`
Expected: no matches (gone from stores and tests).

Run: `npm run build` → `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/store/playStore.ts src/store/__tests__/playStore.test.ts
git commit -m "refactor: drop playStore clearVideoLink/playsLinkedToVideo (orphaned by video cleanup)

Their only external caller was the deleted video-delete cascade; clearVideoLink's
only internal user was playsLinkedToVideo. Removed both + the clearVideoLink test.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Line numbers are approximate anchors — match on the quoted code.
- This is a deletion-only wave; there are no new tests. Confidence comes from `tsc` catching any
  dangling reference, the surviving `videoStore`/`playStore` suites staying green, the grep guards,
  and a clean `build`.
- Do NOT touch: `saveVideoMetadata`, `loadSavedVideos`, `savedVideos`, the `videos` table,
  `PersistedVideoMetadata`, `VideoMetadata`, `videoDb` export, `loadPlays`, any transport/source state,
  `PlayLibrary`'s `videoDb.videos.get`, or the `videoBlobId` columns in `PlayModel`/`appDatabase`.
