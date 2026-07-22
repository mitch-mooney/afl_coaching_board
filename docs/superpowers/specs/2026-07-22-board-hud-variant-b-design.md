# Board HUD — Variant B desktop rail + responsive B/C selection (§6b) — design

> **Status:** Approved design (grilled 2026-07-22), ready for implementation plan.
> **Source:** Lean-scope decision doc §6 ("one IA, two ergonomic skins; desktop/laptop → Variant B left mode rail"). Prototype primary source: branch `prototype/board-layout-4`, `src/prototypes/board-layout/VariantB.tsx`. Faithful reproduction reviewed in-session.
> **Branch:** `lean/live-coaching-first`. Builds on §6a (Variant C thumb-pod HUD + per-concern store wiring). Follows `adac2f0`.

## §6 decomposition (recap; this spec is §6b only)

- **§6a (done)** — mode-concern control wiring + the **Variant C** thumb-pod skin, at all viewports. `BoardHud` = `SetupPod` (left fan) + `CameraPod` (right fan) + `PlayFab` (centre transport). Legacy surfaces retired.
- **§6b (this spec)** — the **Variant B** desktop left-rail skin + **responsive B/C selection** (pointer + viewport) + a persisted manual override. **Additive** — reuses §6a's control wiring; no deletions.
- **§6c** — global drawer + a home for per-Play share (`sharingService.sharePlayWithClip`) + final `Toolbar.tsx` retirement + duplicate-control cleanup.

## Goal (§6b)

On a fine-pointer wide screen, replace the two thumb pods with a **left vertical mode rail** (Setup / Animate / Camera) whose selection swaps a **contextual overlay panel** — same information architecture as C, re-skinned for a mouse. Pick B or C automatically from pointer + width, with a manual override. The two skins render the **same controls over the same stores**; only the chrome differs.

## Approach

§6b introduces **no new board-interaction state**. The rail is **chrome that swaps which panel is visible** and nothing more — board interaction (move / draw / annotate / transport) stays driven by the same explicit controls and stores §6a already wired (`uiStore.boardSubMode`, `annotationStore`, `cameraStore`, `animationStore`, `pathStore`, `playerStore`, `ballStore`). B and C are **behaviourally identical**; the rail is a pure panel-switcher.

To keep one source of truth for the *action set* across two skins, the per-concern controls currently inlined in §6a's pods are **extracted into skin-agnostic controls components** that own the store wiring + their owned modals, and accept the button chrome as a prop. Both the C pod and the B panel render the same controls component; each supplies its own container + button style. **Transport is the one exception** (Q4): the scrub *logic* is already shared in `utils/boardScrub.ts` + `animationStore`, but the *presentation* differs — C keeps the radial `PlayFab`; B gets a **linear** `TransportBar`. Both write through `scrubTo` / `togglePlayback` / `cycleSpeed`.

**Rejected:**
- *Four rail items (Setup/Draw/Animate/Camera), per the prototype* — §6a folded Draw into Setup and shipped it reviewed-clean; a 4-item rail would diverge B from C and fork the shared controls. **Draw stays a toggle inside Setup** (three rail items).
- *Mode-switcher rail (selecting a mode flips board interaction, Figma-style)* — C never couples panel-open to interaction; matching it would break parity and force the shared controls to branch on "pod vs rail". **Panel-switcher only.**
- *Docked/push panel that resizes the Canvas* — every toggle would re-run `useCanvasResize` (the hook behind the render-storm bug fixed earlier this lean). **Overlay panel, no Canvas resize.**
- *Width-only skin selection* — routes a 1366px iPad Pro to the desktop rail, wrong for the thumb-first north star. **Pointer is the discriminator; width is a backstop.**
- *Persistent transport chrome on B* — the doc mode-gates transport and rejected Variant A's permanent bar. **Transport lives only inside Animate; `Space` is the escape hatch.**

## Skin selection (Q1, Q2, Q11)

Pure resolver (unit-tested — the verification gate, since the repo has no RTL):

```
resolveSkin(override, isDesktop, coarsePointer):
  if override === 'B' return 'B'
  if override === 'C' return 'C'
  // override === 'auto'
  return (!coarsePointer && isDesktop) ? 'B' : 'C'
```

- **`isDesktop`** = width ≥ 1024 — reuse the existing `useResponsive().isDesktop` / `BREAKPOINTS.tablet` (`getBreakpoint` returns `desktop` at ≥1024). **No new width constant.**
- **`coarsePointer`** = `matchMedia('(pointer: coarse)').matches` — **net-new**; `useResponsive` is width-only. A small `usePointerCoarse()` hook subscribes to the media query (initial value + `change` listener, SSR-safe default `false`).
- **Override** = `'auto' | 'B' | 'C'`, default `'auto'`, persisted in **`localStorage`** via a tiny zustand store (`hudPreferenceStore`, init-from-storage + write-on-set — the `getInitialMenuPulse` localStorage pattern already in `uiStore`). No Dexie change.
- **Override toggle** surfaced as one item in the **hamburger globals** (`MobileMenu`), cycling Auto → Rail (B) → Pods (C). Copy: "Board layout: Auto / Rail / Pods".

