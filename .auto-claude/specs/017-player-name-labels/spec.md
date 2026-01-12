# Specification: Player Name Labels

## Overview

This feature enables coaches to assign actual player names to positions on the AFL coaching board, supplementing the existing jersey number system. Names can be displayed as labels above players or in a legend panel, with full persistence in the playbook system. This is essential for game-specific preparation where coaches need to show actual team lineups rather than generic position identifiers.

## Workflow Type

**Type**: feature

**Rationale**: This is a new capability being added to the existing playbook system. It extends the player/position model with optional name data and adds UI controls for name management and display. It's not fixing existing behavior (bug) or restructuring code (refactor), but adding new functionality that integrates with the existing playbook save/load system.

## Task Scope

### Services Involved
- **main** (primary) - React/TypeScript frontend with 3D playbook board

### This Task Will:
- [ ] Extend player/position data model with optional `playerName` field
- [ ] Add UI controls for assigning names to positions (likely click-to-edit or form-based)
- [ ] Implement name label rendering (above players on 3D board or in legend panel)
- [ ] Add visibility toggle control for showing/hiding player names
- [ ] Integrate name data into playbook persistence (Dexie/IndexedDB)
- [ ] Create roster import feature (parse text list of names)
- [ ] Ensure names are saved/loaded with playbook data

