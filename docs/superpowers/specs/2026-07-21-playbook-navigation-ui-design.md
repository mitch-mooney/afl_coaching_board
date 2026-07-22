# Playbook navigation UI (§5b-ii) — design

> **Status:** Approved design, ready for implementation plan.
> **Source:** Lean-scope decision doc §5 / §214 ("landing shifts from a flat board list to Playbook library → open a Playbook → its Plays. Quick-save into 'My Plays' stays painless"). This is **§5b-ii** — the navigation UI on top of the §5b-i data layer.
> **Branch:** `lean/live-coaching-first`. Builds on §5b-i (Playbook-collection data layer) and §5a (Scenario→Play rename).

## Goal

Turn the flat all-Plays landing into a two-level library: a **Playbook library** at `/` and a **per-Playbook Plays view** at `/playbook/:id`. Wire up Playbook create/rename/delete, and retire the board's dead "📚 Playbooks" button. No data-layer changes — `usePlaybookStore`, `createPlay(name, playbookId)`, and the `playbookId` FK already exist from §5b-i.

## Approach

**Extract & reuse, don't rebuild.** Add a net-new `PlaybookLibrary` for the root `/`; rework the *existing* `PlayLibrary` (card grid, filter chips, roster pill) into the per-book Plays view at `/playbook/:id`, scoped to one book with back-navigation. Least churn, preserves the current look; the aesthetic pass is §6.

Rejected: a single component switching on a `books | plays-in-book` mode (more conditionals, harder to read); a fresh rebuild of both screens (overkill — §6 re-skins anyway).

## Scope

### In scope
- New `PlaybookLibrary` screen at `/` — grid of Playbook cards; create / rename / delete Playbooks.
- Rework `PlayLibrary` into the per-book Plays view at `/playbook/:id` — filter by `playbookId`, book-name heading, back link, per-book New Play.
- New route `/playbook/:id`; `/` now renders `PlaybookLibrary`.
- Delete the board's dead "📚 Playbooks" button and the `isPlaybookOpen` / `togglePlaybook` / `openPlaybook` / `closePlaybook` state from `uiStore`.
- Keep `activePlaybookId` synced so `+ New Play` and the board's quick-save land in the right book.

### Out of scope (deferred per decision doc)
- Whole-Playbook sharing (one link for a named collection).
- "Duplicate / move Play into another Playbook" cross-book action.
- Aesthetic / layout overhaul — that's §6. This slice reuses the existing dark-card styling.

## Routing

| Route | Screen | Change |
|---|---|---|
| `/` | `PlaybookLibrary` (new) | was `PlayLibrary` (all Plays) |
| `/playbook/:id` | `PlayLibrary` (reworked, filtered to `:id`) | new route |
| `/play/:id` | `MainLayout` (board) | unchanged |
| `/scenario/:id` | `ScenarioRedirect` | unchanged |
| `/rosters` | `RosterLibrary` | unchanged |
| `/shared/:token` | `SharedPlaybookViewer` | unchanged |
| `*` | `Navigate → /` | unchanged |

`App.tsx` imports `PlaybookLibrary` and adds the `/playbook/:id` route; `/` swaps `PlayLibrary` → `PlaybookLibrary`.

## `PlaybookLibrary` — new, at `/`

**Purpose:** entry point. List Playbooks, manage them, drill into one.

**On mount:**
1. `await ensureDefaultPlaybook()` — fresh installs skip the v5 migration, so this guarantees "My Plays" exists.
2. `loadPlaybooks()` and `loadPlays()` — all Plays are loaded so the screen can show a per-book Play count (grouped in memory by `playbookId`).
3. `setActivePlaybook(null)` — root context; a subsequent board quick-save falls back to My Plays.

