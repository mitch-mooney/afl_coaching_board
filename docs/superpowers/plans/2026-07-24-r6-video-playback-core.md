# R6 Extract useVideoPlayback Pure Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `useVideoPlayback`'s buffer math into a pure, unit-tested `videoBuffer.ts` leaf, and dedup its inline frame conversions onto `videoUtils` — with no behaviour change.

**Architecture:** New pure-leaf `src/utils/videoBuffer.ts` (`getBufferedRanges` adapter + pure `calculateBufferedPercent(ranges, duration)`); the hook drops its local copies and calls the leaf, and replaces inline `Math.floor(currentTime * ASSUMED_FRAME_RATE)` / `frames * (1/ASSUMED_FRAME_RATE)` with `videoUtils.timeToFrame`/`frameToTime`. Mirrors the dragMath/cameraMath extractions.

**Tech Stack:** TypeScript, React, Zustand, Vitest (jsdom env).

## Global Constraints

- **Behaviour-preserving.** `calculateBufferedPercent`'s formula + guards are unchanged (just made pure). `timeToFrame(t) = Math.floor(t*30)` is bit-identical to the inline math; `frameToTime(n) = n/30` equals the old `n*(1/30)` exactly at every reachable call site (callers pass `frames=1`) and differs by ≤1 ULP otherwise (negligible, seek-clamped). Do NOT "optimize" the double `video.buffered` read at the call sites — keep it a literal move.
- **Only extract the pure core.** Do NOT restructure the rAF loop, transport commands, or the DOM event-listener effect (out of scope — that's the declined structural split).
- **Full vitest run OOMs on Windows** (pre-existing) — run `videoBuffer.test.ts` targeted; verify the hook repoint with `npx tsc --noEmit` + `npm run build` (no `renderHook` in the repo).
- **Commit footer:** end each commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `videoBuffer.ts` pure leaf + tests

**Files:**
- Create: `src/utils/videoBuffer.ts`
- Test: `src/utils/__tests__/videoBuffer.test.ts`

**Interfaces:**
- Produces (relied on by Task 2):
  - `interface BufferedRange { start: number; end: number }`
  - `getBufferedRanges(video: HTMLVideoElement): BufferedRange[]`
  - `calculateBufferedPercent(ranges: BufferedRange[], duration: number): number`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/videoBuffer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getBufferedRanges, calculateBufferedPercent } from '../videoBuffer';

describe('calculateBufferedPercent', () => {
  it('returns 0 when nothing is buffered', () => {
    expect(calculateBufferedPercent([], 100)).toBe(0);
  });

  it('returns 0 when duration is 0', () => {
    expect(calculateBufferedPercent([{ start: 0, end: 50 }], 0)).toBe(0);
  });

  it('computes the buffered fraction of the duration as a percent', () => {
    expect(calculateBufferedPercent([{ start: 0, end: 50 }], 100)).toBe(50);
  });

  it('sums multiple buffered ranges', () => {
    expect(
      calculateBufferedPercent([{ start: 0, end: 25 }, { start: 50, end: 75 }], 100)
    ).toBe(50);
  });

  it('caps at 100', () => {
    expect(calculateBufferedPercent([{ start: 0, end: 200 }], 100)).toBe(100);
  });
});

