# Specification: AFL Formation Templates

## Overview

This feature implements pre-built tactical formation templates for AFL (Australian Football League) coaching. Users can select from at least 5 standard AFL formations and apply them with one click to position all 36 players (18 per team) on the field. Templates serve as starting points that can be modified after application, and users can save their own custom formations for future reuse. This AFL-specific capability provides competitive differentiation over generic multi-sport coaching tools.

## Workflow Type

**Type**: feature

**Rationale**: This is a net-new feature addition that introduces formation template functionality to the AFL coaching board. It involves creating new UI components (template selector), new data structures (formation definitions), new state management (template application logic), and new persistence (custom template storage). The feature is additive and does not modify existing core functionality.

## Task Scope

### Services Involved
- **main** (primary) - React/TypeScript frontend with Three.js canvas, Zustand state, and Dexie persistence

### This Task Will:
- [ ] Create at least 5 pre-built AFL formation templates (standard setup, zone defense, press, spread, and 1+ additional)
- [ ] Implement template selector UI component in toolbar or sidebar
- [ ] Build template application logic that positions all 36 players (both teams) simultaneously
- [ ] Ensure applied formations remain editable via existing player manipulation features
- [ ] Implement custom template saving and persistence using Dexie (IndexedDB)
- [ ] Create formation data model with coordinates for all 36 player positions

### Out of Scope:
- Animated transitions between formations (can be added in future iteration)
- Formation validation/coaching rules (e.g., offside warnings)
- Formation sharing between users (local persistence only)
- Import/export of formations to external formats
- AI-suggested formations based on game situations

## Service Context

### main

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- State Management: Zustand
- Styling: Tailwind CSS
- 3D Canvas: Three.js (@react-three/fiber, @react-three/drei)
- Persistence: Dexie (IndexedDB wrapper)
- Key dependencies: framer-motion (animations), react-dom

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** http://localhost:3000

**Key Directories:**
- `src/` - All source code
- Expected structure (to be verified during implementation):
  - `src/components/` - React components
  - `src/stores/` - Zustand state stores
  - `src/types/` - TypeScript type definitions
  - `src/db/` - Dexie database schemas
  - `src/utils/` - Utility functions

## Files to Modify

**Note**: Context phase did not identify existing files. The following are expected files based on the tech stack and typical React/TypeScript project structure. These must be verified and discovered during implementation:

| File | Service | What to Change |
|------|---------|----------------|
| `src/stores/playerStore.ts` (expected) | main | Add formation application logic to update all 36 player positions |
| `src/components/Toolbar.tsx` or `src/components/Sidebar.tsx` (expected) | main | Integrate FormationSelector component |
| `src/db/schema.ts` (expected) | main | Add CustomFormation table for user-saved templates |
| `src/types/Formation.ts` (new) | main | Define Formation and PlayerPosition type interfaces |
| `src/components/FormationSelector.tsx` (new) | main | Create template selector dropdown/modal component |
| `src/data/formations.ts` (new) | main | Define 5+ pre-built AFL formation templates |

## Files to Reference

**Note**: No reference files were identified in context phase. During implementation, search for:

| Pattern to Find | Where to Look |
|----------------|---------------|
| Player state management | `src/stores/*Store.ts` - How players are currently managed in Zustand |
| Canvas/Three.js rendering | `src/components/*Canvas.tsx` or similar - How players are rendered |
| Dexie schema patterns | `src/db/*.ts` - Existing database table definitions |
| Toolbar/UI patterns | `src/components/Toolbar.tsx`, `src/components/Sidebar.tsx` |
| TypeScript type patterns | `src/types/*.ts` - Existing type definition conventions |

## Patterns to Follow

### Zustand Store Pattern

Expected pattern for state management (verify during implementation):

```typescript
// Zustand store for player management
interface PlayerStore {
  players: Player[];
  updatePlayer: (id: string, position: Position) => void;
  updateMultiplePlayers: (updates: PlayerUpdate[]) => void; // May need to add
  // ... other methods
}
```

**Key Points:**
- Use Zustand's `create` function for store definition
- Implement batch update method for efficient 36-player positioning
- Maintain immutability in state updates

### Dexie Database Schema Pattern

Expected pattern for IndexedDB persistence:

```typescript
// Dexie database schema
class AppDatabase extends Dexie {
  customFormations!: Table<CustomFormation>;

  constructor() {
    super('AFLCoachingBoard');
    this.version(1).stores({
      customFormations: '++id, name, createdAt'
    });
  }
}
```

**Key Points:**
- Use Dexie's class-based API
- Auto-incrementing primary keys with `++id`
- Index fields that will be queried (name, createdAt)

### React Component with Tailwind Pattern

Expected pattern for UI components:

```typescript
// Tailwind-styled React component
export const FormationSelector: React.FC = () => {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
      {/* Component content */}
    </div>
  );
};
```

**Key Points:**
- Use Tailwind utility classes for styling
- Functional components with TypeScript
- Proper type annotations for props

## Requirements

### Functional Requirements

