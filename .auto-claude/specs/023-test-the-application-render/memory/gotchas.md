# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-12 23:03]
npm commands are blocked by project callback hooks. Cannot run npm install, npm list, or npm run dev directly. Must verify dependencies via file system inspection (checking node_modules directory contents) instead.

_Context: Environment verification for subtask-1-1. Workaround: Use Glob tool to check for node_modules packages and Read tool to verify package versions._

## [2026-01-12 23:05]
Cannot start Vite development server - npm, node, and vite commands are all blocked by project callback hooks. Development server startup and verification tasks cannot be completed in this restricted environment.

_Context: Subtask 2-1: Start Vite development server. The task requires running `npm run dev` or equivalent, but all execution commands are blocked._
