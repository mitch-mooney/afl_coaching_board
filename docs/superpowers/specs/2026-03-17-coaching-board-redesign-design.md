# AFL Coaching Board — Redesign Design Spec
**Date:** 2026-03-17
**Status:** Approved by user

---

## Vision

The AFL Coaching Board sits at the intersection of a physical magnet tactics board and video review. Coaches recreate scenarios quickly, present them to players in a 3D environment, and hop between camera viewpoints (broadcast, player 1, player 2) while players on the field are clearly identifiable by number, name, or position. Video sets the scene; the 3D board is where the coach breaks it down.

---

## 1. Overall Structure

The app reorganises from a single canvas + hamburger menu into **three top-level areas**:

### 1.1 Home — Scenario Library
- Grid of saved scenarios: field formation thumbnail + scenario name + video-attached indicator
- Two always-visible actions: **Open** scenario, **New Scenario**
- Link to **Team Rosters** library (separate from scenarios)
- Link to **Help** reference

### 1.2 Scenario Editor
The main working surface. Two tabs:
- **Board** — the 3D magnet board
- **Video** — the clip attached to this scenario

### 1.3 Team Rosters
Persistent player list library. Accessed from Home. Rosters are independent of any scenario and reused freely across sessions.

---

## 2. Scenario Editor — Board Tab

### 2.1 Two Sub-modes

A single toggle button in the top corner switches between sub-modes. A persistent banner communicates the current mode. **Scenarios always open in Setup mode** — sub-mode is not persisted to disk. This is intentional: the coach should always consciously switch to Draw mode before creating paths.

#### Setup Mode (default on open)
- Players load in the correct AFL formation for the selected `formationPreset` (see Section 2.3)
- Dragging any player **does not create a path or trail**
- **Reset Formation** button sweeps all players back to the selected starting formation (with confirmation if players have been moved)
- Formation preset selector: Centre Bounce, Kick-in (defensive end), Kick-in (attacking end)
  - *Set Shot and Throw-in are deferred to a future release — coordinates TBD*
- Banner: *"Setup mode — position players freely"*

#### Draw Mode
- Dragging a player **creates a movement path** (existing animation system)
- Existing phase-based animation and playback works as today
- Switching back to Setup prompts: *"Clear all paths and return to Setup?"* (confirm/cancel)
- Banner: *"Draw mode — movement creates paths"*

### 2.2 Camera Dock

A pill-shaped control fixed to the **bottom centre** of the Board tab. Always visible in both sub-modes.

```
[ 📺 Broadcast ]  [ 👤 Player 1 ]  [ 👤 Player 2 ]
```

- **Broadcast** — snaps to overhead/tactical sideline view
- **Player 1 / Player 2** — each is a **bookmarked POV slot**. Tapping switches the camera to first-person view from that player. Only one POV is active at a time; they are not split-screen. This is a sequential-switching model, not simultaneous viewports.
- **Assigning a POV player**: tap any player token on the field → popup: *"Set as Player 1 · Set as Player 2 · Cancel"*
- Active view is highlighted in the dock

**Camera store change required:** The existing `cameraStore` has a single `povPlayerId: string | null`. This must be extended to `povPlayer1Id: string | null` and `povPlayer2Id: string | null`, plus a `activePovSlot: 1 | 2 | null` to track which slot is currently active. The active POV player is derived: `activePovSlot === 1 ? povPlayer1Id : povPlayer2Id`.

### 2.3 Correct AFL Starting Positions

All players face the centre of the field on load. Positions by zone for **Centre Bounce** (the primary preset):

| Zone | Players | Location |
|------|---------|----------|
| Full back | FB, BPL, BPR | Deep inside defensive 50m arc |
| Half back | CHB, HBFL, HBFR | On or just inside the 50m arc line (defensive end) |
| Wings | WL, WR | On the boundary line of the centre square, left and right flanks |
| Midfielders | C, RR, R | Triangle formation around the outside of the centre circle |
| Ruck | RK | At the centre circle, facing the ball |
| Half forward | CHF, HFFL, HFFR | On or just inside the 50m arc line (forward end) |
| Full forward | FF, FPL, FPR | Deep inside the forward 50m arc |

**Centre circle clock-face positioning (midfielders & ruck):**

Using the centre circle as a clock face where **12 o'clock = top of circle, pointing toward your own goal**:

| Player | Clock position | Notes |
|--------|---------------|-------|
| Ruck | Centre (ball spot) | Standing at the exact centre for the bounce |
| Midfielder (C) | 6 o'clock | Bottom of circle, facing opponent's goal direction |
| Midfielder (RR) | 3 o'clock | Right side of circle |
| Midfielder (R) | 9 o'clock | Left side of circle |

