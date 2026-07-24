# Extract useVideoBuffering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the buffering concern out of the 720-line `useVideoPlayback` god-hook into a self-contained `useVideoBuffering(videoRef)` hook, with no behaviour change.

**Architecture:** New `src/hooks/useVideoBuffering.ts` owns `bufferState`, the 5 buffering event listeners, and the `BufferState`/`DEFAULT_BUFFER_STATE` types. `useVideoPlayback` calls it and returns its result; the interlocked sync/transport/events cluster is left intact (declined split).

**Tech Stack:** TypeScript, React, Zustand, Vitest.

## Global Constraints

- **Behaviour-preserving.** The moved handlers/listeners/init-block are verbatim. The buffering listeners now register once (`[videoRef]`) instead of re-registering on `playbackRate`/`volume`/etc changes — same closures, identical observable behaviour (noted in the spec).
- **Surgical deletion.** Remove ONLY the buffering pieces from `useVideoPlayback`'s big DOM-listener effect; the transport/sync handlers (`handleLoadedMetadata`/`handleTimeUpdate`/`handleSeeked`/`handleSeeking`/`handlePlay`/`handlePause`/`handleEnded`/`handleRateChange`/`handleVolumeChange`), the `startTimeSync`/`stopTimeSync` wiring, and the effect's dep array stay **byte-identical**.
- **Do NOT** touch the sync loop, transport commands, store→element effects, `objectUrlRef`, or the double-`startTimeSync` behaviour.
- **Full vitest run OOMs on Windows** (pre-existing) — run `videoBuffer.test.ts` targeted; verify with `npx tsc --noEmit` + `npm run build` (no `renderHook`).
- **Commit footer:** end each commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Create `src/hooks/useVideoBuffering.ts`

**Files:**
- Create: `src/hooks/useVideoBuffering.ts`

**Interfaces:**
- Consumes: `getBufferedRanges`, `calculateBufferedPercent` from `../utils/videoBuffer`.
- Produces (relied on by Task 2): `interface BufferState {…}` and `useVideoBuffering(videoRef: RefObject<HTMLVideoElement | null>): BufferState`.

- [ ] **Step 1: Create the file**

Create `src/hooks/useVideoBuffering.ts` with the buffering pieces moved verbatim from `useVideoPlayback`:

```ts
import { useEffect, useState, type RefObject } from 'react';
import { getBufferedRanges, calculateBufferedPercent } from '../utils/videoBuffer';

/**
 * Buffer state information for streaming video
 */
export interface BufferState {
  /** Whether the video is currently buffering */
  isBuffering: boolean;
  /** Percentage of video that has been buffered (0-100) */
  bufferedPercent: number;
  /** Array of buffered time ranges */
  bufferedRanges: Array<{ start: number; end: number }>;
  /** Whether enough data is buffered for smooth playback */
  canPlayThrough: boolean;
}

const DEFAULT_BUFFER_STATE: BufferState = {
  isBuffering: false,
  bufferedPercent: 0,
  bufferedRanges: [],
  canPlayThrough: false,
};

/**
 * Owns the buffering state for a <video>: wires the waiting/canplay/
 * canplaythrough/progress/stalled listeners and returns the current BufferState.
 * Extracted from useVideoPlayback — the buffering concern shares nothing with
 * its sync/transport code.
 */
export function useVideoBuffering(videoRef: RefObject<HTMLVideoElement | null>): BufferState {
  const [bufferState, setBufferState] = useState<BufferState>(DEFAULT_BUFFER_STATE);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Buffering event handlers for streaming large videos
    const handleWaiting = () => {
      // Video is waiting for more data - buffering
      setBufferState((prev) => ({
        ...prev,
        isBuffering: true,
      }));
    };

    const handleCanPlay = () => {
      // Enough data to start playing
      setBufferState((prev) => ({
        ...prev,
        isBuffering: false,
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
        bufferedRanges: getBufferedRanges(video),
      }));
    };

    const handleCanPlayThrough = () => {
      // Enough data buffered to play through without interruption
      setBufferState({
        isBuffering: false,
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
        bufferedRanges: getBufferedRanges(video),
        canPlayThrough: true,
      });
    };

    const handleProgress = () => {
      // New data has been downloaded
      setBufferState((prev) => ({
        ...prev,
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
        bufferedRanges: getBufferedRanges(video),
      }));
    };

    const handleStalled = () => {
      // Download has stalled unexpectedly
      setBufferState((prev) => ({
        ...prev,
        isBuffering: true,
      }));
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('stalled', handleStalled);

    // Initialize buffer state if video already has buffered data
    if (video.buffered.length > 0) {
      setBufferState({
        isBuffering: false,
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
        bufferedRanges: getBufferedRanges(video),
        canPlayThrough: video.readyState >= 4,
      });
    }

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('stalled', handleStalled);
    };
  }, [videoRef]);

  return bufferState;
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` → clean (the file compiles; exported-but-unused is fine until Task 2).

