# Play Thumbnail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a top-down tactical schematic thumbnail of each Play (from `boardAt`) in the `PlayLibrary` cards.

**Architecture:** A pure, store-free `projectSnapshot` helper maps a `BoardSnapshot`'s world positions to 2D SVG coordinates; a thin `PlayThumbnail` component computes the play's end state via `boardAt(fromPhase(phase), 1)`, projects it, and renders an oval field with player/ball dots and path polylines. `PlayLibrary`'s card swaps its placeholder rectangle for the component.

**Tech Stack:** TypeScript, React, inline SVG, Vitest. No new dependencies.

## Global Constraints

- Pure helpers stay store-free (no zustand imports in `thumbnailProjection.ts`).
- Field dimensions come from `FIELD_CONFIG` (`length: 165`, `width: 135`) in `src/models/FieldModel.ts` — do not hard-code 165/135 in the helper body; read from `FIELD_CONFIG`.
- Run tests one file at a time: `npx vitest run <file>` (the full suite OOMs on Windows).
- Typecheck with `npx tsc --noEmit`.
- Commit messages end with the repo's co-author trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: `projectSnapshot` — pure top-down projection

**Files:**
- Create: `src/utils/thumbnailProjection.ts`
- Test: `src/utils/__tests__/thumbnailProjection.test.ts`

**Interfaces:**
- Consumes: `BoardSnapshot` from `src/utils/boardSnapshot.ts`; `FIELD_CONFIG` from `src/models/FieldModel.ts`.
- Produces:
  - `interface ThumbnailViewBox { width: number; height: number; padding: number; }`
  - `interface ThumbnailPrimitives { field: { cx: number; cy: number; rx: number; ry: number }; players: { x: number; y: number; color: string }[]; ball: { x: number; y: number } | null; paths: { points: [number, number][] }[]; }`
  - `function projectSnapshot(snap: BoardSnapshot, viewBox: ThumbnailViewBox): ThumbnailPrimitives`

- [ ] **Step 1: Write the failing test file**

Create `src/utils/__tests__/thumbnailProjection.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { projectSnapshot, type ThumbnailViewBox } from '../thumbnailProjection';
import type { BoardSnapshot } from '../boardSnapshot';
import { createMovementPath } from '../../models/PathModel';
import { createBall } from '../../models/BallModel';
import type { Player } from '../../models/PlayerModel';
import type { MovementPath } from '../../models/PathModel';

const VB: ThumbnailViewBox = { width: 200, height: 164, padding: 12 };

function snapshot(over: Partial<BoardSnapshot> = {}): BoardSnapshot {
  return { players: [], paths: [], annotations: [], camera: null, ball: null, cones: [], ...over };
}

function player(id: string, position: [number, number, number], color = '#fff'): Player {
  return { id, teamId: 'team1', position, rotation: 0, color };
}

describe('projectSnapshot', () => {
  it('places the field oval filling the padded viewBox', () => {
    expect(projectSnapshot(snapshot(), VB).field).toEqual({ cx: 100, cy: 82, rx: 88, ry: 70 });
  });

  it('maps the world origin to the viewBox centre', () => {
    const { players } = projectSnapshot(snapshot({ players: [player('p1', [0, 0, 0])] }), VB);
    expect(players[0].x).toBeCloseTo(100, 5);
    expect(players[0].y).toBeCloseTo(82, 5);
  });

  it('maps the field extremes to the padded box edges', () => {
    const snap = snapshot({
      players: [player('max', [165 / 2, 0, 135 / 2]), player('min', [-165 / 2, 0, -135 / 2])],
    });
    const { players } = projectSnapshot(snap, VB);
    expect([players[0].x, players[0].y]).toEqual([188, 152]);
    expect([players[1].x, players[1].y]).toEqual([12, 12]);
  });

  it('carries each player colour through', () => {
    const { players } = projectSnapshot(snapshot({ players: [player('p1', [0, 0, 0], '#ff0000')] }), VB);
    expect(players[0].color).toBe('#ff0000');
  });

  it('yields a null ball when the snapshot has none', () => {
    expect(projectSnapshot(snapshot(), VB).ball).toBeNull();
  });

  it('projects the ball when present', () => {
    expect(projectSnapshot(snapshot({ ball: createBall([0, 0.5, 0]) }), VB).ball).toEqual({ x: 100, y: 82 });
  });

  it('projects each path with at least two keyframes into a polyline', () => {
    const path = createMovementPath('p1', 'player', [0, 0, 0], [82.5, 0, 67.5], 5, 'path-1');
    const { paths } = projectSnapshot(snapshot({ paths: [path] }), VB);
    expect(paths).toHaveLength(1);
    expect(paths[0].points).toEqual([[100, 82], [188, 152]]);
  });

  it('omits a path with fewer than two keyframes', () => {
    const stub: MovementPath = {
      ...createMovementPath('p1', 'player', [0, 0, 0], [1, 0, 1], 5, 'p'),
      keyframes: [{ timestamp: 0, position: [0, 0, 0] }],
    };
    expect(projectSnapshot(snapshot({ paths: [stub] }), VB).paths).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/utils/__tests__/thumbnailProjection.test.ts`