describe('getBufferedRanges', () => {
  it('reads a video element buffered TimeRanges into {start,end} objects', () => {
    const starts = [0, 60];
    const ends = [30, 90];
    const fakeVideo = {
      buffered: {
        length: 2,
        start: (i: number) => starts[i],
        end: (i: number) => ends[i],
      },
    } as unknown as HTMLVideoElement;
    expect(getBufferedRanges(fakeVideo)).toEqual([
      { start: 0, end: 30 },
      { start: 60, end: 90 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/videoBuffer.test.ts`
Expected: FAIL — `Failed to resolve import "../videoBuffer"`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/videoBuffer.ts`:

```ts
export interface BufferedRange {
  start: number;
  end: number;
}

/** Adapter: read a video element's buffered TimeRanges as plain {start,end} objects. */
export function getBufferedRanges(video: HTMLVideoElement): BufferedRange[] {
  const ranges: BufferedRange[] = [];
  for (let i = 0; i < video.buffered.length; i++) {
    ranges.push({ start: video.buffered.start(i), end: video.buffered.end(i) });
  }
  return ranges;
}

/**
 * Percentage (0..100) of the video duration that is buffered — sum of the
 * buffered range lengths over duration, capped at 100. Returns 0 when duration
 * is 0/falsy or nothing is buffered.
 */
export function calculateBufferedPercent(ranges: BufferedRange[], duration: number): number {
  if (!duration || duration === 0) return 0;
  if (ranges.length === 0) return 0;
  let total = 0;
  for (const range of ranges) total += range.end - range.start;
  return Math.min((total / duration) * 100, 100);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/videoBuffer.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.

```bash
git add src/utils/videoBuffer.ts src/utils/__tests__/videoBuffer.test.ts
git commit -m "feat: add videoBuffer pure leaf (buffered ranges + percent) + tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Repoint `useVideoPlayback` onto `videoBuffer` + `videoUtils` frame math

**Files:**
- Modify: `src/hooks/useVideoPlayback.ts`

**Interfaces:**
- Consumes: `getBufferedRanges`, `calculateBufferedPercent` from `../utils/videoBuffer` (Task 1);
  `timeToFrame`, `frameToTime` from `../utils/videoUtils`.

- [ ] **Step 1: Update imports**

Change the `videoUtils` import (line 3):
```ts
import { supportsVideoFrameCallback, clampTime } from '../utils/videoUtils';
```
to:
```ts
import { supportsVideoFrameCallback, clampTime, frameToTime, timeToFrame } from '../utils/videoUtils';
```
Add, right after it:
```ts
import { getBufferedRanges, calculateBufferedPercent } from '../utils/videoBuffer';
```

- [ ] **Step 2: Delete the local buffer helpers**

Delete both module-level definitions (the doc comments + bodies, ~lines 106–134):
```ts
/**
 * Helper function to get buffered ranges from a video element
 */
function getBufferedRanges(video: HTMLVideoElement): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < video.buffered.length; i++) {
    ranges.push({
      start: video.buffered.start(i),
      end: video.buffered.end(i),
    });
  }
  return ranges;
}

/**
 * Helper function to calculate buffered percentage
 */
function calculateBufferedPercent(video: HTMLVideoElement): number {
  if (!video.duration || video.duration === 0) return 0;
  if (video.buffered.length === 0) return 0;

  // Get total buffered time
  let totalBuffered = 0;
  for (let i = 0; i < video.buffered.length; i++) {
    totalBuffered += video.buffered.end(i) - video.buffered.start(i);
  }

  return Math.min((totalBuffered / video.duration) * 100, 100);
}
```

- [ ] **Step 3: Delete the now-unused `ASSUMED_FRAME_RATE`**

Delete the constant (~line 81):
```ts
const ASSUMED_FRAME_RATE = 30;
```

- [ ] **Step 4: Repoint the 4 buffer-state call sites**

There are 4 identical lines (`handleCanPlay`, `handleCanPlayThrough`, `handleProgress`, and the
already-buffered init block). Replace every occurrence of:
```ts
        bufferedPercent: calculateBufferedPercent(video),
```
with:
```ts
        bufferedPercent: calculateBufferedPercent(getBufferedRanges(video), video.duration),
```
(Leave each adjacent `bufferedRanges: getBufferedRanges(video),` line unchanged.)

- [ ] **Step 5: Dedup `currentFrame`**

Replace (~line 446):
```ts
  const currentFrame = Math.floor(currentTime * ASSUMED_FRAME_RATE);
```
with:
```ts
  const currentFrame = timeToFrame(currentTime);
```

- [ ] **Step 6: Dedup the two `stepFrame` bodies**

In `stepFrameForward` (~lines 363–364), replace:
```ts
      const frameDuration = 1 / ASSUMED_FRAME_RATE;
      const newTime = clampTime(video.currentTime + frames * frameDuration, video.duration);
```
with:
```ts
      const newTime = clampTime(video.currentTime + frameToTime(frames), video.duration);
```
In `stepFrameBackward` (~lines 384–385), replace:
```ts
      const frameDuration = 1 / ASSUMED_FRAME_RATE;
      const newTime = clampTime(video.currentTime - frames * frameDuration, video.duration);
```
with:
```ts
      const newTime = clampTime(video.currentTime - frameToTime(frames), video.duration);
```

- [ ] **Step 7: Typecheck + build + grep**

Run: `npx tsc --noEmit` → clean.

Run: `git grep -n "ASSUMED_FRAME_RATE\|function calculateBufferedPercent\|function getBufferedRanges" src/hooks/useVideoPlayback.ts`
Expected: no matches (the constant + the local buffer helpers are gone from the hook).

Run: `npm run build` → `✓ built`.

Run: `npx vitest run src/utils/__tests__/videoBuffer.test.ts` → still PASS (6 tests).

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useVideoPlayback.ts
git commit -m "refactor: route useVideoPlayback buffer/frame math through videoBuffer + videoUtils

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Line numbers are approximate anchors — match on the quoted code.
- Behaviour is unchanged: the buffer formula/guards are identical (now pure), and `timeToFrame`/
  `frameToTime` produce the same numbers as the deleted inline math. No new component test (no
  `renderHook`) — the hook repoint is build-verified.
- Out of scope: the rAF/frame-callback loop, transport commands, the DOM event-listener effect, and
  the `BufferState`/`DEFAULT_BUFFER_STATE` shape (they stay in the hook).
