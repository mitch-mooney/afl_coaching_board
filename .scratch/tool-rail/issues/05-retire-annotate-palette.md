# 05 — Retire the annotate palette and the Setup-fan tip items

**What to build:** Exactly one way to arm a Pen tip. After tickets 03 and 04 the Tool rail can
do everything the old surfaces could, so the old surfaces go — leaving two ways to arm a tip
would be a slow trap, since they can drift apart.

Three things are deleted: the annotate palette, the `↗ Annotate…` Setup-fan item that opened
it, and the interim `✏ Path tip` Setup-fan item that armed Path before the rail existed.

The palette carried more than tips, so its surviving concerns are rehomed rather than lost:

- Tips and colour — already on the rail (03, 04).
- Thickness — already in the rail's colour popover (04).
- **Clear annotations** — moves to the Setup panel, beside the existing Clear paths. Both wipe
  a category of board content, so they belong together, and neither is an instrument.
- **Text entry** — the field that appears when a text Annotation is placed stays transient and
  near the tap point. It is not a rail concern; it just needs an owner that is not being
  deleted.

**Blocked by:** 03, 04 — every concern needs its new home before the old one is removed.

**Status:** ready-for-agent

Spec: `.scratch/tool-rail/spec.md`.

- [ ] The annotate palette no longer exists, and nothing references it.
- [ ] The `↗ Annotate…` and `✏ Path tip` Setup-fan items are gone.
- [ ] Every tip is still armable — from the Tool rail, and from the keyboard where a shortcut
      exists.
- [ ] Clear annotations appears in the Setup panel beside Clear paths, and clears annotations.
- [ ] Placing a text Annotation still shows a text field near the tap point; entering text
      creates the Annotation, and cancelling discards it.
- [ ] Colour and thickness remain changeable via the rail's popover.
- [ ] No dead exports or unreferenced modules remain from the deletion.
- [ ] Typecheck and production build clean.
