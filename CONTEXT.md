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
    links. `fromShareData` reads `paths` (the hand-rolled restore sites used to drop them).
  Being store-free, leaf layers (the Dexie migration, `sharingService`) can depend on it
  without pulling in the UI store graph.

- **boardSnapshotIO** (`utils/boardSnapshotIO.ts`) — the store-touching half:
  `capture()` reads the board stores; `restore(snap)` writes them back through their
  own actions. The single owner of that store access.

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
  `cameraPosition`/`cameraTarget`/`cameraZoom`, plus share metadata (`name`, `quarter`, `label`).

## Architecture vocabulary

Design discussions use the deep-module vocabulary (see the `codebase-design` skill):
**module, interface, implementation, depth, seam, adapter, leverage, locality**.
Prefer these over "component / service / API / boundary".
