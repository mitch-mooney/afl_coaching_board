# Playbook Navigation UI (§5b-ii) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the flat all-Plays landing into a two-level library — a Playbook library at `/` and a per-Playbook Plays view at `/playbook/:id` — and retire the board's dead "📚 Playbooks" button.

**Architecture:** Add a net-new `PlaybookLibrary` for `/` (grid of Playbook cards + create/rename/delete). Rework the existing `PlayLibrary` into the per-book Plays view at `/playbook/:id`, filtered by `playbookId`. No data-layer changes — `usePlaybookStore` (CRUD + `ensureDefaultPlaybook` + `activePlaybookId`) and `createPlay(name, playbookId)` already exist from §5b-i. `activePlaybookId` is kept synced by both screens so the board's quick-save lands in the right book.

**Tech Stack:** TypeScript, React, react-router-dom, Zustand.

## Global Constraints

- **Branch:** `lean/live-coaching-first`.
- **No data-layer changes.** This slice is pure UI + routing. Do not touch `playbookStore`, `playStore`, `appDatabase`, or the models.
- **Reuse existing styling.** Match the current `PlayLibrary` dark theme (`#0f0f1a` bg, `#13132a` cards, `#00d4aa`→`#0099ff` accent gradient). The aesthetic overhaul is §6, not here.
- **Gate:** `npx tsc --noEmit` clean AND `npm run build` green before each commit. The full Vitest suite OOMs on Windows — do not run it; no test files change in this slice.
- **Git hygiene:** stage explicit paths only — never `git add -A` (the repo has pre-existing untracked `.superpowers/` + a stray `docs/superpowers/plans/2026-03-20-*.md`).
- **Playbook management copy:** default book is named `My Plays` and is un-deletable (the store enforces both — never special-case names in the UI beyond hiding the delete control on `isDefault`).

---

## Task 1: Retire the board's dead "📚 Playbooks" button

The button toggles `isPlaybookOpen`, but `PlaybookPanel` was deleted in §1.8 so it renders nothing. Remove the button and the now-orphaned `uiStore` panel state.

**Files:**
- Modify: `src/components/Layout/MainLayout.tsx` (selectors ~128–129, button ~338–347)
- Modify: `src/store/uiStore.ts` (interface ~35–39, impl ~132–136)

**Interfaces:**
- Consumes: nothing.
- Produces: `uiStore` no longer exposes `isPlaybookOpen` / `togglePlaybook` / `openPlaybook` / `closePlaybook`.

- [ ] **Step 1: Confirm no other consumers**

Run: `grep -rn "isPlaybookOpen\|togglePlaybook\|openPlaybook\|closePlaybook" src`
Expected: matches only in `src/store/uiStore.ts` and `src/components/Layout/MainLayout.tsx`. If anything else appears, stop and reassess.

- [ ] **Step 2: Remove the button from MainLayout**

In `src/components/Layout/MainLayout.tsx`, delete the entire `<button data-playbook-toggle …>` element (the block starting `<button` on ~line 338 through its closing `</button>` on ~line 347):

```tsx
            <button
              data-playbook-toggle
              onClick={togglePlaybook}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-manipulation
                ${isPlaybookOpen
                  ? 'bg-amber-500 text-black'
                  : 'bg-black/60 text-white/70 hover:bg-black/80'}`}
            >
              {isPlaybookOpen ? '✕ Playbooks' : '📚 Playbooks'}
            </button>
```

The `<LabelToggle />` immediately above it stays; the `</div>` closing the board-controls row stays.

- [ ] **Step 3: Remove the orphaned selectors from MainLayout**

In `src/components/Layout/MainLayout.tsx`, delete these two lines (~128–129):

```tsx
  const isPlaybookOpen = useUIStore((s) => s.isPlaybookOpen);
  const togglePlaybook = useUIStore((s) => s.togglePlaybook);
```

- [ ] **Step 4: Remove the panel state from uiStore**

In `src/store/uiStore.ts`, delete the interface block (~35–39):

```ts
  // Playbook panel open state (lifted so top bar can own the toggle button)
  isPlaybookOpen: boolean;
  togglePlaybook: () => void;
  openPlaybook: () => void;
  closePlaybook: () => void;
```

and the implementation block (~132–136):

```ts
    // Playbook panel
    isPlaybookOpen: false,
    togglePlaybook: () => set((s) => ({ isPlaybookOpen: !s.isPlaybookOpen })),
    openPlaybook: () => set({ isPlaybookOpen: true }),
    closePlaybook: () => set({ isPlaybookOpen: false }),
