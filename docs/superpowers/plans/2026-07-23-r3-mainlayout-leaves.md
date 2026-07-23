# R3 MainLayout Leaf Extractions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carve the two self-contained leaves out of the `MainLayout` god-component — a shared unit-tested `formatVideoTime` (deduping `MainLayout` + `VideoWorkspace`) and a `SkyDome` Scene component — with no behaviour change.

**Architecture:** `formatVideoTime` (currently duplicated verbatim in two components) moves into `src/utils/videoUtils.ts` as an exact, round-based export beside the existing floor-based `formatTime`, gaining a unit test. `SkyDome` + its private `generateCrowdTexture` move into a new `src/components/Scene/SkyDome.tsx` leaf. Both are verbatim moves — same runtime output.

**Tech Stack:** TypeScript, React, React Three Fiber, THREE.js, Vitest (jsdom env).

## Global Constraints

- **Behaviour-preserving refactor.** Runtime output must be identical. In particular, `formatVideoTime` uses `Math.round(seconds % 60)` (NOT floor) — preserve the rounding exactly, including the `"0:60"` result it produces at e.g. `59.6s`. Do **not** "fix" that edge; fixing it is an out-of-scope behaviour change.
- **`formatVideoTime` stays distinct from `formatTime`.** Do not unify them — `formatTime` floors and adds hh:mm:ss; `formatVideoTime` rounds and is minute-only. They coexist by design.
- **Verbatim moves.** `SkyDome` / `generateCrowdTexture` bodies and the `formatVideoTime` body move byte-for-byte; only their location changes.
- **Full vitest run OOMs on Windows** (pre-existing) — run `videoUtils` targeted; verify the component repoints with `npx tsc --noEmit` + `npm run build` (none of `MainLayout`/`VideoWorkspace`/`SkyDome` have component-level tests).
- **Commit footer:** end each commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Shared `formatVideoTime` (dedup + test)

**Files:**
- Modify: `src/utils/videoUtils.ts` (add export near `formatTime`, ~line 495)
- Test: `src/utils/__tests__/videoUtils.test.ts` (add import + describe block)
- Modify: `src/components/Layout/MainLayout.tsx` (delete local def lines 45–49; add import)
- Modify: `src/components/VideoImport/VideoWorkspace.tsx` (delete local def lines 9–13; add import)

**Interfaces:**
- Consumes: nothing new.
- Produces: `formatVideoTime(seconds: number): string` exported from `src/utils/videoUtils.ts`.

- [ ] **Step 1: Write the failing test**

In `src/utils/__tests__/videoUtils.test.ts`, add `formatVideoTime` to the existing import block from `'../videoUtils'` — insert it right after the `formatTime,` line (under the `// Time formatting` comment):

```ts
  formatTime,
  formatVideoTime,
  formatTimeWithMs,
```

Then append this describe block at the end of the file:

```ts
describe('formatVideoTime', () => {
  it('formats zero and pads single-digit seconds', () => {
    expect(formatVideoTime(0)).toBe('0:00');
    expect(formatVideoTime(5)).toBe('0:05');
  });

  it('formats minutes and seconds', () => {
    expect(formatVideoTime(65)).toBe('1:05');
    expect(formatVideoTime(600)).toBe('10:00');
  });

  it('rounds fractional seconds (not floor)', () => {
    expect(formatVideoTime(90.4)).toBe('1:30');
    expect(formatVideoTime(90.6)).toBe('1:31');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/videoUtils.test.ts`
Expected: FAIL — `formatVideoTime` is not exported from `../videoUtils` (import resolves to `undefined`, calls throw / assertions fail).

- [ ] **Step 3: Add the export to `videoUtils.ts`**

In `src/utils/videoUtils.ts`, immediately after the `formatTime` function (which ends around line 495, before `formatTimeWithMs`), add:

```ts
/**
 * Formats seconds to "m:ss" for the linked-video moment chip. Unlike formatTime
 * (which floors and supports hh:mm:ss), this rounds the seconds and is
 * minute-only. Kept distinct to preserve the moment chip's existing display.
 */
export function formatVideoTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/videoUtils.test.ts`
Expected: PASS (the new `formatVideoTime` block green, plus all pre-existing videoUtils tests still green).

- [ ] **Step 5: Repoint `MainLayout.tsx`**

Delete the local definition (lines 45–49):
```ts
function formatVideoTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```
Add the import — put it next to the other util imports (after `import { restore } from '../../utils/boardSnapshotIO';`, ~line 34):
```ts
import { formatVideoTime } from '../../utils/videoUtils';
```

- [ ] **Step 6: Repoint `VideoWorkspace.tsx`**

Delete the local definition (lines 9–13):
```ts
function formatVideoTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```
Add the import — after the existing `import { useUIStore } from '../../store/uiStore';` line (~line 7):
```ts
import { formatVideoTime } from '../../utils/videoUtils';
```

- [ ] **Step 7: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: clean (both call sites now resolve `formatVideoTime` from `videoUtils`; no duplicate-definition or unused warnings).

Run: `npm run build`
Expected: `✓ built`, no errors.

- [ ] **Step 8: Commit**

