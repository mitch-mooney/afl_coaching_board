# 01 — Prefactor: the `Boundary` type and venue-ready geometry

**What to build:** Nothing a coach can see. This is the expand step that makes every later
ticket a small change: field dimensions stop being a global constant and become a value
passed in, while the board keeps rendering exactly as it does today.

Field dimensions currently live on `FIELD_CONFIG` alongside the **Absolute markings** — one
frozen object mixing the one thing that varies per ground with the many things that never do.
Roughly 27 call sites read it. If any is missed later, it keeps compiling and keeps returning
plausible numbers, and the board silently renders half on one ground and half on another. So
the boundary values are **deleted**, not deprecated: the compiler, not a reviewer, enumerates
the work.

Two boundary ellipses disagree today. Clamping uses semi-axes of 82.5 × 67.5, while the apron
hole that actually *paints* the oval is hardcoded at 82 × 67. That half-metre gap is invisible
now and becomes a lie the moment the app starts telling coaches something is outside the
boundary. One derived **Boundary** replaces both. Call it out in the commit message — a
half-metre change to the painted edge will otherwise read as an unexplained tweak.

**Blocked by:** None — can start immediately.

**Status:** done — `feat/venue-01-boundary`

**Outcome — two deviations from the checklist below, both deliberate:**

1. **`positionToZone` did NOT take a `Boundary`.** Its thresholds are still calibrated to
   Standard ground, so a Boundary accepted here would be *accepted and ignored* for two
   tickets — looking venue-aware while answering for a different ground, which is the exact
   failure this wave exists to remove. Ticket 04 changes its signature and its thresholds
   together. Recorded in the source and in ADR 0002.
2. **The boundary line is now visible.** Reconciling the apron hole to the boundary (rather
   than 0.5 m inside it) uncovered `FieldBoundary`, which has been drawing a correct white
   ellipse at 82.5 × 67.5 all along — it was simply painted over. Ticket 03's "a white
   boundary line is drawn" is therefore already satisfied; what remains there is making it
   *move* with the Active Venue.

Also added beyond the checklist: `useActiveBoundary` — the one place a ground is resolved,
so ticket 03 changes a single file instead of six. Dead `getFieldBounds` deleted alongside
`generateFieldGeometry` (no caller in `src/`).

Vocabulary: `CONTEXT.md`, "The ground" — **Boundary**, **Boundary dimensions**, **Absolute
markings**, **Standard ground**. Read `docs/adr/0002-venue-is-app-wide-positions-stay-absolute.md`
first; it records why positions are never normalised, which constrains every choice here.
Spec: `.scratch/venue/spec.md`.

- [x] `FIELD_CONFIG` is renamed `FIELD_MARKINGS` and no longer carries `length` or `width`.
      Everything left on it is an Absolute marking.
- [x] A `Boundary { semiX, semiZ }` type exists — semi-axes, because every consumer halves the
      dimensions immediately — with a derivation from a set of Boundary dimensions.
- [ ] `snapToField`, `isPointInField` and `positionToZone` take a `Boundary` as an explicit
      parameter. They read no store; `thumbnailProjection` stays store-free too.
      → **PARTIAL:** `snapToField`, `isPointInField` and `projectSnapshot` do.
      `positionToZone` does not — see Outcome 1 above; it moves to ticket 04.
- [x] Every call site passes a Standard-ground boundary constant (165 × 135) for now, held
      where the seeded Venue will later carry it.
- [x] The painted boundary and the clamping ellipse derive from the same `Boundary`. The
      82 × 67 apron fudge is gone.
- [x] `snapToField`'s callers on the drag and stroke hot paths resolve the `Boundary` **once
      per gesture**, not per pointer event.
- [x] `generateFieldGeometry` is deleted — it is dead code, and migrating it would be work
      spent on something nothing calls.
- [x] A new `fieldGeometry` test file pins **today's** behaviour at Standard ground: zone
      returns, clamping, and in/out tests. These are the regression guard for every later
      ticket, so write them as football claims, not as restatements of the implementation.
- [x] The app renders pixel-identically to before, apart from the half-metre boundary
      reconciliation — and the white boundary line it uncovers (Outcome 2). Typecheck and
      build pass. Tests pass in batches: 439 across models/data/hooks/services/components/
      store/utils. `utils/videoUtils.test.ts` was not run — it OOMs the Node heap on Windows,
      verified to do so on pristine `main` as well, so it is pre-existing and unrelated.
- [ ] **iPad smoke still owed** — nothing here has been seen on the device. Specifically
      unverified: that the uncovered boundary line reads as a boundary rather than an
      artefact, and that the apron seam has no visible gap where the hole now meets it.
