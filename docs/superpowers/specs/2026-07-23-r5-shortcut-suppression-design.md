# R5 Wave — State-based keyboard-shortcut suppression

> **Status:** Design, ready for implementation-plan.
> **Source:** The deferred §7 architecture pass, audit theme **R5** ("no Command abstraction;
> keyboard sniffs DOM `[role=dialog]`"). This wave takes the **concrete, load-bearing half** —
> replacing the broken DOM-sniff modal suppression with real overlay-open state. The full
> Command-registry unification (keyboard ↔ HUD action definitions) is **declined** as speculative
> (see below).
> **Vocabulary:** the keyboard layer should read app *state*, not sniff the *DOM*, to decide
> whether a shortcut is allowed.

## Context — what the audit found (and a bug it surfaced)

`useKeyboardShortcuts` suppresses shortcuts while a modal is open by checking the DOM
(`useKeyboardShortcuts.ts:361–373`):

```ts
const activeElement = document.activeElement;
const isInDialog =
  activeElement?.closest('[role="dialog"]') !== null ||
  activeElement?.closest('[role="alertdialog"]') !== null ||
  document.querySelector('[role="dialog"]') !== null;
if (isInDialog) return;
```

**Verified fact:** *nothing in the codebase sets `role="dialog"` or `role="alertdialog"`* — the only
occurrences of that string are these three read sites. So `isInDialog` is **always false**, the
suppression **never fires**, and single-key shortcuts (tools S/L/A/C/R/T, camera 1/2/3, Space
play/pause) leak through while any modal is open. The DOM sniff is both a smell (keyboard reads the
DOM to infer app state) *and* non-functional. There is no overlay/modal open-state store to read
instead.

The other R5 complaint — keyboard and HUD *re-encode* the same actions (`setPresetView`,
`togglePlayback`, `setSelectedTool`, …) — is real but small (one-line handlers with genuinely
different shapes: keyboard needs key/modifiers/category; HUD needs label/onClick/active-state). The
registry is already a reasonable command-ish layer. A shared Command registry unifying both is a
large, speculative refactor with unclear payoff — **out of scope**.

## Goals

1. Replace the broken `[role=dialog]` DOM sniff with a real, ref-counted overlay-open state that
   modals set and the keyboard layer reads.
2. Extract the suppression decision into a pure, unit-tested predicate.

## Non-goals (declined / deferred)

- **Declined:** the full Command abstraction unifying keyboard ↔ HUD action definitions (speculative;
  the registry is already command-ish; the duplication is small).
- Non-blocking overlays — `OnboardingTour`, `VideoPiP`, `FeatureNotification` — do **not** suppress
  shortcuts; not wired.
- Focus-trap / `aria`/`role=dialog` for the modal family (a pre-existing a11y gap) — not addressed
  here; we no longer *depend* on `role=dialog`, but adding it is a separate concern.

## Behaviour change (intended)

This is a **behaviour fix, not a preservation.** Today, with a modal or the menu open, shortcuts
fire. After this wave they are suppressed — the original (never-working) intent. The `isTypingInInput`
guard is unchanged, and the per-shortcut `allowInModal` opt-out still works (e.g. Esc still closes the
Help overlay). Confirm this is desired: shortcuts should be inert while a blocking overlay is open.

---

## Design

### 1. `src/store/uiStore.ts` — overlay counter

Add to `UIState` and the store body (the store uses `create((set) => …)`; `set((s) => …)` covers the
clamp):

```ts
// state
/** Number of blocking overlays (modals) currently open. */
overlayOpenCount: number; // init 0

// actions
/** Mark one blocking overlay as opened. */
pushOverlay: () => void; // set((s) => ({ overlayOpenCount: s.overlayOpenCount + 1 }))
/** Mark one blocking overlay as closed (clamped at 0). */
popOverlay: () => void;  // set((s) => ({ overlayOpenCount: Math.max(0, s.overlayOpenCount - 1) }))
```

### 2. New `src/hooks/useOverlayOpen.ts`

Ref-counted, nesting-safe registration. Modals call it; while `open` is true a blocking overlay is
counted.

```ts
import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';

/**
 * While `open` is true, marks a blocking overlay as open so global keyboard
 * shortcuts are suppressed. Ref-counted (nesting-safe). Pass the modal's own
 * open flag; overlays that mount only when open can omit it (defaults true).
 */
export function useOverlayOpen(open: boolean = true): void {
  const pushOverlay = useUIStore((s) => s.pushOverlay);
  const popOverlay = useUIStore((s) => s.popOverlay);
  useEffect(() => {
    if (!open) return;
    pushOverlay();
    return () => popOverlay();
  }, [open, pushOverlay, popOverlay]);
}
```

### 3. `useKeyboardShortcuts.ts` — testable predicate, read state not DOM

Add a pure predicate near the other pure helpers:

```ts
/**
 * Whether a matched shortcut is blocked because a blocking overlay (modal or
 * menu) is open. `allowInModalGlobal` is the hook option; `shortcutAllowInModal`
 * is the per-shortcut opt-out (e.g. Esc-to-close).
 */
export function isBlockedByOverlay(
  overlayOpen: boolean,
  allowInModalGlobal: boolean,
  shortcutAllowInModal: boolean,
): boolean {
  return overlayOpen && !allowInModalGlobal && !shortcutAllowInModal;
}
```

Replace the DOM-sniff block (`useKeyboardShortcuts.ts:361–373`) with:

```ts
const { overlayOpenCount, isMenuOpen } = useUIStore.getState();
if (isBlockedByOverlay(overlayOpenCount > 0 || isMenuOpen, allowInModalRef.current, matchedShortcut.allowInModal ?? false)) {
  return;
}
```

Add `import { useUIStore } from '../store/uiStore';`. `useUIStore.getState()` reads the live value
at event time (the handler is a stable `useCallback([])`), so no re-subscription is needed. The
`isTypingInInput` early-return above is unchanged. (No import cycle: `uiStore` imports nothing from
hooks.)

### 4. Wire the blocking overlays

Each modal calls the hook (co-located, one line). For `open`-prop modals the call must precede their
`if (!open) return null` early return (React hook rule):

| File | Call |
|---|---|
| `Board/hud/PovSelectModal.tsx` | `useOverlayOpen(open)` |
| `Board/hud/RosterImportModal.tsx` | `useOverlayOpen(open)` |
| `Board/hud/TeamSelectModal.tsx` | `useOverlayOpen(open)` |
| `UI/MatchSetupModal.tsx` | `useOverlayOpen(open)` |
| `UI/SavePlayDialog.tsx` | `useOverlayOpen(open)` |
| `UI/SharePlayModal.tsx` | `useOverlayOpen(open)` |
| `UI/HelpScreen.tsx` | `useOverlayOpen()` (mounts only when open; no `open` prop) |
| `UI/PlayHQImportDialog.tsx` | `useOverlayOpen()` (mounts only when open; no `open` prop) |

The **menu drawer** contributes through the existing `isMenuOpen` (OR-ed into the predicate in step 3)
— no wiring needed.

### 5. Testing

- `src/hooks/__tests__/keyboardShortcuts.suppression.test.ts` (new): `isBlockedByOverlay` truth table
  — blocked only when `overlayOpen && !allowInModalGlobal && !shortcutAllowInModal`; each opt-out
  (global allow, per-shortcut allow, no overlay) unblocks.
- `src/store/__tests__/uiStore.test.ts` (existing): add `pushOverlay`/`popOverlay` cases —
  push increments; pop decrements; pop clamps at 0; two pushes then two pops returns to 0.
- `useOverlayOpen` and the keyboard integration: build-verified (no `renderHook` in repo).

## Build sequence (for the plan) — never regresses

1. **uiStore counter + tests** → green. (No reader yet; no behaviour change.)
2. **Predicate + keyboard read** (delete the DOM sniff; read `overlayOpenCount > 0 || isMenuOpen`) +
   predicate test. Behaviour: the **menu** now suppresses shortcuts; modals still leak (not wired
   yet) — no regression vs today. Typecheck + build green.
3. **`useOverlayOpen` hook + wire the 8 modals.** Modals now suppress. Typecheck + build green;
   confirm `role="dialog"` / `document.querySelector` no longer appear in `useKeyboardShortcuts.ts`.

## Risks

- **Ref-count leak** if a modal pushes but never pops (e.g. unmounts without the effect cleanup) —
  mitigated by putting the push/pop entirely inside one `useEffect` return, and clamping `popOverlay`
  at 0.
- **Hook-order** — for `open`-prop modals, `useOverlayOpen(open)` must be above the `if (!open)
  return null`. The plan places it as the first hook in each.
- **Over-suppression** — including `isMenuOpen` means shortcuts are inert while the hamburger menu is
  open. That is intended (user is in the menu); `allowInModal` shortcuts (Esc) still fire.

## Testing strategy

TDD for the two pure/store pieces (`isBlockedByOverlay`, `uiStore` counter) — failing test first. The
full vitest run OOMs all-at-once on Windows (pre-existing) — run `uiStore` and the new suppression
suite targeted; cover the hook + modal wiring with `npx tsc --noEmit` + `npm run build`.
