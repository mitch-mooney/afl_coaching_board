# Ball Movement & 8-bit Player Animation - Implementation Plan

## Quick Start
This plan builds on the existing implementation plan to add ball movement animations and 8-bit player character improvements.

---

## 8-Bit Player Leg Animations

### Visual Design
- **Style**: Minecraft-style box geometry legs that swing when moving
- **Trigger**: Animate only when speed > 0.2 threshold
- **Speed Scaling**:
  - Speed < 0.2: Static legs (resting)
  - Speed 0.2-0.6: Slow swing (jog)
  - Speed 0.6-1.0: Fast swing (sprint)
  - Deceleration: Smooth fade to static over 300ms

### Technical Architecture
```
Player Group
  ├─ Torso (static mesh)
  ├─ Head (static mesh)
  ├─ Arms (static mesh)
  ├─ Left Leg Group
  │   └─ Hip Pivot (rotates ~0.4 rad)
  │       ├─ Thigh Mesh
  │       └─ Knee Pivot (rotates ~0.3 rad)
  │           └─ Shin Mesh
  └─ Right Leg Group
      └─ Hip Pivot (rotates ~0.4 rad, 180° offset)
          ├─ Thigh Mesh
          └─ Knee Pivot (rotates ~0.3 rad)
              └─ Shin Mesh
```

### Constants
```typescript
const LEG_AMPITUDE = 0.4;        // rad (~23°) leg swing
const KNEE_AMPITUDE = 0.3;       // rad (~17°) knee bend
const BASE_FREQUENCY = 8;         // rad/s base frequency
const SPEED_THRESHOLD = 0.2;      // min speed to animate
const DECAY_TIME = 300;           // ms to fade
```

### Animation Formula
```typescript
// In useFrame hook
const moveSpeed = getMoveSpeed(playerId);
const shouldAnimate = moveSpeed > SPEED_THRESHOLD;
const timeMultiplier = shouldAnimate ? 1 + (moveSpeed * 0.5) : 1;
const time = globalTime * BASE_FREQUENCY * timeMultiplier;

// Left leg (phase = 0)
leftThigh.rotation.y = Math.sin(time) * LEG_AMPITUDE;
leftKnee.rotation.y = Math.sin(time) * KNEE_AMPITUDE;

// Right leg (phase = π)
rightThigh.rotation.y = Math.sin(time + Math.PI) * LEG_AMPITUDE;
rightKnee.rotation.y = Math.sin(time + Math.PI) * KNEE_AMPITUDE;
```

### Store Changes
**playerStore.ts**:
- Add `playerMoveState: Map<playerId, {isMoving: boolean, speed: number, lastMoveTime: number}>`
- Update `updatePlayerPosition` to track movement speed

**Player.tsx**:
- Extract legs into pivot groups with joints
- Add `useFrame` to apply leg rotations based on move state

---

## Ball Trajectory System

### Ball Modes
1. **Assigned**: Ball follows player (existing)
2. **In-Flight**: Ball animates along trajectory with kick type (new)
3. **Idle**: Ball static at position (new - after landing)

### Kick Type Presets
```typescript
type KickType = 'standard' | 'high' | 'low' | 'checkside' | 'handball';

const KICK_PRESETS: Record<KickType, {
  apexHeight: number;         // Y peak (meters)
  curveDeviation: number;     // Lateral curve (meters)
  durationMultiplier: number; // Speed scaling
}> = {
  standard:    { apexHeight: 3,   curveDeviation: 0, durationMultiplier: 1.0 },
  high:        { apexHeight: 5,   curveDeviation: 0, durationMultiplier: 1.2 },
  low:         { apexHeight: 1,   curveDeviation: 0, durationMultiplier: 0.8 },
  checkside:   { apexHeight: 2.5, curveDeviation: 2, durationMultiplier: 1.1 },
  handball:    { apexHeight: 1.5, curveDeviation: 0, durationMultiplier: 0.6 }
};
```

### Trajectory Generation
- **3-point path**: Start → Apex → End
- **Apex position**: Midpoint X/Z + lateral curve, apexHeight Y
- **Interpolation**: Parabolic Y via `sin(progress * π)`
- **Rotation**: Ball aligns to path tangent

### Bounce Animation (Single Squash)
```typescript
// At last 20% of trajectory (progress > 0.8)
const bouncePhase = (progress - 0.8) / 0.2; // 0-1
const squashY = 1 - (0.20 * bouncePhase);   // Compress to 80%
const stretchY = 1 + (0.15 * bouncePhase);  // Stretch to 115%

// Optional tiny secondary bounce
if (bouncePhase > 0.8) {
  const secondary = Math.sin((bouncePhase - 0.8) * 20) * 0.04;
  squashY -= secondary;
}
```

### Data Model Extensions
**EventModel.ts**:
```typescript
interface BallPathConfig {
  pathId: string;
  startTimeOffset: number;
  kickType: KickType;
}

// Update AnimationEvent
interface AnimationEvent {
  id: string;
  // ... existing fields
  playerPaths: (PlayerPathConfig | BallPathConfig)[]; // Union type
}
```

