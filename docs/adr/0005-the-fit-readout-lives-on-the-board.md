# The Fit readout lives on the board; other surfaces only set the Active Venue

## Status

accepted — decided 2026-08-04 by a design grilling (issue #38, on wayfinding map #24),
before implementation. It records the rule the map's five resolutions kept reaching for; the
board chrome it constrains does not exist yet.

## Context

ADR 0002 established the Active Venue as app-wide match context and closed by declining to
put any of it on the board: *"Venue management lives in the existing Match section of
`GlobalDrawer` … No board chrome in v1."* That left the coach's motivating question — *what
does this play look like at Saturday's ground?* — behind a three-step round trip: open the
drawer, open the panel, read the banner. The board itself renders nothing about the Venue.
`Field.tsx` sizes the Boundary off the Active Venue and never names it.

Map #24 designed the affordance that closes that gap: a ground chip in the top bar with a
popover column that both switches grounds and reports fit. Across five resolutions, one rule
kept being reached for and was never written down anywhere it could bind:

- **Issue #26** needed it to decide what the Venue panel becomes once its banner leaves,
  and stated it as *"they both set the Active Venue, and that is the only overlap either is
  allowed"* — recorded in a doc-comment on `VenueModal.tsx`, i.e. on one of the two surfaces
  it governs.
- **Issue #28** reached for the same rule to keep an inline create form out of the popover,
  and found it in a comment on the other surface.

A rule that has decided two separate questions is a rule rather than a choice, and it is now
about to govern a surface neither ticket could see: a ground control on the play-list route
is explicitly out of scope for that map and named as a likely follow-up. So the bilateral
phrasing — *both* surfaces — does not survive the next change, and neither does a doc-comment
on one component.

**The phrasing has to account for a second fit surface that already ships.** `PlayLibrary`
marks *doesn't fit* on every play row (`PlayLibrary.tsx:183`, `206`) through
`playFitsBoundary`, and ADR 0002 sanctions it. So *"fit is reported in exactly one place"* is
false against running code — the same failure mode as 0002's original out-of-bounds
invariant, which was asserted and then found to have been untrue when written. The
distinction that makes the rule true is **subject**, not place: the row marker answers about
a Play on disk, while a count on a Grounds panel row would answer about the Play on the board
— the question the chip already answers.

That distinction is already load-bearing in the code, and already reasoned. `playFit.ts:13-15`
keeps one definition of the predicate so *"the list can never disagree with the board it
opens"*, and the row marker's own comment says the coach *"fixes it by opening the play, not
from here"* (`PlayLibrary.tsx:202-205`). The rule below was being obeyed before it was named.

## Decision

**Fit readout** names the surfaced answer to *does the open board fit the Active Venue?* — the
count, `describeOutOfBounds`'s sentence, and **Pull inside boundary**, together.

> The open board has exactly one Fit readout, and it lives on the board. A surface that sets
> the Active Venue makes no claim about the open board's fit.

Pull inside boundary needs no separate clause: it is part of the Fit readout by definition, so
it lives where the readout lives. A remedy belongs under the eye of the thing it remedies.

The rule is about the **subject** of the claim, not the count of surfaces. Any number of
surfaces may set the Active Venue, and a surface may report fit for Plays it is not the board
of — read-only, no remedy, one shared predicate. What no surface may do is answer for the open
board while the board is answering for itself.

## Considered options

- **Let both surfaces report fit.** The intuitive answer: the coach is picking a ground, so
  tell them there whether it fits. Rejected because it makes the panel and the popover two
  versions of the same screen, and because every fit claim carries obligations — it has to
  stay in step with the board's, and it becomes another place the cone caveat (issue #34) has
  to be told. This is the option that would be taken accidentally, one helpful addition at a
  time, which is why the rule is worth recording rather than assuming.
- **Leave the readout in the panel; put only a switcher on the board.** Rejected: the round
  trip *is* the problem map #24 exists to remove. A chip that switches grounds but sends the
  coach through the drawer to find out what changed has moved the tap, not the answer.
- **One Fit readout, but somewhere other than the board** — a toast, a drawer badge.
  Rejected: the readout is a claim about the board's contents, and ADR 0002 holds the camera
  still on a Venue switch precisely so the coach can watch the Boundary change underneath the
  play. The finding belongs where they are already looking.
- **No ADR; leave the rule in ticket comments and a doc-comment.** Rejected on the evidence
  above: two tickets already had to re-derive it, half of it (the constraint on the popover)
  had no home in the code at all, and the surface it will govern next does not exist yet.
  0002's closing bullet also has to be corrected regardless, so the choice was never between
  a new record and no change.

## Consequences

### What moves, and when

- The fit banner leaves `VenueModal` (`VenueModal.tsx:138-154`) and `describeOutOfBounds`
  moves to the board **in the same build**. Neither half may ship alone: removing the banner
  first leaves the app with no Fit readout at all, and adding the board's first leaves two.
  Issue #26 split its own build on exactly this and told #37 in as many words not to take the
  banner out.
- `describeOutOfBounds` moves **unchanged**. The chosen popover geometry (issue #27, variant
  A) has room for the sentence as written; it is carried, not rewritten.

### What the Grounds panel may never carry

- **No count, no marker, no Pull inside boundary — ever.** The panel is a library of grounds:
  add, edit, delete, and set the Active Venue. That exclusion is the whole of what keeps it
  from becoming a second board.
- **The popover routes to ground creation; it never creates.** An inline form would be a
  second overlap between the two surfaces — two forms, two validation surfaces, two places the
  cone caveat has to be told. Measuring a Boundary is configuration, not the compare loop the
  chip exists for.

### What no surface may imply

- **No surface may imply there is no ground.** ADR 0002 seeds Standard ground so that *there
  is always an Active Venue*, and drew the code conclusion — no consumer needs a null branch.
  The UI half needs stating separately, because a `Set a ground` chip, a *— choose a ground —*
  placeholder row, or an empty state is not a null branch; it is a falsehood. It is also
  meaningless in the shared viewer, where the chip takes its ground as a prop and there is no
  store to be empty.
- **The Fit readout is never suppressed for being unsurprising.** Out of bounds is pure
  geometry with no exemption list (ADR 0002, issue #29), so content past the ellipse is out at
  Standard ground for exactly the reason it is out at a measured one. Hiding the marker on a
  generic ground would suppress a true finding in the case that most deserves it — a shared
  play designed at a larger ground, opened by a coach who has never touched Venues.

### Venue UI keys on properties, never on `venues.length`

The empty-state pattern used elsewhere in the app — `PlayLibrary.tsx:126-129`,
`RosterLibrary.tsx:38` — is correct where the collection *can* be empty and where emptiness is
*transient*. Venues satisfy neither: 0002 makes Standard ground un-deletable, so the list is
never empty, and one Venue is where most coaches live indefinitely rather than a state they
pass through. A count-conditional nudge therefore has no legitimate trigger and would fire
forever. Key on `isDefault` and on active-or-not instead. This is scoped to Venue UI and makes
no claim about the pattern elsewhere.

### Other surfaces

- **The shared viewer** gets a read-only variant that takes its ground as a prop and never
  reaches for `venueStore`, so it can render the sender's ground without touching app-wide
  state. It still reports fit, and its dot still fires: a shared Play that does not fit is the
  case the readout exists for.
- **A future ground control on the play-list route** may set the Active Venue and let the row
  markers re-derive — they are derived per row and never stored (`PlayLibrary.tsx:178-183`), so
  switching remarks the list on the spot. It may **not** carry Pull inside boundary, because it
  is not the board of any of those Plays. This ADR binds that surface without designing it.

### Not settled here

- Where the popover column goes when a Play has a linked video. `LinkedVideoBar` sits at
  `safe-top + 56px` (`LinkedVideoBar.tsx:16`) and the column starts at 59. A layout collision,
  not a question about who owns the readout.
