# Video Import Overlay

## Overview
This feature enables coaches and analysts to import actual game footage as a background layer within the 3D tactical planning scene. Users can position 3D player models over real video frames to analyze actual plays or diagram counter-strategies, effectively bridging the gap between video analysis tools (Hudl, Coach's Eye) and tactical planning software. This transformative capability allows tactical overlays on real footage for advanced coaching workflows.

**Note**: Research phase was skipped in the spec creation pipeline. This specification was developed based on codebase analysis and existing patterns rather than validated external research. Technical decisions should be validated during implementation, particularly regarding browser API compatibility (requestVideoFrameCallback, MediaRecorder) and video processing approaches. Also note that there has been significant work done so for so build upon what has been built in the main project directory to date including field models, camera control, player movement, ball movement and formations so do not modify these features!


## Workflow Type

**Type**: feature

**Rationale**: This is a new, highly complex feature that adds video import, playback, timeline control, 3D-to-video perspective matching, and video export capabilities. It represents a major architectural addition rather than a modification of existing functionality.

## Task Scope

### Services Involved
- **main** (primary) - React/Three.js frontend application that will handle video import, 3D overlay rendering, timeline controls, and export functionality

### This Task Will:
- [ ] Import video files and render them as background layer in the 3D scene
- [ ] Implement video timeline scrubbing with frame-accurate playback control
- [ ] Enable positioning of 3D player models over video frames with proper depth ordering
- [ ] Provide perspective matching tools to align 3D field geometry with video camera angle
- [ ] Export combined 3D overlay + video view as a new video file

### Out of Scope:
- Automatic computer vision-based perspective calibration (initial version will use manual calibration)
- Live video streaming integration
- Multi-camera angle synchronization
- Advanced video editing features (trimming, effects, transitions)
- Cloud-based video storage or processing

## Service Context

### main

**Tech Stack:**
- Language: TypeScript
- Framework: React
- Build Tool: Vite
- 3D Rendering: Three.js via @react-three/fiber and @react-three/drei
- State Management: Zustand
- Database: Dexie (IndexedDB wrapper)
- Styling: Tailwind CSS
- Animation: Framer Motion

**Entry Point:** `src/App.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

**Key Dependencies:**
- `three` - Core 3D rendering engine
- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Useful helpers for react-three-fiber
- `zustand` - State management
- `dexie` - IndexedDB database for local storage

## Files to Modify

**Note**: Existing codebase structure organizes components as `src/components/Scene/` (3D scene components), `src/components/UI/` (interface components), and `src/components/Layout/` (layout components). The new `VideoImport/` directory follows this pattern as a feature-specific namespace.

| File | Service | What to Change |
|------|---------|---------------|
| `src/App.tsx` | main | Add routing or conditional rendering for video import feature |
| `src/store/*.ts` | main | Create/update Zustand store for video state (file, playback time, perspective settings) |
| New: `src/components/VideoImport/VideoPlayer.tsx` | main | Create video player component with timeline scrubbing |
| New: `src/components/VideoImport/VideoCanvas.tsx` | main | Create Three.js canvas with video as background texture |
| New: `src/components/VideoImport/PerspectiveCalibration.tsx` | main | Create UI for field-to-video perspective matching |
| New: `src/components/VideoImport/VideoExporter.tsx` | main | Create video export functionality using MediaRecorder or canvas streaming |
| New: `src/hooks/useVideoPlayback.ts` | main | Create hook for video playback state and controls |
| New: `src/hooks/useVideoExport.ts` | main | Create hook for video export logic |
| New: `src/utils/videoUtils.ts` | main | Utility functions for video processing and frame extraction |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `src/App.tsx` | React component structure, routing patterns, and application layout |
| Existing `src/store/*.ts` files | Zustand store patterns for state management (playerStore, playbookStore, annotationStore, cameraStore) |
| Existing `src/components/**/*.tsx` | Component composition, TypeScript typing, and Tailwind styling patterns |
| Existing Three.js scene components | React-three-fiber canvas setup, camera controls, and 3D object management |

## Patterns to Follow

### Zustand Store Pattern

From existing store files in `src/stores/`:

```typescript
import { create } from 'zustand';

interface VideoStore {
  videoFile: File | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  perspectiveSettings: PerspectiveSettings;

  setVideoFile: (file: File | null) => void;
  setCurrentTime: (time: number) => void;
  togglePlayback: () => void;
  updatePerspectiveSettings: (settings: Partial<PerspectiveSettings>) => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  videoFile: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  perspectiveSettings: defaultPerspectiveSettings,

  setVideoFile: (file) => set({ videoFile: file }),
  setCurrentTime: (time) => set({ currentTime: time }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  updatePerspectiveSettings: (settings) =>
    set((state) => ({
      perspectiveSettings: { ...state.perspectiveSettings, ...settings }
    })),
}));
```

**Key Points:**
- Use TypeScript interfaces for type safety
- Keep state flat and normalized
- Provide action methods for all state mutations
- Follow immutability patterns in state updates

### Dexie Database Pattern

From existing `src/store/playbookStore.ts`:

```typescript
import Dexie, { Table } from 'dexie';