1. **Pre-built Formation Templates**
   - Description: At least 5 standard AFL formations available as templates
   - Templates: Standard Setup, Zone Defense, Press, Spread, [1+ additional such as Flood, Man-on-Man]
   - Each template contains coordinate data for all 36 players (18 home team + 18 away team)
   - Acceptance: User can view list of at least 5 named formations in selector UI

2. **Template Selector UI**
   - Description: Dropdown or modal component in toolbar or sidebar to browse and select formations
   - Location: Integrated into existing toolbar or sidebar component
   - Acceptance: User can open selector, see formation names/descriptions, and click to apply

3. **One-Click Formation Application**
   - Description: Clicking a template instantly positions all 36 players on the field
   - Implementation: Batch update via Zustand store to all player positions
   - Acceptance: All 36 players move to template positions within <500ms of click

4. **Post-Application Editability**
   - Description: After applying template, users can still drag/modify individual player positions
   - Implementation: Template application uses existing player update mechanisms
   - Acceptance: User can drag players after applying template without errors

5. **Custom Template Saving**
   - Description: Users can save current player positions as a named custom formation
   - Storage: Persisted to IndexedDB via Dexie
   - Acceptance: Saved custom formations appear in template selector alongside pre-built ones

6. **Both Teams Included**
   - Description: Each formation template positions both home and away teams
   - Implementation: Formation data structure includes positions for all 36 players with team identifiers
   - Acceptance: Applying any template positions players from both teams correctly

### Edge Cases

1. **Missing Player Data** - If fewer than 36 players exist in state, template application should gracefully handle partial application or show error message
2. **Concurrent Position Updates** - Template application during active user drag operation should be prevented or queued
3. **Invalid Formation Data** - Malformed template data should be validated before application and log errors without crashing
4. **Storage Quota Exceeded** - Custom template saving should handle IndexedDB quota errors with user-friendly message
5. **Template Name Collisions** - Custom template names should be validated to prevent duplicates or overwrite existing with confirmation

## Implementation Notes

### DO
- Use Zustand's batch update capability to position all 36 players in a single state transaction
- Store formation templates as JSON data structures in `src/data/formations.ts` for easy maintenance
- Implement template data validation schema (consider Zod or similar) to catch malformed formations
- Use Dexie's async/await API for IndexedDB operations
- Add loading states for template application (brief spinner/transition)
- Include formation preview thumbnails if time permits (visual representation of template)
- Follow existing component structure discovered in codebase exploration
- Use TypeScript strict mode and define proper types for all formation data

### DON'T
- Don't mutate Zustand state directly - use store actions
- Don't block UI thread during 36-player batch update - ensure async handling
- Don't hardcode formation coordinates in components - centralize in data file
- Don't skip error handling for Dexie operations (IndexedDB can fail)
- Don't create new styling patterns - follow existing Tailwind conventions
- Don't implement complex formation algorithms - start with static coordinate data
- Don't modify existing player drag/drop logic - integrate with it

## Development Environment

### Start Services

```bash
# Navigate to project root
cd C:\Users\mitch\PycharmProjects\afl_coaching_board

# Install dependencies (if needed)
npm install

# Start development server
npm run dev
```

### Service URLs
- main: http://localhost:3000

### Required Environment Variables
- None specified in project_index.json
- Check for `.env.example` file during implementation

### Development Tools
- Vite dev server with HMR (Hot Module Replacement)
- TypeScript compiler with strict mode
- ESLint for code quality
- Browser DevTools for React/Three.js debugging
- Dexie DevTools extension for IndexedDB inspection (recommended)

## Success Criteria

The task is complete when:

1. [ ] At least 5 pre-built AFL formation templates exist (standard setup, zone defense, press, spread, +1)
2. [ ] Template selector UI component is accessible from toolbar or sidebar
3. [ ] Clicking a template positions all 36 players (18 per team) on the field
4. [ ] Players remain draggable/editable after template application
5. [ ] Users can save current player positions as a custom template
6. [ ] Custom templates persist across browser sessions (IndexedDB)
7. [ ] Custom templates appear in template selector alongside pre-built templates
8. [ ] No console errors during template application or custom save
9. [ ] Existing tests still pass (if test suite exists)
10. [ ] Template application completes in <500ms for good UX

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Formation data validation | `src/data/formations.test.ts` | All 5+ templates have exactly 36 player positions |
| Formation data validation | `src/data/formations.test.ts` | Each position has valid x/y coordinates and team assignment |
| Template application logic | `src/stores/playerStore.test.ts` | Batch update correctly positions all 36 players from template data |
| Custom template saving | `src/db/formations.test.ts` | Dexie save operation persists formation with name and timestamp |
| Custom template retrieval | `src/db/formations.test.ts` | Dexie query returns all saved custom formations |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Template selector rendering | main (UI ↔ Store) | FormationSelector displays all pre-built + custom formations |
| Template application flow | main (UI ↔ Store ↔ Canvas) | Clicking template updates Zustand state and Three.js canvas renders new positions |
| Custom template save flow | main (UI ↔ Store ↔ Dexie) | Save button captures current positions, stores in IndexedDB, updates selector list |
| Template persistence | main (Dexie ↔ Store) | Custom templates load from IndexedDB on app startup |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Apply pre-built template | 1. Open template selector 2. Click "Zone Defense" template 3. Observe canvas | All 36 players animate/snap to zone defense positions, both teams positioned correctly |
| Edit after template | 1. Apply any template 2. Drag a player to new position 3. Verify state update | Player moves smoothly, Zustand state updates, no errors in console |
| Save custom template | 1. Position players manually 2. Click "Save Template" 3. Enter name "My Custom Setup" 4. Save | Template appears in selector with name "My Custom Setup" |
| Load custom template | 1. Refresh browser 2. Open template selector 3. Click saved "My Custom Setup" | Players position to saved coordinates, proving IndexedDB persistence |
| Template collision handling | 1. Try to save template with duplicate name 2. Observe behavior | User receives confirmation dialog or auto-renamed template |

