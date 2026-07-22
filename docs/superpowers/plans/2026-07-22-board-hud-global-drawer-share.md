# Global drawer + per-Play share (§6c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give per-Play share a home (a "Share Play" drawer item + a Share modal), make the clip **optional** so any saved play is shareable, rename the drawer host `Toolbar → GlobalDrawer` and extract its two inline modals, and close out two §6b cleanup nits. **Last lean slice.**

**Architecture:** `Toolbar.tsx` is already the global-drawer host (sections `useMemo` + `<MobileMenu>` + inline Save/Match modals). §6c renames it to `GlobalDrawer`, extracts the Save and Match modals into their own components, adds a Share flow, and makes `sharingService.sharePlayWithClip` → `sharePlay` with an optional-clip branch. No monolith to dismantle (§6a/§6b already did that); the duplicate-control cleanup the doc listed is already done. No Dexie/schema/viewer change.

**Tech Stack:** TypeScript, React, Zustand, Dexie, Supabase, FFmpeg WASM, Vitest.

## Global Constraints

- **Branch:** `lean/live-coaching-first`. This is §6c, the FINAL lean slice (§6a Variant C + §6b Variant B rail already done). After this the lean is complete.
- **No Dexie/schema change. No `SharedPlaybookViewer` change** (it already renders `video_url: null` — starts on the `board` step, `SharedPlaybookViewer.tsx:29`).
- **No board-HUD behaviour change** from the cleanups: after moving `renderAction` and dedup­ing `TEAL`, the Setup/Camera pods + rail render identically.
- **Additive to functionality, minus one rename.** The `Toolbar → GlobalDrawer` rename is a move (`git mv`), not a delete. Preserve every existing drawer item (Video / Match / Playbook / Display "Board layout" / User) and the Save + Match-setup modals' behaviour.
- **Gate:** `npx tsc --noEmit` clean AND `npm run build` green before each commit. Full Vitest suite OOMs on Windows — run only new/changed test files.
- **Git hygiene:** stage explicit paths only, never `git add -A` (untracked `.superpowers/` scratch + a stray `docs/superpowers/plans/2026-03-20-*.md` must not be swept in).
- **Runtime smoke is blocked by the Supabase `/login` gate** (and share needs Supabase configured to round-trip) — the per-task gate is tsc + build; runtime is verified separately with a signed-in session (spec's 6-point checklist).

---

## Task 1: `sharePlay` — optional-clip writer (rename + branch)

Rename `sharePlayWithClip` → `sharePlay` and make the clip optional so a play with no linked moment (or no loaded video) shares board-only.

**Files:**
- Modify: `src/services/sharingService.ts`
- Test (see Step 3): `src/services/__tests__/sharePlay.test.ts` (or documented skip)

**Interfaces:**
- `sharePlay(playId: number, videoBlob?: Blob | null, onProgress?: (phase: string, progress: number) => void): Promise<{ token: string; url: string; clipTooLarge?: boolean } | null>`

- [ ] **Step 1: Rename + branch the writer.** In `sharingService.ts`:
  - Rename the function `sharePlayWithClip` → `sharePlay`; make `videoBlob` optional (`videoBlob?: Blob | null`).
  - Keep the guards: return `null` if `!isSupabaseConfigured() || !supabase`, if the play isn't found, or if `play.phases?.[0]` is missing.
  - **Change the clip requirement:** take the FFmpeg/upload path **only when** `play.linkedVideoMoment` **AND** `videoBlob` are both present. Otherwise skip extraction+upload entirely and set `videoUrl = null`.
  - Keep the `clipTooLarge` early-return (`{ token:'', url:'', clipTooLarge:true }`).
  - In the insert, `quarter`/`label` come from `lvm` **if present, else `null`** (a board-only share has no `lvm`).

  Sketch of the branch (preserve the existing clip code inside the `if`):
```ts
export async function sharePlay(
  playId: number,
  videoBlob?: Blob | null,
  onProgress?: (phase: string, progress: number) => void
): Promise<{ token: string; url: string; clipTooLarge?: boolean } | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const play = await playbookDB.scenarios.get(playId);
  if (!play) return null;
  const phase = play.phases?.[0];
  if (!phase) return null;

  const lvm = play.linkedVideoMoment;
  let videoUrl: string | null = null;
  const token = generateToken();

  if (lvm && videoBlob) {
    onProgress?.('Extracting clip…', 0);
    let clipBlob: Blob;
    try {
      const result = await trimAndConvertVideo(videoBlob, lvm.startTime, lvm.endTime,
        ({ phase: p, progress }) => onProgress?.(p === 'loading' ? 'Loading FFmpeg…' : 'Extracting clip…', progress));
      clipBlob = result.blob;
    } catch (err) {
      console.error('[sharePlay] FFmpeg extraction failed', err);
      return null;
    }
    if (clipBlob.size > MAX_SHARE_VIDEO_SIZE) return { token: '', url: '', clipTooLarge: true };
    onProgress?.('Uploading…', 0.8);
    const videoPath = `shared/${token}.mp4`;
    const { error: uploadError } = await supabase.storage.from('shared-videos').upload(videoPath, clipBlob, { contentType: 'video/mp4' });
    if (!uploadError) {
      videoUrl = supabase.storage.from('shared-videos').getPublicUrl(videoPath).data.publicUrl;
    } else {
      console.error('[sharePlay] upload failed', uploadError); // continue board-only
    }
  }

  onProgress?.('Saving share link…', 0.95);
  const { error } = await supabase.from('shared_playbooks').insert({
    token,
    playbook_data: {
      name: play.name,
      playerPositions: phase.playerPositions,
      paths: phase.paths,
      annotations: phase.annotations ?? [],
      cameraPosition: phase.cameraState?.position ?? null,
      cameraTarget: phase.cameraState?.target ?? null,
      cameraZoom: phase.cameraState?.zoom ?? 1,
      quarter: lvm?.quarter ?? null,
      label: lvm?.label ?? null,
    },
    video_url: videoUrl,
    expires_at: null,
  });
  if (error) { console.error('[sharePlay] insert failed', error); return null; }
  onProgress?.('Done', 1);
  return { token, url: `${window.location.origin}/shared/${token}` };
}
```

- [ ] **Step 2: Confirm no other caller.** `sharePlayWithClip` was orphaned (grep to confirm zero call sites before the rename); after renaming, grep for any lingering `sharePlayWithClip` reference and update. (The share UI caller is added in Task 5.)

- [ ] **Step 3: Board-only-branch test (preferred) OR documented skip.**
  Write `src/services/__tests__/sharePlay.test.ts` using `vi.mock` to stub `../lib/supabase` (`isSupabaseConfigured → true`, `supabase.from().insert` capturing its argument), `../store/appDatabase` (`playbookDB.scenarios.get` → a play with a `phases[0]` but **no `linkedVideoMoment`**), and `../utils/ffmpegConverter` (`trimAndConvertVideo` as a spy). Assert: (a) `trimAndConvertVideo` is **not** called, and (b) `insert` is called with `video_url: null`.
  **If** the module coupling genuinely resists clean mocking after a real attempt (e.g. `supabase` shape, Dexie import), report **DONE_WITH_CONCERNS** documenting exactly what blocked it, and rely on the build gate + runtime smoke. Do NOT commit a test that asserts nothing or is flaky. The controller decides.

- [ ] **Step 4: Gate.** Run the test file (if written) green; `npx tsc --noEmit`; `npm run build`.

- [ ] **Step 5: Commit**
```
git add src/services/sharingService.ts src/services/__tests__/sharePlay.test.ts
git commit -m "feat: sharePlay — optional clip (board-only when no linked moment) (§6c)"
```
(Drop the test path from `git add` if Step 3 was a documented skip.)

---

## Task 2: §6b cleanup — extract `hudActions.tsx` + dedupe `TEAL`

Two logged §6b nits. Board-HUD behaviour must be unchanged.

**Files:**
- Create: `src/components/Board/hud/hudActions.tsx`
- Modify: `src/components/Board/hud/useSetupControls.tsx`, `src/components/Board/hud/CameraPod.tsx`, `src/components/Board/hud/rail/RailHud.tsx`, `src/components/Board/hud/TransportBar.tsx`

- [ ] **Step 1: Move `renderAction` + the `HudAction`/`HudControls` types** out of `useSetupControls.tsx` into a new neutral `hudActions.tsx` (they're shared by Setup, Camera, and the rail). Update `useSetupControls.tsx` to import them from `hudActions` (and stop exporting them from there); update the imports in `CameraPod.tsx` and `rail/RailHud.tsx` to pull `renderAction` from `hudActions`. Verify no other importer of `renderAction`/`HudAction` is left pointing at `useSetupControls`.
- [ ] **Step 2: Dedupe `TEAL`** in `src/components/Board/hud/rail/TransportBar.tsx` — remove the local `const TEAL = '#00d4aa'` and import `TEAL` from `../podStyles` (four-`../` depth as elsewhere in `rail/`).
- [ ] **Step 3: Gate.** `npx tsc --noEmit`; `npm run build`. (No behaviour change — the pods/rail render identically; this is a pure move.)
- [ ] **Step 4: Commit**
```
git add src/components/Board/hud/hudActions.tsx src/components/Board/hud/useSetupControls.tsx src/components/Board/hud/CameraPod.tsx src/components/Board/hud/rail/RailHud.tsx src/components/Board/hud/TransportBar.tsx
git commit -m "refactor: move renderAction into hudActions.tsx; dedupe TEAL in TransportBar (§6c)"
```

---

## Task 3: Rename `Toolbar` → `GlobalDrawer`

Pure rename — honest name for what is now the global-drawer host. Modals stay inline (extracted in Task 4).

**Files:**
- Rename: `src/components/UI/Toolbar.tsx` → `src/components/UI/GlobalDrawer.tsx`
- Modify: `src/components/Layout/MainLayout.tsx`

- [ ] **Step 1:** `git mv src/components/UI/Toolbar.tsx src/components/UI/GlobalDrawer.tsx`.
- [ ] **Step 2:** In `GlobalDrawer.tsx` rename the export `export function Toolbar()` → `export function GlobalDrawer()` and update the header comment.
- [ ] **Step 3:** In `MainLayout.tsx`, update the import (line ~10) `import { Toolbar } from '../UI/Toolbar'` → `import { GlobalDrawer } from '../UI/GlobalDrawer'` and the usage (line ~519) `<Toolbar />` → `<GlobalDrawer />`. Grep the repo for any other `from '../UI/Toolbar'` / `<Toolbar` reference and update (there should be only the one importer).
- [ ] **Step 4: Gate.** `npx tsc --noEmit`; `npm run build`.
- [ ] **Step 5: Commit**
```
git add src/components/UI/GlobalDrawer.tsx src/components/UI/Toolbar.tsx src/components/Layout/MainLayout.tsx
git commit -m "refactor: rename Toolbar -> GlobalDrawer (drawer host) (§6c)"
```
(`git mv` stages the delete+add of the renamed file; include both paths so the rename is captured.)

---

## Task 4: Extract `SavePlayDialog` + `MatchSetupModal` from `GlobalDrawer`

Pull the two fat inline modals into their own components (mirrors §6a's `TeamSelectModal` extraction). Behaviour unchanged.

**Files:**
- Create: `src/components/UI/SavePlayDialog.tsx`, `src/components/UI/MatchSetupModal.tsx`
- Modify: `src/components/UI/GlobalDrawer.tsx`

- [ ] **Step 1: `SavePlayDialog`** — move the Save modal JSX (`GlobalDrawer` ~lines 145–201) + its state (`playbookName`, `playbookDescription`) + `handleSave` (calls `usePlaybook().saveCurrentPlay`) into `SavePlayDialog({ open, onClose })`. The component owns its own name/description state; `GlobalDrawer` keeps the `showSaveDialog` open/close boolean and the "Save Playbook" menu item that sets it, and renders `<SavePlayDialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)} />`.
- [ ] **Step 2: `MatchSetupModal`** — move the Match-setup modal JSX (`GlobalDrawer` ~lines 218–331) into `MatchSetupModal({ open, onClose })`, which reads/writes `matchStore` directly (team names, scores, quarter). `GlobalDrawer` keeps the `showMatchSetup` boolean + the "Match Setup" menu item and renders `<MatchSetupModal open={showMatchSetup} onClose={() => setShowMatchSetup(false)} />`. The `toggle-scoreboard` menu item stays in `GlobalDrawer`'s sections (it's a menu action, not part of the modal).
- [ ] **Step 3: Clean up `GlobalDrawer`** — remove the now-migrated `matchStore` selectors it no longer uses directly (they moved into `MatchSetupModal`), keeping only what the sections `useMemo` still needs (e.g. `matchShowScoreboard`, `toggleScoreboard`). Verify no unused imports/vars remain.
- [ ] **Step 4: Gate.** `npx tsc --noEmit`; `npm run build`.
- [ ] **Step 5: Commit**
```
git add src/components/UI/SavePlayDialog.tsx src/components/UI/MatchSetupModal.tsx src/components/UI/GlobalDrawer.tsx
git commit -m "refactor: extract SavePlayDialog + MatchSetupModal from GlobalDrawer (§6c)"
```

---

## Task 5: `SharePlayModal` + the "Share Play" drawer item (feature goes live)

The substantive feature. Depends on Task 1 (`sharePlay`) and Tasks 3–4 (`GlobalDrawer` + extracted-modal pattern).

**Files:**
- Create: `src/components/UI/SharePlayModal.tsx`
- Modify: `src/components/UI/GlobalDrawer.tsx`

**Interfaces:** `SharePlayModal({ open, onClose })` — reads `usePlayStore(s => s.activePlayId)` + `useVideoStore(s => s.videoFile)`; calls `sharePlay`.

- [ ] **Step 1: `SharePlayModal`.** Reuse the Save-dialog visual shell (backdrop + centered card). States: `idle | working | done | error | tooLarge`.
  - On open (idle): show what will be shared — "Board diagram" or "Board + video clip" depending on whether the active play has a `linkedVideoMoment` AND `videoFile` is loaded — and a primary **"Create share link"** button.
  - On click: `setState('working')`, call `sharePlay(activePlayId, videoFile ?? null, (phase, p) => setProgress({phase, p}))`. Show the phase text + a progress bar (instant for board-only).
  - Result `{ url }` → `done`: show the URL in a read-only input + a **Copy** button (`navigator.clipboard.writeText(url)` → show "Copied" for ~1.5s).
  - Result `{ clipTooLarge: true }` → `tooLarge`: inline "Clip too large — try a shorter moment" + a **"Share board only"** button that calls `sharePlay(activePlayId, null)` and transitions to `done`.
  - Result `null` → `error`: "Couldn't create a share link. Try again."
  - Guard: if `activePlayId == null`, the modal shouldn't be reachable (the drawer item is disabled — Step 2), but render a safe "Save this play first" message if opened without one.
  - To read `linkedVideoMoment` for the "what will be shared" hint: get the active play via `usePlayStore(s => s.plays.find(p => p.id === activePlayId))` (or the store's active-play selector if one exists — check `playStore`) and read `.linkedVideoMoment`.
- [ ] **Step 2: Wire the drawer item.** In `GlobalDrawer`:
  - Add a `showShare` boolean + `<SharePlayModal open={showShare} onClose={() => setShowShare(false)} />`.
  - Add a "Share Play" `createMenuItem` (e.g. in the "Playbook" section next to Save, or a new "Share" section). **Only include the item when `isSupabaseConfigured()`** (import from `../../lib/supabase`) — mirror the conditional User section. Set `disabled: activePlayId == null` with a `description` hint like "Save this play first" when disabled. `onClick` → `setShowShare(true)`. Read `activePlayId` from `usePlayStore`.
  - Add the new state/handlers to the sections `useMemo` dependency array.
- [ ] **Step 3: Gate.** `npx tsc --noEmit`; `npm run build`.
- [ ] **Step 4: Commit**
```
git add src/components/UI/SharePlayModal.tsx src/components/UI/GlobalDrawer.tsx
git commit -m "feat: SharePlayModal + 'Share Play' drawer item (§6c)"
```

---

## Final review & wrap

- [ ] **Whole-slice review** (opus, range `3c68c7b..HEAD` — spec commit to tip): coherence, no orphans, board-HUD unchanged after the cleanups, drawer globals all preserved, `sharePlay` branch correct, share modal edge cases (tooLarge/null/no-Supabase/no-active-play) handled.
- [ ] **Update the SDD ledger** `.superpowers/sdd/progress.md` with a §6c section (per-task status, review verdict).
- [ ] **Runtime smoke** (needs a signed-in session + Supabase configured) — the spec's 6-point checklist: share board-only, share with clip, clipTooLarge → board-only, item hidden/disabled states, Save + Match still work from the drawer, HUD unaffected.
- [ ] **Update memory** `lean-execution.md`: §6c BUILD done → **the lean is COMPLETE**; next is the deferred architecture pass on survivors (doc §7).

## Deviations from the spec (recorded)

- None anticipated. If the `sharePlay` board-only unit test proves impractical to mock cleanly (Task 1 Step 3), that becomes a recorded deviation (documented skip + gate/smoke reliance) — the controller decides at review time.