interface VideoMetadata {
  id?: number;
  fileName: string;
  duration: number;
  createdAt: Date;
  perspectiveSettings: PerspectiveSettings;
}

class VideoDatabase extends Dexie {
  videos!: Table<VideoMetadata>;

  constructor() {
    super('VideoImportDB');
    this.version(1).stores({
      videos: '++id, fileName, createdAt',
    });
  }
}

const videoDb = new VideoDatabase();

// Usage in Zustand store:
export const useVideoStore = create<VideoStore>((set) => ({
  // ... state ...

  saveVideoMetadata: async (metadata: Omit<VideoMetadata, 'id' | 'createdAt'>) => {
    try {
      const record = { ...metadata, createdAt: new Date() };
      const id = await videoDb.videos.add(record);
      return id;
    } catch (error) {
      console.error('Error saving video metadata:', error);
      throw error;
    }
  },
}));
```

**Key Points:**
- Extend Dexie class to define database schema
- Use Table type with TypeScript interfaces
- Define version and stores with indexed fields (++id for auto-increment)
- Use async/await for all database operations
- Handle errors appropriately in try/catch blocks

### React-Three-Fiber Canvas Pattern

From existing 3D scene components:

```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

function VideoCanvas({ videoTexture }: { videoTexture: THREE.VideoTexture }) {
  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 10, 15]} />
      <OrbitControls />

      {/* Video background plane */}
      <mesh position={[0, 0, -5]}>
        <planeGeometry args={[16, 9]} />
        <meshBasicMaterial map={videoTexture} />
      </mesh>

      {/* 3D player models on top */}
      <PlayerModels />

      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
    </Canvas>
  );
}
```

**Key Points:**
- Use Canvas component as root for Three.js scene
- Leverage @react-three/drei helpers (OrbitControls, PerspectiveCamera)
- Manage video as Three.js VideoTexture for efficient rendering
- Layer 3D objects in front of video background using position/depth

### Component Structure Pattern

From existing React components:

```typescript
interface ComponentProps {
  // Props typed with TypeScript
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Zustand store hooks
  const storeValue = useStore((state) => state.value);

  // Local state with useState
  const [localState, setLocalState] = useState(initialValue);

  // Effects
  useEffect(() => {
    // Side effects
  }, [dependencies]);

  // Event handlers
  const handleEvent = () => {
    // Logic
  };

