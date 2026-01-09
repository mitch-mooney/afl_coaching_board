import { create } from 'zustand';
import * as THREE from 'three';

interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
  
  // Actions
  setCameraPosition: (position: [number, number, number]) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  setZoom: (zoom: number) => void;
  resetCamera: () => void;
  focusOnPlayer: (position: [number, number, number]) => void;
  setPresetView: (view: 'top' | 'sideline' | 'end-to-end') => void;
}

const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 100, 150];
const DEFAULT_TARGET: [number, number, number] = [0, 0, 0];
const DEFAULT_ZOOM = 1;

export const useCameraStore = create<CameraState>((set) => ({
  position: DEFAULT_CAMERA_POSITION,
  target: DEFAULT_TARGET,
  zoom: DEFAULT_ZOOM,
  
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
        });
        break;
      case 'sideline':
        set({
          position: [0, 50, 150],
          target: [0, 0, 0],
          zoom: 1,
        });
        break;
      case 'end-to-end':
        set({
          position: [150, 50, 0],
          target: [0, 0, 0],
          zoom: 1,
        });
        break;
    }
  },
}));
