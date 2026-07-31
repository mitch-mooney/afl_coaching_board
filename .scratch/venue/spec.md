# Spec — Venue: render the board on the ground you're actually playing at

**Status:** ready-for-agent

Item 2 of the ship order, after the iPad input-model rework. Decisions recorded in
`docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md` (amended 2026-07-31 after
grilling). Vocabulary in `CONTEXT.md`, "The ground" — **Venue**, **Boundary dimensions**,
**Boundary**, **Standard ground**, **Absolute markings**, **Active Venue**, **Out of
bounds**, **Pull inside boundary**. Read the ADR before starting: it records rejected
alternatives that look correct on first inspection.

Three deferrals already ticketed in `.scratch/venue/deferred/` — do not fold them into this
work. The implementation tickets are in `.scratch/venue/issues/`.

## Problem Statement

A coach preparing for Saturday designs a play on a board that is 165 m × 135 m, and always
has been. No ground they will ever coach on is those dimensions. Community grounds run
roughly 150–170 m long and 110–141 m wide, and the difference is not cosmetic — it is the
spacing the play depends on. A structure that breathes on a wide ground is cramped on a tight
one; wingers that hold width on one ground are standing in the boundary line on another.

The coach has no way to find this out except by running the session and watching it fail. The
app renders every play on a ground that does not exist, and offers no way to ask the one
question that matters on a Friday night: *does this still work at the ground we're playing at
tomorrow?*

The dimensions of the grounds that matter are published nowhere. A coach who wants this has
measured the ground themselves, and the app has nowhere to put that measurement.

## Solution

The coach records the grounds they play at as **Venues** — a name and the ground's **Boundary
dimensions**, measured by them. One Venue is the **Active Venue**, and the board renders on
it: boundary line, grass, stadium bowl, thumbnails, and zone lookup all follow the ground the
coach selected. Switching the Active Venue re-renders every Play on that ground, which is the
point — the coach asks the Friday-night question by selecting Saturday's ground and looking at
their playbook.

Entity positions stay in **absolute metres**. They are not rescaled to fit, because AFL
markings are absolute: the centre square is 50 × 50 and the arc is 50 m from goal at every
ground in the country. Rescaling would slide a centre-square player outside the centre square
and put "top of the 50" somewhere other than the painted arc.

The consequence is honest and deliberate: a play designed on a wide ground can put entities
outside a tighter Venue's **Boundary**. The app says so — a count, a marker on the plays that
don't fit, and a one-tap **Pull inside boundary**. It never fixes it silently, not on load and
not during playback. Seeing that your wingers don't fit is the information the coach came for.

## User Stories

### Recording grounds

1. As a coach, I want to record a ground I have measured as a named Venue, so that I can see
   my plays on the ground I actually coach at.
2. As a coach, I want to give a Venue the name I call the ground, so that I recognise it in a
   list at a glance.
3. As a coach, I want to enter a Venue's length and width in metres, so that I can type in the
   numbers I measured without converting anything.
4. As a coach, I want to be told when I have entered the length and width the wrong way round,
   so that a transposed measurement does not silently reshape every play.
5. As a coach, I want to be warned — but not blocked — when I enter dimensions outside the
   usual range, so that a genuinely unusual junior ground is still recordable.
6. As a coach, I want to edit a Venue's dimensions after I have re-measured the ground, so
   that a correction does not mean deleting and re-creating it.
7. As a coach, I want to delete a Venue I no longer play at, so that my list stays short.
8. As a coach, I want my Venues to still be there next week, so that measuring a ground is
   something I do once.

### Choosing the ground

9. As a coach, I want to set one Venue as the Active Venue, so that the board renders on it.
10. As a coach, I want the Active Venue to still be selected when I reopen the app, so that I
    am not re-choosing my home ground every session.
11. As a coach, I want the app to render on a sensible standard ground before I have measured
    anything, so that it is usable the moment I install it.
12. As a coach, I want the standard ground to be identifiable as generic rather than measured,
    so that I do not mistake it for a real ground someone recorded.
13. As a coach, I want deleting the Active Venue to fall back to the standard ground, so that
    the board never ends up rendering on nothing.
14. As a coach, I want editing the Active Venue's dimensions to re-render the board
    immediately, so that I can correct a measurement and see the effect straight away.
15. As a coach, I want the ground to sit with the scoreboard and other match settings, so that
    it is where I expect match context to live.

