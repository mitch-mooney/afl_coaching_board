# 06 — The play list follows the ground

**What to build:** A coach preparing for Saturday has a **Playbook**, not one Play. Ticket 05
answers "does this play fit?" one play at a time — open it, read the count, close it, open the
next. This ticket turns that into triage: set the Active Venue to Saturday's ground and see,
from the list, which Plays don't fit.

The predicate is already built in 05. What it needs here is running per row rather than for
the open board.

Thumbnails also currently normalise: they map each coordinate by the field's length and width
into a fixed box, which is exactly the model the ADR rejects, already implemented in the one
place nobody looked. It is harmless only because the dimensions have been constant. Once
grounds vary, every Play renders into the same rectangle and a play at a 118 m-wide ground
looks identical in shape to one at 141 m — the list would flatten the very difference the
coach is scanning for. Thumbnails fit the boundary and letterbox the remainder instead, so a
narrow ground reads narrow at a glance.

Thumbnails render live from the stored phase, so they follow the Active Venue with no cache to
invalidate.

**Blocked by:** 05 (the out-of-bounds predicate).

**Status:** ready-for-agent

Vocabulary: `CONTEXT.md` — **Play**, **Playbook**, **Out of bounds**, **Active Venue**. Spec:
`.scratch/venue/spec.md`. ADR: `docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`,
"Rendering", which records the thumbnail normalisation.

- [ ] Plays that do not fit the Active Venue are marked in the play list.
- [ ] The marker uses the same predicate as the on-board count — one definition of "doesn't
      fit", not two.
- [ ] Changing the Active Venue updates the markers without a reload.
- [ ] Thumbnails preserve the Active Venue's aspect: content fits within the viewBox with the
      remainder letterboxed, centred.
- [ ] A narrow ground produces a visibly narrower thumbnail than a wide one — the existing
      thumbnail tests are extended with that comparison.
- [ ] At Standard ground, thumbnail output is unchanged from before this ticket.
