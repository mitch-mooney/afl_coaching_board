# R5 State-Based Shortcut Suppression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken `[role=dialog]` DOM-sniff modal-suppression in `useKeyboardShortcuts` with a ref-counted overlay-open flag in `uiStore` that modals set (via a `useOverlayOpen` hook) and the keyboard layer reads through a pure, tested predicate.

**Architecture:** `uiStore` gains `overlayOpenCount` + `pushOverlay`/`popOverlay`. A new `useOverlayOpen(open)` hook ref-counts a blocking overlay while it is open. `useKeyboardShortcuts` deletes the DOM sniff and instead blocks a matched shortcut when `isBlockedByOverlay(overlayOpenCount > 0 || isMenuOpen, …)`. Eight modals call the hook.

**Tech Stack:** TypeScript, React, Zustand, Vitest (jsdom env).

## Global Constraints

- **Intended behaviour change (not preservation).** After this wave, global shortcuts are suppressed while any wired modal OR the hamburger menu (`isMenuOpen`) is open — today they leak because nothing sets `role="dialog"`. The `isTypingInInput` guard and the per-shortcut `allowInModal` opt-out (e.g. Esc-to-close-Help) MUST keep working.
- **Never regress mid-plan.** Build order: uiStore counter → keyboard read (deletes sniff; menu suppresses, modals not yet wired) → wire modals. No intermediate state fires shortcuts more than today.
- **Ref-count discipline.** Push/pop live entirely inside one `useEffect` return; `popOverlay` clamps at 0.
- **Out of scope:** the full Command abstraction; non-blocking overlays (`OnboardingTour`, `VideoPiP`, `FeatureNotification`); `role=dialog`/focus-trap a11y.
- **Full vitest run OOMs on Windows** (pre-existing) — run `uiStore` + the new suppression suite targeted; cover the hook + modal wiring with `npx tsc --noEmit` + `npm run build`.
- **Commit footer:** end each commit message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `uiStore` overlay counter (+ tests)

**Files:**
- Modify: `src/store/uiStore.ts` (interface ~line 17; initial state ~line 85; actions ~line 122)
- Test: `src/store/__tests__/uiStore.test.ts` (add a describe block)

**Interfaces:**
- Produces (relied on by Tasks 2 & 3): `overlayOpenCount: number`, `pushOverlay: () => void`, `popOverlay: () => void` on `useUIStore`.

- [ ] **Step 1: Write the failing test**

Append to `src/store/__tests__/uiStore.test.ts`:

```ts
describe('overlay counter', () => {
  beforeEach(() => {
    useUIStore.setState({ overlayOpenCount: 0 });
  });

  it('defaults to 0', () => {
    expect(useUIStore.getState().overlayOpenCount).toBe(0);
  });

  it('pushOverlay increments', () => {
    useUIStore.getState().pushOverlay();
    expect(useUIStore.getState().overlayOpenCount).toBe(1);
    useUIStore.getState().pushOverlay();
    expect(useUIStore.getState().overlayOpenCount).toBe(2);
  });

  it('popOverlay decrements', () => {
    useUIStore.getState().pushOverlay();
    useUIStore.getState().pushOverlay();
    useUIStore.getState().popOverlay();
    expect(useUIStore.getState().overlayOpenCount).toBe(1);
  });

  it('popOverlay clamps at 0', () => {
    useUIStore.getState().popOverlay();
    expect(useUIStore.getState().overlayOpenCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/uiStore.test.ts`
Expected: FAIL — `pushOverlay`/`popOverlay` are not functions / `overlayOpenCount` undefined.

- [ ] **Step 3: Add the counter to `uiStore.ts`**

In the `UIState` interface, after `isPenDrawing: boolean;` (line 17), add:
```ts
  // Number of blocking overlays (modals) currently open — read by the keyboard
  // layer to suppress shortcuts while a modal is up.
  overlayOpenCount: number;
```
In the same interface, after `setPenDrawing: (val: boolean) => void;` (line 28), add:
```ts
  // Overlay ref-count actions
  pushOverlay: () => void;
  popOverlay: () => void;
```
In the store body, after `isPenDrawing: false,` (line 85), add:
```ts
    overlayOpenCount: 0,
```
In the store body, after the `setPenDrawing` action (line 120–122), add:
```ts
    pushOverlay: () => {
      set((state) => ({ overlayOpenCount: state.overlayOpenCount + 1 }));
    },

    popOverlay: () => {
      set((state) => ({ overlayOpenCount: Math.max(0, state.overlayOpenCount - 1) }));
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/__tests__/uiStore.test.ts`
Expected: PASS (new overlay-counter block green + all pre-existing uiStore tests still green).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.

