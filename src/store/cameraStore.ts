import { create } from 'zustand';

interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;

  // POV mode state
  povMode: boolean;
  povPlayerId: string | null;
  povHeight: number;
  povDistance: number;

  // Actions
  setCameraPosition: (position: [number, number, number]) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  setZoom: (zoom: number) => void;
  resetCamera: () => void;
  focusOnPlayer: (position: [number, number, number]) => void;
  setPresetView: (view: 'top' | 'sideline' | 'end-to-end') => void;

  // POV mode actions
  enablePOV: (playerId: string) => void;
  disablePOV: () => void;
  setPOVSettings: (height: number, distance: number) => void;

  // Pinch-to-zoom action
  applyPinchZoom: (zoomFactor: number, initialZoom: number) => void;

  // Two-finger pan action
  applyTwoFingerPan: (
    panDelta: { x: number; y: number },
    initialPosition: [number, number, number],
    initialTarget: [number, number, number]
  ) => void;
}

const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 100, 150];
const DEFAULT_TARGET: [number, number, number] = [0, 0, 0];
const DEFAULT_ZOOM = 1;

// Zoom constraints for pinch-to-zoom
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;

// POV mode defaults
const DEFAULT_POV_HEIGHT = 3;
const DEFAULT_POV_DISTANCE = 10;

export const useCameraStore = create<CameraState>((set) => ({
  position: DEFAULT_CAMERA_POSITION,
  target: DEFAULT_TARGET,
  zoom: DEFAULT_ZOOM,

  // POV mode state
  povMode: false,
  povPlayerId: null,
  povHeight: DEFAULT_POV_HEIGHT,
  povDistance: DEFAULT_POV_DISTANCE,

  setCameraPosition: (position) => {
    set({ position });
  },

  setCameraTarget: (target) => {
    set({ target });
  },

  setZoom: (zoom) => {
    set({ zoom });
  },

  resetCamera: () => {
    set({
      position: DEFAULT_CAMERA_POSITION,
      target: DEFAULT_TARGET,
      zoom: DEFAULT_ZOOM,
      povMode: false,
      povPlayerId: null,
    });
  },

  focusOnPlayer: (playerPosition) => {
    const [x, y, z] = playerPosition;
    set({
      target: [x, y, z],
      position: [x + 20, 30, z + 30],
    });
  },

  setPresetView: (view) => {
    switch (view) {
      case 'top':
        set({
          position: [0, 200, 0],
          target: [0, 0, 0],
          zoom: 1,
          povMode: false,
          povPlayerId: null,
        });
        break;
      case 'sideline':
        set({
          position: [0, 50, 150],
          target: [0, 0, 0],
          zoom: 1,
          povMode: false,
          povPlayerId: null,
        });
        break;
      case 'end-to-end':
        set({
          position: [150, 50, 0],
          target: [0, 0, 0],
          zoom: 1,
          povMode: false,
          povPlayerId: null,
        });
        break;
    }
  },

  // POV mode actions
  enablePOV: (playerId) => {
    set({
      povMode: true,
      povPlayerId: playerId,
    });
  },

  disablePOV: () => {
    set({
      povMode: false,
      povPlayerId: null,
    });
  },

  setPOVSettings: (height, distance) => {
    set({
      povHeight: height,
      povDistance: distance,
    });
  },

  applyPinchZoom: (zoomFactor, initialZoom) => {
    // Calculate new zoom from initial zoom and pinch factor
    const newZoom = initialZoom * zoomFactor;
    // Clamp zoom within bounds
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    set({ zoom: clampedZoom });
  },

  applyTwoFingerPan: (panDelta, initialPosition, initialTarget) => {
    // Convert screen delta to world space movement
    // Scale factor converts screen pixels to world units
    // Negative values because dragging right should move camera left (view moves right)
    const panScale = 0.5;
    const worldDeltaX = -panDelta.x * panScale;
    const worldDeltaZ = -panDelta.y * panScale;

    // Apply pan to both position and target to maintain camera orientation
    const newPosition: [number, number, number] = [
      initialPosition[0] + worldDeltaX,
      initialPosition[1], // Keep Y unchanged for horizontal panning
      initialPosition[2] + worldDeltaZ,
    ];

    const newTarget: [number, number, number] = [
      initialTarget[0] + worldDeltaX,
      initialTarget[1], // Keep Y unchanged
      initialTarget[2] + worldDeltaZ,
    ];

    set({ position: newPosition, target: newTarget });
  },
}));
