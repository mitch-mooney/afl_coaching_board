import { describe, it, expect, beforeEach } from 'vitest';
import { useCameraStore, MIN_ZOOM, MAX_ZOOM, MIN_POV_DISTANCE, MAX_POV_DISTANCE } from '../cameraStore';

beforeEach(() => {
  useCameraStore.setState({ povPlayer1Id: null, povPlayer2Id: null, activePovSlot: null });
});

describe('dual-POV slots', () => {
  it('sets POV player for slot 1 and activates it', () => {
    useCameraStore.getState().setPovPlayer(1, 'player-abc');
    const s = useCameraStore.getState();
    expect(s.povPlayer1Id).toBe('player-abc');
    expect(s.activePovSlot).toBe(1);
  });

  it('sets POV player for slot 2 and activates it', () => {
    useCameraStore.getState().setPovPlayer(2, 'player-xyz');
    expect(useCameraStore.getState().povPlayer2Id).toBe('player-xyz');
    expect(useCameraStore.getState().activePovSlot).toBe(2);
  });

  it('clearPov removes player and resets slot if active', () => {
    useCameraStore.getState().setPovPlayer(1, 'player-abc');
    useCameraStore.getState().clearPov(1);
    expect(useCameraStore.getState().povPlayer1Id).toBeNull();
    expect(useCameraStore.getState().activePovSlot).toBeNull();
  });

  it('switchToBroadcast resets activePovSlot', () => {
    useCameraStore.getState().setPovPlayer(1, 'player-abc');
    useCameraStore.getState().switchToBroadcast();
    expect(useCameraStore.getState().activePovSlot).toBeNull();
  });

  it('setActivePovSlot switches between slots', () => {
    useCameraStore.getState().setPovPlayer(1, 'p1');
    useCameraStore.getState().setPovPlayer(2, 'p2');
    useCameraStore.getState().setActivePovSlot(2);
    expect(useCameraStore.getState().activePovSlot).toBe(2);
  });
});

describe('applyPinchZoom', () => {
  it('multiplies the initial zoom by the pinch factor', () => {
    useCameraStore.getState().applyPinchZoom(2, 1);
    expect(useCameraStore.getState().zoom).toBe(2);
  });

  it('clamps to MAX_ZOOM', () => {
    useCameraStore.getState().applyPinchZoom(10, 1);
    expect(useCameraStore.getState().zoom).toBe(MAX_ZOOM);
  });

  it('clamps to MIN_ZOOM', () => {
    useCameraStore.getState().applyPinchZoom(0.1, 1);
    expect(useCameraStore.getState().zoom).toBe(MIN_ZOOM);
  });

  it('uses the passed initialZoom, not the current zoom', () => {
    useCameraStore.getState().applyPinchZoom(2, 1.5);
    expect(useCameraStore.getState().zoom).toBe(3);
  });
});

describe('applyTwoFingerPan', () => {
  it('applies a negated, half-scaled screen delta to position and target (y unchanged)', () => {
    useCameraStore
      .getState()
      .applyTwoFingerPan({ x: 100, y: 50 }, [0, 50, 150], [0, 0, 0]);
    const s = useCameraStore.getState();
    // worldDeltaX = -100 * 0.5 = -50 ; worldDeltaZ = -50 * 0.5 = -25 ; y untouched
    expect(s.position).toEqual([-50, 50, 125]);
    expect(s.target).toEqual([-50, 0, -25]);
  });
});

describe('setPOVDistance', () => {
  it('sets a distance within range', () => {
    useCameraStore.getState().setPOVDistance(20);
    expect(useCameraStore.getState().povDistance).toBe(20);
  });

  it('clamps below MIN_POV_DISTANCE', () => {
    useCameraStore.getState().setPOVDistance(1);
    expect(useCameraStore.getState().povDistance).toBe(MIN_POV_DISTANCE);
  });

  it('clamps above MAX_POV_DISTANCE', () => {
    useCameraStore.getState().setPOVDistance(100);
    expect(useCameraStore.getState().povDistance).toBe(MAX_POV_DISTANCE);
  });
});

describe('focusOnPlayer', () => {
  it('targets the player and offsets the camera by [+20, 30, +30]', () => {
    useCameraStore.getState().focusOnPlayer([10, 0, -5]);
    const s = useCameraStore.getState();
    expect(s.target).toEqual([10, 0, -5]);
    expect(s.position).toEqual([30, 30, 25]);
  });
});

describe('setPresetView', () => {
  it('top: overhead position, origin target, zoom 1', () => {
    useCameraStore.getState().setPresetView('top');
    const s = useCameraStore.getState();
    expect(s.position).toEqual([0, 200, 0]);
    expect(s.target).toEqual([0, 0, 0]);
    expect(s.zoom).toBe(1);
  });

  it('sideline: position [0,50,150]', () => {
    useCameraStore.getState().setPresetView('sideline');
    expect(useCameraStore.getState().position).toEqual([0, 50, 150]);
  });

  it('end-to-end: position [150,50,0]', () => {
    useCameraStore.getState().setPresetView('end-to-end');
    expect(useCameraStore.getState().position).toEqual([150, 50, 0]);
  });

  it('clears an active POV slot', () => {
    useCameraStore.getState().setPovPlayer(1, 'player-1');
    expect(useCameraStore.getState().activePovSlot).toBe(1);
    useCameraStore.getState().setPresetView('top');
    expect(useCameraStore.getState().activePovSlot).toBeNull();
  });
});
