# MainLayout JSX-Blob Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract MainLayout's two big inline JSX blobs into presentational components — `EditorTopBar` and `LinkedVideoBar` — with no behaviour change.

**Architecture:** The JSX moves verbatim into `src/components/Layout/{EditorTopBar,LinkedVideoBar}.tsx`; each component takes the MainLayout values it renders and callbacks for its `onClick`s. MainLayout replaces the two blobs with the two components. Mirrors the §6c modal extractions.

**Tech Stack:** TypeScript, React, Zustand.

## Global Constraints

- **Verbatim JSX move.** Copy each blob's markup/styles unchanged; only replace inline `onClick` bodies with the specified prop callbacks. Do not restyle or restructure.
- **Behaviour-preserving.** The consolidated `onSelectTab` must reproduce the three inline tab handlers exactly (see Task 1).
- **Presentational only** — the components take props; they do NOT read stores directly.
- **Full vitest run OOMs on Windows** (pre-existing) — no unit test (no RTL/`renderHook`); verify with `npx tsc --noEmit` + `npm run build`.
- **Commit footer:** end each commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Extract `EditorTopBar`

**Files:**
- Create: `src/components/Layout/EditorTopBar.tsx`
- Modify: `src/components/Layout/MainLayout.tsx`

**Interfaces:**
- Produces: `EditorTopBar` component with props
  `{ editorTab: 'board'|'video'|'training'; mode: 'match'|'training'; isConePlacementActive: boolean; onBack: () => void; onSelectTab: (tab: 'board'|'video'|'training') => void; onExitConePlacement: () => void }`.

- [ ] **Step 1: Create `EditorTopBar.tsx`**

Move the entire top-bar block from `MainLayout.tsx` — the `{/* Top bar */}` `<div className="absolute top-0 …">…</div>` (its opening `<div className="absolute top-0 left-0 right-0 z-30 …">` through its matching closing `</div>`) — into a new component's `return`. Wrap it:

```tsx
interface EditorTopBarProps {
  editorTab: 'board' | 'video' | 'training';
  mode: 'match' | 'training';
  isConePlacementActive: boolean;
  onBack: () => void;
  onSelectTab: (tab: 'board' | 'video' | 'training') => void;
  onExitConePlacement: () => void;
}

export function EditorTopBar({
  editorTab, mode, isConePlacementActive, onBack, onSelectTab, onExitConePlacement,
}: EditorTopBarProps) {
  return (
    /* the moved top-bar <div className="absolute top-0 …"> … </div> */
  );
}
```

Apply these `onClick` substitutions to the moved JSX (everything else stays byte-identical):
- back button `onClick={() => navigate('/')}` → `onClick={onBack}`
- Board tab `onClick={() => { setEditorTab('board'); if (mode === 'training') switchMode('match'); }}` → `onClick={() => onSelectTab('board')}`
- Video tab `onClick={() => { setEditorTab('video'); if (mode === 'training') switchMode('match'); }}` → `onClick={() => onSelectTab('video')}`
- Training tab `onClick={() => { setEditorTab('training'); switchMode('training'); }}` → `onClick={() => onSelectTab('training')}`
- "← Training" button `onClick={() => { setConePlacementActive(false); setEditorTab('training'); }}` → `onClick={onExitConePlacement}`

The cone-controls block keeps its `{editorTab === 'board' && mode === 'training' && ( … )}` gate and its `{isConePlacementActive && ( … )}` inner gate — both use the props. No React/store imports are needed in this file (pure presentational — it references only the props).

- [ ] **Step 2: Repoint MainLayout**

Add `import { EditorTopBar } from './EditorTopBar';`. Replace the moved top-bar block with:
```tsx
      <EditorTopBar
        editorTab={editorTab}
        mode={mode}
        isConePlacementActive={isConePlacementActive}
        onBack={() => navigate('/')}
        onSelectTab={(tab) => {
          setEditorTab(tab);
          if (tab === 'training') switchMode('training');
          else if (mode === 'training') switchMode('match');
        }}
        onExitConePlacement={() => { setConePlacementActive(false); setEditorTab('training'); }}
      />
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit` → clean.
Run: `npm run build` → `✓ built`.

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout/EditorTopBar.tsx src/components/Layout/MainLayout.tsx
git commit -m "refactor: extract EditorTopBar from MainLayout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Extract `LinkedVideoBar`