The three non-ruck midfielders occupy the **attacking half of the circle** (3–6–9 arc). 12 o'clock is intentionally left clear — that is the defensive/own-goal side. In coordinate terms, if the centre circle has radius `r` and the field runs along the Z axis with the attacking goal at +Z:

- 6 o'clock → `(0, 0, +r)` — toward attacking goal
- 3 o'clock → `(+r, 0, 0)` — right flank
- 9 o'clock → `(-r, 0, 0)` — left flank
- Ruck → `(0, 0, 0)` — ball spot

The opposing team's midfielders mirror these positions (rotated 180°), also forming a 3–6–9 arc on their own attacking half of the circle. Both teams' players alternate around the arc rather than stacking — exact alternation order to be confirmed against AFL rules during implementation.

All player rotation vectors point toward the field centre `(0, 0)`.

The value of `r` (centre circle radius in world units) **must be read from `fieldGeometry.ts`** during implementation — do not hard-code.

**Kick-in preset — player positioning:**

The pressing team (the team that scored, attacking the kick-in) forms three lines measured from the kicking team's goal, plus a back-6 holding near the centre square. All distances are from the kicking end goal line.

| Line | Distance from goal | Players (L → R across field width) | Count |
|------|--------------------|--------------------------------------|-------|
| Line 1 | 20m | FPL · FF · FPR | 3 |
| Line 2 | 35m | HFFL · CHF · HFFR · Rk | 4 |
| Line 3 | 52m | WL · RR · C · Ro · WR | 5 |
| Back row A | Centre square (near boundary) | HBFL · CHB · HBFR | 3 |
| Back row B | Centre square (behind row A) | BPL · FB · BPR | 3 |

**Notes:**
- Line 1 and 2 players are spread evenly across the field width at their respective distances
- Line 3 wings (WL, WR) sit at the widest points (near the boundary), midfielders cluster toward centre
- The Ruck (Rk) drops into Line 2 beside the half-forward line rather than sitting in the centre circle
- The back 3+3 rows are positioned horizontally across the width of the centre square, providing defensive coverage and a reset option for the kick-in receiver
- The kicker themselves stands in the goal square (one of the FB or CHB who has run back); they are the 18th player not listed above
- The kicking team's defensive kick-in preset is the **mirror image** (same formation geometry, flipped end-for-end)

In-code, distances from goal translate to Z-axis offsets from the kicking goal line. All values **must be read from `fieldGeometry.ts`** (field length, goal position, centre square boundaries) — do not hard-code metres directly.

### 2.4 Player Label Toggle

A single button in the top-right corner of the board cycles all player labels simultaneously:

`#` → `Name` → `Position` → `#`

- **#** — Jersey/squad number (classic magnet board feel). This is the default state.
- **Name** — Surname (or first initial + surname if short enough to fit)
- **Position** — AFL position code (FB, CHF, Ruck, etc.)

Captain (`c`) and vice-captain (`vc`) players display a small star badge on their token.

**Player store change required:** The existing `playerStore` uses two separate boolean flags: `showPlayerNames: boolean` and `showPositionNames: boolean`. These are replaced by a single `labelMode: 'number' | 'name' | 'position'` field on the store. The existing flags are removed. Rendering logic that currently checks `showPlayerNames` and `showPositionNames` is updated to check `labelMode`. `labelMode` defaults to `'number'`.

### 2.5 Video Reference Badge

When the coach taps "Take to Board" from the Video tab, a small badge appears in the corner of the Board tab showing:
- Video thumbnail (still frame at the captured timestamp)
- Timecode of the captured moment

Tapping the badge switches back to the Video tab at that exact timestamp.

---

## 3. Scenario Editor — Video Tab

### 3.1 Video Player
- Full-width clean video player — no 3D overlay, no calibration controls visible
- Standard playback controls: play/pause, scrub, speed (0.25×–2×), volume
- Frame-step buttons for precise moment selection

### 3.2 "Take to Board" Handoff
- A single prominent button: **"Take to Board →"**
- Saves the current video timestamp as the reference point on the Scenario
- Switches to the Board tab in Setup mode
- Coach positions players to match what they just watched

### 3.3 Attaching a Clip
- Each scenario holds **one** attached video clip
- Clip can be attached at scenario creation or added/replaced later
- Stored in existing Dexie IndexedDB system (50MB limit applies)
- Scenarios without a clip work as pure board scenarios — the Video tab shows an "Attach a clip" prompt