### Out of Scope:
- Player statistics or performance tracking
- Jersey number replacement (names supplement numbers, don't replace them)
- Advanced roster management (editing player profiles, positions, etc.)
- Export functionality (beyond standard playbook export)
- Multi-language support for names

## Service Context

### main

**Tech Stack:**
- Language: TypeScript
- Framework: React
- 3D Rendering: Three.js with @react-three/fiber and @react-three/drei
- Styling: Tailwind CSS
- State Management: Zustand
- Database: Dexie (IndexedDB wrapper)
- Build Tool: Vite

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `three` - 3D graphics rendering
- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Three.js helpers
- `zustand` - State management
- `dexie` - IndexedDB persistence
- `framer-motion` - Animations

## Files to Modify

**Note**: The context phase did not identify specific files. The implementation agent should discover these files before proceeding. Expected areas:

| Area | Expected Location | What to Change |
|------|-------------------|----------------|
| Player/Position Data Model | `src/types/*.ts` or `src/models/*.ts` | Add optional `playerName?: string` field to player/position type |
| Player Component | `src/components/*Player*.tsx` | Add name label rendering logic |
| Zustand Store | `src/store/*.ts` or `src/state/*.ts` | Add name assignment actions and name visibility toggle state |
| Playbook Persistence | `src/db/*.ts` or `src/services/*.ts` | Ensure `playerName` field is saved/loaded in playbook schema |
| UI Controls | `src/components/*Controls*.tsx` or `src/components/*Panel*.tsx` | Add name visibility toggle and roster import UI |

## Files to Reference

**Note**: The context phase did not identify reference files. The implementation agent should search for these patterns:

| Pattern Needed | Where to Look | What to Learn |
|----------------|---------------|---------------|
| Zustand store structure | `src/store/*.ts` | How actions and state are organized |
| Player rendering | `src/components/*Player*.tsx` | How players are currently rendered |
| Dexie schema | `src/db/*.ts` | How playbook data is structured |
| Toggle controls | `src/components/*Toggle*.tsx` or similar | Existing toggle UI patterns |
| Text input patterns | `src/components/*Input*.tsx` or forms | How text input is handled |

## Patterns to Follow

### State Management with Zustand

Expected pattern:

```typescript
// Zustand store structure
interface PlaybookState {
  players: Player[];
  showPlayerNames: boolean;
  setPlayerName: (playerId: string, name: string) => void;
  togglePlayerNames: () => void;
  importRoster: (names: string[]) => void;
}
```

**Key Points:**
- Use Zustand's `create` function to define store
- Keep actions pure and focused
- Toggle states should be simple boolean flags

### Data Model Extension

Expected pattern:

```typescript
interface Player {
  id: string;
  position: { x: number; y: number; z: number };
  jerseyNumber: number;
  playerName?: string; // NEW: optional player name
  // ... other existing fields
}
```

**Key Points:**
- Make `playerName` optional to maintain backward compatibility
- Use string type for maximum flexibility
- Include in serialization/deserialization

### Dexie Persistence

Expected pattern:

```typescript
// Dexie database schema
class PlaybookDB extends Dexie {
  playbooks: Dexie.Table<Playbook, number>;

  constructor() {
    super('PlaybookDB');
    this.version(2).stores({
      playbooks: '++id, name, createdAt, data'
      // data contains full playbook including player names
    });
  }
}
```

**Key Points:**
- Increment schema version if needed
- Embed player names in playbook data structure
- Test migration from old schema if version changes

## Requirements

### Functional Requirements

1. **Name Assignment**
   - Description: Allow assigning a text name to any player position on the board
   - Acceptance: Click on a player or use a form to enter a name; name is stored and retrievable

2. **Name Display**
   - Description: Render player names as labels (above players or in a legend panel)
   - Acceptance: Names appear clearly visible and associated with the correct player

3. **Visibility Toggle**
   - Description: Provide a control to show/hide player names globally
   - Acceptance: Toggle switch or checkbox that instantly shows/hides all names

4. **Persistence**
   - Description: Save player names with playbook data in IndexedDB
   - Acceptance: After saving and reloading a playbook, names are preserved

5. **Roster Import**
   - Description: Quick import of multiple player names from a text list
   - Acceptance: Paste a list of names (one per line) and assign to positions in order

### Edge Cases

1. **Empty Names** - Allow removing/clearing a player's name (treat empty string as no name)
2. **Long Names** - Truncate or wrap names that are too long to display cleanly
3. **Special Characters** - Support international characters and special punctuation
4. **Roster Import Mismatch** - Handle cases where text list has more/fewer names than positions
5. **Legacy Playbooks** - Old playbooks without name data should still load correctly

## Implementation Notes

### DO
- Use Zustand for state management (consistent with project stack)
- Store names in the existing player/position data structure
- Use Tailwind CSS for styling (consistent with project conventions)
- Make the feature non-breaking (old playbooks without names should work)
- Test name rendering in 3D space (consider label positioning and readability)
- Validate Dexie schema changes if playbook structure needs updating

### DON'T
- Don't create a separate data structure for names (embed in player model)
- Don't replace jersey numbers (names are supplementary)
- Don't assume names are always present (make them optional)
- Don't hardcode positions for roster import (make it flexible)
- Don't block playbook loading if name data is missing

### Design Decisions

**Display Method**: Implementation should support:
- **Option A (Recommended)**: Labels above players in 3D space using `@react-three/drei` Text component
- **Option B**: Legend panel to the side (lower priority, but should be architecturally possible)

**Assignment UI**:
- Click-to-edit inline (best UX) OR
- Form panel with dropdown of players (simpler to implement)

## Development Environment

### Start Services

```bash
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000

### Required Environment Variables
- None (uses IndexedDB locally)

## Success Criteria

The task is complete when:

1. [ ] Can assign a player name to any position (via click or form)
2. [ ] Names display as labels above players on the 3D board
3. [ ] Toggle control shows/hides all player names
4. [ ] Names are saved with playbook data in IndexedDB
5. [ ] Roster import feature parses text list and assigns names
6. [ ] No console errors when using name features
7. [ ] Existing playbooks without names still load correctly
8. [ ] New playbooks with names save and reload correctly

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Player name assignment | `src/store/*.test.ts` | `setPlayerName` action updates player correctly |
| Toggle name visibility | `src/store/*.test.ts` | `togglePlayerNames` flips boolean state |
| Roster import parsing | `src/utils/*.test.ts` or store test | Text list parsed into array correctly |
| Empty name handling | Component or store test | Empty string clears player name |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Name persistence | main (store ↔ Dexie) | Names saved to IndexedDB and retrieved on load |
| Playbook load with names | main (store ↔ Dexie) | Full playbook loads with all player names intact |
| Legacy playbook load | main (store ↔ Dexie) | Old playbooks without name data load without errors |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Assign and save name | 1. Open playbook 2. Assign name to player 3. Save playbook 4. Reload page 5. Open playbook | Name appears on player |
| Toggle visibility | 1. Assign names 2. Turn toggle off 3. Turn toggle on | Names disappear, then reappear |
| Roster import | 1. Click import 2. Paste name list 3. Confirm | Names assigned to positions in order |

### Browser Verification

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Main playbook board | `http://localhost:3000` | - Names render above players in 3D<br>- Toggle control present and functional<br>- Names persist after save/load<br>- No visual glitches or z-fighting |
| Name assignment UI | `http://localhost:3000` | - Can click player to edit name OR<br>- Form/panel for name entry accessible |
| Roster import UI | `http://localhost:3000` | - Import button/modal present<br>- Text area for pasting names<br>- Success feedback after import |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Playbook schema | Open DevTools → Application → IndexedDB → PlaybookDB | `data` field contains player objects with `playerName` property |
| Name persistence | Save playbook, inspect DB | Player names stored in `playbooks` table |
| Schema migration | Check Dexie version | Schema version incremented if structure changed |

### Performance Checks

| Check | How to Verify | Expected |
|-------|---------------|----------|
| Render performance | Open playbook with 22+ players with names | No frame rate drops, smooth 60fps |
| Toggle responsiveness | Click toggle rapidly | Instant show/hide, no lag |
| Import speed | Import 50 names | Completes in <1 second |

### QA Sign-off Requirements

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (all checks pass)
- [ ] Database state verified (names persist correctly)
- [ ] Performance acceptable (no frame drops)
- [ ] No regressions in existing playbook functionality
- [ ] Legacy playbooks load without errors
- [ ] Code follows Zustand/React/TypeScript patterns
- [ ] No console errors or warnings
- [ ] Labels readable and positioned correctly in 3D space
- [ ] Tailwind CSS classes used correctly

## Implementation Risks & Assumptions

### Assumptions

**File Structure**: This spec assumes standard file organization patterns:
- Types/models in `src/types/` or `src/models/`
- Components in `src/components/`
- Store in `src/store/` or `src/state/`
- Database in `src/db/`

**Reality**: Context phase did not identify actual files. Implementation agent MUST discover actual file locations before coding.

### Risks

1. **3D Label Rendering Complexity**: Rendering text in 3D space with Three.js requires careful positioning and scaling
   - Mitigation: Use `@react-three/drei` Text component with Billboard for screen-facing labels

2. **Dexie Schema Changes**: If schema needs versioning, existing data might need migration
   - Mitigation: Make `playerName` optional; version schema carefully; test migration

3. **Performance**: Rendering many text labels in 3D could impact frame rate
   - Mitigation: Use instancing if needed; toggle off by default; test with 22+ players

4. **Unknown Codebase Structure**: Actual file organization may differ from assumptions
   - Mitigation: Implementation agent should run discovery phase before coding

## Next Steps for Implementation Agent

1. **Discover Actual Files**:
   ```bash
   # Find player/position types
   find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "interface.*Player"

   # Find Zustand stores
   find src -name "*store*.ts" -o -name "*state*.ts"

   # Find Dexie database
   find src -name "*db*.ts" -o -name "*database*.ts"

   # Find player rendering components
   find src -name "*Player*.tsx"
   ```

2. **Read Existing Code**: Understand current patterns before modifying

3. **Plan Implementation Order**:
   - Data model first (types)
   - State management second (store)
   - UI third (components)
   - Persistence last (database)

4. **Test Incrementally**: Verify each layer before moving to the next

---

**Spec Version**: 1.0
**Created**: 2026-01-09
**Status**: Ready for Implementation Planning