**Per-book card:** name, Play count (`plays` filtered to that `playbookId`), latest `updatedAt` among its Plays (or the book's own `updatedAt` if it has none). Click the card body → `navigate('/playbook/:id')`.

**Playbook management:**
- **New Playbook:** top-nav `+ New Playbook` → `prompt()` for a name → `createPlaybook(name)` → `navigate('/playbook/:newId')`. Empty/cancelled name = no-op.
- **New Play (global quick-create):** top-nav `+ New Play` → `ensureDefaultPlaybook()` → `createPlay('New Play', myPlaysId)` → `navigate('/play/:newId')`. This is the painless quick-save path into "My Plays" without choosing a book (the "both levels" decision — the same New Play affordance also exists per-book inside `/playbook/:id`).
- **Rename:** a pencil affordance on each card enters an inline text input (local editing state); commit → `renamePlaybook(id, name)`; empty/unchanged = cancel. Available on all books including My Plays.
- **Delete:** a trash affordance on **non-default** cards → `confirm("Delete <name>? Its plays move to My Plays.")` → `deletePlaybook(id)`. The store already refuses to delete `isDefault` and reassigns the book's Plays to the default, so the My Plays card renders no delete control.

**Chrome:** reuse the existing top nav (logo + Rosters button + primary action) and the bottom "👥 Manage Roster" pill from today's `PlayLibrary`.

## `PlayLibrary` — reworked, at `/playbook/:id`

**Purpose:** the Plays inside one Playbook.

**Behaviour changes from today:**
- Read `id` from `useParams` (numeric). On mount `setActivePlaybook(id)` so `+ New Play` **and** the board's quick-save (`saveCurrentPlay` → `activePlaybookId ?? ensureDefaultPlaybook()`) target this book.
- After `loadPlaybooks()`/`loadPlays()`, if no Playbook with `id` exists → `<Navigate to="/" replace />` (handles deleted/invalid ids).
- Filter `plays` to `playbookId === id` before the existing all/linked/board-only chip filter (chips still operate *within* the book).
- Heading shows the resolved book name and a `← Playbooks` link back to `/`.
- `+ New Play` → `createPlay('New Play', id)` → `navigate('/play/:newId')` (replaces today's `ensureDefaultPlaybook()` resolution — the book is known from the route).
- Empty state copy scoped to this book ("No plays in this playbook yet").
- Keep the roster pill and Rosters button.

**New Play lives at both levels** (the "both levels" decision): the root's global `+ New Play` resolves to My Plays via `ensureDefaultPlaybook()`, while this per-book `+ New Play` uses the route `id` directly.

## Board button retirement

In `MainLayout.tsx`: remove the `data-playbook-toggle` button (lines ~338–347) and the `isPlaybookOpen` / `togglePlaybook` selectors (lines ~128–129). In `uiStore.ts`: remove `isPlaybookOpen`, `togglePlaybook`, `openPlaybook`, `closePlaybook` from the interface and the store (lines ~36–37, ~133–136). Grep to confirm no other consumers before deleting.

## Data flow

No store or model changes. `usePlaybookStore` (CRUD + `ensureDefaultPlaybook` + `activePlaybookId`) and `createPlay(name, playbookId)` are the §5b-i surface this slice consumes. `activePlaybookId` is the single source of truth for "where a quick-save lands," written by both screens (`null` at root, the book id inside a book).

## Testing / verification

No React Testing Library in the repo (per project memory), so no component unit tests. Gate + runtime smoke instead:

- **Gate:** `npx tsc --noEmit` clean AND `npm run build` green before each commit. (Full Vitest suite OOMs on Windows — the existing `playbookStore` / `playStore` tests still pass and are unchanged by this slice.)
- **Runtime smoke:**
  1. `/` shows a "My Plays" card containing all migrated Plays.
  2. `+ New Playbook` creates a book and opens `/playbook/:id`; it's empty.
  3. `+ New Play` inside that book lands in it — the new Play's `playbookId` equals the book id.
  4. Open the board from that book, quick-save via the Toolbar → the saved Play's `playbookId` equals the book id (proves `activePlaybookId` sync).
  5. Rename a book — the card updates. Delete a non-default book — it disappears and its Plays reappear under My Plays. My Plays shows no delete control.
  6. Board no longer shows the "📚 Playbooks" button; no console errors.

## Interfaces (for the plan)

- Consumes (from §5b-i, unchanged): `usePlaybookStore` — `playbooks`, `activePlaybookId`, `loadPlaybooks()`, `ensureDefaultPlaybook()`, `createPlaybook(name)`, `renamePlaybook(id, name)`, `deletePlaybook(id)`, `setActivePlaybook(id|null)`; `usePlayStore` — `plays`, `loadPlays()`, `createPlay(name, playbookId)`, `deletePlay(id)`.
- Produces: `PlaybookLibrary` component (route `/`); reworked `PlayLibrary` (route `/playbook/:id`); `App.tsx` route table update; `uiStore` without the playbook-panel toggle; `MainLayout` without the board button.
