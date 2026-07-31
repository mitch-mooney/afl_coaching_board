# Specification: Ball Token with Path

## Overview

This feature adds a ball token to the AFL play designer that can be positioned on the field, assigned movement paths, and animated during playback. The ball will track passes and kicks during play sequences, providing coaches and players with complete visualization of ball movement throughout tactical plays. The ball token will reuse the existing player path system and integrate with the current Three.js-based field visualization.

## Workflow Type

**Type**: feature

**Rationale**: This introduces new functionality (ball token entity) to the existing play visualization system. It extends the current token/path infrastructure with a new entity type while maintaining consistency with existing player token patterns.

## Task Scope

### Services Involved
- **main** (primary) - React frontend with Three.js field visualization, Zustand state management

### This Task Will:
- [ ] Create a ball token entity that renders on the 3D field
- [ ] Enable drag-and-drop positioning for the ball token
- [ ] Extend the movement path system to support ball paths
- [ ] Implement ball animation along paths during playback
- [ ] Add ball-to-player assignment functionality (ball moves with assigned player)
- [ ] Ensure visual distinction between ball and player tokens

### Out of Scope:
- Physics-based ball trajectory calculations (simple path following only)
- Ball possession state tracking (focus on visual representation)
- Automatic ball transfer logic between players (manual assignment only)
- Historical ball movement analysis or statistics

## Service Context

### main

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- State Management: Zustand
- 3D Rendering: Three.js (@react-three/fiber, @react-three/drei)
- Animation: framer-motion
- Storage: Dexie (IndexedDB)
- Styling: Tailwind CSS

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Useful helpers for Three.js
- `zustand` - State management
- `dexie` - IndexedDB wrapper for persistence
- `framer-motion` - Animation library

## Files to Modify

Based on the React + Three.js stack, likely files to modify:

| File | Service | What to Change |
|------|---------|---------------|
| `src/types/entities.ts` or similar | main | Add BallToken type definition |
| `src/store/*` (Zustand store) | main | Add ball state (position, path, assignment) |
| `src/components/Field/*` | main | Add BallToken component rendering |
| `src/components/Tokens/*` | main | Create ball token visual component |
| `src/hooks/useDragDrop.ts` or similar | main | Extend drag-drop to support ball |
| `src/utils/animation.ts` or similar | main | Add ball path animation logic |

## Files to Reference

These files should demonstrate existing patterns:

| File | Pattern to Copy |
|------|----------------|
| Player token component | Token rendering in Three.js scene |
| Player path component | Movement path visualization |
| Player state management | Zustand store structure for entities |
| Player drag-drop handler | Drag-and-drop positioning logic |
| Player animation system | Path-based animation during playback |

## Patterns to Follow

### Three.js Token Rendering Pattern

Expected pattern for rendering tokens in React Three Fiber:

```typescript
// Pattern: 3D token component in R3F
import { useRef } from 'react'
import { Mesh } from 'three'

function PlayerToken({ position, color }) {
  const meshRef = useRef<Mesh>(null)

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
```

**Key Points:**
- Use React Three Fiber declarative mesh components
- Store refs for imperative animation control
- Position prop for 3D coordinates [x, y, z]

### Zustand State Management Pattern

Expected state structure:

```typescript
// Pattern: Entity state in Zustand
interface PlayStore {
  players: Player[]
  ball: Ball | null
  addPlayer: (player: Player) => void
  updateBallPosition: (position: Vector3) => void
  assignBallToPlayer: (playerId: string) => void
}

const usePlayStore = create<PlayStore>((set) => ({
  players: [],
  ball: null,
  updateBallPosition: (position) =>
    set((state) => ({ ball: { ...state.ball, position } })),
}))
```

**Key Points:**
- Separate ball from players (single entity vs array)
- Immutable updates using spread syntax
- Typed store interface

### Movement Path Pattern

Expected path structure:

```typescript
// Pattern: Path definition
interface MovementPath {
  id: string
  entityId: string // player or ball ID
  keyframes: Array<{
    timestamp: number
    position: [number, number, number]
  }>
  duration: number
}
```

**Key Points:**
- Time-based keyframes for animation
- Reusable across player and ball entities
- Position as 3D coordinates

## Requirements

### Functional Requirements

1. **Ball Token Rendering**
   - Description: Render a visually distinct ball token on the 3D field
   - Acceptance: Ball token appears on field with different appearance from players (different color, size, or shape)

2. **Ball Positioning**
   - Description: Allow drag-and-drop positioning of ball token on field
   - Acceptance: Ball can be dragged to any valid field position and stays at dropped location

3. **Ball Movement Paths**
   - Description: Support movement path creation for ball (same system as players)
   - Acceptance: Can define movement paths with keyframes/waypoints for ball token

4. **Ball Animation**
   - Description: Animate ball along defined path during playback
   - Acceptance: Ball moves smoothly along path during play animation with correct timing

5. **Ball-to-Player Assignment**
   - Description: Assign ball to a player so ball moves with that player
   - Acceptance: When assigned, ball follows player's position and movement path

6. **Visual Distinction**
   - Description: Ball must be clearly distinguishable from player tokens
   - Acceptance: Ball uses different visual properties (color, size, shape, or icon)

### Edge Cases

1. **Ball without assignment** - Ball can exist independently on field with its own path
2. **Ball assignment during animation** - Handle ball transfer between players mid-animation
3. **Ball and player path conflict** - When assigned, ball path should be ignored (follow player instead)
4. **Multiple balls** - Initially support single ball only (prevent multiple ball instances)
5. **Ball off-field** - Validate ball position stays within field boundaries
6. **Ball persistence** - Save/load ball position and paths with play data

## Implementation Notes

