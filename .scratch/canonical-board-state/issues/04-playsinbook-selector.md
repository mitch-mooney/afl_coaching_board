# 04 — playsInBook selector (optional)

**What to build:** The Play/Playbook containment relationship currently has no store-level
query — `PlayLibrary` filters the global Play list by `playbookId` client-side and
`PlaybookLibrary` re-groups Plays by book in a component `useMemo`. Add a `playsInBook`
selector on `playStore` so containment is expressed once, in the store, and the library
components consume it. Behaviour is identical to today; this is a cohesion improvement.

**Blocked by:** 02 — Add playStore gateway verbs.

**Status:** ready-for-agent

_Optional — explicitly droppable from this slice. Cut it if the slice is running long; the
client-side filtering is harmless as-is._

Spec: `docs/superpowers/specs/2026-07-22-architecture-pass-canonical-board-state.md` (Wave 1a, lower priority).

- [ ] `playStore.playsInBook(playbookId)` selector returns the Plays in a Playbook.
- [ ] `PlayLibrary` uses it instead of filtering the global list.
- [ ] `PlaybookLibrary` uses it instead of the in-component regroup.
- [ ] Behaviour unchanged; build + affected suites green.
