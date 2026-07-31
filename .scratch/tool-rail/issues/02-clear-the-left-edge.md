# 02 — Clear the left edge: Mode rail right, hamburger into the top bar

**What to build:** The left edge is freed for the Tool rail, and the global menu becomes
reachable again in the Rail HUD skin.

Two moves. The Mode rail — the Setup / Animate / Camera column that opens a contextual panel —
relocates from the left edge to the right. The hamburger folds into the editor top bar as an
icon, joining the other navigation rather than floating below it.

This is a prefactor: the Tool rail cannot occupy the left edge until both are out of the way.
It also fixes a bug on its own — in the Rail skin the Mode rail currently paints over the
hamburger at a higher stacking order, so taps in that region hit the Mode rail's buttons and
the global menu appears unreachable.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

Spec: `.scratch/tool-rail/spec.md`. Placement rationale:
`docs/adr/0003-tool-rail-on-the-left-mode-rail-on-the-right.md`.

- [ ] **First, confirm the hamburger bug on a device or in a browser.** It is a code-level
      finding only. If it does not reproduce, this ticket is a layout change rather than a fix
      and the spec should be corrected.
- [ ] The Mode rail renders on the right edge in the Rail skin; its buttons and panel behave
      exactly as before. No redesign — position only.
- [ ] The hamburger appears as an icon in the editor top bar and opens the same menu, in both
      HUD skins.
- [ ] The hamburger is reachable in the Rail skin.
- [ ] No element remains on the left edge below the top bar.
- [ ] The top bar still lays out sensibly at phone width, wrapping rather than overflowing.
- [ ] The global menu's overlays and modals still receive pointer events — they inherit
      pointer-events from the bar that hosts them, so moving the hamburger must not orphan
      them.
- [ ] Typecheck and production build clean.
