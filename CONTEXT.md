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

## Board snapshot

- **BoardSnapshot** — the canonical **in-memory** shape of a board's live content:
  `players`, `paths`, `annotations`, `camera`, `ball`, `cones`. Distinct from `PlayPhase`:
  a snapshot is board content without persistence identity or stored field names. This is
  the type every capture/restore/share path speaks. Defined in `utils/boardSnapshot.ts`.

- **boardSnapshot** (`utils/boardSnapshot.ts`) — the pure, store-free module that owns
  the `BoardSnapshot` type and its serialization **adapters**:
  - `toPhase` / `fromPhase` — bridge to the persisted `PlayPhase` (renames to/from
    `playerPositions`/`cameraState`; the stored format is unchanged so old Plays load as-is).
  - `toShareData` / `fromShareData` — bridge to the flat `SharePayload` used in shared
    links. `fromShareData` reads `paths` (the hand-rolled restore sites used to drop them),
    and reads *only* board content; the sender's ground comes back through
    `designedGroundOf` instead — see **Designed ground**.
  Being store-free, leaf layers (the Dexie migration, `sharingService`) can depend on it
  without pulling in the UI store graph.

- **boardSnapshotIO** (`utils/boardSnapshotIO.ts`) — the store-touching half:
  `capture()` reads the board stores; `restore(snap)` writes them back through their
  own actions. The single owner of that store access.

  > Undo speaks this type too. A `StateSnapshot` normally carries only players and
  > annotations, but an edit that reaches further — today, **Pull inside boundary**, which
  > also moves the ball, cones and path keyframes — records the whole `BoardSnapshot` it was
  > made against in `StateSnapshot.board`, and is undone by restoring that board wholesale
  > with the camera nulled. The camera stays outside undo.

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

- **Annotation** — inert markup drawn on the board (line, arrow, circle, rectangle,
  text, measure). Distinct from a MovementPath: an Annotation never moves anything
  during playback. Store: `store/annotationStore.ts`.

## The ground

- **Venue** — a named ground the coach has measured: a name plus its Boundary dimensions.
  Venues are created by the user, not shipped as presets — the grounds that matter are
  community grounds whose dimensions are published nowhere.

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
  Saturday's ground?"

  > Entity positions are stored in absolute metres, never as fractions of the field.
  > Fractions would slide centre-square players outside the centre square, because the
  > markings they sit against are Absolute markings. The cost is that a Play authored on a
  > wide ground can place entities outside a narrower Venue's boundary; that is surfaced to
  > the coach rather than silently corrected.

- **Out of bounds** — board content falling outside the Active Venue's Boundary: players,
  the ball, cones, and MovementPath keyframes. Annotations are never out of bounds — they
  are inert markup and may point off-ground deliberately. Out of bounds is *derived, never
  stored*, and is a legitimate state to leave a board in: it is a true statement about a
  play that does not fit this ground, not an error to be repaired. It is **pure geometry
  with no exemption list**, which rests on an invariant: *the only ways board content can be
  out of bounds are a Venue change or a shared link* — the board seeds 18 per team and
  places nothing outside the Boundary, and both clamps are unconditional. There is no
  interchange bench and so nothing here to name; see ADR 0002 and issue #29.

- **Pull inside boundary** — the one-tap affordance that moves out-of-bounds content inside
  the Active Venue's Boundary. Always the coach's choice, never automatic — no fit on load
  and no clamp during playback — and an ordinary undoable board edit like any drag.

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
  behaviour changes when the tip changes.

- **Path tip** — the Pen tip that turns a Stroke into a MovementPath. The Stroke must
  begin on the entity it belongs to; a Stroke starting on open grass produces nothing.

- **Tool rail** — the always-visible surface presenting the Pen tips and the current
  colour. Always-visible is the point: arming a tip is never a trip through a menu.
  A Tool rail button *arms an instrument*; it never opens a panel.

- **Mode rail** — a distinct, older surface: the column of Setup / Animate / Camera
  buttons that opens a contextual panel. Present in the Rail HUD skin only. Named apart
  from the Tool rail deliberately, because the two are different kinds of thing — a Mode
  rail button opens a panel, a Tool rail button arms a tip. "Rail" alone is ambiguous and
  should not be used as a domain noun.

- **HUD skin** — which board chrome is rendered: **Pods** (thumb-reachable pods) or
  **Rail** (the Mode rail plus a contextual panel). Resolved from device characteristics
  unless the coach forces one. The Tool rail is common to both skins — it is not part of
  what a skin varies.

- **Input contract** — **the pen authors, the finger manipulates.** A finger repositions
  players and the ball, moves the camera, and selects; it never authors anything. A pen
  with a tip armed authors; a pen with no tip armed behaves as a finger. This contract is
  the board's only modal axis, and it lives in the user's hand rather than in app state.

## Architecture vocabulary

Design discussions use the deep-module vocabulary (see the `codebase-design` skill):
**module, interface, implementation, depth, seam, adapter, leverage, locality**.
Prefer these over "component / service / API / boundary".
