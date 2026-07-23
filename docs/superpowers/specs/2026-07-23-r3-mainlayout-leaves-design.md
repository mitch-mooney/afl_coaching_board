# R3 Wave — MainLayout leaf extractions

> **Status:** Design, ready for implementation-plan.
> **Source:** The deferred §7 architecture pass, audit theme **R3** (god-components). Third and
> final planned R3 wave. Unlike the `dragMath` / `cameraMath` waves, `MainLayout` has **no trapped
> pure-math seam** — it is a 536-line god-component mixing scene setup, an inline sky-dome +
> procedural crowd texture, a duplicated time formatter, two large JSX blobs, and lifecycle
> orchestration. This wave carves out the **self-contained leaves** only; the JSX-blob and
> orchestration decomposition are deferred.

## Context — what the audit found

`MainLayout.tsx` (536 lines) carries several concerns that don't belong in a layout/composition
component:

- **`SkyDome` + `generateCrowdTexture`** (`MainLayout.tsx:51–113`): a scene mesh component and its
  ~40-line procedural canvas crowd texture, defined inline. This is Scene-rendering code living in
  the layout file (Divergent Change: the layout file changes for stadium-texture reasons).
- **`formatVideoTime`** (`MainLayout.tsx:45–49`): a `seconds → "m:ss"` helper **duplicated
  verbatim** in `VideoWorkspace.tsx:9–13` (Duplicated Code).

`videoUtils.ts` already exports a similar `formatTime`, but it **floors** the seconds and adds
`hh:mm:ss` + NaN/negative guards, whereas `formatVideoTime` **rounds** (`Math.round(seconds % 60)`)
and has neither. They are genuinely different functions — see the decision below.

## Goals

1. Move the self-contained Scene leaf (`SkyDome` + crowd texture) out of the layout file into
   `src/components/Scene/`.
2. Kill the verbatim `formatVideoTime` duplication behind one shared, unit-tested util.

## Non-goals (explicitly deferred)

- The two large inline JSX blobs — the tab switcher (`MainLayout.tsx:243–311`) and the linked-video
  chip bar (`313–416`) — a later UI-decomposition slice.
- The lifecycle orchestration effects (autosave-on-unmount, load-play-on-id, init/loadShared,
  touch-listener setup) — a later hooks slice; the riskiest part, left untouched.
- Unifying `formatVideoTime` onto `formatTime` (see decision — kept behaviour-preserving instead).
- Any behaviour change. This is a **behaviour-preserving** extraction.

---

## Design

### 1. `src/components/Scene/SkyDome.tsx` (new file)

Move `generateCrowdTexture` and `SkyDome` **verbatim** into a new Scene leaf. `generateCrowdTexture`
stays module-private (only `SkyDome` uses it); `SkyDome` is the export.

```ts
import { useMemo } from 'react';
import { BackSide, CanvasTexture } from 'three';

function generateCrowdTexture(): HTMLCanvasElement { /* …verbatim from MainLayout… */ }

/**
 * Stadium sky dome — large inverted sphere with a pixelated crowd texture.
 */
export function SkyDome() { /* …verbatim from MainLayout… */ }
```

**`MainLayout.tsx` then:**
- adds `import { SkyDome } from '../Scene/SkyDome';`
- deletes the `generateCrowdTexture` and `SkyDome` definitions (and the doc comments above them)
- drops `import { BackSide, CanvasTexture } from 'three';` (SkyDome-only — confirmed no other use)
- drops `useMemo` from its React import → `import { useEffect, useRef, useState, useCallback } from 'react';` (SkyDome-only — confirmed no other use)

`<SkyDome />` inside the Canvas is unchanged. Behaviour identical.

### 2. `formatVideoTime` → shared `videoUtils` export + test

**Decision (behaviour-preserving):** extract the **exact** round-based `formatVideoTime` into
`videoUtils.ts` as a new export, and repoint both call sites. It coexists with the floor-based
`formatTime` — the two are documented as different (moment-chip rounding vs scrubber flooring).
Unifying onto `formatTime` was rejected: it would shift fractional-second display by up to 1s.

Add to `src/utils/videoUtils.ts` (near `formatTime`):

```ts
/**
 * Formats seconds to "m:ss" for the linked-video moment chip. Unlike formatTime
 * (which floors and supports hh:mm:ss), this rounds the seconds and is minute-only.
 * Kept distinct to preserve the moment chip's existing display.
 */
export function formatVideoTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```

- `MainLayout.tsx`: delete its local `formatVideoTime` (lines 45–49); import
  `formatVideoTime` from `../../utils/videoUtils`. (MainLayout already imports other things; add to
  or alongside existing imports.)
- `VideoWorkspace.tsx`: delete its local `formatVideoTime` (lines 9–13); import it from
  `../../utils/videoUtils`. (Check the relative path from `components/VideoImport/` →
  `../../utils/videoUtils`.)

**Edge case to preserve:** `Math.round(seconds % 60)` can yield `60` at e.g. `59.6s` → `"0:60"`.
That is the current behaviour of both copies, so the extracted function reproduces it exactly (do
**not** "fix" it — that would be a behaviour change out of scope).

### Testing

`src/utils/__tests__/videoUtils.test.ts` (existing) — add a `describe('formatVideoTime')` block:

- `0` → `"0:00"`; `5` → `"0:05"` (zero-pad).
- `65` → `"1:05"`; `600` → `"10:00"`.
- `90.4` → `"1:30"` and `90.6` → `"1:31"` (pins the **rounding**, distinguishing it from a floor).

`SkyDome` gets no unit test — it is canvas/three rendering with no pure logic to assert; covered by
`tsc` + `npm run build`.

## Build sequence (for the plan)

1. Add `formatVideoTime` to `videoUtils.ts` + its test → green. Repoint `MainLayout` and
   `VideoWorkspace`, delete both local copies; typecheck + build green.
2. Create `src/components/Scene/SkyDome.tsx` (move `SkyDome` + `generateCrowdTexture`); repoint
   `MainLayout` (import + delete defs + drop the two now-unused imports); typecheck + build green;
   confirm `generateCrowdTexture`/`CanvasTexture` no longer appear in `MainLayout.tsx`.

Two small commits, build-green between.

## Risks

- **Import cleanup misses.** Dropping `BackSide`/`CanvasTexture`/`useMemo` from `MainLayout` must
  confirm they're unused elsewhere in the file (already verified: SkyDome-only). `tsc` catches a miss
  (unused imports don't error, but any *removed-yet-still-referenced* symbol would).
- **`formatVideoTime` rounding edge** — the `"0:60"` boundary must be preserved, not fixed.
- **Relative import path** from `VideoWorkspace` (`components/VideoImport/`) to `utils/videoUtils`
  is `../../utils/videoUtils` — verify with `tsc`.

## Testing strategy

TDD for the pure `formatVideoTime` (failing test first, in the existing `videoUtils.test.ts`). The
full vitest run OOMs all-at-once on Windows (pre-existing) — run `videoUtils` targeted, and cover
the `SkyDome`/`MainLayout`/`VideoWorkspace` repoints with `npx tsc --noEmit` + `npm run build`
(none have component-level unit tests).