```

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done`
Expected: no error lines (just `done`).
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3`
Expected: `built in …`.

- [ ] **Step 6: Commit**

```bash
git add src/components/Layout/MainLayout.tsx src/store/uiStore.ts
git commit -m "refactor: retire dead board Playbooks button + uiStore panel state (§5b-ii)"
```

---

## Task 2: `PlaybookLibrary` screen + routing

Add the root Playbook library and wire routes: `/` → `PlaybookLibrary`, new `/playbook/:id` → the (still all-Plays for now) `PlayLibrary`. Task 3 makes `PlayLibrary` honour the `:id`.

**Files:**
- Create: `src/components/UI/PlaybookLibrary.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `usePlaybookStore` — `playbooks`, `loadPlaybooks()`, `ensureDefaultPlaybook()`, `createPlaybook(name)`, `renamePlaybook(id, name)`, `deletePlaybook(id)`, `setActivePlaybook(id|null)`; `usePlayStore` — `plays`, `loadPlays()`, `createPlay(name, playbookId)`; `useRosterStore` — `rosters`, `loadRosters()`.
- Produces: `PlaybookLibrary` component (default of route `/`); route `/playbook/:id` rendering `PlayLibrary`.

- [ ] **Step 1: Create the PlaybookLibrary component**

Create `src/components/UI/PlaybookLibrary.tsx`:

