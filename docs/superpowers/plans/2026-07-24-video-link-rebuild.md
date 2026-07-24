# Video-Link Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore video↔play linking by persisting video metadata on import — one `saveVideoMetadata()` call in `VideoUploader`'s load handler so `currentSavedVideoId` is set and the whole linking/clip-share flow becomes reachable.

**Architecture:** `saveVideoMetadata` (already in `videoStore`, already unit-tested) writes a `videos` row, sets `currentSavedVideoId`, and refreshes `savedVideos`. The import handler already sets `videoMetadata`+`duration` synchronously just before, so calling it there is a drop-in fix.

**Tech Stack:** TypeScript, React, Zustand, Dexie, Vitest.

## Global Constraints

- **Single-file feature fix** — only `src/components/VideoImport/VideoUploader.tsx` changes. Do NOT change `videoStore.saveVideoMetadata`, the linking UI, or the share flow.
- **Non-goals (do not add):** cross-session video-blob storage, `videos`-row de-duplication, or a delete-metadata UI. Out of scope.
- **Failure is non-fatal** — a `saveVideoMetadata` rejection must NOT break the import; wrap it in `try/catch` and log.
- **Full vitest run OOMs on Windows** (pre-existing) — run `videoStore.test.ts` targeted; verify with `npx tsc --noEmit` + `npm run build`.
- **Commit footer:** end each commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Persist video metadata on import in `VideoUploader`

**Files:**
- Modify: `src/components/VideoImport/VideoUploader.tsx`

**Interfaces:**
- Consumes: `saveVideoMetadata` from `useVideoStore` (already exists; `(): Promise<number>`).

- [ ] **Step 1: Add `saveVideoMetadata` to the store-action destructure**

In the `const { … } = useVideoStore(…)` block (starts ~line 236), add `saveVideoMetadata,` alongside the other actions (e.g. right after `setDuration,`):
```ts
    setVideoMetadata,
    setDuration,
    saveVideoMetadata,
    setIsLoaded,
```

- [ ] **Step 2: Call it in the load handler after metadata is set**

In the load handler's `try` block, the state is set like this (~lines 312–323):
```ts
        setDuration(element.duration);
        setVideoElement(element);
        setIsLoaded(true);
        setIsVideoMode(true);

        // Reset progress state
        setLoadingProgress({ phase: 'idle', percent: 0, message: '' });
```
Insert the persist call **between** `setIsVideoMode(true);` and the `// Reset progress state` line:
```ts
        setDuration(element.duration);
        setVideoElement(element);
        setIsLoaded(true);
        setIsVideoMode(true);

        // Persist the loaded video's metadata so it gets a stable saved id. This
        // sets currentSavedVideoId, which the Video-tab "Link to Play" flow
        // requires; without it, linking always refuses with "No video loaded".
        try {
          await saveVideoMetadata();
        } catch (err) {
          // Non-fatal: the video still plays this session; only its saved id +
          // cross-session metadata row are missing.
          console.error('[VideoUploader] failed to persist video metadata', err);
        }

        // Reset progress state
        setLoadingProgress({ phase: 'idle', percent: 0, message: '' });
```
(The handler is already `async` and this is inside its `try` — `await` is valid here.)

- [ ] **Step 3: Add `saveVideoMetadata` to the `useCallback` deps**

In the load handler's dependency array (~lines 346–354), add `saveVideoMetadata,`:
```ts
      setVideoMetadata,
      setDuration,
      saveVideoMetadata,
      setIsLoaded,
```

- [ ] **Step 4: Typecheck + targeted store test + build**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx vitest run src/store/__tests__/videoStore.test.ts`
Expected: green (the existing `saveVideoMetadata` tests still pass — no store change, just confirming).

Run: `git grep -n "saveVideoMetadata" src/components/VideoImport/VideoUploader.tsx`
Expected: 3 matches (destructure, the `await` call, the dep) — confirming it's wired.

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/components/VideoImport/VideoUploader.tsx
git commit -m "fix: persist video metadata on import so Link-to-Play works

VideoUploader never called saveVideoMetadata, so currentSavedVideoId stayed
null and 'Link to Play' always refused. Call it after the video loads —
restores video<->play linking, the linked chip, PlayLibrary filters, and
per-Play clip sharing (within a session).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Line numbers are approximate anchors — match on the quoted code.
- This intentionally changes behaviour: importing a video now writes one Dexie metadata row and sets `currentSavedVideoId`. That is the whole point — it re-enables the linking feature.
- There is no new unit test: the store action `saveVideoMetadata` is already covered by `videoStore.test.ts`, and the wiring is a single call inside an async DOM handler (no component-test harness in the repo). Confidence = existing store test + clean `tsc`/`build` + the 3-match grep.
- Do NOT touch `videoStore.saveVideoMetadata`, `VideoWorkspace`, `MainLayout`, `PlayLibrary`, or `SharePlayModal` — the fix is only the missing call.