### Seeing the ground

16. As a coach, I want the boundary drawn as a visible line, so that when the app tells me
    something is outside the boundary I can see the line it means.
17. As a coach, I want the boundary line to move when I switch Venues, so that the difference
    between two grounds is visible rather than inferred.
18. As a coach, I want the centre square, 50 m arcs, goal squares and posts to stay exactly
    where they are on every ground, so that what I teach against the markings stays true.
19. As a coach, I want the 50 m arcs cut off at the boundary on a narrow ground, so that the
    ground looks like a real ground rather than a diagram.
20. As a coach, I want the grass, stadium bowl and scoreboard to follow the ground's size, so
    that nothing floats detached from the boundary.
21. As a coach, I want the camera to stay exactly where it is when I switch Venues, so that I
    am comparing two grounds from one viewpoint rather than watching the app reframe.
22. As a coach, I want a preset view to frame whatever ground is active, so that "top view"
    fits the ground rather than a ground I am not on.

### When a play doesn't fit

23. As a coach, I want to be told when entities fall outside the Active Venue's boundary, so
    that I find out on Friday rather than at training.
24. As a coach, I want to know how many entities are outside, so that I can tell "one winger
    is a metre out" from "half the structure doesn't fit."
25. As a coach, I want a MovementPath that leaves the ground counted too, so that a play that
    looks fine standing still does not surprise me the moment I press play.
26. As a coach, I want my Annotations left alone, so that an arrow I deliberately pointed
    off-ground is not treated as a mistake.
27. As a coach, I want a one-tap "pull inside boundary", so that adapting a play to a tight
    ground is not thirty manual drags.
28. As a coach, I want to undo "pull inside boundary", so that I can look at the adapted
    version and then go back.
29. As a coach, I want nothing saved until I save it, so that previewing a play at another
    ground cannot damage the play.
30. As a coach, I want a play that does not fit to open unchanged, so that the app never
    quietly reshapes a structure I designed.
31. As a coach, I want playback to run the path exactly as I drew it even when it leaves the
    ground, so that I can see how far outside it goes instead of watching a corrected version.
32. As a coach, I want switching back to the wider ground to restore the play exactly, so that
    looking at a play on another ground costs nothing.
33. As a coach, I want to still be able to move players around freely on a tight ground, so
    that adapting the play by hand works normally.

### Across the playbook

34. As a coach, I want to see which Plays don't fit the Active Venue from the play list, so
    that I can triage a whole playbook for Saturday instead of opening plays one at a time.
35. As a coach, I want play thumbnails to show the shape of the ground they're rendered on, so
    that a narrow ground looks narrow in the list.
36. As a coach, I want zone names suggested against the ground I'm on, so that dropping a
    player on the wing of a narrow ground calls them a winger.
37. As a coach, I want the forward and back zones measured from the goal line, so that "full
    forward" means deep inside the 50 at every ground.

### Sharing

38. As a coach, I want a play I share to be viewed on the ground I designed it for, so that
    the coach I sent it to sees the spacing I intended.
39. As a coach receiving a link, I want to see which ground it was designed at, so that I can
    judge whether it transfers to mine.
40. As a coach receiving a link, I want opening it into my own board to keep my Active Venue,
    so that a link someone sent me cannot change my app's settings.
41. As a coach receiving a link, I want to be told if the play doesn't fit my ground, so that
    I learn the same thing I would about my own plays.
42. As a coach, I want links I shared before this feature existed to render exactly as they
    always did, so that nothing I have already sent out breaks.

## Implementation Decisions

### The Venue record and its store

- A **Venue** is `{ id, name, boundaryLength, boundaryWidth }` plus a creation timestamp.
  Dimensions are named in full because they describe the playing surface, not the ground's
  footprint. Metres only; no unit conversion.
- Venues persist in a new Dexie table in the app database, requiring a schema version bump.
  Plays and Playbooks are untouched — the stored coordinate meaning is unchanged, so **there
  is no Play migration**.
- A new **`venueStore`** owns Venue CRUD, the seeded default, and the Active Venue selection.
  It follows `playbookStore`, which already owns exactly this shape of invariant for the
  default Playbook.
- The store seeds **"Standard ground"** at 165 × 135 on first load and refuses to delete it.
  This guarantees the invariant **there is always an Active Venue**, so no consumer carries a
  null branch. It is also the fallback when the active record is deleted or the stored active
  id names a record that no longer exists.
