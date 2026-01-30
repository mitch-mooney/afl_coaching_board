import { useEffect, useRef, useCallback } from 'react';
import { useAnimationStore } from '../store/animationStore';
import { useEventStore } from '../store/eventStore';
import { usePlayerStore, PlayerUpdate } from '../store/playerStore';
import { usePathStore } from '../store/pathStore';
import { getPositionAtTime } from '../utils/pathAnimation';

/**
 * useAnimationPlayback - Hook for managing event-based animation playback
 *
 * This hook handles:
 * 1. requestAnimationFrame loop for smooth 60fps animation
 * 2. Global time progression based on playback speed
 * 3. Calculating player positions from paths at the current time
 * 4. Batch updating player positions for performance
 *
 * Usage:
 * Call this hook in a component that should drive the animation loop.
 * Typically used in PlayerManager or a top-level scene component.
 */

export interface UseAnimationPlaybackReturn {
  /** Whether an animation is currently running */
  isAnimating: boolean;
  /** Update player positions for the current global time (useful for scrubbing) */
  updatePositionsForCurrentTime: () => void;
}

export function useAnimationPlayback(): UseAnimationPlaybackReturn {
  // Refs for animation loop
  const animationFrameIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Use refs to avoid stale closure issues in animation loop
  const globalTimeRef = useRef<number>(0);
  const speedRef = useRef<number>(1);
  const loopRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const isEventModeRef = useRef<boolean>(false);

  // Store subscriptions
  const isPlaying = useAnimationStore((state) => state.isPlaying);
  const speed = useAnimationStore((state) => state.speed);
  const loop = useAnimationStore((state) => state.loop);

  const globalTime = useEventStore((state) => state.globalTime);
  const isEventMode = useEventStore((state) => state.isEventMode);

  // Keep refs in sync with store values
  useEffect(() => {
    globalTimeRef.current = globalTime;
  }, [globalTime]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isEventModeRef.current = isEventMode;
  }, [isEventMode]);

  /**
   * Calculate positions for all players based on current global time
   * Uses direct store access to avoid stale closures
   */
  const calculatePlayerPositions = useCallback(
    (currentGlobalTime: number): PlayerUpdate[] => {
      const activeEvent = useEventStore.getState().getActiveEvent();
      if (!activeEvent) return [];

      const { getPath } = usePathStore.getState();
      const updates: PlayerUpdate[] = [];

      for (const pathConfig of activeEvent.playerPaths) {
        const path = getPath(pathConfig.pathId);
        if (!path) continue;

        // Calculate local time for this path (accounting for start offset)
        // globalTime and pathConfig.startTimeOffset are in milliseconds
        // path.duration and keyframe timestamps are in seconds
        const localTimeMs = currentGlobalTime - pathConfig.startTimeOffset;
        const localTimeSeconds = localTimeMs / 1000;

        let position: [number, number, number];

        if (localTimeMs < 0) {
          // Animation hasn't started yet - use start position
          if (path.keyframes.length > 0) {
            position = [...path.keyframes[0].position] as [number, number, number];
          } else {
            continue; // Skip paths with no keyframes
          }
        } else if (localTimeSeconds > path.duration) {
          // Animation has finished - use end position
          if (path.keyframes.length > 0) {
            const lastKeyframe = path.keyframes[path.keyframes.length - 1];
            position = [...lastKeyframe.position] as [number, number, number];
          } else {
            continue; // Skip paths with no keyframes
          }
        } else {
          // Animation in progress - interpolate
          position = getPositionAtTime(path, localTimeSeconds);
        }

        updates.push({
          playerId: pathConfig.playerId,
          position,
        });
      }

      return updates;
    },
    []
  );

  /**
   * Update player positions for the current global time
   * Useful for scrubbing or when playback is paused
   */
  const updatePositionsForCurrentTime = useCallback(() => {
    const currentTime = useEventStore.getState().globalTime;
    const playerUpdates = calculatePlayerPositions(currentTime);
    if (playerUpdates.length > 0) {
      usePlayerStore.getState().updateMultiplePlayers(playerUpdates);
    }
  }, [calculatePlayerPositions]);

  /**
   * Animation frame callback
   * Uses refs and direct store access to avoid stale closure issues
   */
  const animate = useCallback(
    (timestamp: number) => {
      // Check if we should continue animating
      if (!isPlayingRef.current || !isEventModeRef.current) {
        animationFrameIdRef.current = null;
        lastTimestampRef.current = null;
        return;
      }

      // Initialize last timestamp on first frame
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
        animationFrameIdRef.current = requestAnimationFrame(animate);
        return;
      }

      // Calculate delta time in milliseconds
      const deltaTime = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      // Get active event directly from store
      const activeEvent = useEventStore.getState().getActiveEvent();
      if (!activeEvent) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
        return;
      }

      // Get current global time from ref (synced from store)
      const currentGlobalTime = globalTimeRef.current;

      // Calculate new global time based on speed
      const newGlobalTime = currentGlobalTime + deltaTime * speedRef.current;

      // Check if we've reached the end of the event
      if (newGlobalTime >= activeEvent.duration) {
        if (loopRef.current) {
          // Loop back to start
          useEventStore.getState().setGlobalTime(0);
          globalTimeRef.current = 0;

          // Update animation store progress
          useAnimationStore.getState().setProgress(0);
        } else {
          // Stop at the end
          useEventStore.getState().setGlobalTime(activeEvent.duration);
          globalTimeRef.current = activeEvent.duration;

          // Update animation store progress to 1 (end)
          useAnimationStore.getState().setProgress(1);

          // Calculate final positions
          const playerUpdates = calculatePlayerPositions(activeEvent.duration);
          if (playerUpdates.length > 0) {
            usePlayerStore.getState().updateMultiplePlayers(playerUpdates);
          }

          // Stop animation (progress setter in animationStore will handle pause)
          animationFrameIdRef.current = null;
          lastTimestampRef.current = null;
          return;
        }
      } else {
        // Update global time in store and ref
        useEventStore.getState().setGlobalTime(newGlobalTime);
        globalTimeRef.current = newGlobalTime;

        // Update progress in animation store
        useAnimationStore.getState().setProgress(newGlobalTime / activeEvent.duration);
      }

      // Calculate and update player positions
      const playerUpdates = calculatePlayerPositions(
        loopRef.current && newGlobalTime >= activeEvent.duration ? 0 : newGlobalTime
      );
      if (playerUpdates.length > 0) {
        usePlayerStore.getState().updateMultiplePlayers(playerUpdates);
      }

      // Schedule next frame
      animationFrameIdRef.current = requestAnimationFrame(animate);
    },
    [calculatePlayerPositions]
  );

  /**
   * Start animation loop
   */
  const startAnimation = useCallback(() => {
    // Don't start if already running
    if (animationFrameIdRef.current !== null) {
      return;
    }

    // Reset last timestamp to start fresh
    lastTimestampRef.current = null;

    // Start animation loop
    animationFrameIdRef.current = requestAnimationFrame(animate);
  }, [animate]);

  /**
   * Stop animation loop
   */
  const stopAnimation = useCallback(() => {
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    lastTimestampRef.current = null;
  }, []);

  // Start/stop animation based on isPlaying and isEventMode state
  useEffect(() => {
    if (isPlaying && isEventMode) {
      startAnimation();
    } else {
      stopAnimation();
    }

    // Cleanup on unmount
    return () => {
      stopAnimation();
    };
  }, [isPlaying, isEventMode, startAnimation, stopAnimation]);

  // When global time changes externally (e.g., scrubbing), update player positions
  // Only do this when not playing to avoid interfering with animation loop
  useEffect(() => {
    if (!isPlaying && isEventMode) {
      updatePositionsForCurrentTime();
    }
  }, [globalTime, isPlaying, isEventMode, updatePositionsForCurrentTime]);

  return {
    isAnimating: isPlaying && isEventMode,
    updatePositionsForCurrentTime,
  };
}

/**
 * Export Position3D type for external use
 */
export type Position3D = [number, number, number];
