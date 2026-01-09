# AFL Coaching Board

A modern 3D coaching board application for Australian Football that allows coaches to recreate game scenarios with full camera control, position players, create videos, save playbooks, and add annotations.

## Features

- **3D Visualization**: Realistic Australian Football field with 36 players (18 per team)
- **Camera Controls**: Full camera control with zoom, pan, and rotation. Preset views (top-down, sideline, end-to-end)
- **Player Management**: Drag and drop players anywhere on the field
- **Video Recording**: Record scenarios and export as MP4
- **Playbook Management**: Save and load scenarios with IndexedDB storage
- **Annotations**: Draw lines, arrows, circles, rectangles, and text on the field

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Position Players**: Click and drag players on the field
2. **Camera Controls**: Use mouse to rotate, scroll to zoom, right-click to pan
3. **Preset Views**: Use toolbar buttons for quick camera positions
4. **Record Video**: Click "Start Recording" to capture your scenario
5. **Save Playbook**: Save current player positions and camera angle
6. **Add Annotations**: Select annotation tool and draw on the field

## Technology Stack

- React 18 + TypeScript
- Three.js + React Three Fiber
- Zustand (state management)
- Dexie.js (IndexedDB)
- Tailwind CSS
- Vite

## Browser Compatibility

Requires modern browser with:
- WebGL support
- MediaRecorder API
- IndexedDB support

## License

MIT