```bash
git add src/hooks/useVideoBuffering.ts
git commit -m "feat: add useVideoBuffering hook (buffering concern extracted from useVideoPlayback)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Repoint `useVideoPlayback` onto `useVideoBuffering`

**Files:**
- Modify: `src/hooks/useVideoPlayback.ts`

**Interfaces:**
- Consumes: `useVideoBuffering` + `BufferState` from `./useVideoBuffering` (Task 1).

- [ ] **Step 1: Fix imports**

Change the React import (line 1) — drop `useState`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react';
```
→
```ts
import { useCallback, useEffect, useRef } from 'react';
```
Delete the `videoBuffer` import line:
```ts
import { getBufferedRanges, calculateBufferedPercent } from '../utils/videoBuffer';
```
Add (near the other local imports):
```ts
import { useVideoBuffering, type BufferState } from './useVideoBuffering';
```

- [ ] **Step 2: Delete the local `BufferState` interface**

Delete the whole block (doc comment + interface, ~lines 29–41):
```ts
/**
 * Buffer state information for streaming video
 */
export interface BufferState {
  /** Whether the video is currently buffering */
  isBuffering: boolean;
  /** Percentage of video that has been buffered (0-100) */
  bufferedPercent: number;
  /** Array of buffered time ranges */
  bufferedRanges: Array<{ start: number; end: number }>;
  /** Whether enough data is buffered for smooth playback */
  canPlayThrough: boolean;
}
```
(The `UseVideoPlaybackReturn.bufferState: BufferState` field below now resolves via the imported `BufferState`.)

- [ ] **Step 3: Delete `DEFAULT_BUFFER_STATE`**

Delete the `DEFAULT_BUFFER_STATE` const and its immediately-preceding doc comment (~lines 94–102):
```ts
const DEFAULT_BUFFER_STATE: BufferState = {
  isBuffering: false,
  bufferedPercent: 0,
  bufferedRanges: [],
  canPlayThrough: false,
};
```
(If a short `/** … */` doc comment sits directly above this const, remove it too — it documents `DEFAULT_BUFFER_STATE`, which is moving to the new hook.)

- [ ] **Step 4: Replace the `bufferState` useState with the hook call**

Replace (~lines 113–114):
```ts
  // Buffer state for streaming large videos
  const [bufferState, setBufferState] = useState<BufferState>(DEFAULT_BUFFER_STATE);
```
with:
```ts
  // Buffering state is owned by a dedicated hook.
  const bufferState = useVideoBuffering(videoRef);
```

- [ ] **Step 5: Delete the 5 buffering handlers from the big effect**

