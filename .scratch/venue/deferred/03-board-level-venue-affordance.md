# 03 — Board-level Venue affordance for the compare loop

**What to build:** In v1, switching the Active Venue is menu → Match section → Venue panel →
tap. That is fine for *configuring* a ground. It is poor for the gesture the feature exists
to serve.

ADR 0002's motivating question is *"what does this play look like at Saturday's ground?"* —
which is a **comparison**: two grounds, switched back and forth while looking at the same
structure. A three-step round trip per switch turns inspection into configuration, and the
board is hidden behind a drawer for most of it.

Candidate shapes (pick one during design, don't build all three):

- The Active Venue's name as a tappable chip on the board, cycling to the previously active
  Venue on tap — a two-ground A/B toggle, which is the actual comparison being made.
- A venue picker in the Out of bounds banner, since that banner is already on screen exactly
  when the coach is asking this question.
- Side-by-side render of one Play at two Venues. Most direct answer to the question, most
  expensive to build.

**Blocked by:** ADR 0002 Venue work must land first — this is an affordance over the model
that work establishes, and it should be built after using the menu-only version for real,
so the design responds to where it actually feels buried.

**Status:** needs-design

Vocabulary: `CONTEXT.md`, "The ground" — **Active Venue**, **Out of bounds**. Related:
`docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`.

Constraints any design must respect:

- [ ] `docs/adr/0003-tool-rail-on-the-left-mode-rail-on-the-right.md` — a **Tool rail**
      button arms a Pen tip and never opens a panel. A venue control is not a Pen tip and
      does not belong on the Tool rail.
- [ ] Board chrome is scarce on an iPad in a coach's hands; anything added competes with the
      board itself and with the safe-area constraints already in play.
- [ ] Switching the Active Venue must keep holding the camera still (ADR 0002) — the
      affordance changes how the switch is *invoked*, never what it does.
