# AFL Coaching Board - Feature Implementation Plan

## Overview
This document outlines the implementation plan for two key features:
1. **8-bit Player Leg Animations** - Players' legs move when running
2. **Ball Trajectory System** - Synchronized ball movement with kick types and landing bounce

---

## Feature 1: 8-bit Player Leg Animations

### Design Specifications

#### Animation Behavior
- **Trigger**: Only animate when movement speed > 0.2 threshold
- **Speed Range**:
  - Speed < 0.2: Static legs (resting position)
  - Speed 0.2-0.6: Slow leg swing (walk/jog)
  - Speed 0.6-1.0: Fast leg swing (sprint)
- **Deceleration**: Smooth fade to static over 300ms

#### Visual Style
- **Leg Movement**: Combined swing + lateral (Option B - more natural, still 8-bit)
- **Left/Right Legs**: 180° out of phase (alternating)
- **Speed Scaling**: Animation frequency scales with movement speed

#### Technical Constants
```typescript
const LEG_AMPITUDE = 0.4;        // Radians (~23°) leg swing amplitude
const KNEE_AMPITUDE = 0.3;       // Radians (~17°) knee bend amplitude
const BASE_FREQUENCY = 8;         // Radians per second base frequency
const SPEED_THRESHOLD = 0.2;      // Minimum speed to trigger animation
const DECAY_TIME = 300;           // ms to fade to static after stopping
```

#### Leg Architecture
```
Player Group
  ├─ Torso (static)
  ├─ Head (static)
  ├─ Arms (static)
  ├─ Left Leg
  │   └─ Hip Pivot
  │       ├─ Thigh Mesh (rotates ~0.4 rad)
  │       └─ Knee Pivot
  │           ├─ Shin Mesh (rotates ~0.3 rad)
  │           └─ Shoe Mesh
  └─ Right Leg
      └─ Hip Pivot
          ├─ Thigh Mesh (rotates ~0.4 rad, 180° offset)
          └─ Knee Pivot
              ├─ Shin Mesh (rotates ~0.3 rad)
              └─ Shoe Mesh
```

#### Animation Formula
```typescript
// Each frame in useFrame hook
const shouldAnimate = moveSpeed > SPEED_THRESHOLD;
const timeMultiplier = shouldAnimate ? 1 + (moveSpeed * 0.5) : 1;
const time = globalTime * BASE_FREQUENCY * timeMultiplier;

// Left leg (phase = 0)
const leftThighAngle = Math.sin(time) * LEG_AMPITUDE;
const leftKneeAngle = Math.sin(time) * KNEE_AMPITUDE;

// Right leg (phase = π)
const rightThighAngle = Math.sin(time + Math.PI) * LEG_AMPITUDE;
const rightKneeAngle = Math.sin(time + Math.PI) * KNEE_AMPITUDE;
```

#### Store Integration
- **playerStore**: Add `playerMoveState` map `Map<playerId, {isMoving: boolean, speed: number, lastMoveTime: number}>`
- **useAnimationPlayback**: Calculate speed from path distance/duration, broadcast to players
- **Player.tsx**: Subscribe to move state, apply rotations in useFrame

---

## Feature 2: Ball Trajectory System

### Design Specifications

#### Ball Modes
1. **Assigned**: Ball follows player position (existing behavior)
2. **In-Flight**: Ball animates along trajectory with kick type
3. **Idle**: Ball static at position (newly landed or manually placed)

#### Kick Types
```typescript
type KickType = 'standard' | 'high' | 'low' | 'checkside' | 'handball';

const KICK_PRESETS: Record<KickType, {
  apexHeight: number;           // Y-axis peak height (meters)
  curveDeviation: number;       // Lateral curve (meters)
  durationMultiplier: number;   // Duration scaling
}> = {
  standard:    { apexHeight: 3,   curveDeviation: 0, durationMultiplier: 1.0 },
  high:        { apexHeight: 5,   curveDeviation: 0, durationMultiplier: 1.2 },
  low:         { apexHeight: 1,   curveDeviation: 0, durationMultiplier: 0.8 },
  checkside:   { apexHeight: 2.5, curveDeviation: 2, durationMultiplier: 1.1 },
  handball:    { apexHeight: 1.5, curveDeviation: 0, durationMultiplier: 0.6 }
};
```

#### Trajectory Generation
- **Keyframes**: 3-point trajectory (start, apex, end)
- **Apex Position**: Midpoint X/Z + lateral curve, apexHeight Y
- **Interpolation**: Parabolic Y curve via `sin(progress * π)`
- **Rotation**: Ball aligns to path tangent (Option A - realistic AFL)

#### Bounce Animation
```typescript
// Single squash at landing (last 20% of trajectory)
const bouncePhase = calculateBouncePhase(progress);  // 0-1 during landing
const squashY = 1 - (0.2 * bouncePhase);            // Compress to 80%
const stretchY = 1 + (0.15 * bouncePhase);          // Stretch to 115%

// Optional tiny secondary bounce (20% amplitude)
if (bouncePhase > 0.8) {
  const secondaryBounce = Math.sin((bouncePhase - 0.8) * 20) * 0.04;
  squashY -= secondaryBounce;
}
```

