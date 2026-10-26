# AFL Coaching Board — Domain Language

The shared vocabulary for this codebase. Use these terms exactly — in code, tests,
commits, and reviews — so names match across the app. New architectural work should
extend this file rather than inventing parallel names.

## Core persistence model

- **Play** — one saved board: the positions, movement paths, annotations, camera,
  linked video moment, and roster references a coach arranges. This is the unit that
  is saved, loaded, and shared. Stored in the Dexie `scenarios` table (legacy table
  name; the rows are Plays). Model: `models/PlayModel.ts` (`Play`). Store: `store/playStore.ts`.

- **Playbook** — a named collection of Plays, by **containment**: each Play carries
  exactly one `playbookId`. `"My Plays"` is the un-deletable default. Not a
  many-to-many join. Model: `models/PlaybookModel.ts`. Store: `store/playbookStore.ts`,
  which owns the Play→Playbook containment invariant (default creation, dedupe,
  reassign-on-delete).

- **PlayPhase** — the persisted shape of one phase of a Play: phase identity
  (`id`, `label`) plus the board content under the stored field names
  (`playerPositions`, `paths`, `annotations`, `cameraState`). A Play holds `phases: PlayPhase[]`;
  today exactly one phase is used.

- **Meeting** — an ordered list of Plays a coach presents to a room, one after another
  ("Thursday's meeting"). It points at Plays rather than copying them, so an edit made
  after a Play was added is what the room sees. The same Play may appear more than once.
  Deleting a Play removes it from every Meeting, and the coach is told which Meetings
  first. Presenting a Meeting is Present, stepping from Play to Play. A Meeting may carry
  a date; the **next Meeting** is the earliest dated one not yet past, and it leads Home.

- **Home** — what the app opens to: the next Meeting first, ready to present, then the
  recently edited Plays, then the Playbooks. Ordered by what the coach does next, not by
  how Plays are filed.
  _Avoid_: dashboard, landing page, library.
  _Avoid_: session (TrainingSession is drills on the track), running order, setlist,
  presentation.

## Board snapshot

- **BoardSnapshot** — the canonical **in-memory** shape of a board's live content:
  `players`, `paths`, `annotations`, `camera`, `ball`, `cones`. Distinct from `PlayPhase`:
  a snapshot is board content without persistence identity or stored field names. This is
  the type every capture/restore/share path speaks. Defined in `utils/boardSnapshot.ts`.

- **boardSnapshot** (`utils/boardSnapshot.ts`) — the pure, store-free module that owns
  the `BoardSnapshot` type, its serialization **adapters**, and the comparison that
  answers whether two boards differ:
  - `toPhase` / `fromPhase` — bridge to the persisted `PlayPhase` (renames to/from
    `playerPositions`/`cameraState`; the stored format is unchanged so old Plays load as-is).
  - `toShareData` / `fromShareData` — bridge to the flat `SharePayload` used in shared
    links. `fromShareData` reads `paths` (the hand-rolled restore sites used to drop them),
    and reads *only* board content; the sender's ground comes back through
    `designedGroundOf` instead — see **Designed ground**.
  - `boardChanged(before, after)` — did anything change? Compares the content slices,
    asking reference equality first at every level (the board stores update immutably,
    so an untouched slice is the same object) and walking only what differs. The camera
    is deliberately *not* content: undo never moves it, so a camera-only difference is a
    change the undo stack cannot represent. `COMPARED_SLICES` states that answer per
    slice, and is typed so a new slice cannot be added without answering for it.
  Being store-free, leaf layers (the Dexie migration, `sharingService`) can depend on it
  without pulling in the UI store graph.

- **boardSnapshotIO** (`utils/boardSnapshotIO.ts`) — the store-touching half:
  `capture()` reads the board stores; `restore(snap)` writes them back through their
  own actions. The single owner of that store access.