  return (
    <div className="tailwind-classes">
      {/* JSX */}
    </div>
  );
}
```

**Key Points:**
- Explicitly type all props with interfaces
- Use Zustand for global state, useState for component-local state
- Name event handlers with `handle` prefix
- Use Tailwind CSS for styling

## Requirements

### Functional Requirements

1. **Video File Import**
   - Description: Allow users to select and import video files (MP4, WebM) from their local filesystem
   - Acceptance: File input dialog opens, video loads successfully, and displays in the scene

2. **Video Timeline Scrubbing**
   - Description: Provide timeline UI with playback controls (play/pause) and scrubbing capability for frame-accurate navigation
   - Acceptance: User can drag timeline slider to any point, video seeks to that frame, play/pause buttons work correctly

3. **3D Player Overlay Positioning**
   - Description: Enable positioning of 3D player models over video frames with proper depth ordering (3D in front of video)
   - Acceptance: 3D players render on top of video background, can be moved/positioned, and maintain proper layering

4. **Field Perspective Matching**
   - Description: Provide tools to calibrate 3D field perspective to match video camera angle (rotation, position, field of view)
   - Acceptance: User can adjust perspective parameters, 3D field lines align with video field markings

5. **Combined Video Export**
   - Description: Export the combined 3D overlay + video view as a new video file with matched timing
   - Acceptance: Export button generates downloadable video file showing 3D overlays synchronized with original footage

### Edge Cases

1. **Large Video Files** - Handle videos >100MB with streaming approach to avoid memory issues; show loading indicator for initial processing
2. **Unsupported Video Codecs** - Detect unsupported formats, show error message with list of supported formats (MP4/H.264, WebM/VP9)
3. **Browser Compatibility** - MediaRecorder API may not be available in all browsers; provide fallback message or alternative export method
4. **Video Aspect Ratio Mismatch** - Handle videos with non-standard aspect ratios by letterboxing or pillarboxing to prevent distortion
5. **Playback Performance** - If rendering 3D + video causes frame drops, reduce 3D quality or resolution during playback
6. **Export Duration Limits** - Very long videos may hit browser memory limits during export; chunk export process or limit to reasonable durations (e.g., 5 minutes for 1080p resolution based on typical browser memory constraints of ~2GB for tab processes)

## Implementation Notes

### DO
- Use HTML5 `<video>` element with `requestVideoFrameCallback` for frame-accurate synchronization (with fallback to `requestAnimationFrame` for browsers without support - primarily Firefox and Safari)
- Create Three.js VideoTexture from the video element for efficient GPU rendering
- Store video metadata and perspective settings in Dexie database for persistence across sessions
- Use MediaRecorder API with canvas.captureStream() for video export
- Implement loading states and progress indicators for long operations (import, export)
- Add keyboard shortcuts for playback control (spacebar = play/pause, arrow keys = frame step)
- Validate video file types and sizes before processing
- Use existing Tailwind CSS classes and design system for UI consistency

### DON'T
- Don't load entire video into memory as data URL; stream from File/Blob object
- Don't block the main thread during video processing; use requestAnimationFrame for smooth playback
- Don't hard-code perspective settings; make them user-adjustable and persistent
- Don't create new state management patterns; use existing Zustand store approach
- Don't bypass TypeScript type checking; maintain strict type safety
- Don't create custom video codecs or processing; rely on browser-native capabilities

## Development Environment

### Start Services

```bash
# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

### Service URLs
- main: http://localhost:3000

### Required Environment Variables
No additional environment variables required for this feature. All processing happens client-side in the browser.

## Success Criteria

The task is complete when:

1. [ ] User can import a video file (MP4 or WebM) which displays as background in the 3D scene
2. [ ] Timeline control allows scrubbing through video with play/pause functionality
3. [ ] 3D player models can be positioned and render correctly over the video background
4. [ ] Perspective calibration UI allows matching 3D field geometry to video camera angle
5. [ ] Export functionality generates a downloadable video file combining 3D overlays with original footage
6. [ ] No console errors during normal operation
7. [ ] Existing tests still pass (if applicable)
8. [ ] Video playback is smooth (30+ fps) with 3D overlay rendering
9. [ ] Perspective settings persist across browser sessions

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Video store state management | `src/stores/__tests__/videoStore.test.ts` | State updates correctly for file selection, playback control, and perspective changes |
| Video utility functions | `src/utils/__tests__/videoUtils.test.ts` | Frame extraction, time formatting, and file validation work correctly |
| useVideoPlayback hook | `src/hooks/__tests__/useVideoPlayback.test.ts` | Hook manages video element lifecycle and playback state correctly |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Video texture integration with Three.js | main | VideoTexture updates correctly as video plays; 3D scene renders with video background |
| Perspective calibration | main | Adjusting perspective settings updates camera/field position in real-time |
| Export pipeline | main | MediaRecorder captures combined canvas output with audio sync |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Full Video Import Workflow | 1. Click import button 2. Select video file 3. Video loads and displays | Video appears as background, timeline reflects duration, playback controls are active |
| Playback and Scrubbing | 1. Play video 2. Pause video 3. Scrub timeline 4. Play again | Video plays smoothly, pauses on command, seeks to scrubbed position accurately |
| 3D Overlay Positioning | 1. Import video 2. Add 3D player model 3. Position over video 4. Rotate camera | 3D player stays positioned relative to field, renders in front of video |
| Perspective Calibration | 1. Import field video 2. Open calibration panel 3. Adjust parameters 4. Verify alignment | 3D field lines visually align with video field markings |
| Video Export | 1. Import video with 3D overlay 2. Click export 3. Wait for processing 4. Download file | Downloaded video file plays with 3D overlays correctly synchronized |

### Browser Verification (Frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Video Import UI | `http://localhost:3000` (video import page/modal) | File input works, supports drag-and-drop, shows file name after selection |
| Video Player | `http://localhost:3000` (video player component) | Video displays correctly, timeline scrubbing is responsive, play/pause works |
| Perspective Calibration Panel | `http://localhost:3000` (calibration UI) | Sliders/inputs adjust perspective in real-time, reset button works |
| Export UI | `http://localhost:3000` (export dialog) | Export progress indicator shows, download triggers automatically on completion |

