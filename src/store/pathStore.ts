import { create } from 'zustand';
import {
  MovementPath,
  Keyframe,
  PathEntityType,
  createMovementPath,
  addKeyframeToPath,
  updateKeyframeInPath,
  removeKeyframeFromPath,
} from '../models/PathModel';

interface PathState {
  paths: MovementPath[];
  selectedPathId: string | null;

  // Actions - Path CRUD
  addPath: (path: MovementPath) => void;
  createPath: (
    entityId: string,
    entityType: PathEntityType,
    startPosition: [number, number, number],
    endPosition: [number, number, number],
    duration?: number,
    startTimeOffset?: number
  ) => MovementPath;
  updatePath: (pathId: string, updates: Partial<Omit<MovementPath, 'id'>>) => void;
  removePath: (pathId: string) => void;
  clearPaths: () => void;

  // Actions - Keyframe CRUD
  addKeyframe: (pathId: string, keyframe: Keyframe) => void;
  updateKeyframe: (pathId: string, keyframeIndex: number, updates: Partial<Keyframe>) => void;
  removeKeyframe: (pathId: string, keyframeIndex: number) => void;

  // Selection
  selectPath: (pathId: string | null) => void;

  // Getters
  getPath: (pathId: string) => MovementPath | undefined;
  getPathsByEntity: (entityId: string) => MovementPath[];
  getPathByEntity: (entityId: string, entityType: PathEntityType) => MovementPath | undefined;
}

export const usePathStore = create<PathState>((set, get) => ({
  paths: [],
  selectedPathId: null,

  // Path CRUD
  addPath: (path) => {
    set((state) => ({
      paths: [...state.paths, path],
    }));
  },

  createPath: (entityId, entityType, startPosition, endPosition, duration, startTimeOffset) => {
    const newPath = createMovementPath(
      entityId,
      entityType,
      startPosition,
      endPosition,
      duration,
      undefined, // id - let the factory generate it
      startTimeOffset
    );
    get().addPath(newPath);
    return newPath;
  },

  updatePath: (pathId, updates) => {
    set((state) => ({
      paths: state.paths.map((path) =>
        path.id === pathId ? { ...path, ...updates } : path
      ),
    }));
  },

  removePath: (pathId) => {
    set((state) => ({
      paths: state.paths.filter((path) => path.id !== pathId),
      selectedPathId: state.selectedPathId === pathId ? null : state.selectedPathId,
    }));
  },

  clearPaths: () => {
    set({ paths: [], selectedPathId: null });
  },

  // Keyframe CRUD
  addKeyframe: (pathId, keyframe) => {
    set((state) => ({
      paths: state.paths.map((path) =>
        path.id === pathId ? addKeyframeToPath(path, keyframe) : path
      ),
    }));
  },

  updateKeyframe: (pathId, keyframeIndex, updates) => {
    set((state) => ({
      paths: state.paths.map((path) =>
        path.id === pathId ? updateKeyframeInPath(path, keyframeIndex, updates) : path
      ),
    }));
  },

  removeKeyframe: (pathId, keyframeIndex) => {
    const path = get().getPath(pathId);
    if (!path) return;

    // Only remove if we have more than minimum keyframes
    if (path.keyframes.length <= 2) return;

    set((state) => ({
      paths: state.paths.map((p) =>
        p.id === pathId ? removeKeyframeFromPath(p, keyframeIndex) : p
      ),
    }));
  },

  // Selection
  selectPath: (pathId) => {
    set({ selectedPathId: pathId });
  },

  // Getters
  getPath: (pathId) => {
    return get().paths.find((p) => p.id === pathId);
  },

  getPathsByEntity: (entityId) => {
    return get().paths.filter((p) => p.entityId === entityId);
  },

  getPathByEntity: (entityId, entityType) => {
    return get().paths.find(
      (p) => p.entityId === entityId && p.entityType === entityType
    );
  },
}));