#### Data Model Changes
```typescript
// EventModel.ts extension
interface BallPathConfig {
  pathId: string;
  startTimeOffset: number;
  kickType: KickType;          // User-selected kick type
}

// Union type for event paths
type EntityPathConfig = PlayerPathConfig | BallPathConfig;

interface AnimationEvent {
  // ... existing fields
  playerPaths: EntityPathConfig[];  // Renamed for clarity
}

// ballStore state extensions
interface BallState {
  // ... existing fields
  mode: 'assigned' | 'in-flight' | 'idle';
  currentPathId: string | null;
  currentKickType: KickType | null;
}
```

#### UI Workflow
1. User opens EventEditor for active event
2. User clicks "Add Ball Movement" button
3. User selects ball start position (defaults to current ball location)
4. User selects end position (drag or click target on field)
5. User selects kick type from dropdown
6. System auto-calculates duration (default) or user adjusts
7. User adjusts start time offset for phase synchronization
8. User previews trajectory (dashed arc line in 3D view)
9. User saves to event → Ball path stored with player paths
10. During playback, ball follows synchronized trajectory

---

## Implementation Order

### Phase 1: Foundation (1-2 hours)
**Files to Modify**:
- `src/models/EventModel.ts` - Add `KickType`, `BallPathConfig`, `EntityPathConfig`
- `src/store/pathStore.ts` - Ensure dual entity type support
- `src/store/ballStore.ts` - Add ball mode state

**Why First**: Ball system depends on these types; leg animation can proceed independently in parallel

### Phase 2: Player Leg Animations (2-3 hours)
**Files to Modify**:
- `src/components/Scene/Player.tsx` - Extract legs into subcomponents, add animation
- `src/store/playerStore.ts` - Add `playerMoveState` map and speed tracking actions
- `src/hooks/useAnimationPlayback.ts` - Calculate player movement speeds

**Dependencies**: None (can run in parallel with Phase 1)

### Phase 3: Ball Trajectory System (2-3 hours)
**Files to Create/Modify**:
- `src/utils/trajectoryGeneration.ts` (NEW) - Generate keyframes for kick types
- `src/components/Scene/Ball.tsx` - Handle all three ball modes with bounce
- `src/store/ballStore.ts` - Add mode transition actions and current path tracking

**Dependencies**: Phase 1 (EventModel types, ballStore structure)

### Phase 4: UI Integration (2-3 hours)
**Files to Modify**:
- `src/components/UI/EventEditor.tsx` - Add ball movement creation UI
- `src/components/UI/EventTimeline.tsx` - Show ball paths as separate row, color-coded by kick type
- `src/components/Scene/AnnotationLayer.tsx` (optional) - Draw trajectory preview arcs

**Dependencies**: Phase 3 (trajectory generation)

### Phase 5: Polish & Testing (1-2 hours)
**Tasks**:
- Fine-tune animation constants (leg speeds, bounce intensity)
- Add visual feedback during editing (trajectory preview arcs)
- Test synchronized playback (player/ball timing alignment)
- Test all kick types visually
- Performance testing with full team (22 players)

**Dependencies**: Phases 1-4 complete

---

## Technical Challenges & Solutions

### Challenge 1: Player Performance
**Issue**: 22 players each with 2 Leg subcomponents = 44 additional components
**Solution**: Test with current count first. If performance degrades:
- Use CSS3D for distant players
- Implement LOD (Level of Detail) - disable leg animation beyond 30m

### Challenge 2: Ball Trajectory Accuracy
**Issue**: Aligning ball rotation to parabolic curve
**Solution**:
- Calculate tangent vectors between interpolated points
- Use Three.js `Object3D.lookAt()` for alignment
- Pre-compute rotation quaternions during trajectory generation

### Challenge 3: Phase Synchronization
**Issue**: Player reaches kick point exactly when ball launches
**Solution**:
- Use event `startTimeOffset` for both player path and ball path
- Verify visually in EventEditor with timeline markers
- Add "snap to phase" feature in EventEditor

### Challenge 4: Bounce Timing
**Issue**: Bouncing ball looks weird if it occurs mid-trajectory
**Solution**:
- Calculate bounce to occur at last 15-20% of progress
- Apply squash/stretch via mesh scale (not position)
- Ensure bounce completes before path end

---

## Testing Checklist

### Leg Animations
- [ ] Player static at speed 0.0 - no leg movement
- [ ] Player at speed 0.1 - no leg movement (below threshold)
- [ ] Player at speed 0.3 - slow leg swing (jog)
- [ ] Player at speed 0.8 - fast leg swing (sprint)
- [ ] Player decelerating - smooth fade to static over 300ms
- [ ] Left/right legs alternate (180° out of phase)
- [ ] Leg rotation direction correct (forward/back swing)
- [ ] 22 players animating simultaneously (60fps target)

