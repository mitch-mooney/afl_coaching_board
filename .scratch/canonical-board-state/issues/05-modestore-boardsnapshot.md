# 05 — modeStore routes through boardSnapshotIO

**What to build:** Switching between match and training mode currently preserves only players
and annotations, because `modeStore` defines its own partial snapshot. Paths, ball, cones, and
camera silently leak across the switch. Route `modeStore` through the canonical
`boardSnapshotIO` so a mode switch saves and restores the **whole** board — one definition of
"the board," no coverage gap.

**Blocked by:** None — can start immediately.

**Status:** done (branch arch/canonical-board-state)

Spec: `docs/superpowers/specs/2026-07-22-architecture-pass-canonical-board-state.md` (Wave 1b).

- [x] `modeStore`'s context snapshot becomes the canonical `BoardSnapshot`; `saveContext` uses `capture()`, `restoreContext` uses `restore()`.
- [x] The bespoke `ContextSnapshot` (players + annotations only) is removed.
- [x] Round-trip test: seed players + a path + a moved ball + cones (+ annotations), switch match→training→match, assert the full board is intact (`src/store/__tests__/modeStore.test.ts`). Watched it fail red on paths/ball/cones first, then pass.
- [x] Confirm nothing relied on the old "paths/ball/cones persist across the switch" quirk; build + `modeStore` suite green. _Cones only render in training (`ConeManager.tsx:46` gates on `mode === 'training'`) — a training-only concept with no match consumer; match paths/ball are now correctly restored rather than leaked (the intended fix); each `switchMode('training')` re-captures fresh, so no stale snapshot. `npm run build` + `tsc --noEmit` clean; `modeStore` suite 2/2 green._