Expected: FAIL — cannot resolve `../thumbnailProjection` / `projectSnapshot is not a function`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/thumbnailProjection.ts`:

```ts
import type { BoardSnapshot } from './boardSnapshot';
import { FIELD_CONFIG } from '../models/FieldModel';

/**
 * thumbnailProjection — pure, store-free projection of a board's world positions
 * onto a 2D thumbnail viewBox for a top-down schematic. Ignores world y (up):
 * x (field length) → horizontal, z (field width) → vertical. All geometry lives
 * behind projectSnapshot; the SVG component just draws the returned primitives.
 */

/** The 2D box the schematic is drawn into, with an inset so edge dots aren't clipped. */
export interface ThumbnailViewBox {
  width: number;
  height: number;
  padding: number;
}

/** Flat draw primitives in viewBox coordinates. */
export interface ThumbnailPrimitives {
  field: { cx: number; cy: number; rx: number; ry: number };
  players: { x: number; y: number; color: string }[];
  ball: { x: number; y: number } | null;
  paths: { points: [number, number][] }[];
}

/** Project a snapshot's players, ball, and paths into the viewBox as draw primitives. */
export function projectSnapshot(snap: BoardSnapshot, viewBox: ThumbnailViewBox): ThumbnailPrimitives {
  const { length: L, width: W } = FIELD_CONFIG;
  const { width, height, padding } = viewBox;
  const drawW = width - 2 * padding;
  const drawH = height - 2 * padding;

  const project = (x: number, z: number): [number, number] => [
    padding + (x / L + 0.5) * drawW,
    padding + (z / W + 0.5) * drawH,
  ];

  const players = snap.players.map((p) => {
    const [x, y] = project(p.position[0], p.position[2]);
    return { x, y, color: p.color };
  });

  let ball: { x: number; y: number } | null = null;
  if (snap.ball) {
    const [x, y] = project(snap.ball.position[0], snap.ball.position[2]);
    ball = { x, y };
  }

  const paths = snap.paths
    .filter((path) => path.keyframes.length >= 2)
    .map((path) => ({
      points: path.keyframes.map((kf) => project(kf.position[0], kf.position[2])) as [number, number][],
    }));

  return {
    field: { cx: width / 2, cy: height / 2, rx: drawW / 2, ry: drawH / 2 },
    players,
    ball,
    paths,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/utils/__tests__/thumbnailProjection.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/utils/thumbnailProjection.ts src/utils/__tests__/thumbnailProjection.test.ts
git commit -m "feat: add projectSnapshot — pure top-down thumbnail projection"
```

---

### Task 2: `PlayThumbnail` component + `PlayLibrary` integration

**Files:**
- Create: `src/components/UI/PlayThumbnail.tsx`
- Modify: `src/components/UI/PlayLibrary.tsx` (the `PlayCard` thumbnail box, ~line 189)

**Interfaces:**
- Consumes: `Play` from `src/models/PlayModel.ts`; `fromPhase` from `src/utils/boardSnapshot.ts`; `boardAt` from `src/utils/boardPlayback.ts`; `projectSnapshot` + `ThumbnailViewBox` from `src/utils/thumbnailProjection.ts` (Task 1).
- Produces: `function PlayThumbnail({ play }: { play: Play }): JSX.Element` — an absolutely-positioned `<svg>` filling its container.

This task is UI (SVG output). There is no meaningful unit test to write; verification is typecheck plus a visual check in the running app. Do NOT add a test file.

- [ ] **Step 1: Write the component**

Create `src/components/UI/PlayThumbnail.tsx`:

```tsx
import type { Play } from '../../models/PlayModel';
import type { BoardSnapshot } from '../../utils/boardSnapshot';
import { fromPhase } from '../../utils/boardSnapshot';
import { boardAt } from '../../utils/boardPlayback';
import { projectSnapshot, type ThumbnailViewBox } from '../../utils/thumbnailProjection';

const VIEWBOX: ThumbnailViewBox = { width: 200, height: 164, padding: 12 };
const EMPTY: BoardSnapshot = { players: [], paths: [], annotations: [], camera: null, ball: null, cones: [] };

/**
 * PlayThumbnail — a store-free top-down schematic of a Play's end state. Computes
 * boardAt(phase, 1) so tokens/ball sit at their path ends, projects to 2D, and draws
 * an oval field with path polylines, player dots (team colour), and a ball dot.
 */
export function PlayThumbnail({ play }: { play: Play }) {
  const phase = play.phases[0];
  const prims = projectSnapshot(phase ? boardAt(fromPhase(phase), 1) : EMPTY, VIEWBOX);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <ellipse
        cx={prims.field.cx}
        cy={prims.field.cy}
        rx={prims.field.rx}
        ry={prims.field.ry}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1.5}
      />
      {prims.paths.map((p, i) => (
        <polyline
          key={i}
          points={p.points.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke="rgba(0,212,170,0.5)"
          strokeWidth={1.5}
        />
      ))}
      {prims.players.map((pl, i) => (
        <circle key={i} cx={pl.x} cy={pl.y} r={4} fill={pl.color} stroke="rgba(0,0,0,0.4)" strokeWidth={0.5} />
      ))}
      {prims.ball && (
        <circle cx={prims.ball.x} cy={prims.ball.y} r={2.5} fill="#ffffff" stroke="rgba(0,0,0,0.5)" strokeWidth={0.75} />
      )}
    </svg>
  );
}
```

- [ ] **Step 2: Import the component in `PlayLibrary.tsx`**

At the top of `src/components/UI/PlayLibrary.tsx`, after the existing imports (the last import is `import type { Play } from '../../models/PlayModel';`), add:

```ts
import { PlayThumbnail } from './PlayThumbnail';
```

- [ ] **Step 3: Swap the placeholder rectangle for the thumbnail**

In `PlayLibrary.tsx`, inside `PlayCard`'s thumbnail box, find this line (~189, directly after the radial-gradient `<div>`):

```tsx
        <div style={{ position: 'relative', width: 80, height: 60, border: '1px solid #2a5a2a', borderRadius: 3 }} />
```

Replace it with:

```tsx
        <PlayThumbnail play={play} />
```

Leave the surrounding box, the gradient `<div>` above it, and the video badges / clip strip below it unchanged. (The gradient is `position: absolute; inset: 0`; the thumbnail is also absolute `inset: 0` and comes after it in the DOM, so it renders above the gradient and below the badges.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Visual check in the app**

Run: `npm run dev`, open the app, navigate into a playbook with saved Plays.
Expected: each card's thumbnail area shows an oval field with coloured dots for players, a white dot for the ball, and teal lines for any movement paths (dots sitting at the path ends). A Play with no movement shows dots at their arranged positions; an empty Play shows just the oval. The video badge and clip-duration strip still render over the thumbnail.

Note: if the app cannot be run in this environment, record that the SVG was verified by typecheck + Task 1's projection tests only, not a live browser check.

- [ ] **Step 6: Commit**

```bash
git add src/components/UI/PlayThumbnail.tsx src/components/UI/PlayLibrary.tsx
git commit -m "feat: add PlayThumbnail SVG component and use it in PlayLibrary cards"
```

---

## Self-Review

**Spec coverage:**
- `projectSnapshot` pure helper + projection math + types → Task 1. ✓
- `PlayThumbnail` SVG component (boardAt → project → svg) → Task 2, Step 1. ✓
- Integration swapping the placeholder in `PlayLibrary` → Task 2, Steps 2–3. ✓
- Edge cases (no phase → oval only; no players; null ball; <2-keyframe path) → covered by Task 1 tests (null ball, <2 keyframes) and the component's `phase ? … : EMPTY` guard + projection over possibly-empty arrays. ✓
- Store-free projection tests → Task 1, Step 1. ✓
- Element scope players + ball + paths only (no cones/annotations) → `projectSnapshot` reads only `players`/`ball`/`paths`. ✓

**Placeholder scan:** No TBD/TODO; all code shown in full. ✓

**Type consistency:** `ThumbnailViewBox`/`ThumbnailPrimitives`/`projectSnapshot` names and shapes match between Task 1's Produces block, its implementation, and Task 2's consumption. `VIEWBOX = { width: 200, height: 164, padding: 12 }` matches the test's `VB`. Field result `{ cx: 100, cy: 82, rx: 88, ry: 70 }` matches the derived math. ✓
