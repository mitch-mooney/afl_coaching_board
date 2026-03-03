import { useEffect, useRef, useCallback } from 'react';
import { useAnimationStore } from '../store/animationStore';
import { useEventStore } from '../store/eventStore';
import { usePlayerStore, PlayerUpdate } from '../store/playerStore';
import { usePathStore } from '../store/pathStore';
import { useBallStore } from '../store/ballStore';
import { getPositionAtTime } from '../utils/pathAnimation';
import { PlayerPathConfig, BallPathConfig } from '../models/EventModel';

/**
 * useAnimationPlayback - Hook for managing event-based animation playback
 *
 * This hook handles:
 * 1. requestAnimationFrame loop for smooth 60fps animation
 * 2. Global time progression based on playback speed
 * 3. Calculating player positions from paths at the current time
 * 4. Calculating ball positions from ballPaths during event playback
 * 5. Batch updating player and ball positions for performance
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
   * Calculate positions for all players (and ball) based on current global time.
   * For players with multiple phase paths, selects the path whose startTimeOffset
   * is the highest value <= currentGlobalTime (the "most recently started" phase).
   * Uses direct store access to avoid stale closures.
   */
  const calculatePlayerPositions = useCallback(
    (currentGlobalTime: number): PlayerUpdate[] => {
      const activeEvent = useEventStore.getState().getActiveEvent();
      if (!activeEvent) return [];

      const { getPath } = usePathStore.getState();

      // Build active path map for players
      const activePlayerPathMap = new Map<string, PlayerPathConfig>();
      for (const pathConfig of activeEvent.playerPaths) {
        const existing = activePlayerPathMap.get(pathConfig.playerId);
        if (pathConfig.startTimeOffset <= currentGlobalTime) {
          if (!existing || pathConfig.startTimeOffset > existing.startTimeOffset) {
            activePlayerPathMap.set(pathConfig.playerId, pathConfig);
          }
        } else {
          if (!existing) {
            activePlayerPathMap.set(pathConfig.playerId, pathConfig);
          }
        }
      }

      // Build active path map for ball
      const activeBallPathMap = new Map<string, BallPathConfig>();
      for (const pathConfig of activeEvent.ballPaths) {
        const existing = activeBallPathMap.get(pathConfig.entityId);
        if (pathConfig.startTimeOffset <= currentGlobalTime) {
          if (!existing || pathConfig.startTimeOffset > existing.startTimeOffset) {
            activeBallPathMap.set(pathConfig.entityId, pathConfig);
          }
        } else {
          if (!existing) {
            activeBallPathMap.set(pathConfig.entityId, pathConfig);
          }
        }
      }

      const playerUpdates: PlayerUpdate[] = [];

      // Process player paths
      for (const pathConfig of activePlayerPathMap.values()) {
        const path = getPath(pathConfig.pathId);
        if (!path) continue;

        const localTimeMs = currentGlobalTime - pathConfig.startTimeOffset;
        const localTimeSeconds = localTimeMs / 1000;

        let position: [number, number, number];

        if (localTimeMs < 0) {
          if (path.keyframes.length > 0) {
            position = [...path.keyframes[0].position] as [number, number, number];
          } else {
            continue;
          }
        } else if (localTimeSeconds > path.duration) {
          if (path.keyframes.length > 0) {
            const lastKeyframe = path.keyframes[path.keyframes.length - 1];
            position = [...lastKeyframe.position] as [number, number, number];
          } else {
            continue;
          }
        } else {
          position = getPositionAtTime(path, localTimeSeconds);
        }

        playerUpdates.push({
          playerId: pathConfig.playerId,
          position,
        });
      }

      // Process ball paths
      for (const pathConfig of activeBallPathMap.values()) {
        const path = getPath(pathConfig.pathId);
        if (!path) continue;

        const localTimeMs = currentGlobalTime - pathConfig.startTimeOffset;
        const localTimeSeconds = localTimeMs / 1000;

        let position: [number, number, number];

        if (localTimeMs < 0) {
          if (path.keyframes.length > 0) {
            position = [...path.keyframes[0].position] as [number, number, number];
          } else {
            continue;
          }
        } else if (localTimeSeconds > path.duration) {
          if (path.keyframes.length > 0) {
            const lastKeyframe = path.keyframes[path.keyframes.length - 1];
            position = [...lastKeyframe.position] as [number, number, number];
          } else {
            continue;
          }
        } else {
          position = getPositionAtTime(path, localTimeSeconds);
        }

        useBallStore.getState().updateBallPosition(position);
      }

      return playerUpdates;
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

      // Check for phase boundary crossings
      const sortedPhases = (activeEvent.phases ?? [])
        .filter((p) => p.startTime > 0)
        .sort((a, b) => a.startTime - b.startTime);

      const crossedPhase = sortedPhases.find(
        (p) => p.startTime > currentGlobalTime && p.startTime <= newGlobalTime
      );

      if (crossedPhase) {
        // Find the index within the full sorted phases array (including startTime=0)
        const allSorted = [...(activeEvent.phases ?? [])].sort(
          (a, b) => a.startTime - b.startTime
        );
        const crossedIndex = allSorted.findIndex((p) => p.id === crossedPhase.id);

        useEventStore.getState().setGlobalTime(crossedPhase.startTime);
        globalTimeRef.current = crossedPhase.startTime;
        useEventStore.getState().setPausedAtPhaseIndex(crossedIndex);

        const updates = calculatePlayerPositions(crossedPhase.startTime);
        if (updates.length > 0) {
          usePlayerStore.getState().updateMultiplePlayers(updates);
        }

        useAnimationStore.getState().pause();
        animationFrameIdRef.current = null;
        lastTimestampRef.current = null;
        return;
      }

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

          // Reset ball mode to idle when animation completes
          const activeEventState = useEventStore.getState().getActiveEvent();
          if (activeEventState && activeEventState.ballPaths && activeEventState.ballPaths.length > 0) {
            // Find the final ball path that was active at the end
            const finalPath = activeEventState.ballPaths
              .filter((bp) => bp.startTimeOffset <= activeEvent.duration)
              .sort((a, b) => b.startTimeOffset - a.startTimeOffset)[0];
            
            if (finalPath) {
              const path = usePathStore.getState().getPath(finalPath.pathId);
              if (path && activeEvent.duration >= path.duration * 1000 + finalPath.startTimeOffset) {
                // Animation path has completed - set ball to idle
                useBallStore.getState().setBallIdle();
              }
            }
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
      // Clear any phase-break banner when playback resumes
      useEventStore.getState().setPausedAtPhaseIndex(-1);
      
      // Transition ball to in-flight mode if event has ball paths
      const activeEvent = useEventStore.getState().getActiveEvent();
      if (activeEvent && activeEvent.ballPaths && activeEvent.ballPaths.length > 0) {
        const ballPathConfig = activeEvent.ballPaths.find(
          (bp) => bp.startTimeOffset <= useEventStore.getState().globalTime
        );
        if (ballPathConfig) {
          useBallStore.getState().setBallInFlight(ballPathConfig.pathId, ballPathConfig.kickType);
        }
      }
      
      startAnimation();
    } else {
      // Transition ball to idle mode when animation stops
      const activeEvent = useEventStore.getState().getActiveEvent();
      if (activeEvent && activeEvent.ballPaths && activeEvent.ballPaths.length > 0) {
        const globalTime = useEventStore.getState().globalTime;
        const finalPath = activeEvent.ballPaths
          .filter((bp) => bp.startTimeOffset <= globalTime)
          .sort((a, b) => b.startTimeOffset - a.startTimeOffset)[0];
        
        if (finalPath) {
          const path = usePathStore.getState().getPath(finalPath.pathId);
          if (path && globalTime >= path.duration * 1000 + finalPath.startTimeOffset) {
            // Animation has finished - check if ball should return to assigned or idle
            useBallStore.getState().setBallIdle();
          }
        } else {
          useBallStore.getState().setBallIdle();
        }
      }
      stopAnimation();
    }

    // Cleanup on unmount
    return () => {
      stopAnimation();
    };
  }, [isPlaying, isEventMode, startAnimation, stopAnimation]);

  // When global time changes externally (e.g., scrubbing), update player positions
  // Only do this when not playing to avoid interfering with animation loop.
  // isEventMode intentionally excluded from deps — don't snap players to t=0
  // when an event is first activated (players stay at current board positions).
  useEffect(() => {
    if (!isPlaying && isEventModeRef.current) {
      updatePositionsForCurrentTime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalTime, isPlaying, updatePositionsForCurrentTime]);

  return {
    isAnimating: isPlaying && isEventMode,
    updatePositionsForCurrentTime,
  };
}

/**
 * Export Position3D type for external use
 */
export type Position3D = [number, number, number];
