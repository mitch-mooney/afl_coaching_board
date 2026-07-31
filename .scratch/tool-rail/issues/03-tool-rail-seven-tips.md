# 03 — The Tool rail: seven tips, always visible

**What to build:** A coach arms any Pen tip with one tap, from anywhere, without opening a
menu. This is the point of the whole input model — ADR 0001 requires an always-visible Tool
rail precisely so that arming a tip is never a menu trip, and today it still is.

An always-visible Tool rail on the left edge of the Board tab, carrying all seven tips: the six
Annotation kinds and Path. Tapping a tip arms it; tapping the armed tip disarms it; the armed
tip is visually obvious at a glance.

The rail is common to both HUD skins — it is not something a skin varies, so it is built once
and rendered for both, in the same place in each so muscle memory transfers.

The old palette and Setup-fan items **stay for now**. Two ways to arm a tip is redundant but
harmless, and leaving them keeps this slice independently shippable. Ticket 05 removes them.

**Blocked by:** 02 — the left edge must be clear first.

**Status:** ready-for-agent

Spec: `.scratch/tool-rail/spec.md`. Vocabulary: `CONTEXT.md`. Placement rationale:
`docs/adr/0003-tool-rail-on-the-left-mode-rail-on-the-right.md`.

- [ ] The Tool rail is visible on the Board tab without any interaction, in both HUD skins, in
      the same position in each.
- [ ] It carries seven tips: line, arrow, circle, rectangle, text, measure, and Path.
- [ ] Tapping a tip arms it; tapping the armed tip disarms it.
- [ ] The armed tip is visually distinct from the unarmed ones.
- [ ] A Tool rail button arms an instrument and never opens a panel.
- [ ] The rail is absent on the Video and Training tabs.
- [ ] The rail respects the iPad safe-area bottom inset — no tip sits under the home indicator.
- [ ] The rail does not overlap the editor top bar.
- [ ] Arming a tip from the rail and arming it from the existing palette produce identical
      behaviour — both drive the same armed-tip state.
- [ ] Typecheck and production build clean.

> Buttons sized and placed with the palm case in mind — the coach is right-handed and rests
> their hand on the glass. Palm-rejection hardening is explicitly out of scope; see the spec.