```bash
git add src/store/uiStore.ts src/store/__tests__/uiStore.test.ts
git commit -m "feat: add overlay-open ref counter to uiStore

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `isBlockedByOverlay` predicate + keyboard reads state (delete the sniff)

**Files:**
- Modify: `src/hooks/useKeyboardShortcuts.ts` (add import; add predicate after `modifiersMatch` ~line 187; replace the sniff block ~lines 361–373)
- Test: `src/hooks/__tests__/keyboardShortcuts.suppression.test.ts` (new)

**Interfaces:**
- Consumes: `useUIStore` from `../store/uiStore` (Task 1's `overlayOpenCount`; existing `isMenuOpen`).
- Produces: `isBlockedByOverlay(overlayOpen: boolean, allowInModalGlobal: boolean, shortcutAllowInModal: boolean): boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/keyboardShortcuts.suppression.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isBlockedByOverlay } from '../useKeyboardShortcuts';

describe('isBlockedByOverlay', () => {
  it('blocks when an overlay is open and neither opt-out is set', () => {
    expect(isBlockedByOverlay(true, false, false)).toBe(true);
  });

  it('does not block when no overlay is open', () => {
    expect(isBlockedByOverlay(false, false, false)).toBe(false);
  });

  it('does not block when the hook globally allows in modal', () => {
    expect(isBlockedByOverlay(true, true, false)).toBe(false);
  });

  it('does not block when the shortcut opts into modal (e.g. Esc)', () => {
    expect(isBlockedByOverlay(true, false, true)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/keyboardShortcuts.suppression.test.ts`
Expected: FAIL — `isBlockedByOverlay` is not exported.

- [ ] **Step 3: Add the import + predicate**

At the top of `src/hooks/useKeyboardShortcuts.ts`, with the other store imports (after `import { useAnimationStore } from '../store/animationStore';`, ~line 20), add:
```ts
import { useUIStore } from '../store/uiStore';
```
After the `modifiersMatch` function (ends ~line 187), add:
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/keyboardShortcuts.suppression.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Replace the DOM sniff in the handler**

In `handleKeyDown`, replace this block (currently ~lines 361–373):
```ts
    // Check if we should process this shortcut when in a modal
    if (!allowInModalRef.current && !matchedShortcut.allowInModal) {
      // Check if a modal/dialog is currently open
      const activeElement = document.activeElement;
      const isInDialog =
        activeElement?.closest('[role="dialog"]') !== null ||
        activeElement?.closest('[role="alertdialog"]') !== null ||
        document.querySelector('[role="dialog"]') !== null;

      if (isInDialog) {
        return;
      }
    }
```
with:
```ts
    // Suppress the shortcut when a blocking overlay (modal or menu) is open,
    // unless the hook or the shortcut opts into modal handling (e.g. Esc).
    const { overlayOpenCount, isMenuOpen } = useUIStore.getState();
    if (
      isBlockedByOverlay(
        overlayOpenCount > 0 || isMenuOpen,
        allowInModalRef.current,
        matchedShortcut.allowInModal ?? false,
      )
    ) {
      return;
    }
```

Leave the `isTypingInInput` early-return above and `event.preventDefault()` / `matchedShortcut.handler(event)` below unchanged.

- [ ] **Step 6: Typecheck + build + grep**

Run: `npx tsc --noEmit` → clean.

Run: `git grep -n "role=\"dialog\"\|role=\"alertdialog\"\|document.querySelector" src/hooks/useKeyboardShortcuts.ts`
Expected: no matches (the DOM sniff is gone).

Run: `npm run build` → `✓ built`.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useKeyboardShortcuts.ts src/hooks/__tests__/keyboardShortcuts.suppression.test.ts
git commit -m "fix: suppress shortcuts via overlay state, not a dead role=dialog sniff

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `useOverlayOpen` hook + wire the 8 modals

**Files:**
- Create: `src/hooks/useOverlayOpen.ts`
- Modify (add one hook call each): `src/components/Board/hud/PovSelectModal.tsx`, `RosterImportModal.tsx`, `TeamSelectModal.tsx`, `src/components/UI/MatchSetupModal.tsx`, `SavePlayDialog.tsx`, `SharePlayModal.tsx`, `HelpScreen.tsx`, `PlayHQImportDialog.tsx`

**Interfaces:**
- Consumes: `useUIStore` (`pushOverlay`/`popOverlay` from Task 1).
- Produces: `useOverlayOpen(open?: boolean): void`.

- [ ] **Step 1: Create the hook**

Create `src/hooks/useOverlayOpen.ts`:

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

- [ ] **Step 2: Wire the six `open`-prop modals**

In each of these files, add `useOverlayOpen(open)` as the **first statement inside the component body** (before any other hooks and before any `if (!open) return null`), and add the import.

`src/components/Board/hud/PovSelectModal.tsx`, `RosterImportModal.tsx`, `TeamSelectModal.tsx` — import path `../../../hooks/useOverlayOpen`:
```ts
import { useOverlayOpen } from '../../../hooks/useOverlayOpen';
// ...first line of component body:
  useOverlayOpen(open);
```

`src/components/UI/MatchSetupModal.tsx`, `SavePlayDialog.tsx`, `SharePlayModal.tsx` — import path `../../hooks/useOverlayOpen`:
```ts
import { useOverlayOpen } from '../../hooks/useOverlayOpen';
// ...first line of component body:
  useOverlayOpen(open);
```

(For `SavePlayDialog`, this must go above its `if (!open) return null;` — placing it as the first body statement satisfies that.)

- [ ] **Step 3: Wire the two mount-when-open modals**

These have no `open` prop (they mount only when open), so call `useOverlayOpen()`:

`src/components/UI/HelpScreen.tsx` — import path `../../hooks/useOverlayOpen`; add `useOverlayOpen();` as the first statement of the `HelpScreen` body (before the `return (`).

`src/components/UI/PlayHQImportDialog.tsx` — import path `../../hooks/useOverlayOpen`; add `useOverlayOpen();` as the first statement of the `PlayHQImportDialog` body.

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit` → clean.

Run: `npm run build` → `✓ built`.

- [ ] **Step 5: Confirm every blocking modal is wired**

Run: `git grep -L "useOverlayOpen" src/components/Board/hud/PovSelectModal.tsx src/components/Board/hud/RosterImportModal.tsx src/components/Board/hud/TeamSelectModal.tsx src/components/UI/MatchSetupModal.tsx src/components/UI/SavePlayDialog.tsx src/components/UI/SharePlayModal.tsx src/components/UI/HelpScreen.tsx src/components/UI/PlayHQImportDialog.tsx`
Expected: no output (every listed file contains `useOverlayOpen`).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useOverlayOpen.ts src/components/Board/hud/PovSelectModal.tsx src/components/Board/hud/RosterImportModal.tsx src/components/Board/hud/TeamSelectModal.tsx src/components/UI/MatchSetupModal.tsx src/components/UI/SavePlayDialog.tsx src/components/UI/SharePlayModal.tsx src/components/UI/HelpScreen.tsx src/components/UI/PlayHQImportDialog.tsx
git commit -m "feat: register blocking modals with useOverlayOpen so shortcuts suppress

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- Line numbers are approximate anchors — match on the quoted code.
- Hook-order rule: `useOverlayOpen(open)` MUST precede any `if (!open) return null` in the `open`-prop modals — placing it as the first body statement guarantees this. React would throw a hooks-order error otherwise; `tsc` will not catch it, so follow the placement exactly.
- This wave intentionally CHANGES behaviour (shortcuts suppressed under modals/menu). There is no automated test of the end-to-end suppression (no `renderHook`); the pure predicate + store counter carry the unit coverage, and the wiring is build-verified.
- Out of scope: `OnboardingTour`, `VideoPiP`, `FeatureNotification` (non-blocking); the full Command abstraction; `role=dialog`/focus-trap a11y.