## Rail structure (Q3, Q5, Q6, Q8)

`RailHud` (rendered by `BoardHud` when skin === 'B', gated `editorTab === 'board'`):

- **Left vertical rail**, 68px, full height, glass, always visible. Three mode buttons: **👥 Setup · ▶ Animate · 🎥 Camera** (icon + 9px label, active = teal gradient on black text — matching the prototype). Bottom of the rail is left empty (globals stay in the hamburger, Q9 — no rail globals in §6b).
- **Contextual panel** — an **overlay** (absolute, `top:54 left:80`, ~250px, glass, rounded) floating over the Canvas. **No Canvas resize.** One panel at a time.
- **Collapse:** clicking the **active** mode again closes the panel → clean board, rail still visible. **Opens collapsed** (no panel) on entry, matching C's `pod = null`.
- Top strip keeps `← Plays` + Play title offset by the rail (`left:68`), consistent with the existing `MainLayout` header — actually the existing `MainLayout` top bar stays; the rail sits beneath it (see Files).

### Setup panel
Renders `<SetupControls>` (see below) in a vertical panel: Formation presets ×3 · Teams/jerseys · Labels · Reset players · Undo · **Draw path** (toggle, amber when `boardSubMode === 'draw'`) · Clear paths · Give/Release ball · Annotate… · Import roster…. Identical action set to C's Setup fan.

### Animate panel
The **linear** `TransportBar`: Play/pause (`togglePlayback`) · Stop · a horizontal scrub `<input type=range>` bound to `animationStore.progress` via `scrubTo` · speed chip (`cycleSpeed`) · a `mm:ss / mm:ss` readout. Disabled/dimmed when `!hasAnimation`. `Space` still toggles play/pause (existing `useAnimationControlShortcuts`). **Transport is reachable only via this panel** (Q7).

### Camera panel
Renders `<CameraControls>`: Broadcast · Top / Sideline / End-to-end · Reset camera · POV slot 1/2 (activate) · Assign POV #1/#2 (opens `PovSelectModal`). Identical action set to C's Camera fan.

## Shared-control extraction (Q4)

New skin-agnostic components, consumed by **both** skins:

- **`SetupControls({ buttonStyle })`** — owns the Setup store wiring + the Team / Roster / Annotate modal open-state and renders those modals (all centred/floating, skin-agnostic). Renders the ordered action buttons as a fragment; the **parent** provides the container (fan vs panel) and passes the button chrome (`fanPill` for C, a panel-pill style for B). Single source of truth for the Setup action set — add a formation once, both skins get it.
- **`CameraControls({ buttonStyle })`** — same pattern; owns the `PovSelectModal` + `assignSlot` state.
- **§6a pods refactor:** `SetupPod` and `CameraPod` stop inlining their button lists + modal state and instead render `<SetupControls buttonStyle={fanPill}>` / `<CameraControls …>` inside their fan wrapper. Net behaviour unchanged (verify C still works).
- **Transport is NOT unified into a controls component** — `PlayFab` (C, radial) and `TransportBar` (B, linear) are separate presentational components sharing only `boardScrub` + `animationStore` (already shared). No new transport hook needed.
- **`AnnotatePalette`** stays a floating palette; it keeps its current bottom-left, safe-area anchor in **both** skins for §6b (it's transient, and position parity is acceptable). An `anchor` prop is a possible §6c polish, not a §6b requirement.

Button-chrome note: C uses rounded `fanPill`; B's panel wants a left-aligned rectangular pill (see the prototype's `pill()` — `border-radius:8`, full-width). Add a `panelPill` to `podStyles.ts`; pass it as `buttonStyle`.

## The B↔C flip (Q10)

Skin can change mid-session (rotate, cross-1024 resize, override toggle). All state a coach cares about mid-demo — playback position/`isPlaying` (`animationStore`), camera/POV (`cameraStore`), board data — already lives in shared stores and **survives automatically**. The only skin-local state is *which panel/pod is open*; it is **not** lifted to a store — each skin mounts at its default (**collapsed**), so a flip resets to a clean board. No new shared "active concern" state.

## Scope

### In scope
- Skin resolver + `usePointerCoarse` hook + `hudPreferenceStore` (localStorage override) + the hamburger override toggle.
- `BoardHud` becomes the **skin switch**; the current C body extracts to `ThumbPodHud`.
- `RailHud` + its three panels + `TransportBar` (linear).
- Extract `SetupControls` / `CameraControls`; refactor `SetupPod` / `CameraPod` to consume them; add `panelPill`.

