# 05 — modeStore routes through boardSnapshotIO

**What to build:** Switching between match and training mode currently preserves only players
and annotations, because `modeStore` defines its own partial snapshot. Paths, ball, cones, and
camera silently leak across the switch. Route `modeStore` through the canonical
`boardSnapshotIO` so a mode switch saves and restores the **whole** board — one definition of
"the board," no coverage gap.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

Spec: `docs/superpowers/specs/2026-07-22-architecture-pass-canonical-board-state.md` (Wave 1b).

- [ ] `modeStore`'s context snapshot becomes the canonical `BoardSnapshot`; `saveContext` uses `capture()`, `restoreContext` uses `restore()`.
- [ ] The bespoke `ContextSnapshot` (players + annotations only) is removed.
- [ ] Round-trip test: seed players + a path + a moved ball + cones, switch match→training→match, assert the full board is intact.
- [ ] Confirm nothing relied on the old "paths/ball/cones persist across the switch" quirk; build + `modeStore` suite green.
