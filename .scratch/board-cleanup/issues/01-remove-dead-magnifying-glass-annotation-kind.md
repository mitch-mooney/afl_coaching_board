# 01 — Remove the dead `magnifying-glass` Annotation kind

**What to build:** `AnnotationType` claims seven Annotation kinds. Only six are real.

`'magnifying-glass'` appears in that type declaration and **nowhere else in `src/`** — no
Tool rail tip, no keyboard shortcut, no `AnnotationLayer` render case, no authoring path. A
coach cannot arm it, create one, or see one. It has been dead since before the Tool rail wave.

It is not merely unused, it is misleading. `PenTip = AnnotationType | 'path'`, so every place
that reasons about "the set of Pen tips" nominally includes a value that can never occur.
`toolRailTips.ts` already carries a comment explaining why the rail's list is written out
explicitly rather than derived from `PenTip` — that comment exists *because* of this member.
The domain says six Annotation kinds plus Path; the type should too.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

Vocabulary: `CONTEXT.md`, "Board content" — an **Annotation** is inert markup drawn on the
board. Related: `docs/adr/0001-pen-authors-finger-manipulates.md` for the tip set.

- [ ] **First, re-confirm it is dead.** `grep -rn "magnifying-glass" src/` should return only
      the type declaration and doc-comment mentions. If anything else appears, stop and report
      — the premise is wrong.
- [ ] `'magnifying-glass'` is removed from `AnnotationType`.
- [ ] Doc comments that exist only to explain the dead member are removed or reworded —
      notably the note in `toolRailTips.ts` about why the rail's list is explicit. If that list
      can now be derived from `PenTip` safely, say so in the PR rather than changing it here.
- [ ] **Check persisted and shared data before assuming this is free.** Annotations are stored
      in saved Plays and in shared-link payloads. Confirm no stored Annotation can carry
      `type: 'magnifying-glass'` — if one somehow could, narrowing the type makes old data fail
      to load, and this ticket needs a read-tolerant approach instead. Prior art for that
      judgement is the `ExportSettings` removal in `.scratch/canonical-board-state/issues/01`.
- [ ] Typecheck and production build clean; existing suites stay green.

> Scope: this is a type-level cleanup, not a feature. Do not add a magnifying-glass tip, and do
> not touch the Tool rail's behaviour, the six real kinds, or Path.