- The **Active Venue** is a `venueId` in `localStorage` (the `hudPreferenceStore` pattern),
  not a Dexie row — it is a selection over the record set, not data. An unreadable or unknown
  stored id resolves to Standard ground rather than erroring.
- Validation is a pure function returning accept / accept-with-warning / reject:
  - **reject** when `boundaryWidth >= boundaryLength`, or either is non-positive. An AFL
    ground is always longer than it is wide, and transposition is the likely data-entry error.
  - **warn but accept** outside 120–200 m long or 90–170 m wide.
  - The write path refuses rejects; warnings surface in the form and the coach proceeds.

### Splitting boundary from markings

- `FIELD_CONFIG` is renamed **`FIELD_MARKINGS`** and **loses `length` and `width` entirely**.
  Every one of the ~27 call sites is then enumerated by the compiler. A deprecated alias was
  explicitly rejected: an alias that still returns plausible numbers fails silently, which is
  the hazard this whole feature exists to remove.
- Everything remaining on `FIELD_MARKINGS` is an **Absolute marking** and never varies. The
  name states the invariant, so a future per-venue value added to it looks obviously wrong.
- The 165 × 135 that used to live there moves to the seeded Standard ground — the numbers
  relocate to where they are now true rather than being deleted.
- `generateFieldGeometry` is dead code and is deleted, not migrated.

### Geometry stays pure

- `fieldGeometry` gains a **`Boundary { semiX, semiZ }`** type — semi-axes, because every
  consumer immediately halves the dimensions — plus a derivation from a Venue. Geometry
  functions take a `Boundary` **as an explicit parameter** and never read a store, preserving
  the pure/IO split the codebase already commits to (`boardSnapshot` vs `boardSnapshotIO`,
  `boardPlayback` vs `boardScrub`). Passing the whole Venue was rejected so geometry code
  cannot reach for a name or id.
- A `useActiveVenue` hook supplies the `Boundary` at the React boundary; the two or three
  non-React callers read the store directly.
- `snapToField` and `isPointInField` take the `Boundary`. Both are on hot paths — every
  pointer move during a drag and every stroke waypoint — so the `Boundary` is read **once per
  gesture**, not per event.
- **One ellipse, one source.** The painted boundary, clamping, arc clipping and thumbnails all
  derive from the same `Boundary`. Today the clamp uses 82.5 × 67.5 while the apron hole that
  paints the oval is hardcoded at 82 × 67 — that half-metre disagreement is removed, because
  "outside the boundary" is about to become a user-facing claim.

### Zones

- `positionToZone` takes a `Boundary`. Its **lateral** thresholds become fractions of
  half-width, calibrated to reproduce today's behaviour at 135 m: wing at `0.444 × semiZ`,
  the CHF/HFF split at `0.296`, the FF/FP split at `0.222`.
- Its **forward/back** thresholds stay absolute but are **anchored to the goal line**, which
  sits at `±boundaryLength / 2`. Full forward is within ~35 m of goal; the centre-half-forward
  band reaches ~55 m; the back half mirrors. Calibrated against 165 m these reproduce today's
  behaviour exactly. Keeping the current constants measured from field *centre* was rejected:
  `x >= 48` means 34.5 m from goal at 165 m and 27 m at 150 m, which slides the forward line
  relative to the goal — the same failure normalisation was rejected for.
- The zone **ordering bug is out of scope** and separately ticketed. Do not fix it here; keep
  this change a pure substitution of which thresholds are used.

### Out of bounds

- Two pure snapshot-level functions live alongside the point-level ones in `fieldGeometry`:
  one reporting what falls outside a `Boundary`, one returning a snapshot with that content
  pulled inside. Both take `(snapshot, boundary)`. They sit in `fieldGeometry` rather than a
  new module on the fewest-seams rule.
- Scope: **players, the ball, cones, and MovementPath keyframes**. A path that leaves the
  ground matters more than a static position — the board looks correct until playback flings a
  player over the grandstand. **Annotations are excluded**: inert markup may point off-ground
  deliberately, and moving an endpoint would distort a shape the coach drew.
- The out-of-bounds set is **derived, never stored** — recomputed from live board against
  Active Venue, so it appears the instant the Venue changes and clears the instant it is
  resolved. No dirty flag, nothing to keep in sync.
