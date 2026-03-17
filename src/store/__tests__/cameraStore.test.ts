import { describe, it, expect, beforeEach } from 'vitest';
import { useCameraStore } from '../cameraStore';

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
