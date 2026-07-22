# Global drawer + per-Play share (§6c) — design

> **Status:** Approved design (grilled 2026-07-22), ready for implementation plan.
> **Source:** Lean-scope decision doc §6 ("a drawer survives only for rare/global actions — roster import, reset, share"; "final `Toolbar.tsx` retirement + duplicate-control cleanup") and §2 ("per-Play share via `shareScenarioWithClip` — paths + **optional** clip").
> **Branch:** `lean/live-coaching-first`. Builds on §6a (Variant C pods) + §6b (Variant B rail + skin switch). Follows `75008f2`. **This is the LAST lean slice.**

## Reframing (why §6c is smaller than the doc imagined)

§6a/§6b already did most of what the doc's §6c bullet listed:
- **`Toolbar.tsx` is no longer a 913-line monolith** — it's ~334 lines and is now purely the **global-drawer host**: builds the drawer sections `useMemo` (Video / Match / Playbook / Display / User), renders `<MobileMenu>`, and holds the inline **Save** and **Match-setup** modals.
- **The "duplicate-control cleanup" (two label controls, two roster-import paths) is DONE** — §6a consolidated the label control into `useSetupControls` and roster-import into `RosterImportModal`; neither is duplicated in `Toolbar` anymore. **No work remains here.**

So §6c is: **(1)** the substantive per-Play **share** feature; **(2)** an honest **rename + modal extraction** of the drawer host; **(3)** two small §6b-carryover hygiene fixes. No monolith to dismantle.

## Goal (§6c)

Give the orphaned per-Play share a home (a "Share Play" drawer item + a Share modal), make the clip **optional** so any saved play is shareable, rename the drawer host to `GlobalDrawer` and extract its two inline modals, and close out two §6b cleanup nits.

## Decisions (grilled 2026-07-22)