- **Pull inside boundary** is an ordinary undoable board edit through the existing history
  layer, applied by an IO half that reuses the snapshot restore path. Nothing reaches Dexie
  until the coach saves the Play.
- **No auto-fit on load. No clamp during playback.** Both were rejected as the silent-reshape
  option wearing a disguise. An ignored out-of-bounds path plays exactly as authored.
- The **live clamp stays**, now against the Active Venue. Direct manipulation with immediate
  visual feedback is not a silent correction, and keeping it yields the invariant: *the only
  ways board content can be out of bounds are a Venue change or a Play arriving from a shared
  link.* The cost — entities cannot be staged outside the boundary for a throw-in — is today's
  behaviour and is separately ticketed.
- The same predicate drives a **"doesn't fit" marker** in the play list, computed per row
  alongside the thumbnail's existing per-row snapshot work.

### Rendering

- The boundary is drawn as a **white line** on the ellipse. Without it, a narrower Venue reads
  as "the grass got smaller" rather than "your wingers don't fit on this ground", and the
  out-of-bounds claim refers to nothing visible.
- The grass stays a **rectangle** sized to the Venue's bounding box plus a margin, with the
  apron painting over the corners as it does now. An elliptical mesh is work with no visible
  payoff.
- Arc clipping already tests against the boundary ellipse and needs only the venue-derived
  `Boundary` to cut correctly at a narrow ground.
- The stadium bowl and the scoreboard's offset derive from the Active Venue.
- **The camera does not move when the Active Venue changes.** Presets derive from the Venue so
  a preset frames the actual ground, but holding the view still while the boundary changes
  underneath *is* the comparison the coach is making; refitting would re-normalise it visually
  and destroy the information. Per-Play stored camera state is unchanged.
- Thumbnails currently map `x / length` and `z / width` into a fixed box — that **is** the
  rejected normalisation, already implemented in the one place the ADR originally missed. The
  projection changes to a single scale fitted from both axes with the remainder letterboxed,
  so a 118 m-wide ground reads as narrower than a 141 m one. Thumbnails render live from the
  phase, so they follow the Active Venue with no cache to invalidate.

### Sharing

- The share payload gains optional `venueName`, `boundaryLength`, `boundaryWidth` as **render
  context, not Play content**. Absolute metres are meaningless in an app where the author's
  Venue does not exist.
- The shared viewer renders on the **sender's** dimensions, labelled with the ground's name.
- Restoring a shared Play into your own board keeps **your** Active Venue — a link must never
  reconfigure app-wide state — and surfaces out-of-bounds content if it doesn't fit.
- **Nothing is auto-imported** into the recipient's Venue list.
- Payloads with no venue fields fall back to Standard ground 165 × 135, which is exactly what
  they were authored at, so existing links render byte-identically to today.

### Where it lives

- Venue management is an entry in the existing **Match** section of the global drawer — the
  same section as the scoreboard, which states the ADR's claim in the UI: the ground is match
  context, not a display preference.
- The panel lists Venues with the active one marked, tap to activate, plus create / edit /
  delete.
- **No board chrome in v1.** The Tool rail arms Pen tips and nothing else (ADR 0003), and
  board real estate on an iPad is scarce. The faster compare loop is separately ticketed.

## Testing Decisions

A good test here asserts **external behaviour at a seam**: given these dimensions and this
board content, what does the function return? It does not assert how the value was computed,
does not reach into store internals, and does not assert on React rendering. Every new test
should read as a football claim — "on a 110 m-wide ground, a player 32 m off centre is a
winger" — not as a restatement of the implementation.

Five seams, four already existing.

**`fieldGeometry` — new test file, the bulk of the work.** No test file exists today. Prior
art for style: `boardPlayback.test.ts` and `dragMath.test.ts` (pure functions, table-ish
cases, no store).

- `positionToZone` at three ground sizes — a tight ground, the standard ground, a wide one.
  The standard-ground cases must reproduce **today's** returns exactly; that is the
  regression guard for the whole threshold rewrite.
- Goal-line anchoring stated as a claim: a position 34.5 m from goal is full forward at 150 m,
  165 m and 175 m alike — the case that fails under the rejected centre-anchored reading.
