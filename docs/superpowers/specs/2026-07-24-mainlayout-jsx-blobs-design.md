# MainLayout JSX-blob split

> **Status:** Design, ready for implementation-plan.
> **Source:** The last optional architecture-pass remainder — the two big inline JSX blobs in the
> `MainLayout` god-component (deferred from R3 wave 3, which extracted `SkyDome` + `formatVideoTime`).
> This wave extracts them into presentational components; the lifecycle orchestration effects are
> **declined** for this slice (higher-risk, separate concern).

## Context

`MainLayout.tsx` inlines two large, self-contained JSX sections:
- **Top bar** (`~173–241`): a back button, the Board/Video/Training tab switcher, and the training-mode
  cone-placement controls. ~68 lines.
- **Linked-video chip bar** (`~243–346`): the "VIDEO LINKED / VIDEO NOT LOADED" chip with Preview /
  Load / Unlink actions, gated on `editorTab === 'board' && linkedVideoMoment`. ~104 lines.

Both are pure presentation wired to a handful of MainLayout values/callbacks. Extracting them shrinks
the god-component by ~170 lines and gives each blob a named home.

## Goal

Move the two JSX blobs into presentational components under `src/components/Layout/`, with MainLayout
passing the values + callbacks. Behaviour-preserving; the JSX moves verbatim.

## Non-goals (declined / deferred)

- **Declined for this slice:** extracting the lifecycle orchestration effects (autosave-on-unmount,
  load-play-on-id, init/loadShared, touch-listener setup) into hooks — higher-risk orchestration, a
  separate later concern.
- Restyling, restructuring the tab logic, or changing the linked-video behaviour. Verbatim JSX move.
- No new store reads inside the components beyond what's passed as props (they stay presentational).

---

## Design

### 1. `src/components/Layout/EditorTopBar.tsx`

The whole top-bar `<div>` (the gradient bar wrapping the back button + tab switcher + training cone
controls). Props:

```ts
interface EditorTopBarProps {
  editorTab: 'board' | 'video' | 'training';
  mode: 'match' | 'training';
  isConePlacementActive: boolean;
  onBack: () => void;
  onSelectTab: (tab: 'board' | 'video' | 'training') => void;
  onExitConePlacement: () => void;
}
```

The tab buttons' `onClick`s become `onSelectTab('board'|'video'|'training')`; the back button →
`onBack`; the training "← Training" button → `onExitConePlacement`. The cone-controls block keeps its
`editorTab === 'board' && mode === 'training'` gate (hence `mode` + `isConePlacementActive` props). All
styles/markup move verbatim.

**MainLayout** wires the callbacks (owning the mode-transition logic that was inline):
```ts
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
`onSelectTab` is verified equivalent to the three inline handlers: board/video → `switchMode('match')`
only when currently in training; training → always `switchMode('training')`.

### 2. `src/components/Layout/LinkedVideoBar.tsx`

The linked-video chip bar's inner content. Props:

```ts
import type { LinkedVideoMoment } from '../../models/PlayModel';

interface LinkedVideoBarProps {
  moment: LinkedVideoMoment;   // non-null (MainLayout gates on it)
  available: boolean;
  onPreview: () => void;       // both the "▶ Preview" and "Load video →" buttons
  onUnlink: () => void;        // both the "✕" and "Unlink" buttons
}
```

Renders the `available ? (LINKED) : (NOT LOADED)` branches verbatim, using `formatVideoTime` (imported
from `../../utils/videoUtils`). Both branches' primary button (`Preview` / `Load video →`) → `onPreview`;
both secondary buttons (`✕` / `Unlink`) → `onUnlink`.

**MainLayout** keeps the outer gate and passes props:
```ts
{editorTab === 'board' && linkedVideoMoment && (
  <LinkedVideoBar
    moment={linkedVideoMoment}
    available={!!linkedVideoAvailable}
    onPreview={() => setEditorTab('video')}
    onUnlink={handleUnlink}
  />
)}
```
`available={!!linkedVideoAvailable}` preserves the original ternary's null-as-false behaviour
(`linkedVideoAvailable` is `boolean | null`).

### MainLayout cleanup

- Replace the two JSX blobs with the two component invocations above.
- Import `EditorTopBar` and `LinkedVideoBar` from `./`.
- Drop the `formatVideoTime` import if it becomes unused (it was only used by the chip — verify with
  grep; `tsc` won't flag it, so check by eye). `navigate` stays (used by `onBack`).

## Testing

Build-verified: `npx tsc --noEmit` + `npm run build`. Presentational component extraction with no unit
test (no RTL/`renderHook` in the repo — same convention as the §6c modal extractions, `SkyDome`, etc.).
Grep guard: after the change, MainLayout contains no `VIDEO LINKED` / `Tap field to place cone` literal
strings (they moved to the components).

## Build sequence (for the plan)

1. Create `EditorTopBar.tsx` (top-bar JSX verbatim, props-wired); repoint MainLayout's top bar; tsc + build.
2. Create `LinkedVideoBar.tsx` (chip JSX verbatim, props-wired); repoint MainLayout's chip; drop the now-unused `formatVideoTime` import; tsc + build; grep guard.

## Risks

- **Prop-wiring drift** — a tab handler or an `onClick` wired to the wrong callback. Mitigated by moving
  the JSX verbatim and mapping each `onClick` explicitly (documented above); `tsc` catches type/name mistakes.
- **`onSelectTab` equivalence** — the consolidated callback must reproduce the three inline handlers
  exactly (checked above).
- **Unused-import fallout** — dropping `formatVideoTime` from MainLayout; confirm it's unused there after
  the chip moves.

## Testing strategy

No TDD (presentational JSX move; no component-test harness). The full vitest run OOMs on Windows
(pre-existing) — verification is `tsc` + `build` + the grep guard.