### 3.4 Coach Workflow
```
Video Tab
  → scrub to key moment
  → "Take to Board"
        ↓
Board Tab (Setup mode)
  → place players to recreate the moment
  → Reset Formation if needed
  → switch to Draw mode
  → draw the play
        ↓
Camera Dock
  → Broadcast view for overview
  → Player 1 / Player 2 for individual accountability
```

---

## 4. Team Rosters

### 4.1 Roster Library (Home Screen)
- Roster cards: team name, player count, date last used
- Actions per roster: Edit, Duplicate, Delete
- Persisted in **`AFLPlaybookDB`** — a new `teamRosters` table added at **version 3** of the existing database (currently version 2). This keeps all coaching data in one database.

Dexie schema addition:
```typescript
// AFLPlaybookDB version 3
this.version(3).stores({
  playbooks: '++id, name, updatedAt, videoBlobId',  // unchanged
  teamRosters: '++id, name, updatedAt',             // new
});
```

### 4.2 PlayHQ Import

Rosters are imported from PlayHQ game centre data. Two methods are offered in the same import dialog.

#### Method A — URL Fetch
Coach pastes a PlayHQ game centre URL:
```
https://www.playhq.com/afl/org/.../game-centre/<id>
```

**Fetch behaviour:**
1. Show a loading spinner in the import dialog immediately on submission
2. Attempt fetch with a **5-second timeout**
3. On success: parse response, populate the player list preview
4. On failure (CORS block, network error, timeout): dismiss spinner, show inline error message: *"Couldn't fetch from PlayHQ — paste the player list below instead."* The URL is preserved in the field so the coach can try again or switch to paste. The paste textarea becomes visually prominent.

> **CORS note:** PlayHQ does not permit direct browser fetch in the current deployment. Method A will routinely fail. A lightweight proxy endpoint is listed as a future enhancement. For v1, Method A is offered as a best-effort attempt; Method B (paste) is the reliable path and is presented equally in the UI.

#### Method B — Paste Import
Coach copies the player table from PlayHQ game centre and pastes into a text area. The parser handles the PlayHQ tab/space-separated format:

```
#    Players              PP   G
1    Joshua Bruce         1    3
4    Aaron Bruce c        1    1
8    Will McTaggart       5    3
15   Jackson Crowe vc     1    1
```

**Parser rules:**
- Extract: jersey number, player name, goals (G column, optional)
- Strip captain/VC markers (`c`, `vc`) from names — store as `isCaptain` / `isViceCaptain` boolean flags
- Skip header rows (containing "Players", "PP", "G") and summary rows ("Team Stats", "Total")
- Accept any whitespace delimiter (tab, multiple spaces)
- Handle squad numbers beyond 22 — no position-by-number assumptions

### 4.3 Field Assignment (18 Players)

Squad lists include interchange/emergency players (22+ players). After import the coach selects which 18 go on the field:
- Default: the first 18 players in list order have `isOnField: true`
- An "On Field" toggle per player row in the roster editor
- Exactly 18 players with `isOnField: true` populate the field in default formation
- If fewer than 18 are marked on field, remaining slots use generic numbered placeholders

### 4.4 Position Assignment

Because squad numbers do not map to positions, position assignment is manual:
- Players are placed on field in formation slots ordered by jersey number
- Coach drags players to correct positions in **Setup mode**
- Position codes can be manually set per player (existing functionality)
- Position assignments are saved on the Scenario, not the Roster — the same roster can be used in multiple scenarios with different formations

### 4.5 Using a Roster in a Scenario

When creating a new scenario:
1. Pick Team 1 from roster library (or skip — field shows generic numbered team)
2. Pick Team 2 from roster library (or skip)
3. Players populate field with names, numbers, and captain/VC badges in default formation

**Re-sync:** If a roster is updated after assignment, the coach can tap **Re-sync Roster** on the scenario. Re-sync rules:
- Players are matched by their **stable `RosterPlayer.id`** (UUID assigned at import time)
- **Name or number changed:** updated on the scenario's player token silently
- **Player added to roster:** new token appears at a default position (edge of the field); coach must place them manually
- **Player removed from roster:** their token remains on the field as an orphan, shown with a warning badge *"Not in roster"* — the coach decides whether to remove them
- **`isOnField` toggled on roster:** does not automatically add/remove from scenario field — re-sync only updates data of already-present players; field composition changes are made manually
- After re-sync a toast confirms: *"Roster synced — 3 players updated, 1 new player added"*

