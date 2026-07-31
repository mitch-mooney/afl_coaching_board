# 04 — Colour and thickness on the rail

**What to build:** A coach sees at a glance what colour they are about to draw with, and can
change it without leaving the rail.

A current-colour button on the Tool rail, rendered **in** the current colour so its state is
readable without opening anything. Tapping it opens a popover holding the colour swatches and
the thickness control.

Colour and thickness are in a popover rather than inline because the rail must stay thin to
stay always-visible, and because thickness is a set-once-and-forget setting that does not earn
permanent space.

**Blocked by:** 03.

**Status:** ready-for-agent

Spec: `.scratch/tool-rail/spec.md`.

- [ ] The rail shows a current-colour button rendered in the currently selected colour.
- [ ] Tapping it opens a popover; tapping away or re-tapping closes it.
- [ ] The popover offers the same colour choices available today.
- [ ] The popover offers thickness control, matching today's range and behaviour.
- [ ] Choosing a colour updates the button's appearance immediately.
- [ ] A Stroke authored after changing colour or thickness uses the new values.
- [ ] The colour button is the sole rail control that opens a panel, and is not a tip — arming
      state is unaffected by opening or using the popover.
- [ ] Thickness is hidden or inert for tips where it does not apply, matching today's
      behaviour for text and measure.
- [ ] The popover does not obscure the rail's tips while open.
- [ ] Typecheck and production build clean.