```tsx
// src/components/UI/PlaybookLibrary.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaybookStore } from '../../store/playbookStore';
import { usePlayStore } from '../../store/playStore';
import { useRosterStore } from '../../store/rosterStore';
import type { Playbook } from '../../models/PlaybookModel';

export function PlaybookLibrary() {
  const { playbooks, loadPlaybooks, ensureDefaultPlaybook, createPlaybook, renamePlaybook, deletePlaybook, setActivePlaybook } =
    usePlaybookStore();
  const { plays, loadPlays, createPlay } = usePlayStore();
  const { rosters, loadRosters } = useRosterStore();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    // Root context: a subsequent board quick-save falls back to My Plays.
    setActivePlaybook(null);
    // Fresh installs skip the v5 migration — guarantee "My Plays" exists.
    ensureDefaultPlaybook().then(() => loadPlaybooks());
    loadPlays();
    loadRosters();
  }, [ensureDefaultPlaybook, loadPlaybooks, loadPlays, loadRosters, setActivePlaybook]);

  // Play count + latest activity per book, grouped in memory.
  const stats = useMemo(() => {
    const map: Record<number, { count: number; latest: string }> = {};
    for (const p of plays) {
      if (p.playbookId == null) continue;
      const s = map[p.playbookId] ?? { count: 0, latest: '' };
      s.count += 1;
      if (p.updatedAt > s.latest) s.latest = p.updatedAt;
      map[p.playbookId] = s;
    }
    return map;
  }, [plays]);

  const handleNewPlaybook = async () => {
    const name = prompt('Name this playbook')?.trim();
    if (!name) return;
    const id = await createPlaybook(name);
    navigate(`/playbook/${id}`);
  };

  const handleNewPlay = async () => {
    const playbookId = await ensureDefaultPlaybook();
    const id = await createPlay('New Play', playbookId);
    navigate(`/play/${id}`);
  };

  const startRename = (book: Playbook) => {
    setEditingId(book.id!);
    setEditName(book.name);
  };

  const commitRename = async () => {
    const id = editingId;
    const name = editName.trim();
    setEditingId(null);
    if (id != null && name) await renamePlaybook(id, name);
  };

  const handleDelete = async (book: Playbook) => {
    if (!confirm(`Delete "${book.name}"? Its plays move to My Plays.`)) return;
    await deletePlaybook(book.id!);
    await loadPlays(); // refresh counts for the reassigned plays
  };

  return (
    <div className="min-h-screen" style={{ background: '#0f0f1a', color: '#ffffff', fontFamily: 'sans-serif' }}>
      {/* Top nav */}
      <div style={{ background: '#13132a', borderBottom: '1px solid #1e1e3f', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #00d4aa, #0099ff)', borderRadius: 6, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>AFL Coaching Board</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/rosters')}
            style={{ background: '#1a1a35', border: '1px solid #2a2a55', borderRadius: 6, padding: '6px 14px', color: '#8888aa', fontSize: 12, cursor: 'pointer' }}
          >
            Rosters {rosters.length > 0 && `(${rosters.length})`}
          </button>
          <button
            onClick={handleNewPlaybook}
            style={{ background: '#1a1a35', border: '1px solid #2a2a55', borderRadius: 6, padding: '6px 14px', color: '#8888aa', fontSize: 12, cursor: 'pointer' }}
          >
            + New Playbook
          </button>
          <button
            onClick={handleNewPlay}
            style={{ background: 'linear-gradient(135deg, #00d4aa, #0099ff)', borderRadius: 6, padding: '7px 16px', color: '#000', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            + New Play
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ color: '#ffffff', fontWeight: 600, fontSize: 14, marginRight: 4 }}>Playbooks</span>
          <span style={{ background: '#1e1e3f', border: '1px solid #2a2a55', borderRadius: 10, padding: '2px 8px', color: '#6666aa', fontSize: 11 }}>{playbooks.length}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {playbooks.map((book) => (
            <PlaybookCard
              key={book.id}
              book={book}
              count={book.id != null ? (stats[book.id]?.count ?? 0) : 0}
              latest={book.id != null ? (stats[book.id]?.latest || book.updatedAt) : book.updatedAt}
              isEditing={editingId === book.id}
              editName={editName}
              onOpen={() => navigate(`/playbook/${book.id}`)}
              onStartRename={() => startRename(book)}
              onEditName={setEditName}
              onCommitRename={commitRename}
              onCancelRename={() => setEditingId(null)}
              onDelete={() => handleDelete(book)}
            />
          ))}
        </div>
      </div>

      {/* Roster pill — safe-area pinned bottom */}
      <div
        style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)',
          bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          background: '#13132a', border: '1px solid #1e1e3f', borderRadius: 8,
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', zIndex: 20,
        }}
        onClick={() => navigate('/rosters')}
      >
        <span style={{ color: '#8888aa', fontSize: 12 }}>👥 Manage Roster</span>
        <span style={{ color: '#4444aa', fontSize: 12 }}>→</span>
      </div>
    </div>
  );
}

function PlaybookCard({
  book, count, latest, isEditing, editName,
  onOpen, onStartRename, onEditName, onCommitRename, onCancelRename, onDelete,
}: {
  book: Playbook;
  count: number;
  latest: string;
  isEditing: boolean;
  editName: string;
  onOpen: () => void;
  onStartRename: () => void;
  onEditName: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={isEditing ? undefined : onOpen}
      style={{
        background: '#13132a', border: '1px solid #1e1e3f', borderRadius: 10,
        overflow: 'hidden', cursor: isEditing ? 'default' : 'pointer', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#00d4aa44')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e3f')}
    >
      <div style={{ height: 100, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, #16163a, #0a0a1a)' }} />
        <span style={{ position: 'relative', fontSize: 34 }}>📚</span>
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {isEditing ? (
            <input
              autoFocus
              value={editName}
              onClick={e => e.stopPropagation()}
              onChange={e => onEditName(e.target.value)}
              onBlur={onCommitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') onCommitRename();
                if (e.key === 'Escape') onCancelRename();
              }}
              style={{ width: '100%', background: '#0f0f1a', border: '1px solid #00d4aa44', borderRadius: 4, color: '#fff', fontSize: 12, padding: '3px 6px' }}
            />
          ) : (
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {book.name}{book.isDefault && <span style={{ color: '#5555aa', fontWeight: 400 }}> · default</span>}
            </div>
          )}
          <div style={{ color: '#5555aa', fontSize: 10 }}>
            {count} {count === 1 ? 'play' : 'plays'} · {new Date(latest).toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onStartRename(); }}
            style={{ color: '#5555aa', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
            title="Rename"
          >
            ✎
          </button>
          {!book.isDefault && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ color: 'rgba(239,83,80,0.4)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef5350')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,83,80,0.4)')}
              title="Delete"
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the routes in App.tsx**

In `src/App.tsx`, add the import after the existing `PlayLibrary` import (line 7):

```tsx
import { PlaybookLibrary } from './components/UI/PlaybookLibrary';
```

Change the `/` route (line 50) from:

```tsx
        <Route path="/" element={<ProtectedRoute><PlayLibrary /></ProtectedRoute>} />
```

to:

```tsx
        <Route path="/" element={<ProtectedRoute><PlaybookLibrary /></ProtectedRoute>} />
        <Route path="/playbook/:id" element={<ProtectedRoute><PlayLibrary /></ProtectedRoute>} />
