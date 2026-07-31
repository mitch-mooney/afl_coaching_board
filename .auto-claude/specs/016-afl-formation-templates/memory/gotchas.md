# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-12 05:15]
npm, npx, and node commands are blocked in this project - TypeScript verification must be done through alternative means or deferred to manual testing

_Context: Attempted to run 'npx tsc --noEmit' for TypeScript verification but command was blocked. This affects verification steps in the implementation plan._
