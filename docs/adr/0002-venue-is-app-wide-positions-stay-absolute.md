# Venue is app-wide context; positions stay in absolute metres

## Status

accepted — amended 2026-07-31 after a design grilling, before implementation. Three
substantive changes: forward/back zone thresholds are anchored to the **goal line** rather
than to field centre; a shared Play **carries the ground it was designed on**; and
`thumbnailProjection` was found to already implement the rejected normalisation.

Amended again 2026-08-03: the out-of-bounds invariant below was **false when this ADR was
written** — the seed formations staged an interchange bench outside the boundary, so every
play reported eight players out of bounds forever. The bench has been deleted rather than
exempted (issue #29), which makes the invariant true for the first time. See "The invariant"
under Out of bounds.

Amended again 2026-08-05: **the lossless claim below was over-broad and is reframed.** "Switching
back to the wide venue restores it perfectly, because no data changed" was true of the case its
own bullet describes — an *ignored* out-of-bounds, where the coach changed nothing — but it read
as a general guarantee about switching, and ADR 0005 has since put Pull inside boundary one tap
away mid-compare. A round trip with a pull in the middle does not restore anything. This is the
same species of error as the 2026-08-03 amendment and was found the same way: by checking the
claim against the code rather than against the prose. The sentence now says what the switch
*does* — `setActiveVenue` writes the selection and nothing else — rather than what it results in,
so a future edit reachable from the Venue surfaces falls under it instead of falsifying it. See
Out of bounds.

Amended again 2026-08-04: **"No board chrome in v1" is retired.** ADR 0005 puts a ground chip
and its Fit readout on the board, and names the rule governing which surface may claim fit.
This ADR's model is unchanged and 0005 depends on it — the always-an-Active-Venue invariant,
absolute positions, and the derived-never-stored out-of-bounds set are all load-bearing there.
Only the final Data bullet changed.

## Context

`FIELD_CONFIG` (`models/FieldModel.ts`) was a frozen `as const` at 165 × 135 m — dimensions
that match no real ground. Community grounds vary enormously (roughly 150–170 m long,
110–141 m wide), and a play designed with the spacing of a wide ground does not transfer to
a tight one. Coaches need to see a play rendered on the ground they are about to play at.

## Decision

A **Venue** is a user-created record: a name plus `boundaryLength` / `boundaryWidth`. There
is no shipped preset list — the grounds that matter are community grounds whose dimensions
are published nowhere. Venues live in a Dexie `venues` table; the **Active Venue** is a
`venueId` in `localStorage`, because it is a selection over the record set rather than data
in its own right.

One Venue is seeded and un-deletable: **"Standard ground"**, 165 × 135, carrying the numbers
that used to live in `FIELD_CONFIG`. It exists to guarantee the invariant **there is always
an Active Venue**, so no consumer needs a null branch — the same role `"My Plays"` plays for
Playbooks, and the same fallback when the active record is deleted.

The Active Venue is app-wide match context, not per-Play board content — the same exclusion
already applied to the scoreboard, and for the same reason. Setting it re-renders every Play
on that ground.

**Entity positions remain in absolute metres, never normalised to fractions of the field.**

Only boundary length and width vary. Every other marking — centre square, 50 m arcs, goal
square, post spacing — is identical at every ground and stays constant. `FIELD_CONFIG` is
renamed **`FIELD_MARKINGS`** and loses `length`/`width` entirely, so that the compiler
enumerates every site needing a Venue and nothing can keep reading a stale boundary.

Geometry stays pure: `snapToField`, `isPointInField`, `positionToZone` and `projectSnapshot`
take an explicit `Boundary { semiX, semiZ }` argument rather than reading a store, preserving
the pure/IO split the codebase already commits to (`boardSnapshot` vs `boardSnapshotIO`).
`positionToZone` gains its `Boundary` at the same moment its thresholds start using one —
a parameter accepted and ignored would look venue-aware while answering for a different
ground, which is the failure mode this decision exists to remove. The IO half is a
`useActiveBoundary` hook: the single place a ground is resolved, so no call site names one.

## Considered options

- **Normalise positions to fractions of the field.** Rejected, and this is the important
  one: it is the intuitive answer and it is wrong. AFL field markings are almost all
  absolute. Scaling a player's position by ground width would slide a centre-square player
  outside the centre square, and would put "top of the 50" somewhere other than the painted
  50 m arc. A narrow ground is not a scaled-down MCG.
- **Store the Venue on each Play.** Nothing is ever out of bounds, but the playbook
  fragments by ground and you lose the ability to preview a play at this week's venue —
  which was the entire motivation.
- **Silently clamp out-of-bounds entities** via `snapToField`. Never produces an invalid
  board, but a play quietly reshapes itself and the coach ends up teaching a structure they
  did not design. Rejected in every form it can take: not on load, not on the "pull inside"
  affordance, and not during playback.
- **Keep `FIELD_CONFIG` as a deprecated alias** and migrate call sites gradually. Rejected:
  an alias that still returns plausible numbers fails silently, which is the exact hazard
  this decision exists to avoid, and there is no rollout pressure — one app, one branch.

## Consequences

### Zones

- `positionToZone` (`utils/fieldGeometry.ts`) hardcodes thresholds calibrated to 165 × 135
  and would fail silently — on a 110 m-wide ground, `|z| >= 30` would make almost everyone a
  winger. Its **lateral** thresholds become fractions of half-width (wing at `0.444 ×
  semiZ`, the CHF/HFF split at `0.296`, the FF/FP split at `0.222`, all calibrated to
  reproduce today's behaviour at 135 m).
- Its **forward/back** thresholds stay absolute but are anchored to the **goal line**, not
  to field centre. The original wording said only "absolute", which taken literally keeps
  `x >= 48` — and since the goal line sits at `±boundaryLength / 2`, that constant means
  34.5 m from goal at 165 m, 27 m at 150 m, and 39.5 m at 175 m. Anchoring to centre slides
  the forward line relative to the goal, which is the same failure normalisation was
  rejected for. Full-forward is *within ~35 m of goal*; the centre-half-forward band reaches
  *~55 m*; the back half mirrors. The value is absolute; the origin is the goal line, exactly
  as the 50 m arc is.

### Out of bounds

- A Play authored on a wide ground can place entities outside a narrower Active Venue's
  boundary. This is **surfaced to the coach** with a one-tap "pull inside boundary", never
  corrected silently. Seeing that your wingers don't fit is useful information, not an error.
- The check covers players, the ball, cones, **and MovementPath keyframes** — a path that
  leaves the ground matters more than a static position, because the board looks fine until
  playback flings a player over the grandstand. Annotations are excluded: they are inert
  markup, and pulling a drawn arrow's endpoint inside would distort a shape the coach drew
  deliberately, possibly pointing off-ground on purpose.
- The out-of-bounds set is **derived, never stored** — computed from live board against
  Active Venue, so it appears the instant the venue changes and clears the instant it is
  resolved, with no dirty flag to keep in sync.
- "Pull inside boundary" is an **ordinary undoable board edit** through `historyStore`.
  Nothing reaches Dexie until the coach saves the Play. There is **no auto-fit on load** and
  **no clamping during playback**: an ignored out-of-bounds path plays exactly as authored,
  and a player visibly running off the ground is honest, self-explanatory feedback. Switching
  back to the wide venue restores it perfectly, because the switch itself changes no board data
  — `setActiveVenue` writes the selection and nothing else. What a round trip cannot restore is
  an edit made *between* the switches, and Pull inside boundary is exactly that: a real board
  edit, so a coach who pulls inside at a tight ground and switches back finds the play as the
  pull left it. Undo reverses it like any other edit, and the Fit readout says so on the board
  (ADR 0005).
- Live input **keeps** clamping via `snapToField`, now against the Active Venue. That is
  direct manipulation with immediate visual feedback, not a silent reshape. The cost is that
  entities still cannot be staged outside the boundary — a boundary throw-in is taken from
  outside the line — which is today's behaviour and is ticketed separately.

#### The invariant

> The only ways board content can be out of bounds are a Venue change or a shared link.

This holds for **players, the ball, and MovementPath keyframes**, because the board seeds 18
per team and places nothing outside the Boundary, and because both the drag clamp and the
stroke clamp are unconditional. **Relaxing either retires the invariant.**

It does **not** yet hold for cones — see issue #34. `TrainingSessionEditor.handleSetUpOnBoard`
seeds drill cones at fixed absolute metres through `coneStore.addCone`, which is unclamped. An
`attack`/`goal-kicking`/`defence` drill puts its outermost cone at (x, z) ≈ (±70.4, ±12.6):
inside Standard ground, but outside the ellipse once the ground is shorter than **≈ 143.3 m**
at a standard 135 m width — a length the app accepts without even warning. So setting up a
drill on a narrow Active Venue can put content out of bounds with no Venue change and no shared
link.

Stated rather than fixed here because it is a live TrainingMode defect, not a Venue decision.
It is the same class of mistake as the interchange bench — content seeded at fixed absolute
metres by a subsystem that predates variable grounds — found the same way, and closing it is
what would let this caveat be deleted and the invariant stated unconditionally.

It has not always held. This ADR originally asserted it as a consequence of the clamps alone,
which was wrong: the seed formations were a third way in, staging four players per team at
formation `x = 73` as an interchange bench — outside every realistic ground, and predating
the Venue work entirely. So the fit readout reported eight out of bounds on every play from
the day it shipped, and `Pull inside boundary` dragged that bench onto the field.

Issue #29 settled it by **deleting the bench rather than exempting it**: the board is 18 a
side, a one-off Dexie migration strips players 19–22 from every stored play, and both read
adapters drop them as a backstop for shared links authored on old clients. Out of bounds
therefore stays **pure geometry with no exemption list** — a fit report that said "8 outside,
but 8 of those don't count" would not be a fit report — and its count genuinely reaches zero.
- The same predicate marks **"doesn't fit"** on Plays in the playbook list. A coach preparing
  for Saturday has a playbook, not one play; without the marker the feature answers the
  motivating question one play at a time.

### Rendering

- The stadium bowl (`Field.tsx`), camera framing, `Scoreboard.tsx`, and `thumbnailProjection`
  all hardcode field extents today and must derive them from the Active Venue.
- Two boundary ellipses currently disagree: `snapToField` clamps to 82.5 × 67.5 while the
  apron hole that *paints* the oval is 82 × 67 (`Field.tsx:49`). One derived `Boundary`
  replaces both. `generateFieldGeometry()` (`FieldModel.ts:57`) is dead and is deleted rather
  than migrated.
- A **white boundary line** is drawn on the ellipse. When the app claims entities are outside
  the boundary, the coach has to be able to see the line that claim refers to — and see it
  move on switching grounds. Without it, a narrower venue reads as "the grass got smaller"
  rather than "your wingers don't fit."
- `FiftyMeterArcs` already clips against the boundary ellipse, so arcs cut correctly at a
  narrow ground once the ellipse is venue-derived.
- **The camera does not move when the Active Venue changes.** Presets derive from the venue
  so "top view" always frames the actual ground, but holding the view still while the
  boundary changes underneath is the comparison the coach is asking for; refitting would
  re-normalise it visually and destroy exactly the information the feature exists to show.
- `projectSnapshot` (`thumbnailProjection.ts:33`) maps `x / L` and `z / W` into a fixed draw
  box — it **is** the rejected normalisation, already implemented, in the one place this
  decision did not originally look. Harmless while L and W are constant; the moment they vary
  every Play renders into the same rectangle and a play at 118 m wide looks identical in shape
  to one at 141 m. Thumbnails letterbox to the venue's true aspect instead.

### Sharing

- A shared Play crosses into an app where the sender's Active Venue does not exist, and
  absolute metres are meaningless without the boundary they were drawn against. `SharePayload`
  therefore carries optional `venueName` / `boundaryLength` / `boundaryWidth` as **render
  context, not Play content**.
- The shared viewer renders on the **sender's** dimensions, labelled. Restoring a shared Play
  into your own board keeps **your** Active Venue — a link must never silently reconfigure
  app-wide state — and surfaces out-of-bounds entities if they don't fit. Nothing is
  auto-imported into the recipient's Venue list.
- Legacy payloads with no venue fields fall back to "Standard ground" 165 × 135, which is
  precisely what they were authored at, so old links render exactly as they always have.

### Data

- Saved Plays need no migration — the stored coordinate meaning is unchanged.
- Venue input is validated: swapped dimensions (`width >= length`) are **rejected**, as an
  AFL ground is always longer than it is wide and transposition is the likely data-entry
  error; anything outside 120–200 m long or 90–170 m wide is **warned about but accepted**,
  because the coach measured the ground and we did not.
- Ground management lives in the existing **Match** section of `GlobalDrawer`, presented as
  **"Grounds"** — a library of grounds: add, edit, delete, and set which one is active.
  **Adding one sets it**, in `venueStore` rather than at any call site, so every door into
  recording a ground lands the coach on it (issue #49); the selection is made after the
  reload, so the board never resolves an id its records do not hold yet. It
  stays in Match because Match holds the fixture's *fixed facts* — teams, score, ground — not
  where they are watched (issue #26). Originally this bullet also said *"no board chrome in
  v1"*, on the reasoning that the drawer's placement states this decision's claim in the UI.
  That is retired: **ADR 0005** puts a ground chip and the Fit readout on the board, and the
  panel carries no fit claim at all — its banner left in issue #52, in the same change that
  put the readout in the chip's popover.