**ballStore.ts**:
```typescript
interface BallState {
  ball: Ball | null;
  mode: 'assigned' | 'in-flight' | 'idle';
  currentPathId: string | null;
  currentKickType: KickType | null;
  // ... existing fields
}
```

### UI Workflow
1. EventEditor → "Add Ball Movement" button
2. Select start position (defaults to current ball location)
3. Select end position (drag or click target on field)
4. Select kick type from dropdown
5. Adjust duration/start time offset
6. Preview trajectory (dashed arc in 3D view)
7. Save to event → stored with player paths
8. Playback: Ball follows synchronized trajectory

---

## Implementation Phases

### Phase 1: Foundation (Parallel - 1-2 hours)
1. **EventModel.ts** - Add `KickType`, `BallPathConfig`, extend `AnimationEvent`
2. **ballStore.ts** - Add mode state, current path tracking
3. **playerStore.ts** - Add `playerMoveState` map and speed tracking

### Phase 2: Player Legs (2-3 hours)
1. **Player.tsx** - Refactor legs into pivot groups (hip/knee joints)
2. **Player.tsx** - Add `useFrame` for leg animation based on move speed
3. **playerStore.ts** - Track movement speed in `updatePlayerPosition`
4. Test with 1 player, then full team (22 players)

### Phase 3: Ball Trajectory (2-3 hours)
1. **traject oryGeneration.ts** (new) - Generate 3-point keyframes for kick types
2. **Ball.tsx** - Handle 3 ball modes (assigned/in-flight/idle)
3. **Ball.tsx** - Add trajectory animation with bounce squash/stretch
4. Test all kick types visually

### Phase 4: UI Integration (2-3 hours)
1. **EventEditor.tsx** - Ball movement creation UI
2. **EventTimeline.tsx** - Show ball rows with kick type color coding
3. **AnnotationLayer.tsx** (optional) - Trajectory preview arcs

### Phase 5: Polish (1-2 hours)
1. Fine-tune constants (leg speeds, bounce intensity)
2. Test synchronized playback
3. Performance test with full team
4. Test all kick types
5. Accessibility and responsive checks

---

## Testing Checklist

### Leg Animations
- [ ] Speed 0.0 - no leg movement
- [ ] Speed 0.1 - no leg movement (below threshold)
- [ ] Speed 0.3 - slow leg swing (jog)
- [ ] Speed 0.8 - fast leg swing (sprint)
- [ ] Deceleration - smooth fade over 300ms
- [ ] Left/right legs alternate (180° out of phase)
- [ ] 22 players animating simultaneously (60fps)

### Ball Trajectories
- [ ] Assigned mode follows player (existing behavior preserved)
- [ ] In-flight mode follows trajectory correctly
- [ ] Ball lands and bounces at end of path
- [ ] All 5 kick types visually distinct
- [ ] Checkside kick curves laterally
- [ ] Handball is shorter/faster
- [ ] High ball has visible peak
- [ ] Ball rotates to align with path

### Integration
- [ ] EventEditor ball path creation workflow
- [ ] Kick type persists in saved events
- [ ] Timeline shows ball rows color-coded by kick type
- [ ] Player runs to kick point, ball launches simultaneously
- [ ] Timeline scrubbing updates players and ball

---

## Files to Create

1. `src/utils/trajectoryGeneration.ts` - Ball trajectory keyframe generation

## Files to Modify

1. `src/models/EventModel.ts` - Add `KickType`, `BallPathConfig`
2. `src/store/ballStore.ts` - Add mode state and path tracking
3. `src/store/playerStore.ts` - Add move state tracking
4. `src/components/Scene/Player.tsx` - Leg subcomponents and animation
5. `src/components/Scene/Ball.tsx` - Trajectory modes and bounce
6. `src/components/UI/EventEditor.tsx` - Ball path creation UI
7. `src/components/UI/EventTimeline.tsx` - Ball path display

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Leg animation FPS | 60fps | 22 players simultaneous |
| Ball trajectory FPS | 60fps | All kicks during playback |
| Memory increase | <10MB | 22 players + trajectory data |

---

## Risk Mitigation

### Challenge: Performance with 22 players
**Solution**: If FPS drops below 60:
- Implement LOD (disable leg animation beyond 30m)
- Use CSS3D for distant players

### Challenge: Phase synchronization
**Solution**: Use `startTimeOffset` for both player and ball paths in EventEditor

### Challenge: Ball trajectory accuracy
**Solution**: Pre-compute rotation quaternions during trajectory generation

---

## Rollback Strategy

Both features are additive, non-destructive:
- **Rollback legs**: Revert Player.tsx, playerStore.ts changes
- **Rollback ball**: Revert EventModel.ts, ballStore.ts, Ball.tsx, EventEditor.tsx changes
- Existing paths/events remain valid (ball paths are optional)

---

**END OF IMPLEMENTATION PLAN**
