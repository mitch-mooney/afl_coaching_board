import { useRef, useCallback } from 'react';
import {
  getTouchDistance,
  getTouchMidpoint,
  calculateZoomFactor,
  getTouchDelta,
  type TouchPoint,
  type Point,
} from '../utils/touchHelpers';

/**
 * Gesture types detected by the hook
 */
export type GestureType = 'none' | 'single-touch' | 'two-finger-pan' | 'pinch-to-zoom';

/**
 * Current gesture state with metrics
 */
export interface GestureState {
  type: GestureType;
  isActive: boolean;
  touchCount: number;
  // Pinch-to-zoom metrics
  zoomFactor: number;
  zoomCenter: Point;
  // Pan metrics
  panDelta: Point;
  panCenter: Point;
  // Single touch metrics
  singleTouchPosition: Point | null;
  singleTouchDelta: Point;
}

/**
 * Configuration options for gesture detection
 */
export interface GestureConfig {
  /** Minimum distance change to classify as pinch gesture (default: 10px) */
  pinchThreshold?: number;
  /** Minimum movement to classify as pan gesture (default: 5px) */
  panThreshold?: number;
  /** Whether to enable gesture detection (default: true) */
  enabled?: boolean;
}

/**
 * Internal refs for tracking gesture state without re-renders
 */
interface GestureRefs {
  initialPinchDistance: number | null;
  initialMidpoint: Point | null;
  previousMidpoint: Point | null;
  previousSingleTouch: Point | null;
  currentGestureType: GestureType;
  touchCount: number;
}

const DEFAULT_CONFIG: Required<GestureConfig> = {
  pinchThreshold: 10,
  panThreshold: 5,
  enabled: true,
};

/**
 * Creates an initial gesture state
 */
function createInitialGestureState(): GestureState {
  return {
    type: 'none',
    isActive: false,
    touchCount: 0,
    zoomFactor: 1,
    zoomCenter: { x: 0, y: 0 },
    panDelta: { x: 0, y: 0 },
    panCenter: { x: 0, y: 0 },
    singleTouchPosition: null,
    singleTouchDelta: { x: 0, y: 0 },
  };
}

/**
 * Hook for detecting multi-touch gestures (single-touch, two-finger-pan, pinch-to-zoom)
 *
 * Uses refs to store gesture state to avoid unnecessary re-renders.
 * Returns handlers for touch events and the current gesture state.
 *
 * @param config - Configuration options for gesture detection
 * @returns Gesture handlers and state accessor
 *
 * @example
 * ```tsx
 * const { handlers, getGestureState } = useGestures();
 *
 * // Attach handlers to element
 * <div
 *   onTouchStart={handlers.onTouchStart}
 *   onTouchMove={handlers.onTouchMove}
 *   onTouchEnd={handlers.onTouchEnd}
 * >
 *   Canvas content
 * </div>
 *
 * // Check gesture state in move handler
 * const state = getGestureState();
 * if (state.type === 'pinch-to-zoom') {
 *   camera.zoom *= state.zoomFactor;
 * }
 * ```
 */