- Lateral fractions: the same fraction of half-width returns the same zone at any width.
- `snapToField` / `isPointInField` against a `Boundary`: inside unchanged, outside projected
  onto the ellipse, and a point inside a wide ground that is outside a narrow one.
- The out-of-bounds report: players, ball, cones and **path keyframes** all counted;
  **Annotations never counted**, including one deliberately drawn well outside.
- Pull-inside returns a snapshot whose content is inside, leaves in-bounds content
  **byte-identical**, and leaves Annotations untouched.

**`venueStore` — new test file.** Prior art: `playbookStore.test.ts`, which tests the
equivalent default-record invariant against a fake IndexedDB.

- Standard ground is seeded on first load and is not seeded twice on reload.
- Standard ground cannot be deleted.
- Deleting the Active Venue falls back to Standard ground.
- An unknown or absent stored active id resolves to Standard ground rather than throwing.
- Validation: swapped dimensions rejected; out-of-range accepted with a warning; in-range
  accepted clean.
- Editing the Active Venue's dimensions changes what the active `Boundary` resolves to.

**`thumbnailProjection` — existing test file, extended.** A ground and its double-width
counterpart must produce **different** ellipse radii, and content must stay centred with the
remainder letterboxed. The current tests are the guard that standard-ground output is
unchanged.

**`boardSnapshot` — existing test file, extended.** Venue fields round-trip through the share
adapters; a payload without them reads back as Standard ground. The existing "legacy flat
camera" tests are the pattern to copy — this codebase already tests backward compatibility of
this wire shape explicitly, and should here too.

**`appDatabase` migration — existing test file, extended.** The version bump creates the
Venues table and leaves existing Plays and Playbooks readable and unchanged.

**Not tested, by codebase precedent:** field rendering and the boundary line, the drawer
panel, camera preset derivation, and the IO half of pull-inside — the same split by which
`boardScrub` is untested while `boardPlayback` carries the tests. These need the **iPad
smoke**, not unit tests.

## Out of Scope

- **The zone ordering bug** (`FB`/`BP` unreachable). Ticketed as `deferred/01`. It touches the
  same lines, which is exactly why it stays separate — this change must be a pure substitution
  of thresholds, not a change to what the function returns.
- **Staging entities outside the boundary** for throw-ins, interchange or bench. Ticketed as
  `deferred/02`, `needs-design` — it retires an invariant this work depends on.
- **A board-level venue affordance** for faster A/B comparison. Ticketed as `deferred/03`,
  `needs-design`, deliberately deferred until the menu-only version has been used for real.
- **Shipped venue presets.** Explicitly rejected in the ADR — the grounds that matter are
  community grounds whose dimensions are published nowhere.
- **Supabase sync of Venues.** Venues stay local, like everything else that is not a shared
  link.
- **Auto-importing a shared link's ground** into the recipient's Venue list. A "save this
  ground" tap may earn its place later; a link adding rows to your data does not.
- **Per-Play Venues.** Rejected in the ADR: the playbook fragments by ground and you lose the
  preview that motivated the feature.
- **Non-boundary markings varying by ground.** Every Absolute marking is identical everywhere.
- **Unit conversion.** Metres only.
- **Anything that changes stored Play data.** No migration, no rewrite of coordinates.
- **The stadium and player-silhouette items** (3 and 4 of the ship order), beyond deriving the
  bowl's extents from the Active Venue.

## Further Notes

The riskiest part of this change is not the new feature; it is the ~27 call sites that read
field dimensions today, every one of which would keep compiling and keep returning plausible
numbers if it were missed. That is why `length`/`width` are **deleted** rather than
deprecated: the compiler, not a reviewer, is what enumerates the work.

The single most surprising finding from grilling is that the rejected model was already in the
codebase. `thumbnailProjection` normalises positions to fractions of the field — precisely
what the ADR forbids — and it is harmless only because the dimensions are currently constant.
Expect at least one more instance of this shape; the tell is any expression dividing a
coordinate by a field dimension.

The 165 × 135 constant appears in three places with two different values (the clamp ellipse at
82.5 × 67.5 and the painted apron hole at 82 × 67). Reconciling them changes the painted
boundary by half a metre. That is invisible today and worth stating in the commit, because it
will read as an unexplained tweak.

Standard-ground behaviour should be **identical before and after** this change, everywhere —
zones, clamping, thumbnails, share round-trips. That is the strongest available regression
guard and the tests should lean on it hard.