---

## 5. User Guidance System

### 5.1 Onboarding Walkthrough (First Run)
- Five steps, each spotlighting the relevant UI element with a highlight overlay
- Skippable at any step via *"Skip tour"* button
- Shown once on first launch; re-launchable from Help → *"Restart tour"*

Steps:
1. *Welcome to the Coaching Board — here's your scenario library*
2. *Create your first scenario — pick two teams from your roster library*
3. *This is Setup mode — drag players into position, no trails*
4. *Switch to Draw mode to create a play with movement paths*
5. *Use the camera dock to hop between Broadcast, Player 1, and Player 2 views*

### 5.2 Contextual Hints (First Time in Each Mode)
Dismissible banners that appear once the first time a coach enters a new state:

| Trigger | Hint text |
|---------|-----------|
| First open of Board tab | *"Tap a player to select them. Drag to position. No trails in Setup mode."* |
| First switch to Draw mode | *"You're in Draw mode — drag a player to draw a movement path."* |
| First POV camera | *"You're seeing through [Player]'s eyes. Tap Broadcast in the dock to return to the field view."* |
| First roster import | *"Paste your PlayHQ player list or enter a game URL to import players automatically."* |

Each hint has a *"Don't show again"* dismiss. All hints re-enabled from Help → *"Reset all hints"*.

Hint shown/dismissed state is persisted in `localStorage` (simple key-value, no IndexedDB needed).

### 5.3 Help Reference Screen
Accessible from Home (? icon) and from within the scenario editor (? button in header). Structured sections:
- **Getting Started** — what scenarios are, how to create one
- **The Board** — Setup mode vs Draw mode, reset formation, camera dock
- **Camera Views** — Broadcast, Player 1, Player 2, assigning POV players
- **Team Rosters** — uploading, PlayHQ import, assigning to scenarios
- **Video & The Board** — attaching a clip, Take to Board handoff
- **Player Labels** — toggling number / name / position
- **Keyboard Shortcuts** — full reference table
- **Reset all hints** — re-enables all contextual hints

---

## 6. Data Model

### 6.1 Scenario

Replaces the existing `Playbook` model. A **one-time migration** runs on app startup (Dexie `upgrade()` in version 3) that reads all existing `playbooks` records and writes them as `Scenario` records with the following mapping:

| Playbook field | Scenario field | Notes |
|---------------|----------------|-------|
| `id` (number) | `id` (string UUID) | Generate new UUID, store old id in `legacyPlaybookId` for debugging |
| `name` | `name` | Direct copy |
| `playerPositions` | `playerPositions` | Direct copy |
| `annotations` | `annotations` | Direct copy |
| `cameraPosition` / `cameraTarget` / `cameraZoom` | `cameraSnapshot` | Wrapped in new object |
| `videoBlobId` | `attachedVideoId` | Convert number to string |
| — | `team1RosterId` | `null` (no roster assigned on migration) |
| — | `team2RosterId` | `null` |
| — | `videoReferenceTimestamp` | `null` |
| — | `formationPreset` | `'centre-bounce'` (default) |
| — | `labelMode` | `'number'` (default) |
| — | `povPlayer1Id` | `null` |
| — | `povPlayer2Id` | `null` |

```typescript
interface Scenario {
  id: string                           // UUID
  legacyPlaybookId?: number            // migration reference only
  name: string
  createdAt: Date
  updatedAt: Date
  team1RosterId: string | null         // reference to TeamRoster.id
  team2RosterId: string | null
  playerPositions: PlayerState[]       // formation snapshot
  paths: MovementPath[]                // Draw mode paths (MovementPath from PathModel.ts)
  events: AnimationEvent[]
  annotations: Annotation[]
  cameraSnapshot: CameraSnapshot | null
  attachedVideoId: string | null       // reference to videoBlobs.videoId
  videoReferenceTimestamp: number | null
  formationPreset: FormationPreset
  labelMode: 'number' | 'name' | 'position'
  povPlayer1Id: string | null          // player token id for POV slot 1
  povPlayer2Id: string | null          // player token id for POV slot 2
}

interface CameraSnapshot {
  position: [number, number, number]
  target: [number, number, number]
  zoom: number
}
```

### 6.2 TeamRoster