export function useGestures(config: GestureConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Use refs to avoid re-renders during gestures
  const gestureRefs = useRef<GestureRefs>({
    initialPinchDistance: null,
    initialMidpoint: null,
    previousMidpoint: null,
    previousSingleTouch: null,
    currentGestureType: 'none',
    touchCount: 0,
  });

  const gestureStateRef = useRef<GestureState>(createInitialGestureState());

  /**
   * Resets all gesture tracking state
   */
  const resetGestureState = useCallback(() => {
    gestureRefs.current = {
      initialPinchDistance: null,
      initialMidpoint: null,
      previousMidpoint: null,
      previousSingleTouch: null,
      currentGestureType: 'none',
      touchCount: 0,
    };
    gestureStateRef.current = createInitialGestureState();
  }, []);

  /**
   * Converts a Touch object to TouchPoint
   */
  const touchToPoint = useCallback((touch: Touch): TouchPoint => ({
    clientX: touch.clientX,
    clientY: touch.clientY,
  }), []);

  /**
   * Handles touch start events
   */
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!mergedConfig.enabled) return;

    const touches = event.touches;
    const touchCount = touches.length;
    gestureRefs.current.touchCount = touchCount;

    if (touchCount === 1) {
      // Single touch - potential drag
      const touch = touchToPoint(touches[0]);
      gestureRefs.current.currentGestureType = 'single-touch';
      gestureRefs.current.previousSingleTouch = { x: touch.clientX, y: touch.clientY };

      gestureStateRef.current = {
        ...gestureStateRef.current,
        type: 'single-touch',
        isActive: true,
        touchCount: 1,
        singleTouchPosition: { x: touch.clientX, y: touch.clientY },
        singleTouchDelta: { x: 0, y: 0 },
      };
    } else if (touchCount === 2) {
      // Two-finger gesture - could be pan or pinch
      const touch1 = touchToPoint(touches[0]);
      const touch2 = touchToPoint(touches[1]);

      const distance = getTouchDistance(touch1, touch2);
      const midpoint = getTouchMidpoint(touch1, touch2);

      gestureRefs.current.initialPinchDistance = distance;
      gestureRefs.current.initialMidpoint = midpoint;
      gestureRefs.current.previousMidpoint = midpoint;
      // Start as two-finger gesture, type determined during move
      gestureRefs.current.currentGestureType = 'two-finger-pan';

      gestureStateRef.current = {
        ...gestureStateRef.current,
        type: 'two-finger-pan',
        isActive: true,
        touchCount: 2,
        zoomFactor: 1,
        zoomCenter: midpoint,
        panDelta: { x: 0, y: 0 },
        panCenter: midpoint,
        // Clear single touch when switching to multi-touch
        singleTouchPosition: null,
        singleTouchDelta: { x: 0, y: 0 },
      };
    } else {
      // More than 2 touches - reset to none
      gestureRefs.current.currentGestureType = 'none';
      gestureStateRef.current = {
        ...gestureStateRef.current,
        type: 'none',
        isActive: false,
        touchCount,
      };
    }
  }, [mergedConfig.enabled, touchToPoint]);

  /**
   * Handles touch move events
   */
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!mergedConfig.enabled) return;

    const touches = event.touches;
    const touchCount = touches.length;

    if (touchCount === 1 && gestureRefs.current.currentGestureType === 'single-touch') {
      // Single touch drag
      const touch = touchToPoint(touches[0]);
      const currentPos: Point = { x: touch.clientX, y: touch.clientY };

      let delta: Point = { x: 0, y: 0 };
      if (gestureRefs.current.previousSingleTouch) {
        delta = getTouchDelta(gestureRefs.current.previousSingleTouch, currentPos);
      }

      gestureRefs.current.previousSingleTouch = currentPos;

      gestureStateRef.current = {
        ...gestureStateRef.current,
        type: 'single-touch',
        isActive: true,
        touchCount: 1,
        singleTouchPosition: currentPos,
        singleTouchDelta: delta,
      };
    } else if (touchCount === 2) {
      // Two-finger gesture
      const touch1 = touchToPoint(touches[0]);
      const touch2 = touchToPoint(touches[1]);

      const currentDistance = getTouchDistance(touch1, touch2);
      const currentMidpoint = getTouchMidpoint(touch1, touch2);

      // Calculate distance change to determine if it's a pinch or pan
      const initialDistance = gestureRefs.current.initialPinchDistance;
      const distanceChange = initialDistance
        ? Math.abs(currentDistance - initialDistance)
        : 0;

      // Calculate midpoint movement
      let panDelta: Point = { x: 0, y: 0 };
      if (gestureRefs.current.previousMidpoint) {
        panDelta = getTouchDelta(gestureRefs.current.previousMidpoint, currentMidpoint);
      }

      const panMovement = Math.sqrt(panDelta.x * panDelta.x + panDelta.y * panDelta.y);

      // Determine gesture type based on thresholds
      // If distance change is significant, it's a pinch gesture
      // Otherwise, if there's significant pan movement, it's a pan gesture
      let gestureType: GestureType = gestureRefs.current.currentGestureType;

      if (distanceChange > mergedConfig.pinchThreshold) {
        gestureType = 'pinch-to-zoom';
      } else if (panMovement > mergedConfig.panThreshold) {
        gestureType = 'two-finger-pan';
      }

      gestureRefs.current.currentGestureType = gestureType;
      gestureRefs.current.previousMidpoint = currentMidpoint;

      // Calculate zoom factor
      const zoomFactor = initialDistance
        ? calculateZoomFactor(initialDistance, currentDistance)
        : 1;

      gestureStateRef.current = {
        ...gestureStateRef.current,
        type: gestureType,
        isActive: true,
        touchCount: 2,
        zoomFactor,
        zoomCenter: currentMidpoint,
        panDelta,
        panCenter: currentMidpoint,
      };
    }
  }, [mergedConfig.enabled, mergedConfig.pinchThreshold, mergedConfig.panThreshold, touchToPoint]);

  /**
   * Handles touch end events
   */
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!mergedConfig.enabled) return;

    const touches = event.touches;
    const touchCount = touches.length;

    if (touchCount === 0) {
      // All touches released - reset state
      resetGestureState();
    } else if (touchCount === 1) {
      // Went from multi-touch to single touch
      // Reset to single touch mode
      const touch = touchToPoint(touches[0]);
      gestureRefs.current.currentGestureType = 'single-touch';
      gestureRefs.current.previousSingleTouch = { x: touch.clientX, y: touch.clientY };
      gestureRefs.current.initialPinchDistance = null;
      gestureRefs.current.initialMidpoint = null;
      gestureRefs.current.previousMidpoint = null;

      gestureStateRef.current = {
        ...gestureStateRef.current,
        type: 'single-touch',
        isActive: true,
        touchCount: 1,
        singleTouchPosition: { x: touch.clientX, y: touch.clientY },
        singleTouchDelta: { x: 0, y: 0 },
        zoomFactor: 1,
        panDelta: { x: 0, y: 0 },
      };
    }

    gestureRefs.current.touchCount = touchCount;
  }, [mergedConfig.enabled, resetGestureState, touchToPoint]);

  /**
   * Handles touch cancel events (treat same as touch end)
   */
  const handleTouchCancel = useCallback((event: TouchEvent) => {
    // On cancel, reset all gesture state
    resetGestureState();
  }, [resetGestureState]);

  /**
   * Gets the current gesture state
   */
  const getGestureState = useCallback((): GestureState => {
    return { ...gestureStateRef.current };
  }, []);

  /**
   * Checks if a specific gesture type is currently active
   */
  const isGestureActive = useCallback((type: GestureType): boolean => {
    return gestureStateRef.current.type === type && gestureStateRef.current.isActive;
  }, []);

  /**
   * Gets the current touch count
   */
  const getTouchCount = useCallback((): number => {
    return gestureRefs.current.touchCount;
  }, []);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    getGestureState,
    isGestureActive,
    getTouchCount,
    resetGestureState,
  };
}
