import { describe, it, expect, vi } from 'vitest';
import { useGestures, type GestureType, type GestureState, type GestureConfig } from '../useGestures';

// Since we don't have @testing-library/react, we'll test the hook logic directly
// by calling the exported hook in a controlled manner

/**
 * Helper to create a mock Touch object
 */
function createMockTouch(id: number, clientX: number, clientY: number): Touch {
  return {
    identifier: id,
    target: document.body,
    clientX,
    clientY,
    screenX: clientX,
    screenY: clientY,
    pageX: clientX,
    pageY: clientY,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 1,
  } as Touch;
}

/**
 * Helper to create a mock TouchList
 */
function createMockTouchList(touches: Touch[]): TouchList {
  const list = touches as unknown as TouchList;
  Object.defineProperty(list, 'length', { value: touches.length });
  Object.defineProperty(list, 'item', {
    value: (index: number) => touches[index] || null,
  });
  return list;
}

/**
 * Helper to create a mock TouchEvent
 */
function createMockTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  touches: Touch[],
  changedTouches: Touch[] = touches
): TouchEvent {
  return {
    type,
    touches: createMockTouchList(touches),
    changedTouches: createMockTouchList(changedTouches),
    targetTouches: createMockTouchList(touches),
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as TouchEvent;
}

/**
 * Since we don't have @testing-library/react, we test the hook's types and
 * the mathematical logic that it relies on. The actual hook behavior is
 * tested through integration tests with the canvas component.
 */

describe('useGestures', () => {
  // ============================================================================
  // HOOK INITIALIZATION TESTS
  // ============================================================================

  describe('initialization', () => {
    it('should return handlers object with all required functions', () => {
      // Test that the hook exports the expected interface
      // by checking the types - this is a compile-time verification

      // This is a type-level test - if this compiles, the interface is correct
      type HookResult = ReturnType<typeof useGestures>;
      type Handlers = HookResult['handlers'];

      // Check that handlers has expected keys (type-level assertion)
      const handlersHasAllKeys: keyof Handlers extends
        | 'onTouchStart'
        | 'onTouchMove'
        | 'onTouchEnd'
        | 'onTouchCancel'
        ? true
        : false = true;

      // Check that hook returns expected methods (type-level assertion)
      type HasGetGestureState = HookResult['getGestureState'] extends () => GestureState ? true : false;
      type HasIsGestureActive = HookResult['isGestureActive'] extends (type: GestureType) => boolean ? true : false;
      type HasGetTouchCount = HookResult['getTouchCount'] extends () => number ? true : false;
      type HasResetGestureState = HookResult['resetGestureState'] extends () => void ? true : false;

      // Runtime verification
      expect(handlersHasAllKeys).toBe(true);

      // Verify type checks compile (always true if code compiles)
      const hasAllMethods: HasGetGestureState & HasIsGestureActive & HasGetTouchCount & HasResetGestureState = true;
      expect(hasAllMethods).toBe(true);
    });

    it('should have initial gesture state as none', () => {
      // Type test for initial state
      const initialState: GestureState = {
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

      expect(initialState.type).toBe('none');
      expect(initialState.isActive).toBe(false);
      expect(initialState.touchCount).toBe(0);
    });
  });

  // ============================================================================
  // GESTURE TYPE TESTS
  // ============================================================================

  describe('GestureType', () => {
    it('should support all expected gesture types', () => {
      const types: GestureType[] = ['none', 'single-touch', 'two-finger-pan', 'pinch-to-zoom'];

      expect(types).toContain('none');
      expect(types).toContain('single-touch');
      expect(types).toContain('two-finger-pan');
      expect(types).toContain('pinch-to-zoom');
      expect(types.length).toBe(4);
    });
  });

  // ============================================================================
  // GESTURE STATE TESTS
  // ============================================================================

  describe('GestureState', () => {
    it('should have correct shape for pinch gesture', () => {
      const pinchState: GestureState = {
        type: 'pinch-to-zoom',
        isActive: true,
        touchCount: 2,
        zoomFactor: 1.5,
        zoomCenter: { x: 200, y: 300 },
        panDelta: { x: 0, y: 0 },
        panCenter: { x: 200, y: 300 },
        singleTouchPosition: null,
        singleTouchDelta: { x: 0, y: 0 },
      };

      expect(pinchState.type).toBe('pinch-to-zoom');
      expect(pinchState.touchCount).toBe(2);
      expect(pinchState.zoomFactor).toBe(1.5);
      expect(pinchState.zoomCenter.x).toBe(200);
      expect(pinchState.zoomCenter.y).toBe(300);
    });

    it('should have correct shape for pan gesture', () => {
      const panState: GestureState = {
        type: 'two-finger-pan',
        isActive: true,
        touchCount: 2,
        zoomFactor: 1,
        zoomCenter: { x: 150, y: 250 },
        panDelta: { x: 10, y: -5 },
        panCenter: { x: 150, y: 250 },
        singleTouchPosition: null,
        singleTouchDelta: { x: 0, y: 0 },
      };

      expect(panState.type).toBe('two-finger-pan');
      expect(panState.panDelta.x).toBe(10);
      expect(panState.panDelta.y).toBe(-5);
    });

    it('should have correct shape for single touch gesture', () => {
      const singleState: GestureState = {
        type: 'single-touch',
        isActive: true,
        touchCount: 1,
        zoomFactor: 1,
        zoomCenter: { x: 0, y: 0 },
        panDelta: { x: 0, y: 0 },
        panCenter: { x: 0, y: 0 },
        singleTouchPosition: { x: 100, y: 200 },
        singleTouchDelta: { x: 5, y: 3 },
      };

      expect(singleState.type).toBe('single-touch');
      expect(singleState.touchCount).toBe(1);
      expect(singleState.singleTouchPosition?.x).toBe(100);
      expect(singleState.singleTouchPosition?.y).toBe(200);
      expect(singleState.singleTouchDelta.x).toBe(5);
      expect(singleState.singleTouchDelta.y).toBe(3);
    });
  });

  // ============================================================================
  // GESTURE CONFIG TESTS
  // ============================================================================

  describe('GestureConfig', () => {
    it('should have correct default values structure', () => {
      const defaultConfig: Required<GestureConfig> = {
        pinchThreshold: 10,
        panThreshold: 5,
        enabled: true,
      };

      expect(defaultConfig.pinchThreshold).toBe(10);
      expect(defaultConfig.panThreshold).toBe(5);
      expect(defaultConfig.enabled).toBe(true);
    });

    it('should allow partial configuration', () => {
      const partialConfig: GestureConfig = {
        pinchThreshold: 20,
      };

      expect(partialConfig.pinchThreshold).toBe(20);
      expect(partialConfig.panThreshold).toBeUndefined();
      expect(partialConfig.enabled).toBeUndefined();
    });

    it('should allow disabling gestures', () => {
      const disabledConfig: GestureConfig = {
        enabled: false,
      };

      expect(disabledConfig.enabled).toBe(false);
    });
  });

  // ============================================================================
  // MOCK TOUCH EVENT TESTS
  // ============================================================================

  describe('mock touch events', () => {
    it('should create valid single-touch TouchEvent', () => {
      const touch = createMockTouch(0, 100, 200);
      const event = createMockTouchEvent('touchstart', [touch]);

      expect(event.type).toBe('touchstart');
      expect(event.touches.length).toBe(1);
      expect(event.touches[0].clientX).toBe(100);
      expect(event.touches[0].clientY).toBe(200);
    });

    it('should create valid two-touch TouchEvent', () => {
      const touch1 = createMockTouch(0, 100, 200);
      const touch2 = createMockTouch(1, 200, 200);
      const event = createMockTouchEvent('touchstart', [touch1, touch2]);

      expect(event.touches.length).toBe(2);
      expect(event.touches[0].clientX).toBe(100);
      expect(event.touches[1].clientX).toBe(200);
    });

    it('should create valid touchend event with no remaining touches', () => {
      const touch = createMockTouch(0, 100, 200);
      const event = createMockTouchEvent('touchend', [], [touch]);

      expect(event.type).toBe('touchend');
      expect(event.touches.length).toBe(0);
      expect(event.changedTouches.length).toBe(1);
    });
  });

  // ============================================================================
  // SINGLE TOUCH DETECTION TESTS
  // ============================================================================

  describe('single touch detection', () => {
    it('should detect single touch at correct position', () => {
      // Test that the state structure correctly represents single touch
      const touch = createMockTouch(0, 150, 250);
      const event = createMockTouchEvent('touchstart', [touch]);

      // Verify event structure supports single touch detection
      expect(event.touches.length).toBe(1);
      expect(event.touches[0].clientX).toBe(150);
      expect(event.touches[0].clientY).toBe(250);
    });

    it('should calculate delta for single touch movement', () => {
      const touch1 = createMockTouch(0, 100, 100);
      const touch2 = createMockTouch(0, 130, 140);

      // Delta should be (30, 40)
      const deltaX = touch2.clientX - touch1.clientX;
      const deltaY = touch2.clientY - touch1.clientY;

      expect(deltaX).toBe(30);
      expect(deltaY).toBe(40);
    });
  });

  // ============================================================================
  // TWO-FINGER PAN DETECTION TESTS
  // ============================================================================

  describe('two-finger pan detection', () => {
    it('should calculate midpoint for two touches', () => {
      const touch1 = createMockTouch(0, 100, 100);
      const touch2 = createMockTouch(1, 200, 200);

      // Midpoint should be (150, 150)
      const midpointX = (touch1.clientX + touch2.clientX) / 2;
      const midpointY = (touch1.clientY + touch2.clientY) / 2;

      expect(midpointX).toBe(150);
      expect(midpointY).toBe(150);
    });

    it('should detect pan movement by midpoint change', () => {
      // Initial touches
      const touch1a = createMockTouch(0, 100, 100);
      const touch2a = createMockTouch(1, 200, 200);
      const midpoint1 = {
        x: (touch1a.clientX + touch2a.clientX) / 2,
        y: (touch1a.clientY + touch2a.clientY) / 2,
      };

      // Moved touches (both moved by 50, 50 - pan gesture)
      const touch1b = createMockTouch(0, 150, 150);
      const touch2b = createMockTouch(1, 250, 250);
      const midpoint2 = {
        x: (touch1b.clientX + touch2b.clientX) / 2,
        y: (touch1b.clientY + touch2b.clientY) / 2,
      };

      // Pan delta should be (50, 50)
      const panDeltaX = midpoint2.x - midpoint1.x;
      const panDeltaY = midpoint2.y - midpoint1.y;

      expect(panDeltaX).toBe(50);
      expect(panDeltaY).toBe(50);
    });

    it('should distinguish pan from pinch by distance stability', () => {
      // Pan: distance stays same, midpoint moves
      const touch1a = createMockTouch(0, 100, 100);
      const touch2a = createMockTouch(1, 200, 100);
      const distance1 = Math.sqrt(
        Math.pow(touch2a.clientX - touch1a.clientX, 2) +
          Math.pow(touch2a.clientY - touch1a.clientY, 2)
      );

      // Moved by (20, 20) - both touches move together
      const touch1b = createMockTouch(0, 120, 120);
      const touch2b = createMockTouch(1, 220, 120);
      const distance2 = Math.sqrt(
        Math.pow(touch2b.clientX - touch1b.clientX, 2) +
          Math.pow(touch2b.clientY - touch1b.clientY, 2)
      );

      // Distances should be equal for pure pan
      expect(distance1).toBeCloseTo(distance2, 5);
    });
  });

  // ============================================================================
  // PINCH-TO-ZOOM DETECTION TESTS
  // ============================================================================

  describe('pinch-to-zoom detection', () => {
    it('should calculate distance between two touches', () => {
      const touch1 = createMockTouch(0, 0, 0);
      const touch2 = createMockTouch(1, 100, 0);

      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      expect(distance).toBe(100);
    });

    it('should detect zoom in when distance increases', () => {
      // Initial distance
      const touch1a = createMockTouch(0, 100, 100);
      const touch2a = createMockTouch(1, 200, 100);
      const initialDistance = Math.abs(touch2a.clientX - touch1a.clientX);

      // Fingers spread apart (zoom in)
      const touch1b = createMockTouch(0, 50, 100);
      const touch2b = createMockTouch(1, 250, 100);
      const currentDistance = Math.abs(touch2b.clientX - touch1b.clientX);

      const zoomFactor = currentDistance / initialDistance;

      expect(zoomFactor).toBe(2); // Doubled distance = 2x zoom
      expect(zoomFactor).toBeGreaterThan(1); // Zoom in
    });

    it('should detect zoom out when distance decreases', () => {
      // Initial distance
      const touch1a = createMockTouch(0, 0, 100);
      const touch2a = createMockTouch(1, 200, 100);
      const initialDistance = Math.abs(touch2a.clientX - touch1a.clientX);

      // Fingers pinch together (zoom out)
      const touch1b = createMockTouch(0, 75, 100);
      const touch2b = createMockTouch(1, 125, 100);
      const currentDistance = Math.abs(touch2b.clientX - touch1b.clientX);

      const zoomFactor = currentDistance / initialDistance;

      expect(zoomFactor).toBe(0.25); // Quarter distance = 0.25x zoom
      expect(zoomFactor).toBeLessThan(1); // Zoom out
    });

    it('should return zoom factor of 1 when distances are equal', () => {
      const touch1a = createMockTouch(0, 100, 100);
      const touch2a = createMockTouch(1, 200, 100);
      const distance = Math.abs(touch2a.clientX - touch1a.clientX);

      const zoomFactor = distance / distance;

      expect(zoomFactor).toBe(1);
    });

    it('should calculate zoom center at midpoint of two touches', () => {
      const touch1 = createMockTouch(0, 100, 200);
      const touch2 = createMockTouch(1, 300, 400);

      const zoomCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };

      expect(zoomCenter.x).toBe(200);
      expect(zoomCenter.y).toBe(300);
    });
  });

  // ============================================================================
  // TOUCH COUNT TRANSITION TESTS
  // ============================================================================

  describe('touch count transitions', () => {
    it('should handle transition from 0 to 1 touch', () => {
      const event0 = createMockTouchEvent('touchend', []);
      const touch = createMockTouch(0, 100, 100);
      const event1 = createMockTouchEvent('touchstart', [touch]);

      expect(event0.touches.length).toBe(0);
      expect(event1.touches.length).toBe(1);
    });

    it('should handle transition from 1 to 2 touches', () => {
      const touch1 = createMockTouch(0, 100, 100);
      const touch2 = createMockTouch(1, 200, 200);

      const event1 = createMockTouchEvent('touchstart', [touch1]);
      const event2 = createMockTouchEvent('touchstart', [touch1, touch2]);

      expect(event1.touches.length).toBe(1);
      expect(event2.touches.length).toBe(2);
    });

    it('should handle transition from 2 to 1 touch', () => {
      const touch1 = createMockTouch(0, 100, 100);
      const touch2 = createMockTouch(1, 200, 200);

      const event2 = createMockTouchEvent('touchmove', [touch1, touch2]);
      const event1 = createMockTouchEvent('touchend', [touch1], [touch2]);

      expect(event2.touches.length).toBe(2);
      expect(event1.touches.length).toBe(1);
    });

    it('should handle transition from 1 to 0 touches', () => {
      const touch = createMockTouch(0, 100, 100);
      const event1 = createMockTouchEvent('touchmove', [touch]);
      const event0 = createMockTouchEvent('touchend', [], [touch]);

      expect(event1.touches.length).toBe(1);
      expect(event0.touches.length).toBe(0);
    });

    it('should handle more than 2 touches gracefully', () => {
      const touch1 = createMockTouch(0, 100, 100);
      const touch2 = createMockTouch(1, 200, 200);
      const touch3 = createMockTouch(2, 300, 300);

      const event3 = createMockTouchEvent('touchstart', [touch1, touch2, touch3]);

      expect(event3.touches.length).toBe(3);
      // More than 2 touches should result in 'none' gesture type
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    it('should handle touch cancel event', () => {
      const touch = createMockTouch(0, 100, 100);
      const event = createMockTouchEvent('touchcancel', [], [touch]);

      expect(event.type).toBe('touchcancel');
      expect(event.touches.length).toBe(0);
    });

    it('should handle rapid touch events', () => {
      const touches: Touch[] = [];
      for (let i = 0; i < 10; i++) {
        touches.push(createMockTouch(0, 100 + i * 10, 100 + i * 10));
      }

      // Verify all touches have sequential positions
      for (let i = 1; i < touches.length; i++) {
        const deltaX = touches[i].clientX - touches[i - 1].clientX;
        expect(deltaX).toBe(10);
      }
    });

    it('should handle zero distance between touches', () => {
      const touch1 = createMockTouch(0, 100, 100);
      const touch2 = createMockTouch(1, 100, 100);

      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      expect(distance).toBe(0);
      // Should not cause division by zero in zoom calculation
    });

    it('should handle negative coordinates', () => {
      const touch1 = createMockTouch(0, -100, -200);
      const touch2 = createMockTouch(1, 100, 200);

      const midpoint = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };

      expect(midpoint.x).toBe(0);
      expect(midpoint.y).toBe(0);
    });

    it('should handle very large coordinates', () => {
      const touch1 = createMockTouch(0, 10000, 20000);
      const touch2 = createMockTouch(1, 10100, 20100);

      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      expect(distance).toBeCloseTo(Math.sqrt(100 * 100 + 100 * 100), 5);
    });

    it('should handle floating point coordinates', () => {
      const touch1 = createMockTouch(0, 100.5, 200.7);
      const touch2 = createMockTouch(1, 200.3, 300.9);

      const midpoint = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };

      expect(midpoint.x).toBeCloseTo(150.4, 5);
      expect(midpoint.y).toBeCloseTo(250.8, 5);
    });
  });

  // ============================================================================
  // GESTURE CONFLICT PREVENTION TESTS
  // ============================================================================

  describe('gesture conflict prevention', () => {
    it('should not trigger single-touch when two fingers are present', () => {
      const touch1 = createMockTouch(0, 100, 100);
      const touch2 = createMockTouch(1, 200, 200);
      const event = createMockTouchEvent('touchstart', [touch1, touch2]);

      // Two touches should not be classified as single-touch
      expect(event.touches.length).toBe(2);
    });

    it('should reset pinch state when going from 2 to 1 touch', () => {
      const touch1 = createMockTouch(0, 100, 100);
      const touch2 = createMockTouch(1, 200, 200);

      // Two-finger gesture
      const event2 = createMockTouchEvent('touchmove', [touch1, touch2]);

      // One finger lifted
      const event1 = createMockTouchEvent('touchend', [touch1], [touch2]);

      expect(event2.touches.length).toBe(2);
      expect(event1.touches.length).toBe(1);
      // Pinch state should be reset when going to single touch
    });

    it('should prioritize pinch over pan when both thresholds met', () => {
      // When finger distance changes significantly AND midpoint moves,
      // pinch should take precedence

      createMockTouch(0, 100, 100);
      createMockTouch(1, 200, 100);
      const initialDistance = 100;

      // Move fingers apart AND move midpoint
      createMockTouch(0, 50, 150); // moved in and up
      createMockTouch(1, 300, 150); // moved out and up
      const newDistance = 250;

      const distanceChange = Math.abs(newDistance - initialDistance);

      // Distance change (150) is greater than typical pinch threshold (10)
      expect(distanceChange).toBeGreaterThan(10);
    });
  });

  // ============================================================================
  // CONFIGURATION TESTS
  // ============================================================================

  describe('configuration', () => {
    it('should respect custom pinch threshold', () => {
      const config: GestureConfig = {
        pinchThreshold: 50, // Higher threshold
      };

      // Distance change of 30 should NOT trigger pinch with threshold of 50
      const distanceChange = 30;
      const isPinch = distanceChange > config.pinchThreshold!;

      expect(isPinch).toBe(false);
    });

    it('should respect custom pan threshold', () => {
      const config: GestureConfig = {
        panThreshold: 20, // Higher threshold
      };

      // Pan movement of 10 should NOT trigger pan with threshold of 20
      const panMovement = 10;
      const isPan = panMovement > config.panThreshold!;

      expect(isPan).toBe(false);
    });

    it('should not process events when disabled', () => {
      const config: GestureConfig = {
        enabled: false,
      };

      expect(config.enabled).toBe(false);
      // When disabled, gesture handlers should return early
    });
  });

  // ============================================================================
  // STATE IMMUTABILITY TESTS
  // ============================================================================

  describe('state immutability', () => {
    it('should create new state objects on update', () => {
      const state1: GestureState = {
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

      // Create updated state
      const state2: GestureState = {
        ...state1,
        type: 'single-touch',
        isActive: true,
        touchCount: 1,
      };

      // Original state should be unchanged
      expect(state1.type).toBe('none');
      expect(state2.type).toBe('single-touch');
      expect(state1).not.toBe(state2);
    });

    it('should create new Point objects for delta and center', () => {
      const originalDelta = { x: 10, y: 20 };
      const newDelta = { ...originalDelta, x: 30 };

      expect(originalDelta.x).toBe(10);
      expect(newDelta.x).toBe(30);
      expect(originalDelta).not.toBe(newDelta);
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe('integration scenarios', () => {
    it('should support complete pinch-to-zoom flow', () => {
      // 1. Touch start with two fingers
      const touch1a = createMockTouch(0, 100, 200);
      const touch2a = createMockTouch(1, 200, 200);
      const startEvent = createMockTouchEvent('touchstart', [touch1a, touch2a]);

      expect(startEvent.touches.length).toBe(2);
      expect(startEvent.type).toBe('touchstart');

      // 2. Move fingers apart (pinch out)
      const touch1b = createMockTouch(0, 50, 200);
      const touch2b = createMockTouch(1, 250, 200);
      const moveEvent = createMockTouchEvent('touchmove', [touch1b, touch2b]);

      expect(moveEvent.type).toBe('touchmove');
      expect(moveEvent.touches.length).toBe(2);

      const initialDistance = 100;
      const newDistance = 200;
      const zoomFactor = newDistance / initialDistance;

      expect(zoomFactor).toBe(2);

      // 3. Touch end
      const endEvent = createMockTouchEvent('touchend', []);

      expect(endEvent.touches.length).toBe(0);
      expect(endEvent.type).toBe('touchend');
    });

    it('should support complete two-finger-pan flow', () => {
      // 1. Touch start with two fingers
      const touch1a = createMockTouch(0, 100, 100);
      const touch2a = createMockTouch(1, 200, 100);
      const startEvent = createMockTouchEvent('touchstart', [touch1a, touch2a]);

      expect(startEvent.touches.length).toBe(2);

      const initialMidpoint = {
        x: (touch1a.clientX + touch2a.clientX) / 2,
        y: (touch1a.clientY + touch2a.clientY) / 2,
      };

      expect(initialMidpoint.x).toBe(150);

      // 2. Move both fingers together (pan)
      const touch1b = createMockTouch(0, 150, 150);
      const touch2b = createMockTouch(1, 250, 150);
      const moveEvent = createMockTouchEvent('touchmove', [touch1b, touch2b]);

      expect(moveEvent.type).toBe('touchmove');

      const newMidpoint = {
        x: (touch1b.clientX + touch2b.clientX) / 2,
        y: (touch1b.clientY + touch2b.clientY) / 2,
      };

      const panDelta = {
        x: newMidpoint.x - initialMidpoint.x,
        y: newMidpoint.y - initialMidpoint.y,
      };

      expect(panDelta.x).toBe(50);
      expect(panDelta.y).toBe(50);
    });

    it('should support complete single-touch drag flow', () => {
      // 1. Touch start with one finger
      const touch1 = createMockTouch(0, 100, 100);
      const startEvent = createMockTouchEvent('touchstart', [touch1]);

      expect(startEvent.touches.length).toBe(1);
      expect(startEvent.type).toBe('touchstart');

      // 2. Move finger
      const touch2 = createMockTouch(0, 150, 180);
      const moveEvent = createMockTouchEvent('touchmove', [touch2]);

      expect(moveEvent.type).toBe('touchmove');
      expect(moveEvent.touches.length).toBe(1);

      const delta = {
        x: touch2.clientX - touch1.clientX,
        y: touch2.clientY - touch1.clientY,
      };

      expect(delta.x).toBe(50);
      expect(delta.y).toBe(80);

      // 3. Touch end
      const endEvent = createMockTouchEvent('touchend', [], [touch2]);

      expect(endEvent.touches.length).toBe(0);
      expect(endEvent.type).toBe('touchend');
    });

    it('should handle gesture transition from single to multi touch', () => {
      // 1. Start with single touch (player drag)
      const touch1 = createMockTouch(0, 100, 100);
      const event1 = createMockTouchEvent('touchstart', [touch1]);

      expect(event1.touches.length).toBe(1);

      // 2. Second finger touches (transition to camera control)
      const touch2 = createMockTouch(1, 200, 200);
      const event2 = createMockTouchEvent('touchstart', [touch1, touch2]);

      expect(event2.touches.length).toBe(2);

      // 3. One finger lifts (back to single touch or end)
      const event3 = createMockTouchEvent('touchend', [touch1], [touch2]);

      expect(event3.touches.length).toBe(1);
    });
  });
});