Delete this block (the buffering handler definitions, ~lines 502–546) — from the `// Buffering event handlers` comment through the end of `handleStalled`:
```ts
    // Buffering event handlers for streaming large videos
    const handleWaiting = () => {
      // Video is waiting for more data - buffering
      setBufferState((prev) => ({
        ...prev,
        isBuffering: true,
      }));
    };

    const handleCanPlay = () => {
      // Enough data to start playing
      setBufferState((prev) => ({
        ...prev,
        isBuffering: false,
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
        bufferedRanges: getBufferedRanges(video),
      }));
    };

    const handleCanPlayThrough = () => {
      // Enough data buffered to play through without interruption
      setBufferState({
        isBuffering: false,
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
        bufferedRanges: getBufferedRanges(video),
        canPlayThrough: true,
      });
    };

    const handleProgress = () => {
      // New data has been downloaded
      setBufferState((prev) => ({
        ...prev,
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
        bufferedRanges: getBufferedRanges(video),
      }));
    };

    const handleStalled = () => {
      // Download has stalled unexpectedly
      setBufferState((prev) => ({
        ...prev,
        isBuffering: true,
      }));
    };
```

- [ ] **Step 6: Delete the 5 buffering `addEventListener` lines**

Delete (~lines 558–563):
```ts
    // Buffering events
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('stalled', handleStalled);
```
(Leave the 9 non-buffering `addEventListener` lines above it intact.)

- [ ] **Step 7: Delete the "already has buffered data" init block**

Delete (~lines 570–578):
```ts
    // Initialize buffer state if video already has buffered data
    if (video.buffered.length > 0) {
      setBufferState({
        isBuffering: false,
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
        bufferedRanges: getBufferedRanges(video),
        canPlayThrough: video.readyState >= 4,
      });
    }
```
(Leave the `if (video.readyState >= 1) { handleLoadedMetadata(); }` block above it intact.)

- [ ] **Step 8: Delete the 5 buffering `removeEventListener` lines**

In the effect's cleanup, delete (~lines 591–596):
```ts
      // Buffering events
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('stalled', handleStalled);
```
(Leave the 9 non-buffering `removeEventListener` lines intact. Do NOT change the effect's dependency array.)

- [ ] **Step 9: Delete the buffer reset in the unmount-cleanup effect**

Delete (~lines 705–706):
```ts
      // Reset buffer state
      setBufferState(DEFAULT_BUFFER_STATE);
```
(Keep the `stopTimeSync()` + `objectUrlRef` revoke logic in that effect.)

- [ ] **Step 10: Typecheck + build + grep guards + tests**

Run: `npx tsc --noEmit`
Expected: clean (no leftover `setBufferState`/`DEFAULT_BUFFER_STATE`/`useState`/`getBufferedRanges`/`calculateBufferedPercent` references in the file).

Run: `git grep -n "setBufferState\|DEFAULT_BUFFER_STATE\|'waiting'\|'stalled'\|getBufferedRanges\|calculateBufferedPercent" src/hooks/useVideoPlayback.ts`
Expected: no matches (all buffering lives in `useVideoBuffering.ts` now).

Run: `npx vitest run src/utils/__tests__/videoBuffer.test.ts`
Expected: PASS (the shared buffer math still green).

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 11: Commit**

```bash
git add src/hooks/useVideoPlayback.ts
git commit -m "refactor: route useVideoPlayback buffering through useVideoBuffering

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Line numbers are approximate anchors — match on the quoted code.
- Behaviour is unchanged: the buffering handlers/listeners/init block are moved verbatim; the big effect keeps all its non-buffering handlers, listeners, and dep array exactly. The only difference is the buffering listeners register once instead of on every store-value change (identical observable behaviour).
- No new unit test: the buffer math (`calculateBufferedPercent`) is already covered by `videoBuffer.test.ts`; `useVideoBuffering` is event-listener + `useState` wiring with no `renderHook` harness. Confidence = existing math test + clean `tsc`/`build` + the grep guards.
- Out of scope: the sync loop, transport commands, store→element effects, `objectUrlRef`, and the double-`startTimeSync` behaviour.