**Files:**
- Create: `src/components/Layout/LinkedVideoBar.tsx`
- Modify: `src/components/Layout/MainLayout.tsx`

**Interfaces:**
- Produces: `LinkedVideoBar` component with props
  `{ moment: LinkedVideoMoment; available: boolean; onPreview: () => void; onUnlink: () => void }`.

- [ ] **Step 1: Create `LinkedVideoBar.tsx`**

Move the linked-video chip's inner JSX — the `<div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top…', … }}>…</div>` that is currently the body of `{editorTab === 'board' && linkedVideoMoment && ( … )}` — into a new component:

```tsx
import { formatVideoTime } from '../../utils/videoUtils';
import type { LinkedVideoMoment } from '../../models/PlayModel';

interface LinkedVideoBarProps {
  moment: LinkedVideoMoment;
  available: boolean;
  onPreview: () => void;
  onUnlink: () => void;
}

export function LinkedVideoBar({ moment, available, onPreview, onUnlink }: LinkedVideoBarProps) {
  return (
    /* the moved <div style={{ position: 'absolute', … }}> … </div> */
  );
}
```

Apply these substitutions to the moved JSX (everything else byte-identical):
- every `linkedVideoMoment` reference → `moment` (e.g. `moment.quarter`, `moment.startTime`, `moment.endTime`)
- the `linkedVideoAvailable ? (…) : (…)` ternary → `available ? (…) : (…)`
- both primary buttons — "▶ Preview" (`onClick={() => setEditorTab('video')}`) and "Load video →" (`onClick={() => setEditorTab('video')}`) → `onClick={onPreview}`
- both secondary buttons — "✕" and "Unlink" (`onClick={handleUnlink}`) → `onClick={onUnlink}`
- `formatVideoTime(…)` calls stay (now imported in this file).

- [ ] **Step 2: Repoint MainLayout**

Add `import { LinkedVideoBar } from './LinkedVideoBar';`. Replace the chip block with:
```tsx
      {editorTab === 'board' && linkedVideoMoment && (
        <LinkedVideoBar
          moment={linkedVideoMoment}
          available={!!linkedVideoAvailable}
          onPreview={() => setEditorTab('video')}
          onUnlink={handleUnlink}
        />
      )}
```

- [ ] **Step 3: Drop the now-unused `formatVideoTime` import**

`formatVideoTime` was only used by the chip. Remove its import from `MainLayout.tsx`
(`import { formatVideoTime } from '../../utils/videoUtils';`). (Confirm with the grep in Step 4 — if any other MainLayout code still uses it, keep it, but the chip was its only user.)

- [ ] **Step 4: Typecheck + build + grep guard**

Run: `npx tsc --noEmit` → clean.

Run: `git grep -n "VIDEO LINKED\|Tap field to place cone\|formatVideoTime\|handleUnlink" src/components/Layout/MainLayout.tsx`
Expected: `VIDEO LINKED` and `Tap field to place cone` gone (moved to the components); `formatVideoTime` gone (import removed); `handleUnlink` still present (its definition + the `onUnlink={handleUnlink}` wiring).

Run: `npm run build` → `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout/LinkedVideoBar.tsx src/components/Layout/MainLayout.tsx
git commit -m "refactor: extract LinkedVideoBar from MainLayout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- The JSX moves **verbatim** — the only edits are the `onClick`/reference substitutions listed per task. Do not touch markup, styles, gates, or the surrounding MainLayout code (Canvas, VideoWorkspace, TrainingMode, GlobalDrawer, effects).
- `handleUnlink` stays defined in MainLayout (it uses `updatePlay`/`activePlayId`); it's passed as `onUnlink`.
- No unit test (presentational components, no RTL/`renderHook` harness). Confidence = clean `tsc`/`build` + the grep guard + verbatim move.
- Out of scope: the lifecycle orchestration effects (autosave/load/init/touch), and anything outside the two blobs.