```

(Leave the `/play/:id`, `/scenario/:id`, `/rosters`, `/shared/:token`, and `*` routes unchanged.)

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done`
Expected: no error lines.
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3`
Expected: `built in …`.

- [ ] **Step 4: Runtime smoke**

Reload the app at `/`. Expected: a "My Plays · default" card showing the count of all migrated Plays, no delete control on it. `+ New Playbook` prompts for a name and opens `/playbook/:id`. Rename (✎) edits the card name inline. `+ New Play` opens the board at `/play/:id`. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/UI/PlaybookLibrary.tsx src/App.tsx
git commit -m "feat: Playbook library landing screen + /playbook/:id route (§5b-ii)"
```

---

## Task 3: Scope `PlayLibrary` to one Playbook

Rework `PlayLibrary` so `/playbook/:id` shows only that book's Plays, with a back link, per-book New Play, and `activePlaybookId` sync. A missing book id redirects to `/`.

**Files:**
- Modify: `src/components/UI/PlayLibrary.tsx`

**Interfaces:**
- Consumes: `usePlaybookStore` — `playbooks`, `loadPlaybooks()`, `setActivePlaybook(id)`; route param `:id`.
- Produces: `PlayLibrary` renders the Plays of one Playbook.

- [ ] **Step 1: Update imports and add the router param**

In `src/components/UI/PlayLibrary.tsx`, change the router import (line 3) from:

```tsx
import { useNavigate } from 'react-router-dom';
```

to:

```tsx
import { useNavigate, useParams, Navigate } from 'react-router-dom';
```

- [ ] **Step 2: Read the playbook id and load books**

In `src/components/UI/PlayLibrary.tsx`, replace the store-hook + navigate lines (currently lines 22–24):

```tsx
  const { plays, loadPlays, createPlay, deletePlay } = usePlayStore();
  const { rosters, loadRosters } = useRosterStore();
  const navigate = useNavigate();
```

with:

```tsx
  const { plays, loadPlays, createPlay, deletePlay } = usePlayStore();
  const { playbooks, loadPlaybooks, setActivePlaybook } = usePlaybookStore();
  const { rosters, loadRosters } = useRosterStore();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const playbookId = Number(id);
  const currentBook = playbooks.find((b) => b.id === playbookId);
```

- [ ] **Step 3: Sync active playbook + load books on mount**

Replace the first `useEffect` (currently lines 28–31):

```tsx
  useEffect(() => {
    loadPlays();
    loadRosters();
  }, [loadPlays, loadRosters]);
```

with:

```tsx
  useEffect(() => {
    // Board quick-save + New Play here target this book.
    setActivePlaybook(playbookId);
    loadPlaybooks();
    loadPlays();
    loadRosters();
  }, [playbookId, setActivePlaybook, loadPlaybooks, loadPlays, loadRosters]);
```

- [ ] **Step 4: Filter Plays to this book + point New Play at it**

Replace `handleNew` (currently lines 47–51):

```tsx
  const handleNew = async () => {
    const playbookId = await usePlaybookStore.getState().ensureDefaultPlaybook();
    const id = await createPlay('New Play', playbookId);
    navigate(`/play/${id}`);
  };
```

with:

```tsx
  const handleNew = async () => {
    const newId = await createPlay('New Play', playbookId);
    navigate(`/play/${newId}`);
  };
```

Then replace the `filtered` computation (currently lines 53–57):

```tsx
  const filtered = plays.filter(p => {
    if (filter === 'linked') return !!p.linkedVideoMoment;
    if (filter === 'board-only') return !p.linkedVideoMoment;
    return true;
  });
```

with:

```tsx
  const bookPlays = plays.filter(p => p.playbookId === playbookId);
  const filtered = bookPlays.filter(p => {
    if (filter === 'linked') return !!p.linkedVideoMoment;
    if (filter === 'board-only') return !p.linkedVideoMoment;
    return true;
  });

  // Book was deleted or the id is invalid — books have loaded and none match.
  if (playbooks.length > 0 && !currentBook) return <Navigate to="/" replace />;
```

- [ ] **Step 5: Add a back link + book name to the header**

Replace the top-nav title span (currently line 64):

```tsx
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>AFL Coaching Board</span>
```

with:

```tsx
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#8888aa', fontSize: 12, cursor: 'pointer', padding: 0 }}
        >
          ← Playbooks
        </button>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>{currentBook?.name ?? 'Plays'}</span>
```

- [ ] **Step 6: Scope the Plays counter + empty-state copy to the book**

Replace the "Plays" label + count (currently lines 84–85):

