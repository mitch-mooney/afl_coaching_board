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
  `players`, `paths`, `annotations`, `camera`. Distinct from `PlayPhase`: a snapshot is
  board content without persistence identity or stored field names. This is the type
  every capture/restore/share path speaks. Defined in `utils/boardSnapshot.ts`.

- **boardSnapshot** (`utils/boardSnapshot.ts`) — the pure, store-free module that owns
  the `BoardSnapshot` type and its serialization **adapters**:
  - `toPhase` / `fromPhase` — bridge to the persisted `PlayPhase` (renames to/from
    `playerPositions`/`cameraState`; the stored format is unchanged so old Plays load as-is).
  - `toShareData` / `fromShareData` — bridge to the flat `SharePayload` used in shared
    links. `fromShareData` reads `paths` (the hand-rolled restore sites used to drop them).
  Being store-free, leaf layers (the Dexie migration, `sharingService`) can depend on it
  without pulling in the UI store graph.

- **boardSnapshotIO** (`utils/boardSnapshotIO.ts`) — the store-touching half:
  `capture()` reads the four board stores; `restore(snap)` writes them back through their
  own actions. The single owner of that store access.

  > Scope note: a BoardSnapshot is deliberately the four slices a Play persists today.
  > Ball, scoreboard/match, and cones are **not** yet captured — extending the snapshot to
  > cover them is a known, deliberate follow-on, not an accident.

- **SharePayload** — the flat wire shape stored in a shared-link record
  (`shared_playbooks.playbook_data`): board content with the camera split into
  `cameraPosition`/`cameraTarget`/`cameraZoom`, plus share metadata (`name`, `quarter`, `label`).

## Architecture vocabulary

Design discussions use the deep-module vocabulary (see the `codebase-design` skill):
**module, interface, implementation, depth, seam, adapter, leverage, locality**.
Prefer these over "component / service / API / boundary".