### Ball Trajectories
- [ ] Ball in "assigned" mode follows player (existing behavior preserved)
- [ ] Ball in "in-flight" mode follows trajectory correctly
- [ ] Ball lands and bounces at end of path
- [ ] All 5 kick types produce visually distinct trajectories
- [ ] Checkside kick curves laterally
- [ ] Ball rotates to align with path direction
- [ ] Handball is noticeably shorter and faster
- [ ] High ball has visible peak

### Event System Integration
- [ ] Can create ball path for existing event
- [ ] Kick type persists in saved event
- [ ] Ball path syncs to correct phase (startTimeOffset)
- [ ] Timeline shows ball row with color-coded kick type
- [ ] Can edit/update ball path after creation
- [ ] Multiple ball paths in same event work correctly

### Cross-Feature Testing
- [ ] Player runs to kick point, ball launches simultaneously
- [ ] Ball bounce timing doesn't clash with player arrival
- [ ] Playback at different speeds (0.25x, 2x) accelerates both systems
- [ ] Scrubbing timeline updates player legs and ball position correctly

---

## Files to Create

### New Files
- `src/utils/trajectoryGeneration.ts` - Ball trajectory keyframe generation

### Files to Modify
1. `src/models/EventModel.ts` - Type extensions
2. `src/store/pathStore.ts` - Entity type support
3. `src/store/ballStore.ts` - Ball mode management
4. `src/store/playerStore.ts` - Speed tracking (LEG ANIMATION)
5. `src/components/Scene/Player.tsx` - Leg subcomponents (LEG ANIMATION)
6. `src/hooks/useAnimationPlayback.ts` - Speed calculation
7. `src/components/Scene/Ball.tsx` - Trajectory animation (BALL TRAJECTORY)
8. `src/components/UI/EventEditor.tsx` - Ball path creation UI
9. `src/components/UI/EventTimeline.tsx` - Ball path display

---

## Rollback Strategy

If issues arise, roll back feature by feature:

### Rollback Player Legs
- Git revert commits modifying `Player.tsx`, `playerStore.ts`, `useAnimationPlayback.ts`
- Core functionality preserved (players still move, just static legs)

### Rollback Ball Trajectories
- Git revert commits modifying `EventModel.ts`, `ballStore.ts`, `Ball.tsx`, `EventEditor.tsx`, `EventTimeline.tsx`
- Core functionality preserved (ball still follows player, just no kick animations)

### Notes
- Both features are additive, non-destructive
- Existing paths and events remain valid (ball paths are optional)
- Speed threshold defaults to 0.2 (conservative) - can lower if needed

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Leg animation FPS | 60fps | 22 players simultaneous |
| Ball trajectory FPS | 60fps | All kicks during playback |
| EventEditor load time | <100ms | With full event data |
| Timeline smoothness | 60fps | Scrubbing at 30fps |
| Memory increase | <10MB | 22 players + trajectory data |

---

## Future Enhancements (Not in Scope)

### Potential Additions
- Multiple ball bounces (realistic physics bounce)
- Ball spin animation (rotation around long axis during flight)
- Different player animations for different positions (goal squats vs field runners)
- Jump/leap animation for mark players
- Ball handball sound effects during playback
- Player collision detection (overlapping paths)

### Implementation Priority
- **High Priority (Post-Launch)**: Multiple bounces, jump animation
- **Medium Priority**: Player collision detection
- **Low Priority**: Ball spin animation, sound effects

---

## Appendix: Constants Summary

### Player Leg Animation
```typescript
const LEG_AMPITUDE = 0.4;           // rad, hip swing
const KNEE_AMPITUDE = 0.3;          // rad, knee bend
const BASE_FREQUENCY = 8;           // rad/s
const SPEED_THRESHOLD = 0.2;        // min speed to animate
const DECAY_TIME = 300;             // ms to fade
```

### Ball Trajectory
```typescript
const BOUNCE_SQUASH = 0.20;         // 80% compression
const BOUNCE_STRETCH = 0.15;        // 115% stretch
const BOUNCE_PHASE_START = 0.80;    // bounce at last 20%
const SECONDARY_BOUNCE = 0.04;      // 4% secondary bounce
```

### Kick Type Presets
```typescript
const KICK_PRESETS = {
  standard:    { apexHeight: 3,   curveDeviation: 0, durationMultiplier: 1.0 },
  high:        { apexHeight: 5,   curveDeviation: 0, durationMultiplier: 1.2 },
  low:         { apexHeight: 1,   curveDeviation: 0, durationMultiplier: 0.8 },
  checkside:   { apexHeight: 2.5, curveDeviation: 2, durationMultiplier: 1.1 },
  handball:    { apexHeight: 1.5, curveDeviation: 0, durationMultiplier: 0.6 }
};
```

---

## Document Control

- **Created**: $(date)
- **Author**: Implementation Plan
- **Version**: 1.0
- **Status**: Ready for review
- **Next Action**: Review, approve, clear context, begin Phase 1

---

## Sign-off Checklist

Before beginning implementation, confirm:
- [ ] All design decisions reviewed and approved
- [ ] Implementation order validated
- [ ] Rollback strategy understood
- [ ] Performance targets accepted
- [ ] Testing checklist ready to execute
- [ ] No questions remaining unanswered

---

**END OF IMPLEMENTATION PLAN**