- **Board edit** — a change the coach made to the open board, recorded so it can be
  undone. A board write the app performs on the coach's behalf — loading a Play,
  seeding the board, playback, undo's own restore — is not a Board edit and records
  nothing; that rule, not a list of blessed call sites, decides whether a given write
  records. `utils/boardEdit.ts` is the one module that makes an edit: `editBoard(label,
  mutate)` runs a mutation and records it in one call (a tap, a menu action);
  `beginEdit(label)` opens a gesture that spans time — the coach's hand landing, some
  number of writes, then lifting — and returns a handle whose `commit()` closes it. Both
  ask `boardSnapshot.boardChanged` whether the board actually differs before recording,
  so a drag that ends where it started, or a menu action re-applying what is already
  true, costs the coach nothing on the undo stack. An edit begun while another is already
  open folds into it — only the outermost `commit()` records — so a tangled interaction
  never produces entries out of order. Nothing outside this module pushes onto
  `historyStore`'s `past`.

  A **`HistoryEntry`** (`store/historyStore.ts`) is `{ before, after, label, timestamp }` —
  the whole `BoardSnapshot` on both sides, never a lighter shape for an edit that only
  touched a player or an annotation. Undo restores `before` with the camera nulled — it
  stays outside undo, and a null camera is exactly what tells `restore()` to leave the
  live one alone; redo restores `after` the same way, though nothing in the app calls it
  yet (issue #63). The **Fit readout**'s pull memory (`fitReadout.hasBeenPulledInside`) is
  a predicate over entries' `label`, matched against the one exported
  `PULL_INSIDE_BOUNDARY_LABEL` both **Pull inside boundary** and the readout read — see
  ADR 0005.

- **boardPlayback** (`utils/boardPlayback.ts`) — the pure "where is everything at *t*"
  queries, no store access:
  - `positionsAtProgress(entityPaths, progress)` returns each entity's position at a global
    progress (0..1) — longest path drives the clock, shorter paths clamp at their own end.
    `boardScrub` is its IO half (`collectEntityPaths` reads; the mutator applies the result),
    the same pure-vs-IO split as boardSnapshot / boardSnapshotIO.
  - `boardAt(snap, progress)` is the snapshot-level form: a new `BoardSnapshot` with players
    and the ball moved to their positions at `progress`, everything else carried through. Its
    entity paths come from `snap.paths` filtered by `pathHasMovement`, matching `collectEntityPaths`,
    so it renders the same moment the live scrubber would. Store-free — for export frames,
    thumbnails, and the shared viewer.

- **boardPlacement** (`utils/boardPlacement.ts`) — the pure "who is on the board" edits,
  no store access: each returns a new `BoardSnapshot` from the one given, and each surface
  that uses one is nothing more than `editBoard(label, () => restore(fn(capture())))`.
  Same pure-vs-IO split as boardSnapshot / boardSnapshotIO.
  - `placePlayer(snap, teamId, point, appearance, boundary)` — the board with one more player
    of that team standing where the coach tapped: the lowest free number for the team from 1
    upward, the id a seeded player of that number would have, the jersey in `appearance`,
    facing the ball or the ground centre when there is none, and the point snapped inside
    the Boundary. Returns the same snapshot by reference when the team already holds 18, so
    `editBoard` records nothing for a refused nineteenth. This is what **Placement** records
    on a tap on grass.
  - `withoutPlayer(snap, playerId)` — the board without one player: every MovementPath that
    belongs to them goes with them, and the ball is released only if they held it. Same
    snapshot by reference when no such player is on the board. This is what **Placement**
    records on a tap on a player.
  - `withoutPlayers(snap)` — the board with no players: every MovementPath that belongs to a
    player goes with them and the ball is released. The ball itself, the ball's own path,
    every annotation and every cone stay, because none of them belongs to a player. This is
    what **Clear players** in the Setup sheet records.
  - `atFullStrength(board)` — true only when both teams hold exactly 18. The formation
    presets position 18 a side by number, so the three formation actions are disabled
    whenever this is false; **Reset players** is never disabled, because reseeding 36 is how
    a short board gets back to full strength.

  A board short of 36 is a legitimate board. Nothing downstream counts the players list —
  `toPhase`, `toShareData`, `restore`, `boardChanged`, `boardAt`, the fit readout all read
  it — so a 6v6 board saves, shares, undoes and plays back as drawn. The round trip through
  both adapter pairs is pinned in the boardSnapshot suite. Startup is unchanged: 36 players
  in Centre Bounce. See issue #81.

  > Scope note: a BoardSnapshot captures players/paths/annotations/camera **plus the ball
  > and cones**. `toPhase`/`toShareData` emit `ball`/`cones` only when present, so pre-ball/
  > pre-cones Plays and shared links keep a byte-identical stored shape. Scoreboard/match
  > state is **deliberately excluded** — it is app-wide match context, not per-Play board
  > content, so capturing it would make restoring a Play clobber the live scoreboard.

- **SharePayload** — the flat wire shape stored in a shared-link record
  (`shared_playbooks.playbook_data`): board content with the camera split into
  `cameraPosition`/`cameraTarget`/`cameraZoom`, plus share metadata (`name`, `quarter`, `label`)
  and the **Designed ground** (`venueName`, `boundaryLength`, `boundaryWidth`).

- **Designed ground** — the ground a shared Play was designed on, carried on a SharePayload
  as **render context, not Play content**: positions are absolute metres, which mean nothing
  without the boundary they were drawn against. Read with `designedGroundOf(payload)`, never
  through `fromShareData` — it is not board content and must not ride a restore into app-wide
  state. It is **not** a Venue: viewing a link renders on it, but restoring one into your own
  board keeps **your** Active Venue and adds nothing to your Venue list. Every link written
  from here on carries one, so absent venue fields date a link rather than describe one: it
  was shared before Venues existed, at 165 × 135, and falls back to Standard ground — which
  is exactly what it was authored at.

## Board content

- **MovementPath** — the route one entity travels during playback, as timed waypoints.
  Belongs to exactly one entity (a Player or the Ball), identified by `entityId` +
  `entityType`. This is the *only* term for this concept — "run", "route" and "line"
  are not synonyms for it and must not appear as domain nouns. Model: `models/PathModel.ts`.

- **Carrier** — the player holding the ball; a ball with a carrier is a **held ball**,
  one without is **loose**. A finger gives the ball by dropping it on a player and
  releases it by dragging it off; a drop that lands on no player leaves it loose, with no
  catch radius to guess at who was meant (decided 2026-10-25).
  _Avoid_: assigned player, owner, holder.

- **Annotation** — inert markup drawn on the board (line, arrow, circle, rectangle,
  text, measure). Distinct from a MovementPath: an Annotation never moves anything
  during playback. Store: `store/annotationStore.ts`.

## The ground

- **Venue** — a named ground the coach has measured: a name plus its Boundary dimensions.
  Venues are created by the user, not shipped as presets — the grounds that matter are
  community grounds whose dimensions are published nowhere.

- **Grounds** — the user-facing name for the coach's collection of Venues, and for the panel
  that manages it: the drawer item, the panel header. The one deliberate place where the UI's
  word and the code's differ, because *Venue* is the precise noun for one measured ground and
  *Grounds* is what a coach calls the several of them. Not a parallel name for the concept —
  a Venue is still a Venue everywhere in code, tests and commits, and there is no `Ground`
  type. Two doors lead to the panel — the drawer item, and the **ground popover**'s *Add a
  ground* footer — so its open state is held in `uiStore` (`showVenue`) rather than by either
  of them. Panel: `components/UI/VenueModal.tsx`. See ADR 0002 and issue #26.

- **Boundary dimensions** — `boundaryLength` (goal-to-goal) and `boundaryWidth`
  (wing-to-wing): the axes of a Venue's boundary ellipse, and the *only* part of the field
  that varies between grounds. Named in full because they describe the playing surface, not
  the ground's footprint.

- **Boundary** — the ellipse itself, as geometry consumes it: the semi-axes derived from a
  Venue's Boundary dimensions. This is what "inside the ground" is measured against — one
  ellipse, shared by the painted boundary line, clamping, zone lookup, and thumbnails.

- **Standard ground** — the seeded, un-deletable Venue at 165 × 135 m. It is a generic
  ground, not a measured one, and exists so that **there is always an Active Venue** —
  the same role `"My Plays"` plays for Playbooks, including as the fallback when the active
  record is deleted.

- **Absolute markings** — every other field marking: centre square (50×50m), 50m arcs,
  goal square, goal and behind post spacing. These are identical at every ground and are
  never scaled. A narrow ground is not a scaled-down MCG; it is the same markings with the
  boundary pulled in tighter, so the 50m arc sits closer to the wing.

- **Active Venue** — the ground the board is currently rendered on. This is app-wide match
  context, **not** per-Play board content — the same exclusion that applies to the
  scoreboard, and for the same reason. Setting the Active Venue re-renders every Play on
  that ground, which is the point: a coach asks "what does this play look like at
  Saturday's ground?" **Recording a ground sets it** — that is a second way the Active
  Venue changes, and it lives in `venueStore` so every door into creating one behaves
  alike (issue #49).

  > Entity positions are stored in absolute metres, never as fractions of the field.
  > Fractions would slide centre-square players outside the centre square, because the
  > markings they sit against are Absolute markings. The cost is that a Play authored on a
  > wide ground can place entities outside a narrower Venue's boundary; that is surfaced to
  > the coach rather than silently corrected.

- **Ground chip** — the board's own name for its ground, in the editor top bar right of the
  tab switcher: the Active Venue's name, a hairline oval at rest, and a single amber dot —
  no number — when anything is Out of bounds. Tapping it drops the **ground popover**, a
  264px column of every Venue that stays open across picks, so a repeated compare costs one
  tap per switch rather than a round trip through the drawer, with the **Fit readout**'s block
  hanging beneath the list and an *Add a ground* footer beneath that — which routes to the
  **Grounds** panel and never creates, so grounds are managed in one place. Both are board
  chrome and
  render on the board tab only, from the top bar, where the **Board chrome** leaves them.
  What the chip *says* is decided in
  `components/Board/hud/fitReadout.ts` beside the **Fit readout**'s words, because the dot
  and the sentence are the same finding at two resolutions. Components:
  `components/Board/hud/GroundChip.tsx`, `GroundPopover.tsx`. See ADR 0003 for where the
  column sits and ADR 0005 for what it may claim.

- **Out of bounds** — board content falling outside the Active Venue's Boundary: players,
  the ball, cones, and MovementPath keyframes. Annotations are never out of bounds — they
  are inert markup and may point off-ground deliberately. Out of bounds is *derived, never
  stored*, and is a legitimate state to leave a board in: it is a true statement about a
  play that does not fit this ground, not an error to be repaired. It is **pure geometry
  with no exemption list**, which rests on an invariant: *the only ways board content can be
  out of bounds are a Venue change or a shared link* — the board seeds 18 per team and
  places nothing outside the Boundary, Placement clamps the tapped point inside it, and
  every one of those clamps is unconditional. There is no
  interchange bench and so nothing here to name. The invariant holds for players, the ball
  and paths; drill cones are a known exception, since `addCone` is unclamped (issue #34). A cone
  *drag* is not part of that exception: it snaps inside the Boundary as a player drag does. See
  ADR 0002 and issue #29.

- **Pull inside boundary** — the one-tap affordance that moves out-of-bounds content inside
  the Active Venue's Boundary. Always the coach's choice, never automatic — no fit on load
  and no clamp during playback — and an ordinary undoable board edit like any drag. Part of
  the **Fit readout**, and so lives wherever that does — since issue #52, in the ground
  popover's block, under the sentence that reports the finding: a remedy belongs under the eye
  of the thing it remedies.

- **Fit readout** — the surfaced answer to *does the open board fit the Active Venue?*: the
  Out of bounds count, its sentence (`describeOutOfBounds`, in
  `components/Board/hud/fitReadout.ts`), **Pull inside boundary**, and
  whether the board **has been pulled inside** (`hasBeenPulledInside`, in the same module —
  a predicate over the undo stack's entry labels, since the pull marks the history entry
  it records rather than setting any flag), together as one thing. The open board has
  exactly one Fit readout and it lives **on the board**; a surface that merely sets the Active
  Venue makes no claim about the board's fit. Distinct from **playFit**'s row marker, which is
  the same predicate on a different *subject* — a Play on disk rather than the board — and so
  is not a second readout. See ADR 0005.

  It renders as one block in the **ground popover**, **below** the ground list — `fitReadoutState`
  decides its words, `GroundPopover`'s `FitBlock` draws them. Below the list and not above it,
  because a finding appearing mid-compare must not move the rows the coach is tapping. The
  Grounds panel's fit banner, which was the readout until issue #52, is gone.

  The readout explains its own answer: a count of 0 the coach **created**, by pulling inside at
  the ground they are standing on, is not the finding a count of 0 they **inherited** is. Both
  say the board fits; only one says the board is still the play they opened. This is the same
  claim at a higher resolution, not a second subject — the readout reports fit, never *the board
  has been edited*, which would be a dirty flag and is deliberately not a thing this app has.

- **playFit** (`utils/playFit.ts`) — the pure "does this *stored* Play fit this ground?"
  predicate, over every phase of the Play. Delegates to **Out of bounds** rather than
  restating it, so the marker on a row in the play list and the count on the open board are
  the same claim; a row is marked when any phase has anything outside. Same pure/IO split as
  boardSnapshot / boardSnapshotIO — the Play and the Boundary are both passed in.

## Board input

- **Stroke** — one continuous pen gesture on the board. A Stroke is raw input; what it
  *becomes* is decided entirely by the armed Pen tip.

- **Pen tip** — the currently armed authoring instrument: at most one of the Annotation
  kinds, or Path, or none. Called a *tip* rather than a mode deliberately — it describes
  what a Stroke turns into, not a state the board is in. Nothing else about the board's
  behaviour changes when the tip changes. **Placement** is not one; it decides what a tap
  creates, never what a Stroke turns into, and `PenTip` is not widened for it.

- **Path tip** — the Pen tip that turns a Stroke into a MovementPath. The Stroke must
  begin on the entity it belongs to; a Stroke starting on open grass produces nothing.

- **Tool rail** — the always-visible surface presenting the Pen tips, the two Placement
  buttons and the current colour. It arms two kinds of instrument, a Pen tip above the
  divider or a Placement below it, one at a time. Always-visible is the point: arming an
  instrument is never a trip through a menu. A Tool rail button *arms an instrument*; it
  never opens a panel. The one exception is **Undo**, set apart at the rail's foot
  (decided 2026-10-25): an action, not an instrument, placed here because it changes the
  board and the left edge is where the board is changed.

- **Placement** — the Tool rail's second kind of instrument. It is armed *for a team*:
  while it is armed, a tap on grass places a player of that team where the tap landed, and
  a tap on any player, either team, takes that player off the board, with their
  MovementPaths, the ball if they held it, and any selection or POV slot they occupied.
  Armed means "I am editing the roster"; the team only decides what a tap on grass creates.
  A placed player is a real player in every respect — the lowest free number for the team,
  the team's current jersey, facing the ball (or the ground centre when there is none),
  clamped inside the Boundary, and refused once the team holds 18 — so nothing downstream
  has a second kind of player to know about. Not a Pen tip, and deliberately outside the
  Input contract's authoring rule, by the reasoning ADR 0001 gives for cone placement:
  placing an object is a pointer job, and a pointer job accepts a finger, a Pencil and a
  mouse alike. At most one instrument is armed, a tip or a Placement, never both; arming
  either disarms the other, and arming the armed one disarms it. Cone setup is exclusive
  with it too, in both directions, since the cone plane and the placement plane would
  otherwise both take the same tap. Unavailable while an
  animation plays, for the Path tip's reason: it writes the state playback reads, and a
  removal mid-animation would take off whoever was under the tap. Available again when
  playback is paused or stopped, and playback starting does not disarm it. **Clear
  players**, in the Setup sheet, is the bulk form of removal and arms nothing; arming is the
  Tool rail's job. The armed team: `store/penStore.ts` (`armedPlacement`). The edits:
  `utils/boardPlacement.ts`. The grass under the tap:
  `components/Scene/PlayerPlacementPlane.tsx`; the tap on a player is handled in
  `components/Scene/Player.tsx`, ahead of selection.

- **Cone setup** — Training mode's counterpart to Placement, for cones. While it is armed
  ("Set up cones"), a tap on grass sets a cone and a tap on a cone takes it off. Disarmed,
  a finger drags a cone as it drags a player (ADR 0001), and the drag is one Board edit,
  snapped inside the Boundary. A tap on a cone does nothing then, so removal is never what
  an ordinary tap does (issue #110). A pen with a tip armed draws over a cone rather than
  moving it. The rule: `utils/coneDrag.ts` (`conePointerIntent`); the cone:
  `components/Scene/ConeManager.tsx`. The gold dots "Set up on Board" shows are a different
  thing, the **drill preview**: ghost positions in `playerStore.previewPositions`, never
  captured into a BoardSnapshot or saved. A finger drags a gold dot as it drags a cone,
  snapped inside the Boundary, but the drag is not a Board edit and Undo does not reach it,
  since the preview is not board content (`beginPreviewDrag`). While cone setup is armed a
  tap on a dot goes to the grass beneath, so a cone can be set on it. **Clear drill
  preview**, beside the Ground chip, removes the dots.

- **Mode rail** — retired with the Rail HUD skin (ADR 0007). It was the column of Setup /
  Animate / Camera buttons that opened a contextual panel. The name survives only in ADRs
  0003 and 0007; "Rail" alone is ambiguous and should not be used as a domain noun.

- **Board chrome** — the board's one set of controls, the same on every device (ADR 0007).
  Each edge has one job: the **Tool rail** on the left changes the board, the **View
  column** on the right changes how you see it, and the **Playback bar** along the bottom
  changes the moment. The bottom of the board is one stack between the two side
  clearances, so nothing there is placed against another surface's height: the Playback
  bar, the **Setup sheet** above it when open, and the Link Video Moment button above
  that. Component: `components/Board/hud/BoardChrome.tsx`.
  _Avoid_: HUD skin, Pods, Rail (all retired).

- **View column** — the right-edge column holding the camera views (Broadcast, Top,
  Sideline, End-to-end, Reset camera), the two POV slots and their assignment, and an
  empty, labelled Lens group that Spec 2 fills. Nothing in it edits the board, which is
  why it may sit in the right-hand palm zone (ADR 0007, answering ADR 0003). Its top is
  the Tool rail's top, with or without the linked-video bar: the Board chrome sets the
  two side by side in one row, each at its head. Other surfaces keep out of it
  through `VIEW_COLUMN_CLEARANCE`, as they keep out of the Tool rail through
  `TOOL_RAIL_CLEARANCE` (`components/Board/hud/podStyles.ts`). Component:
  `components/Board/hud/ViewColumn.tsx`.
  _Avoid_: right rail, Mode rail, sidebar.

- **Playback bar** — the bottom bar, between the two side clearances: the scrubber across
  its width, and beneath it play/pause, stop, speed and the **Setup** button. A Play with
  no animation says *No animation* and its transport is disabled. The one control Present
  keeps whole. Component: `components/Board/hud/PlaybackBar.tsx`.
  _Avoid_: transport, timeline, Animate pod.

- **Setup sheet** — rises from the Playback bar and holds the Setup action list:
  formations (disabled while a team is short of 18), Teams / jerseys, Labels, Reset
  players, Clear paths, Clear annotations, Clear players, Give / Release ball and Import
  roster. Undo is not in it. It closes on a tap on the board or on Escape. Component:
  `components/Board/hud/SetupSheet.tsx`; the list is `useSetupControls`.

- **Design tokens** — the one source for the app's colour, type, spacing and radius:
  `src/theme/tokens.ts`. The Tailwind theme is built from it and inline-style HUD code
  imports it, so a utility class and an inline style cannot disagree. The palette is a
  night game under lights: **Turf**, **Turf lit**, **Chalk**, **Concrete**, **Steel** and
  **Floodlight**. There is no brand accent; team colours are the accents. Type is Big
  Shoulders Display for numbers and headings and Public Sans for everything else, both
  bundled with the build.

- **Floodlight** — the state colour: an armed tip, an active view or tab, an open panel,
  the focus ring. A state never borrows a team's colour, and amber is not a state: it
  means only *doesn't fit* (ADR 0005).
  _Avoid_: accent, brand colour, highlight.

- **Input contract** — **the pen authors, the finger manipulates.** A finger repositions
  players and the ball, moves the camera, and selects; it never authors anything. A pen
  with a tip armed authors; a pen with no tip armed behaves as a finger. This contract is
  one of the board's two modal axes, and it lives in the user's hand rather than in app
  state. The other is **Present**, which is app state: the contract still decides *what* a
  gesture makes, and Present decides whether it is kept. Inside Present the contract holds
  unchanged; what it produces lands in the Present sketch instead of the Play.

## Players on screen

- **Player body** — how a player looks from a broadcast angle: a real athletic build and
  real movement, a guernsey with a readable number, no face. The player is identified by
  number, build and motion, the way a crowd identifies them.
  _Avoid_: avatar, model, figure, character.

- **Player token** — how a player looks from overhead: a flat disc wearing the team's
  guernsey pattern, a large number on a plain centre so stripes never cut through it, and
  a notch showing facing. Chosen by the camera, not by the coach: past a
  steep enough tilt every body becomes its token at once, and turns back as the camera
  lowers. A POV view always shows bodies.
  A device that cannot keep the board smooth also falls back to tokens, after giving up
  shadows and Arrival map resolution first: the board may give up looks, never
  information, and a token carries every fact a body does.
  _Avoid_: chip (Ground chip owns it), marker, counter, 2D mode.

- **Clash guernsey** — the alternate a team wears when its guernsey is too close to the
  other team's to tell apart, as on match day. Always the second team that changes, on
  body and token alike. The board decides when the teams clash; the coach can override
  it either way. Covers two clubs that look alike, two custom teams coloured alike,
  and a club playing itself in an intra-club drill.
  _Avoid_: away kit, alternate colours, contrast mode.

## Presenting

- **Present** — the board as shown to a room of players: the Play fills the screen, the
  authoring chrome steps back, and the coach drives playback and the camera. The moment the
  board's look is designed for; authoring alone is the close second. A coach is
  *presenting* while in it. Nothing done in Present changes the Play.
  _Avoid_: presentation mode, slideshow, TV mode.

- **Present sketch** — the disposable layer a coach draws and drags on while presenting:
  telestrator ink over the paused moment, players moved to a "what if" spot, and Lenses
  turned on or off. Not a Board
  edit: it records nothing, saves nothing, and is discarded when playback resumes or the
  coach leaves Present, so the Play comes back as it was.
  _Avoid_: scratch edit, temporary edit, draft.

## Space

- **Lens** — a layer that shows space on the board rather than adding content to it: the
  Arrival map is one. A Play saves which Lenses it opens with, because the space is part
  of what the Play argues. Toggling a Lens while presenting is part of the Present sketch.
  _Avoid_: overlay, layer, filter, visualisation.

- **Arrival map** — the ground coloured by which team gets to each point first. Every
  player runs at the same speed, and turning away from their facing costs time, so space
  in front of a player is theirs more cheaply than space behind. Reads players only: the
  ball does not weight it. Derived from the board as shown, so a Present sketch redraws it.
  _Avoid_: Voronoi, heat map, space control map.

- **Depth** — how many of each team stand behind the ball, toward the goal that team
  defends. The football meaning, the one players hear on match day; the 3D sense of the
  word is never called depth. The **Depth Lens** draws the ball's line across the ground
  and the count either side of it. With no ball on the board there is no Depth, and the
  Lens cannot be turned on; it never falls back to halfway, which would show a different
  number that looks the same. A held ball is measured where its carrier stands.
  _Avoid_: numbers back, behind-the-ball count (as names; fine in speech).

- **Hang time** — the Lens showing a kick's flight: its arc, where it lands, and who can
  get under it before it does. The board's use of height; not a kind of Depth.

## Architecture vocabulary

Design discussions use the deep-module vocabulary (see the `codebase-design` skill):
**module, interface, implementation, depth, seam, adapter, leverage, locality**.
Prefer these over "component / service / API / boundary".