### Performance Verification
| Check | Method | Expected |
|-------|--------|----------|
| Playback Frame Rate | Browser DevTools Performance tab during video playback | Maintain 30+ fps with 3D overlay rendering |
| Memory Usage | Browser DevTools Memory profiler with 500MB video | Memory stays under 1GB, no memory leaks over 5 minutes |
| Video Load Time | Network tab, measure video file import | Large videos (>100MB) show loading indicator, load within 10 seconds |
| Export Time | Measure duration from export start to download | Export time ≤ 2x video duration for 1080p content |

### Database Verification
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Perspective Settings Persistence | Open DevTools → Application → IndexedDB → Dexie database | Perspective settings object stored correctly |
| Video Metadata Storage | Query Dexie for video records | Video file reference, duration, and timestamp stored |

### QA Sign-off Requirements
- [ ] All unit tests pass (if implemented)
- [ ] Integration tests verify video-3D rendering pipeline
- [ ] All E2E test flows complete successfully
- [ ] Browser verification complete across Chrome, Firefox, Safari (if applicable)
- [ ] Performance metrics meet specified thresholds
- [ ] Database correctly persists video and perspective settings
- [ ] No regressions in existing 3D scene functionality
- [ ] Code follows established patterns (React, Zustand, TypeScript, Tailwind)
- [ ] No security vulnerabilities introduced (e.g., XSS via video metadata)
- [ ] Video export produces playable files with correct overlay synchronization
- [ ] Accessibility considerations addressed (keyboard controls, ARIA labels)
- [ ] Error handling verified for edge cases (unsupported formats, large files, export failures)

## Technical Architecture

### Component Hierarchy
```
App.tsx
└── VideoImportFeature/
    ├── VideoUploader
    ├── VideoWorkspace
    │   ├── VideoCanvas (Three.js scene)
    │   │   ├── VideoBackgroundPlane
    │   │   ├── FieldGeometry
    │   │   └── PlayerModels
    │   ├── VideoTimeline
    │   └── PlaybackControls
    ├── PerspectiveCalibration
    └── VideoExporter
```

### State Management
```typescript
// Video Store (Zustand)
{
  videoFile: File | null,
  videoElement: HTMLVideoElement | null,
  currentTime: number,
  duration: number,
  isPlaying: boolean,
  playbackRate: number,
  perspective: {
    cameraPosition: [x, y, z],
    cameraRotation: [x, y, z],
    fieldOfView: number,
    fieldScale: number
  },
  exportSettings: {
    resolution: '1080p' | '720p',
    format: 'mp4' | 'webm',
    quality: number
  }
}
```

### Data Flow
1. **Import**: User selects video → File stored in state → Video element created → VideoTexture generated
2. **Playback**: User controls timeline → State updates currentTime → Video seeks → VideoTexture updates → Canvas re-renders
3. **Calibration**: User adjusts perspective → State updates camera/field settings → Three.js camera updates → Scene re-renders
4. **Export**: User clicks export → Canvas.captureStream() → MediaRecorder encodes → Blob generated → Download triggered

## Dependencies to Add

**Note**: All required dependencies (zustand, dexie, @react-three/fiber, @react-three/drei, three) are already installed in package.json. No additional packages are required for initial implementation.

**Optional packages only if needed**:
- `video.js` - Only if browser-native HTML5 video controls prove insufficient (unlikely for this use case)
- `recordrtc` - Only if MediaRecorder API lacks browser support in testing (unlikely; widely supported in modern browsers)

Both optional packages should only be added if specific browser compatibility issues are discovered during implementation and testing.

## Security Considerations

- **File Upload Validation**: Verify file type and size client-side before processing
- **XSS Prevention**: Sanitize any video metadata displayed in UI
- **Memory Safety**: Implement cleanup/disposal of video elements and textures on unmount
- **CORS**: Ensure video files are loaded from same origin or with proper CORS headers if from external sources

## Accessibility Considerations

- Video player controls must be keyboard accessible
- Provide ARIA labels for all interactive elements
- Include skip-ahead/skip-back functionality for keyboard users
- Ensure sufficient color contrast for UI elements over video
- Provide text alternatives for visual calibration feedback

## Future Enhancements (Out of Scope)

- Automatic perspective calibration using computer vision (field line detection)
- Multi-camera angle synchronization
- Cloud storage integration for large video files
- Collaborative annotation/sharing of overlaid videos
- Real-time video streaming integration
- Advanced video editing (trimming, speed adjustment, filters)