```tsx
          <span style={{ color: '#ffffff', fontWeight: 600, fontSize: 14, marginRight: 4 }}>Plays</span>
          <span style={{ background: '#1e1e3f', border: '1px solid #2a2a55', borderRadius: 10, padding: '2px 8px', color: '#6666aa', fontSize: 11 }}>{plays.length}</span>
```

with:

```tsx
          <span style={{ color: '#ffffff', fontWeight: 600, fontSize: 14, marginRight: 4 }}>Plays</span>
          <span style={{ background: '#1e1e3f', border: '1px solid #2a2a55', borderRadius: 10, padding: '2px 8px', color: '#6666aa', fontSize: 11 }}>{bookPlays.length}</span>
```

Replace the empty-state paragraph (currently line 108):

```tsx
            <p style={{ marginBottom: 8 }}>{plays.length === 0 ? 'No plays yet' : 'No plays match this filter'}</p>
```

with:

```tsx
            <p style={{ marginBottom: 8 }}>{bookPlays.length === 0 ? 'No plays in this playbook yet' : 'No plays match this filter'}</p>
```

and the `plays.length === 0` guard on the "Create your first play" button (currently line 109):

```tsx
            {plays.length === 0 && (
```

with:

```tsx
            {bookPlays.length === 0 && (
```

- [ ] **Step 7: Typecheck + build**

Run: `npx tsc --noEmit 2>&1 | grep -E "error TS"; echo done`
Expected: no error lines.
Run: `npm run build 2>&1 | grep -iE "error|built in" | tail -3`
Expected: `built in …`.

- [ ] **Step 8: Runtime smoke — the full nav loop**

Reload at `/`. Then:
1. Click into "My Plays" → `/playbook/:id` shows only that book's Plays; header reads "My Plays" with a `← Playbooks` link back to `/`.
2. `+ New Play` here creates a Play; in the console confirm it landed in this book:
   ```js
   const db = (await import('/src/store/appDatabase.ts')).playbookDB;
   const plays = await db.scenarios.orderBy('createdAt').reverse().toArray();
   JSON.stringify({ newest: plays[0] && { name: plays[0].name, playbookId: plays[0].playbookId } });
   ```
   Expected: `newest.playbookId` equals the book id in the URL.
3. From that Play's board, quick-save via the Toolbar → the saved Play's `playbookId` equals the same book id (proves `activePlaybookId` sync).
4. Back at `/`, create a second book, open it, add a Play, then delete that book from `/` → it disappears and its Play reappears under My Plays' count.
5. No console errors anywhere.

- [ ] **Step 9: Commit**

```bash
git add src/components/UI/PlayLibrary.tsx
git commit -m "feat: scope Play library to a single Playbook at /playbook/:id (§5b-ii)"
```

---

## Self-Review

**Spec coverage:**
- New `PlaybookLibrary` at `/` with create/rename/delete → Task 2. ✓
- Reworked `PlayLibrary` filtered to `/playbook/:id` + back link + per-book New Play → Task 3. ✓
- Route `/playbook/:id`; `/` → `PlaybookLibrary` → Task 2. ✓
- Board button + `uiStore` toggle state deleted → Task 1. ✓
- `activePlaybookId` synced (null at root, book id inside a book) → Task 2 Step 1 (`setActivePlaybook(null)`), Task 3 Step 3 (`setActivePlaybook(playbookId)`). ✓
- Global New Play → My Plays (both-levels decision) → Task 2 `handleNewPlay`; per-book New Play → Task 3 `handleNew`. ✓
- `ensureDefaultPlaybook()` on the library (fresh-install safety) → Task 2 Step 1. ✓
- Invalid/deleted book id → `/` → Task 3 Step 4 (`<Navigate to="/" replace />`). ✓
- My Plays shows no delete control → Task 2 (`!book.isDefault` guard). ✓
- No data-layer changes → none of the three tasks touch stores/models/db. ✓
- Verification = tsc + build + runtime smoke (no RTL) → each task's build gate + Task 2 Step 4 / Task 3 Step 8. ✓

**Placeholder scan:** No TBD/TODO; every step shows concrete code, exact commands, and expected output. ✓

**Type consistency:** `playbookId` (number), `currentBook`, `bookPlays`, `stats`, `createPlay(name, playbookId)`, `createPlaybook`/`renamePlaybook`/`deletePlaybook`/`ensureDefaultPlaybook`/`setActivePlaybook`, and `Playbook.isDefault`/`.updatedAt`/`.name` used identically across the Interfaces blocks, `PlaybookLibrary`, and the reworked `PlayLibrary`. The `Playbook` type is imported from `../../models/PlaybookModel` in both the new component and (already) via the store. ✓
