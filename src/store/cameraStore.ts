import { create } from 'zustand';
import { presetCameraPose, type CameraPreset } from '../utils/cameraMath';
import type { Boundary } from '../utils/fieldGeometry';

interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;

  // POV mode state
  povPlayer1Id: string | null;
  povPlayer2Id: string | null;
  activePovSlot: 1 | 2 | null;
  povHeight: number;
  povDistance: number;

  // Actions
  setCameraPosition: (position: [number, number, number]) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  setZoom: (zoom: number) => void;
  resetCamera: () => void;
  focusOnPlayer: (position: [number, number, number]) => void;
  /**
   * Frame the ground from one of the three fixed viewpoints. The Boundary is passed
   * in rather than read here: the camera store has no business resolving which Venue
   * is active, and an explicit parameter means the compiler names every caller if
   * that ever changes again.
   */
  setPresetView: (view: CameraPreset, boundary: Boundary) => void;

  // POV mode actions
  setPovPlayer: (slot: 1 | 2, playerId: string) => void;
  clearPov: (slot: 1 | 2) => void;
  setActivePovSlot: (slot: 1 | 2 | null) => void;
  switchToBroadcast: () => void;
  setPOVSettings: (height: number, distance: number) => void;
  setPOVDistance: (distance: number) => void;

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

// POV mode defaults and constraints
const DEFAULT_POV_HEIGHT = 3;
const DEFAULT_POV_DISTANCE = 10;
export const MIN_POV_DISTANCE = 3;
export const MAX_POV_DISTANCE = 40;

export const useCameraStore = create<CameraState>((set, get) => ({
  position: DEFAULT_CAMERA_POSITION,
  target: DEFAULT_TARGET,
  zoom: DEFAULT_ZOOM,

  // POV mode state
  povPlayer1Id: null,
  povPlayer2Id: null,
  activePovSlot: null,
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
      activePovSlot: null,
    });
  },

  focusOnPlayer: (playerPosition) => {
    const [x, y, z] = playerPosition;
    set({
      target: [x, y, z],
      position: [x + 20, 30, z + 30],
    });
  },

  setPresetView: (view, boundary) => {
    const { position, target } = presetCameraPose(view, boundary);
    set({ position, target, zoom: 1, activePovSlot: null });
  },

  // POV mode actions
  setPovPlayer: (slot, playerId) => {
    if (slot === 1) set({ povPlayer1Id: playerId, activePovSlot: 1 });
    else set({ povPlayer2Id: playerId, activePovSlot: 2 });
  },

  clearPov: (slot) => {
    const clearSlot1 = slot === 1;
    const isActive = get().activePovSlot === slot;
    set({
      ...(clearSlot1 ? { povPlayer1Id: null } : { povPlayer2Id: null }),
      ...(isActive ? { activePovSlot: null } : {}),
    });
  },

  setActivePovSlot: (slot) => set({ activePovSlot: slot }),

  switchToBroadcast: () => set({ activePovSlot: null }),

  setPOVSettings: (height, distance) => {
    set({
      povHeight: height,
      povDistance: distance,
    });
  },

  setPOVDistance: (distance) => {
    const clamped = Math.max(MIN_POV_DISTANCE, Math.min(MAX_POV_DISTANCE, distance));
    set({ povDistance: clamped });
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
