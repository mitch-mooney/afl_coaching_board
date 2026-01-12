# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-12 03:55]
The loadPlaybook function in playbookStore.ts must return the Playbook object for usePlaybook.ts hook to properly restore player state. Without this return statement, the loaded playbook data is lost and player positions/names are not restored.

_Context: Found during subtask-5-2 verification - the original implementation returned void instead of the playbook, causing the loadScenario hook to silently fail restoration._
