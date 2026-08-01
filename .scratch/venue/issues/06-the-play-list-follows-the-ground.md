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

**Status:** done

Vocabulary: `CONTEXT.md` — **Play**, **Playbook**, **Out of bounds**, **Active Venue**. Spec:
`.scratch/venue/spec.md`. ADR: `docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`,
"Rendering", which records the thumbnail normalisation.

**The predicate runs over every phase, not the one the thumbnail draws.** `playFitsBoundary`
is a new pure module — `utils/playFit` — that calls `outOfBounds` per phase, so there is one
definition of "doesn't fit" and the list can never disagree with the board it opens. Checking
only phase 0 would leave a play whose second phase pushes the forward line off a tight ground
unmarked, and an unmarked row reads as "this one's fine".

**The list had to load Venues itself.** Only `MainLayout` did, and the play list is reachable
without the board ever mounting — a coach going Playbooks → Plays would have triaged Saturday's
playbook against the generic ground and been told, wrongly, that everything fits.

**The viewBox is 4 units taller: 200 × 168, not 200 × 164.** The projection now uses a single
scale fitted from both axes, so the padded interior has to *be* a ground's shape or every
ground letterboxes — including Standard ground against itself, which would have shrunk the
thumbnail everyone already has. At 176 × 144 the interior is exactly 165 : 135, so Standard
ground fills it edge to edge with the 12-unit inset it always had. The x axis is byte-identical
to before; the y axis stretches by 2.9%, which is the old projection's distortion coming out —
it drew the generic ground at 1.257 : 1 when the ground is 1.222 : 1. That is the only respect
in which Standard-ground output is not literally unchanged, and correcting it is the point of
the ticket.

- [x] Plays that do not fit the Active Venue are marked in the play list.
- [x] The marker uses the same predicate as the on-board count — one definition of "doesn't
      fit", not two.
- [x] Changing the Active Venue updates the markers without a reload.
- [x] Thumbnails preserve the Active Venue's aspect: content fits within the viewBox with the
      remainder letterboxed, centred.
- [x] A narrow ground produces a visibly narrower thumbnail than a wide one — the existing
      thumbnail tests are extended with that comparison.
- [x] At Standard ground, thumbnail output is unchanged from before this ticket — bar the 2.9%
      aspect correction above, which the existing tests pin at its new numbers.