1. **`Toolbar` retirement = rename + extract.** Rename `Toolbar.tsx` → `GlobalDrawer.tsx`; extract the inline **Save** modal (`Toolbar.tsx:145–201`) → `SavePlayDialog.tsx` and the inline **Match-setup** modal (`Toolbar.tsx:218–331`) → `MatchSetupModal.tsx`. The drawer host shrinks to the sections `useMemo` + `<MobileMenu>` + the (now componentised) modals. Rejected: deleting `Toolbar` and re-hosting in `MainLayout` (churn, `MainLayout` already large); leaving the name (it's a drawer, not a toolbar).
2. **Share home = a "Share Play" item in the `GlobalDrawer`** (a new "Share" section or folded next to Save in "Playbook"). It's the only context where the active play + loaded video both exist, and the doc's stated home. Rejected: `PlayLibrary` card (no video loaded there); board HUD (permanent chrome for a rare action — Variant A's rejection).
3. **Optional clip; rename `sharePlayWithClip` → `sharePlay`.** Branch the writer: if the play has a `linkedVideoMoment` **and** a video blob is provided → extract the clip (existing FFmpeg path) and set `video_url`; otherwise → insert the same `shared_playbooks` row with `video_url: null` (board diagram + paths + annotations only). The shared viewer already renders `video_url: null` (`SharedPlaybookViewer.tsx:29` → starts on the `board` step). Rejected: clip-only (leaves board-only plays unshareable — the *common* live-coaching case; contradicts the doc's "optional clip").
4. **Share result UX = a Share modal** (mirrors the Save dialog). Rejected: fire-and-forget auto-copy (no progress during multi-second FFmpeg, no `clipTooLarge` path, silent clipboard failure).
5. **Match-setup + scoreboard stay in the drawer** (as the extracted `MatchSetupModal`). It's match-session config, global across plays. Doc §3.3's "move to Setup mode" is **superseded** by the settled drawer/pod IA. Rejected: moving into the Setup pod (bloats the everyday per-play surface with session config; duplicates into both skins).
6. **Bundle two cleanups** (last slice — no later polish pass): move `renderAction` → `hudActions.tsx`; dedupe `TEAL` in `TransportBar.tsx`. The §6b "Board layout" drawer item rides along inside the rename (verify it survives). Label/roster dup cleanup already done (no work).

## `sharePlay` — the writer change

Current `sharePlayWithClip(playId, videoBlob, onProgress?)` (`sharingService.ts:51`) returns `null` unless `play.linkedVideoMoment` exists. New `sharePlay`:

- **Signature:** `sharePlay(playId: number, videoBlob?: Blob | null, onProgress?): Promise<{ token: string; url: string; clipTooLarge?: boolean } | null>`.
- **Still returns `null`** when: Supabase not configured, play not found, or `play.phases?.[0]` missing (a play must have a phase to share).
- **Clip path (unchanged) — taken only when** `play.linkedVideoMoment` **AND** `videoBlob` are both present: extract via `trimAndConvertVideo(videoBlob, lvm.startTime, lvm.endTime, …)`, size-guard (`clipTooLarge`), upload to `shared-videos`, set `video_url`.
- **Board-only path (new) — otherwise:** skip FFmpeg + upload entirely; `videoUrl = null`. Still insert the `shared_playbooks` row with `playbook_data` (name, playerPositions, paths, annotations, camera*, and `quarter`/`label` from `lvm` **if present, else null**).
- **Keep** the `clipTooLarge` early-return (`{ token:'', url:'', clipTooLarge:true }`) so the modal's "Share board only" can re-call with `videoBlob = null`.
- The video blob comes from `useVideoStore.getState().videoFile` (a `File`, which is a `Blob`); pass it when a video is loaded, else `null`.

No Dexie/schema change. No `SharedPlaybookViewer` change (already null-safe).

## The Share modal (`SharePlayModal.tsx`)

- **Props:** `{ open, onClose }`. Reads `usePlayStore(s => s.activePlayId)` and `useVideoStore(s => s.videoFile)`.
- **Availability:** the drawer "Share Play" item is **hidden when `!isSupabaseConfigured()`** (mirrors the conditional User section) and **disabled when there is no saved active play** (`activePlayId == null`) with a hint "Save this play first".
- **Flow:** modal opens → shows what will be shared ("Board diagram" or "Board + video clip" depending on `linkedVideoMoment && videoFile`) → primary **"Create share link"** button → runs `sharePlay(activePlayId, videoFile ?? null, onProgress)` with a progress bar (phase text: "Extracting clip…"/"Uploading…"/"Saving…"; instant for board-only) → on success show the `/shared/:token` URL in a read-only field + a **Copy** button (uses `navigator.clipboard.writeText`, with a visible "Copied" confirmation).
- **`clipTooLarge`:** inline message "Clip too large — try a shorter moment" + a **"Share board only"** button that re-runs `sharePlay(activePlayId, null)`.
- **`null` result:** error text "Couldn't create a share link" (Supabase/insert failure) — the item is already hidden when Supabase is unconfigured, so this covers transient failures + not-found.
- Reuse the existing Save-dialog visual shell (backdrop + centered card) that Q1 extracts as `SavePlayDialog`.

## Files

- **Rename:** `src/components/UI/Toolbar.tsx` → `src/components/UI/GlobalDrawer.tsx` (update the importer — `MainLayout.tsx` renders `<Toolbar/>`; repoint to `<GlobalDrawer/>`). Export name `Toolbar` → `GlobalDrawer`.
- **Create:**
  - `src/components/UI/SavePlayDialog.tsx` — extracted Save modal (name/description → `saveCurrentPlay`).
  - `src/components/UI/MatchSetupModal.tsx` — extracted Match-setup modal (team names, scores, quarter; `matchStore` wiring).
  - `src/components/UI/SharePlayModal.tsx` — the new Share flow.
  - `src/components/Board/hud/hudActions.tsx` — `renderAction` + `HudAction`/`HudControls` types moved here (re-export or update imports).
- **Modify:**
  - `src/services/sharingService.ts` — `sharePlayWithClip` → `sharePlay` with the optional-clip branch.
  - `src/components/UI/GlobalDrawer.tsx` — add the "Share Play" drawer item (hidden if `!isSupabaseConfigured()`, disabled if no active play) + mount `<SharePlayModal>`; render the extracted `<SavePlayDialog>` / `<MatchSetupModal>`; keep the "Board layout" item.
  - `src/components/Board/hud/TransportBar.tsx` — import `TEAL` from `podStyles` instead of the local `const`.
  - `src/components/Board/hud/useSetupControls.tsx`, `CameraPod.tsx`, `rail/RailHud.tsx` — import `renderAction` from `hudActions` (and `useSetupControls.tsx` stops exporting it).
- **Delete:** none (the rename is a move, not an added deletion).

## Verification

No RTL → no component unit tests. Gate + a focused unit test for the writer branch + runtime smoke:

- **Gate:** `npx tsc --noEmit` clean AND `npm run build` green before each commit. (Vitest suite OOMs on Windows — run only new/changed test files.)
- **Unit:** the `sharePlay` **board-only branch** is testable in isolation if `supabase`/`playbookDB` are mockable — at minimum, add a test that `sharePlay` with a play that has **no `linkedVideoMoment`** does **not** call `trimAndConvertVideo` and inserts with `video_url: null`. If the Supabase/Dexie coupling makes a unit test impractical, note it and rely on the build gate + runtime smoke (document which).
- **Runtime smoke (blocked by the Supabase `/login` gate — needs a signed-in session, and Supabase configured for the share to actually round-trip):**
  1. Drawer opens; "Share Play" appears (Supabase configured) / is hidden (not configured); disabled with a hint when no play is active/saved.
  2. Share a play with **no** video → instant → modal shows a `/shared/:token` URL; Copy works; opening the URL shows the board diagram (viewer starts on the board step).
  3. Share a play **with** a linked moment + loaded video → progress runs → URL shares; opening it shows the clip + board.
  4. Force `clipTooLarge` (large/long clip) → inline error + "Share board only" produces a board-only link.
  5. Match-setup + scoreboard still work from the drawer (extracted `MatchSetupModal`); Save still works (extracted `SavePlayDialog`); "Board layout" cycle still works.
  6. Board HUD unaffected: pods/rail render, `renderAction` still drives Setup/Camera buttons after the move, `TransportBar` unchanged. No console errors.

## Interfaces (for the plan)

- **Consumes:** `usePlayStore` (`activePlayId`), `useVideoStore` (`videoFile`), `sharingService.sharePlay`, `isSupabaseConfigured`, `usePlaybook.saveCurrentPlay`, `matchStore` (existing match wiring), `MobileMenu` (`createMenuSection`/`createMenuItem`), `podStyles.TEAL`.
- **Produces:** `GlobalDrawer` (was `Toolbar`), `SavePlayDialog`, `MatchSetupModal`, `SharePlayModal`, `hudActions.tsx` (`renderAction` + types), `sharePlay` (was `sharePlayWithClip`).
- **Invariant:** board HUD (pods + rail) behaviour unchanged after the `renderAction`/`TEAL` moves; the shared viewer unchanged; no Dexie/schema change; drawer globals (Video/Match/Playbook/Display/User) all still present and working.