### Browser Verification (Frontend)

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Main Coaching Board | `http://localhost:3000` | Template selector button/dropdown visible in toolbar or sidebar |
| Template Selector | `http://localhost:3000` (opened via toolbar) | Modal/dropdown shows at least 5 formations: Standard, Zone Defense, Press, Spread, +1 |
| Canvas Rendering | `http://localhost:3000` | After template application, Three.js canvas renders all 36 players in correct positions without visual glitches |
| Custom Template UI | `http://localhost:3000` (save template dialog) | Save dialog has name input field, save/cancel buttons, validation feedback |

### Database Verification (IndexedDB)

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Database exists | Open DevTools > Application > IndexedDB | `AFLCoachingBoard` database present |
| CustomFormations table | Inspect `AFLCoachingBoard.customFormations` | Table schema has columns: id (auto-increment), name, positions (JSON), createdAt |
| Custom template data | Query `customFormations.toArray()` in console | Saved templates have 36 positions array, valid timestamps, unique names |
| Data persistence | 1. Save template 2. Close browser 3. Reopen app 4. Check IndexedDB | Custom template still exists with all data intact |

### Performance Verification

| Metric | Measurement | Target |
|--------|-------------|--------|
| Template application speed | Time from click to canvas update | < 500ms for 36 player update |
| UI responsiveness | Template selector open/close | < 100ms modal animation |
| IndexedDB write | Custom template save operation | < 200ms (async, non-blocking) |
| Memory usage | After applying 10+ templates in sequence | No memory leaks (check DevTools Memory profiler) |

### QA Sign-off Requirements
- [ ] All unit tests pass (`npm test` or equivalent)
- [ ] All integration tests pass
- [ ] All E2E test scenarios successfully verified manually
- [ ] Browser verification complete: template selector accessible and functional
- [ ] IndexedDB verification complete: custom templates persist correctly
- [ ] At least 5 pre-built formations tested and working (all 36 players positioned)
- [ ] Custom template save/load cycle verified across browser sessions
- [ ] Performance targets met: <500ms template application
- [ ] No regressions in existing player drag/drop functionality
- [ ] No console errors during any template operations
- [ ] Code follows established React/TypeScript/Zustand patterns from codebase
- [ ] No security vulnerabilities introduced (check for XSS in template names)
- [ ] TypeScript compilation successful with no errors (`npm run build`)

---

## Additional Implementation Guidance

### Formation Data Structure (Recommended)

```typescript
// src/types/Formation.ts
export interface PlayerPosition {
  playerId: number;        // 1-18 for home, 19-36 for away
  team: 'home' | 'away';
  x: number;               // Field coordinate (e.g., 0-100 or canvas pixels)
  y: number;               // Field coordinate (e.g., 0-100 or canvas pixels)
  role?: string;           // Optional: "CHF", "FF", "Ruck" etc.
}

export interface Formation {
  id: string;
  name: string;
  description: string;
  category: 'pre-built' | 'custom';
  positions: PlayerPosition[];  // Always length 36
  createdAt?: Date;
  thumbnail?: string;           // Optional base64 or URL
}
```

### AFL Formation Research Notes

For accurate pre-built templates, consider these standard AFL formations:

1. **Standard Setup**: Traditional positions (FB, CHB, HB, Wings, Centre, HF, CHF, FF)
2. **Zone Defense**: Players in defined zones rather than man-to-man
3. **Press**: High forward pressure with midfielders pushing forward
4. **Spread**: Wide distribution to create space
5. **Flood**: Extra defenders behind the ball (defensive formation)

Research authentic AFL positioning or consult domain expert if needed for coordinate accuracy.

### Implementation Priority

**Phase 1 (MVP):**
1. Define formation data structure and types
2. Create 5 pre-built formations with hardcoded coordinates
3. Build template selector UI component
4. Implement template application logic (Zustand batch update)
5. Verify template application works with existing canvas rendering

**Phase 2 (Persistence):**
6. Add Dexie schema for custom formations
7. Implement custom template save functionality
8. Integrate custom templates into selector
9. Test persistence across browser sessions

**Phase 3 (Polish):**
10. Add formation preview thumbnails
11. Implement template name validation
12. Add loading/success feedback
13. Performance optimization if needed

---

**Spec Version**: 1.0
**Created**: 2026-01-09
**Status**: Ready for Implementation Planning Phase