### Out of scope
- §6c: global drawer, per-Play share home, `Toolbar.tsx` deletion, duplicate-control cleanup. **No deletions in §6b.**
- Lifting "active concern" into a shared store (Q10 — reset-to-collapsed on flip instead).
- Persistent B transport / rail globals / `AnnotatePalette` re-anchoring (deferred).
- Any change to the modals' internals (Team/Roster/Pov are reused verbatim).

## Files

- **Create:**
  - `src/utils/hudSkin.ts` — pure `resolveSkin(override, isDesktop, coarse)` (+ Vitest test).
  - `src/hooks/usePointerCoarse.ts` — `matchMedia('(pointer: coarse)')` subscription.
  - `src/store/hudPreferenceStore.ts` — `skinOverride: 'auto'|'B'|'C'` + `setSkinOverride`, localStorage-backed.
  - `src/components/Board/hud/SetupControls.tsx`, `CameraControls.tsx` — shared controls.
  - `src/components/Board/hud/ThumbPodHud.tsx` — the current C shell (SetupPod + PlayFab + CameraPod), moved out of `BoardHud`.
  - `src/components/Board/hud/rail/RailHud.tsx`, `SetupPanel.tsx`, `CameraPanel.tsx`, `AnimatePanel.tsx`, `TransportBar.tsx`.
- **Modify:**
  - `src/components/Board/hud/BoardHud.tsx` — resolve skin (`usePointerCoarse` + `useResponsive().isDesktop` + `hudPreferenceStore`), render `<ThumbPodHud>` or `<RailHud>`.
  - `src/components/Board/hud/SetupPod.tsx`, `CameraPod.tsx` — consume the extracted controls.
  - `src/components/Board/hud/podStyles.ts` — add `panelPill`.
  - `src/components/UI/MobileMenu.tsx` (globals) — add the "Board layout" override cycle item.
- **Delete:** none.

## Verification

No RTL → no component unit tests. Gate + pure-unit + runtime smoke:

- **Gate:** `npx tsc --noEmit` clean AND `npm run build` green before each commit. (Vitest suite OOMs on Windows — run only new/changed test files.)
- **Unit:** `hudSkin.test.ts` covers the resolver truth table — override B/C forces; auto → B only when `!coarse && isDesktop`; auto → C for coarse-any-width and fine-narrow.
- **Runtime smoke (blocked by the Supabase `/login` gate — needs a signed-in session):**
  1. **Fine pointer + ≥1024:** board shows the left rail (Setup/Animate/Camera), no thumb pods; opens collapsed.
  2. Rail: select Setup → panel opens; apply a formation → tokens move; toggle Draw → drag records a path; Annotate → draw; click active Setup again → panel collapses, board clean.
  3. Animate panel: with a drawn path, play animates; the linear scrub repositions tokens; speed cycles; `Space` toggles play from any mode.
  4. Camera panel: Broadcast ↔ POV switches; Assign POV opens the selector.
  5. **Coarse pointer OR <1024:** the thumb-pod HUD (C) renders instead — verify C is unchanged after the controls extraction.
  6. Hamburger "Board layout" cycles Auto → Rail → Pods and overrides the auto choice; survives reload (localStorage).
  7. Resize across 1024 (fine pointer) flips rail↔pods; open panel resets to collapsed; playback/camera state preserved; no console errors; no Canvas resize storm.

## Interfaces (for the plan)

- **Consumes (verbatim, all already wired in §6a):** `playerStore` (`applyFormation`, `resetPlayers`, `cycleLabelMode`, `labelMode`, `selectedPlayerId`, `players`), `uiStore` (`setActiveFormationId`, `boardSubMode`, `toggleBoardSubMode`, `isMobile`/responsive), `pathStore` (`clearPaths`, `paths`), `ballStore` (`ball`, `assignBallToPlayer`), `annotationStore` (via `AnnotatePalette`), `cameraStore` (`switchToBroadcast`, `setPresetView`, `resetCamera`, `setActivePovSlot`, `povPlayer1Id`, `povPlayer2Id`, `activePovSlot`), `animationStore` (`togglePlayback`, `isPlaying`, `progress`, `speed`, `cycleSpeed`, `hasAnimation`), `boardScrub.scrubTo`, `useBoardUndo`. `useResponsive().isDesktop`, `BREAKPOINTS`.
- **Produces:** `resolveSkin` (pure), `usePointerCoarse`, `hudPreferenceStore`, `SetupControls`/`CameraControls`, `ThumbPodHud`, `RailHud` + panels + `TransportBar`. `BoardHud` now returns one skin or the other.
- **Invariant:** C's behaviour is byte-for-byte unchanged after the extraction; B and C share the same action set and stores; only chrome (fan vs rail-panel, radial vs linear transport) differs.