```bash
git add src/utils/videoUtils.ts src/utils/__tests__/videoUtils.test.ts src/components/Layout/MainLayout.tsx src/components/VideoImport/VideoWorkspace.tsx
git commit -m "refactor: dedupe formatVideoTime behind a videoUtils export + test

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Extract `SkyDome` into a Scene leaf

**Files:**
- Create: `src/components/Scene/SkyDome.tsx`
- Modify: `src/components/Layout/MainLayout.tsx` (delete `generateCrowdTexture` + `SkyDome` defs and their doc comments, lines 51–113; add import; drop two now-unused imports)

**Interfaces:**
- Consumes: nothing new.
- Produces: `SkyDome` React component exported from `src/components/Scene/SkyDome.tsx`.

- [ ] **Step 1: Create `src/components/Scene/SkyDome.tsx`**

Move the crowd-texture generator and dome component verbatim into the new file:

```tsx
import { useMemo } from 'react';
import { BackSide, CanvasTexture } from 'three';

/**
 * Generates a pixelated AFL stadium crowd texture onto a canvas.
 * The texture wraps the interior of the sky-sphere: the equatorial band
 * (UV v ≈ 0.35–0.65) becomes the crowd stands; above is a floodlit night sky.
 */
function generateCrowdTexture(): HTMLCanvasElement {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Night sky (upper 40% of texture = v > 0.6 on the sphere) ──────────────
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.42);
  skyGrad.addColorStop(0, '#01020a');
  skyGrad.addColorStop(0.6, '#04060f');
  skyGrad.addColorStop(1, '#080e1c');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H * 0.42);

  // Floodlight glow blobs (4 lights evenly spaced around the dome)
  const lightPositions = [0.12, 0.38, 0.62, 0.88];
  for (const lx of lightPositions) {
    const x = lx * W, y = H * 0.06;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 90);
    grad.addColorStop(0, 'rgba(255,252,240,1.0)');
    grad.addColorStop(0.05, 'rgba(255,240,180,0.9)');
    grad.addColorStop(0.2, 'rgba(200,170,80,0.3)');
    grad.addColorStop(1, 'rgba(50,80,150,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, 40, 55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Lower dome — smooth dark gradient (stadium stands are 3D geometry now) ──
  const lowerGrad = ctx.createLinearGradient(0, H * 0.38, 0, H);
  lowerGrad.addColorStop(0, '#080e1c');
  lowerGrad.addColorStop(0.4, '#04060a');
  lowerGrad.addColorStop(1, '#010204');
  ctx.fillStyle = lowerGrad;
  ctx.fillRect(0, H * 0.38, W, H * 0.62);

  return canvas;
}

/**
 * Stadium sky dome — large inverted sphere with a pixelated crowd texture.
 * Wraps a procedurally-generated canvas texture around the scene.
 */
export function SkyDome() {
  const texture = useMemo(() => {
    const canvas = generateCrowdTexture();
    return new CanvasTexture(canvas);
  }, []);

  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[800, 48, 24]} />
      <meshBasicMaterial map={texture} side={BackSide} depthWrite={false} />
    </mesh>
  );
}
```

- [ ] **Step 2: Repoint `MainLayout.tsx`**

Delete the moved code — the `formatVideoTime`-free span from the `generateCrowdTexture` doc comment through the end of the `SkyDome` function (originally lines 51–113, i.e. everything from `/**\n * Generates a pixelated AFL stadium crowd texture…` down to the closing `}` of `SkyDome`, including the blank line after). After Task 1 removed `formatVideoTime`, this is the block that remains between the imports and `export function MainLayout()`.

Add the import — next to the other Scene imports (after `import { Scoreboard } from '../Scene/Scoreboard';`, ~line 9):
```ts
import { SkyDome } from '../Scene/SkyDome';
```

Drop the two now-unused imports:
- Delete `import { BackSide, CanvasTexture } from 'three';` (was line 2 — SkyDome-only).
- Remove `useMemo` from the React import (was `import { useEffect, useRef, useState, useCallback, useMemo } from 'react';`) → `import { useEffect, useRef, useState, useCallback } from 'react';` (SkyDome was the only `useMemo` user).

Leave the `<SkyDome />` usage inside the `<Canvas>` unchanged.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (`BackSide`/`CanvasTexture`/`useMemo` are gone from `MainLayout` and only referenced in `SkyDome.tsx`; no unused-symbol or missing-symbol errors.)

- [ ] **Step 4: Confirm the move**

Run: `git grep -n "generateCrowdTexture\|CanvasTexture" src/components/Layout/MainLayout.tsx`
Expected: no matches (the texture code lives only in `SkyDome.tsx` now).

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: `✓ built`, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Scene/SkyDome.tsx src/components/Layout/MainLayout.tsx
git commit -m "refactor: extract SkyDome + crowd texture into a Scene leaf

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Line numbers are approximate anchors — match on the quoted code, not the number. Note that Task 1 removes `formatVideoTime` (lines 45–49) *before* Task 2 touches the `SkyDome` block, so by Task 2 the SkyDome block's line numbers have shifted up.
- No behaviour change; there are no new component tests because `MainLayout` / `VideoWorkspace` / `SkyDome` have none today, and `SkyDome` is canvas/three rendering with no pure logic. Confidence comes from the `formatVideoTime` unit test plus a clean typecheck + build.
- Out of scope (do not touch): the tab-switcher JSX, the linked-video chip bar, the lifecycle orchestration effects, and any change to `formatTime`.