### DO
- Reuse existing player path rendering and animation infrastructure
- Follow the same Zustand state patterns used for players
- Use Three.js primitives (sphere/mesh) for ball rendering
- Leverage existing drag-drop handlers by extending them for ball
- Store ball data in the same IndexedDB structure as plays
- Use TypeScript interfaces to define ball entity clearly

### DON'T
- Create separate animation system for ball (reuse player animation logic)
- Hardcode ball properties (use configuration/constants)
- Allow multiple balls initially (enforce single ball instance)
- Skip visual distinction (ball must look different from players)
- Forget to handle ball in play serialization/deserialization

### Recommended Visual Design
- **Shape**: Sphere (football/AFL ball shape if possible)
- **Color**: Brown/red (traditional AFL ball colors) or bright accent color
- **Size**: Slightly smaller than player tokens
- **Icon/Texture**: Optional ball texture or icon overlay

## Development Environment

### Start Services

```bash
npm run dev
```

### Service URLs
- main: http://localhost:3000

### Required Environment Variables
- None (frontend-only application)

### Development Workflow
1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:3000`
3. Test ball interactions in play designer
4. Verify animations in playback mode
5. Check IndexedDB persistence (browser DevTools → Application → IndexedDB)

## Success Criteria

The task is complete when:

1. [ ] Ball token renders on field with distinct appearance from players
2. [ ] Ball can be positioned via drag-and-drop interaction
3. [ ] Ball supports movement path creation (keyframes/waypoints)
4. [ ] Ball animates smoothly along path during playback
5. [ ] Ball can be assigned to players (moves with assigned player)
6. [ ] Ball persists with play data (save/load works)
7. [ ] No console errors during ball interactions
8. [ ] Existing player functionality remains unaffected
9. [ ] Ball interactions tested via browser at http://localhost:3000

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Ball state management | `src/store/__tests__/playStore.test.ts` | Ball creation, position updates, assignment work correctly |
| Ball path utilities | `src/utils/__tests__/animation.test.ts` | Ball path interpolation and animation calculations |
| Ball type validation | `src/types/__tests__/entities.test.ts` | Ball entity type conforms to expected structure |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Ball + Player interaction | main | Ball assignment to player updates ball position |
| Ball path + animation | main | Ball follows defined path with correct timing |
| Ball persistence | main | Ball data saves to and loads from IndexedDB |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Ball positioning | 1. Open play designer 2. Add ball token 3. Drag to position | Ball moves to cursor position and stays |
| Ball path creation | 1. Select ball 2. Add waypoints 3. Play animation | Ball animates through waypoints |
| Ball assignment | 1. Assign ball to player 2. Move player 3. Verify ball follows | Ball position matches assigned player |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Play Designer | `http://localhost:3000` | Ball token visible, draggable, distinct from players |
| Play Animation | `http://localhost:3000` (playback mode) | Ball animates along path smoothly |
| Path Editor | `http://localhost:3000` (path mode) | Ball path waypoints can be added/edited |

### Manual Testing Checklist
- [ ] **Visual distinction**: Ball clearly different from player tokens (color/shape/size)
- [ ] **Drag-drop**: Ball responds to mouse drag events
- [ ] **Path creation**: Can add movement path to ball
- [ ] **Animation**: Ball moves along path during playback
- [ ] **Player assignment**: Ball can be assigned to player via UI
- [ ] **Assignment behavior**: Assigned ball follows player movement
- [ ] **Persistence**: Ball data saved when play is saved
- [ ] **Load**: Ball data restored when play is loaded
- [ ] **Single instance**: Only one ball allowed on field
- [ ] **Field boundaries**: Ball constrained to valid field area

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Play data includes ball | Browser DevTools → IndexedDB → plays table | Ball object present in play data |
| Ball schema valid | Check stored ball object | Contains position, path, assignment fields |

### Performance Checks
- [ ] Ball rendering doesn't cause frame drops
- [ ] Ball animation smooth at 60fps
- [ ] Drag-drop responsive (no lag)
- [ ] No memory leaks during path animation

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (ball visible and functional)
- [ ] Database state verified (ball data persists correctly)
- [ ] No regressions in existing player functionality
- [ ] Code follows established patterns (Three.js, Zustand, TypeScript)
- [ ] No console errors or warnings
- [ ] Performance acceptable (smooth animations, responsive drag)
- [ ] Visual design matches specifications (distinct from players)
- [ ] Documentation updated (if needed for ball entity)

## Implementation Strategy

### Phase 1: Core Ball Entity
1. Define ball type in type definitions
2. Add ball state to Zustand store
3. Create basic ball component (Three.js mesh)
4. Render ball on field (static position first)

### Phase 2: Positioning
1. Extend drag-drop system for ball
2. Add ball position updates to store
3. Test ball placement via drag-drop

### Phase 3: Movement Paths
1. Add ball path creation (reuse player path system)
2. Store ball paths in state
3. Render ball path visualization

### Phase 4: Animation
1. Integrate ball with animation playback
2. Implement ball path interpolation
3. Test ball animation timing

### Phase 5: Player Assignment
1. Add ball-to-player assignment state
2. Create assignment UI controls
3. Override ball position when assigned (follow player)
4. Test assignment during animation

### Phase 6: Persistence & Polish
1. Add ball to play serialization
2. Test save/load with ball data
3. Refine visual appearance
4. Add validation (single ball, boundaries)
5. Final QA testing

## Technical Debt and Future Enhancements

### Known Limitations
- Initial implementation supports single ball only
- Ball transfer between players requires manual assignment
- No physics simulation (simple path following)

### Future Improvements
- Automatic ball possession tracking
- Ball transfer animations (arc/trajectory)
- Multiple ball support (for practice scenarios)
- Ball physics (bounce, spin, trajectory)
- Ball interaction events (kick, handball, mark)
