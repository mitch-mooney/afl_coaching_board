# 07 — Keyboard shortcut for the Path tip

**What to build:** All seven Pen tips are armable from the keyboard, not just six.

The tip-selection shortcut layer predates Path becoming a tip, so it is typed to the Annotation
kinds only. Path is now a peer of the other six everywhere else in the model — it belongs on
the same footing at the keyboard too.

Small and self-contained: widen the shortcut layer from the Annotation kinds to the full tip
set, and bind a key for Path. Independent of the Tool rail — nothing here waits on it.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

Spec: `.scratch/tool-rail/spec.md`.

- [ ] A key arms the Path tip, chosen not to collide with the existing tip shortcuts or any
      other board shortcut.
- [ ] Pressing that key twice leaves Path armed rather than toggling it off, matching the
      existing idempotency rule for the other tips.
- [ ] The existing shortcuts for the six Annotation tips are unchanged.
- [ ] The disarm shortcut still disarms whatever is armed, including Path.
- [ ] Tip shortcuts remain suppressed wherever they are suppressed today — text entry must not
      arm tips while the coach is typing.
- [ ] Covered at the existing shortcut-registry seam, following the prior art in the
      shortcut-suppression suite.
- [ ] Typecheck and production build clean.