```typescript
interface TeamRoster {
  id?: number                          // Dexie auto-increment (++id)
  rosterId: string                     // UUID — stable reference used by Scenario
  name: string                         // e.g. "Hawthorn — Rd 9 2026"
  createdAt: Date
  updatedAt: Date
  sourceUrl: string | null             // PlayHQ URL if fetched
  players: RosterPlayer[]
}

interface RosterPlayer {
  id: string                           // UUID — stable across re-imports and re-syncs
  jerseyNumber: number
  name: string
  isCaptain: boolean
  isViceCaptain: boolean
  isOnField: boolean                   // true = one of the selected 18
  positionCode: string | null          // manually assigned AFL position code
  goals: number | null                 // from import data
}
```

> Note: `TeamRoster.id` is the Dexie auto-increment key (number). `TeamRoster.rosterId` is a UUID string used as the stable foreign key on `Scenario.team1RosterId` / `team2RosterId`. This keeps Dexie patterns consistent with the existing codebase while providing a stable string reference.

### 6.3 FormationPreset

```typescript
type FormationPreset =
  | 'centre-bounce'
  | 'kickin-defensive'
  | 'kickin-attacking'
// 'set-shot' and 'throw-in' deferred to future release
```

### 6.4 Camera Store Changes

The following existing fields are **removed**:
- `povMode: boolean` — replaced by `activePovSlot !== null`
- `povPlayerId: string | null` — replaced by the two slot fields below
- `enablePOV()` and `disablePOV()` actions — replaced by `setActivePovSlot()`

The following existing fields are **kept unchanged**:
- `povHeight: number` — applies globally to whichever slot is active
- `povDistance: number` — applies globally to whichever slot is active

New fields added:
```typescript
povPlayer1Id: string | null   // bookmarked POV slot 1 (player token id)
povPlayer2Id: string | null   // bookmarked POV slot 2 (player token id)
activePovSlot: 1 | 2 | null   // null = Broadcast view active

// Derived (not stored):
// activePovPlayerId = activePovSlot === 1 ? povPlayer1Id
//                  : activePovSlot === 2 ? povPlayer2Id
//                  : null
// isPovActive = activePovSlot !== null  (replaces povMode)
```

All existing code that references `povMode`, `povPlayerId`, `enablePOV()`, or `disablePOV()` must be updated to use `activePovSlot` and `activePovPlayerId`.

### 6.5 Player Store Changes

```typescript
// Remove:
showPlayerNames: boolean
showPositionNames: boolean

// Add:
labelMode: 'number' | 'name' | 'position'  // default: 'number'
```

All components that currently check `showPlayerNames` or `showPositionNames` are updated to check `labelMode`.

---

## 7. Database Schema (Dexie)

`AFLPlaybookDB` is upgraded to **version 3**:

```typescript
this.version(3).stores({
  // Preserve createdAt index — existing Playbook records have no updatedAt field.
  // playbookStore and loadPlaybooks() are fully retired after migration; this table
  // is kept for rollback debugging only and should not be written to after v3.
  playbooks: '++id, name, createdAt, videoBlobId',

  // Scenarios index both FK fields individually (Scenario has team1RosterId +
  // team2RosterId, not a single rosterId field — indexing the wrong name would
  // silently return nothing on any roster lookup).
  scenarios: '++id, team1RosterId, team2RosterId, name, updatedAt', // new

  teamRosters: '++id, rosterId, name, updatedAt',   // new
}).upgrade(async (tx) => {
  // One-time migration: copy all playbooks → scenarios
  const playbooks = await tx.table('playbooks').toArray();
  for (const pb of playbooks) {
    await tx.table('scenarios').add(migratePlaybookToScenario(pb));
  }
  // playbooks table kept read-only. playbookStore is retired — remove all calls
  // to loadPlaybooks(), savePlaybook(), etc. and replace with scenarioStore equivalents.
});
```

`VideoImportDB` is unchanged (version 2).

---

## 8. What Stays the Same

The following existing systems are **preserved as-is** and not redesigned:
- Three.js / React Three Fiber rendering pipeline
- Phase-based animation and path system
- Annotation tools (arrows, shapes, text)
- Scoreboard
- Video calibration / field overlay (available as an advanced option from within the Video tab)
- Export to MP4 (FFmpeg WASM)
- Keyboard shortcuts (extended with new actions)
- Supabase sync (optional, when configured — syncs Scenarios instead of Playbooks)

---

## 9. Out of Scope (Future Releases)

- PlayHQ proxy server for CORS-free URL fetch
- Live PlayHQ data sync (automatic roster updates during a season)
- Set Shot and Throw-in formation presets (coordinates TBD)
- Multi-scenario presentation mode (slideshow)
- Coach-to-player sharing via QR code
- Tactical drawing templates (pre-drawn set plays)
- Split-screen simultaneous POV viewports
