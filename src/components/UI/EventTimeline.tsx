import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  useAnimationStore,
  ANIMATION_SPEED_PRESETS,
  AnimationSpeed,
} from '../../store/animationStore';
import { useEventStore, formatEventTime } from '../../store/eventStore';
import { usePlayerStore } from '../../store/playerStore';
import { useCameraStore } from '../../store/cameraStore';

/**
 * EventTimeline component with scrubber and time display
 *
 * Features:
 * - Timeline slider showing 0 to event.duration
 * - Playhead position synced with eventStore.globalTime
 * - Click/drag to scrub via eventStore.setGlobalTime
 * - Time display in mm:ss.ms format
 * - Play/pause/stop buttons using animationStore actions
 * - Speed control for playback rate
 */
export function EventTimeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Animation store state
  const isPlaying = useAnimationStore((state) => state.isPlaying);
  const speed = useAnimationStore((state) => state.speed);
  const loop = useAnimationStore((state) => state.loop);
  const togglePlayback = useAnimationStore((state) => state.togglePlayback);
  const stop = useAnimationStore((state) => state.stop);
  const setSpeed = useAnimationStore((state) => state.setSpeed);
  const toggleLoop = useAnimationStore((state) => state.toggleLoop);

  // Event store state
  const globalTime = useEventStore((state) => state.globalTime);
  const activeEventId = useEventStore((state) => state.activeEventId);
  const getActiveEvent = useEventStore((state) => state.getActiveEvent);
  const setGlobalTime = useEventStore((state) => state.setGlobalTime);

  // Player store state
  const players = usePlayerStore((state) => state.players);

  // Camera store state for POV
  const povMode = useCameraStore((state) => state.povMode);
  const povPlayerId = useCameraStore((state) => state.povPlayerId);
  const enablePOV = useCameraStore((state) => state.enablePOV);
  const disablePOV = useCameraStore((state) => state.disablePOV);

  // Get active event
  const activeEvent = getActiveEvent();
  const duration = activeEvent?.duration ?? 0;

  // Get participating players grouped by team
  const participatingPlayers = useMemo(() => {
    if (!activeEvent) return { team1: [], team2: [] };

    const playerIds = new Set(activeEvent.playerPaths.map((pp) => pp.playerId));
    const team1: typeof players = [];
    const team2: typeof players = [];

    players.forEach((player) => {
      if (playerIds.has(player.id)) {
        if (player.teamId === 'team1') {
          team1.push(player);
        } else {
          team2.push(player);
        }
      }
    });

    return { team1, team2 };
  }, [activeEvent, players]);

  // Determine which players are currently animating based on time offset
  const animatingPlayerIds = useMemo(() => {
    if (!activeEvent) return new Set<string>();

    const animating = new Set<string>();
    activeEvent.playerPaths.forEach((pp) => {
      // Player is animating if globalTime >= their startTimeOffset
      if (globalTime >= pp.startTimeOffset) {
        animating.add(pp.playerId);
      }
    });
    return animating;
  }, [activeEvent, globalTime]);

  /**
   * Handle clicking on a player badge to toggle POV
   */
  const handlePlayerPOVClick = useCallback(
    (playerId: string) => {
      if (povMode && povPlayerId === playerId) {
        // If already viewing this player's POV, disable it
        disablePOV();
      } else {
        // Enable POV for this player
        enablePOV(playerId);
      }
    },
    [povMode, povPlayerId, enablePOV, disablePOV]
  );

  // Calculate progress (0-1) for timeline display
  const progress = duration > 0 ? globalTime / duration : 0;

  /**
   * Calculate time from mouse position on timeline
   */
  const getTimeFromPosition = useCallback(
    (clientX: number): number => {
      if (!timelineRef.current || duration <= 0) return 0;

      const rect = timelineRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
      return percentage * duration;
    },
    [duration]
  );

  /**
   * Handle click on timeline to jump to position
   */
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const time = getTimeFromPosition(e.clientX);
      setGlobalTime(time);
    },
    [getTimeFromPosition, setGlobalTime]
  );

  /**
   * Handle mouse down to start dragging
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
      const time = getTimeFromPosition(e.clientX);
      setGlobalTime(time);
    },
    [getTimeFromPosition, setGlobalTime]
  );

  /**
   * Handle mouse move during drag
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const time = getTimeFromPosition(e.clientX);
      setGlobalTime(time);
    },
    [isDragging, getTimeFromPosition, setGlobalTime]
  );

  /**
   * Handle mouse up to stop dragging
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for drag tracking
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  /**
   * Handle stop button click
   */
  const handleStop = useCallback(() => {
    stop();
    // Also reset global time to start
    setGlobalTime(0);
  }, [stop, setGlobalTime]);

  /**
   * Handle speed change
   */
  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSpeed = parseFloat(e.target.value) as AnimationSpeed;
      setSpeed(newSpeed);
    },
    [setSpeed]
  );

  /**
   * Handle step backward (jump 1 second back)
   */
  const handleStepBackward = useCallback(() => {
    const newTime = Math.max(0, globalTime - 1000);
    setGlobalTime(newTime);
  }, [globalTime, setGlobalTime]);

  /**
   * Handle step forward (jump 1 second forward)
   */
  const handleStepForward = useCallback(() => {
    const newTime = Math.min(duration, globalTime + 1000);
    setGlobalTime(newTime);
  }, [globalTime, duration, setGlobalTime]);

  // Don't render if no active event
  if (!activeEventId || !activeEvent) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10">
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
        {/* Event Name Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700 truncate max-w-xs">
            {activeEvent.name}
          </h3>
          <span className="text-xs text-gray-500">
            Duration: {formatEventTime(duration)}
          </span>
        </div>

        {/* Participating Players */}
        {(participatingPlayers.team1.length > 0 || participatingPlayers.team2.length > 0) && (
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-gray-500">Players:</span>
            <div className="flex gap-3">
              {/* Team 1 Players */}
              {participatingPlayers.team1.length > 0 && (
                <div className="flex gap-1">
                  {participatingPlayers.team1.map((player) => {
                    const isAnimating = animatingPlayerIds.has(player.id);
                    const isPOVTarget = povMode && povPlayerId === player.id;
                    return (
                      <button
                        key={player.id}
                        onClick={() => handlePlayerPOVClick(player.id)}
                        className={`text-white text-xs px-2 py-1 rounded font-medium transition-all cursor-pointer hover:scale-105 ${
                          isPOVTarget
                            ? 'bg-indigo-600 ring-2 ring-indigo-400 ring-offset-1'
                            : isAnimating
                            ? 'bg-blue-500 ring-2 ring-blue-300 ring-offset-1'
                            : 'bg-blue-300 hover:bg-blue-400'
                        }`}
                        title={`${isPOVTarget ? 'Exit POV' : 'Watch POV'}: ${player.playerName || `Player #${player.number}`}`}
                      >
                        {isPOVTarget && (
                          <svg className="w-3 h-3 inline mr-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                        )}
                        #{player.number}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Team 2 Players */}
              {participatingPlayers.team2.length > 0 && (
                <div className="flex gap-1">
                  {participatingPlayers.team2.map((player) => {
                    const isAnimating = animatingPlayerIds.has(player.id);
                    const isPOVTarget = povMode && povPlayerId === player.id;
                    return (
                      <button
                        key={player.id}
                        onClick={() => handlePlayerPOVClick(player.id)}
                        className={`text-white text-xs px-2 py-1 rounded font-medium transition-all cursor-pointer hover:scale-105 ${
                          isPOVTarget
                            ? 'bg-indigo-600 ring-2 ring-indigo-400 ring-offset-1'
                            : isAnimating
                            ? 'bg-red-500 ring-2 ring-red-300 ring-offset-1'
                            : 'bg-red-300 hover:bg-red-400'
                        }`}
                        title={`${isPOVTarget ? 'Exit POV' : 'Watch POV'}: ${player.playerName || `Player #${player.number}`}`}
                      >
                        {isPOVTarget && (
                          <svg className="w-3 h-3 inline mr-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                        )}
                        #{player.number}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline Scrubber */}
        <div
          ref={timelineRef}
          className="relative h-3 bg-gray-200 rounded-full cursor-pointer mb-3 group"
          onClick={handleTimelineClick}
          onMouseDown={handleMouseDown}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={globalTime}
          aria-label="Animation timeline"
          tabIndex={0}
        >
          {/* Progress Fill */}
          <div
            className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-75"
            style={{ width: `${progress * 100}%` }}
          />

          {/* Playhead */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow transition-transform ${
              isDragging ? 'scale-125' : 'group-hover:scale-110'
            }`}
            style={{ left: `calc(${progress * 100}% - 8px)` }}
          />

          {/* Tick marks */}
          <div className="absolute inset-0 flex justify-between px-1">
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
              <div
                key={tick}
                className="w-px h-1 bg-gray-400 opacity-50"
                style={{ marginTop: '4px' }}
              />
            ))}
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left: Playback Controls */}
          <div className="flex items-center gap-2">
            {/* Step Backward */}
            <button
              onClick={handleStepBackward}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
              title="Step backward 1 second"
              aria-label="Step backward"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                />
              </svg>
            </button>

            {/* Stop */}
            <button
              onClick={handleStop}
              className="w-10 h-10 flex items-center justify-center bg-gray-500 text-white rounded-full hover:bg-gray-600 transition"
              title="Stop and reset to start"
              aria-label="Stop"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlayback}
              className={`w-12 h-12 flex items-center justify-center rounded-full transition ${
                isPlaying
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 ml-0.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Step Forward */}
            <button
              onClick={handleStepForward}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
              title="Step forward 1 second"
              aria-label="Step forward"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
                />
              </svg>
            </button>
          </div>

          {/* Center: Time Display */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-semibold text-gray-800">
              {formatEventTime(globalTime)}
            </span>
            <span className="text-gray-400">/</span>
            <span className="font-mono text-sm text-gray-500">
              {formatEventTime(duration)}
            </span>
          </div>

          {/* Right: Speed and Loop Controls */}
          <div className="flex items-center gap-3">
            {/* Loop Toggle */}
            <button
              onClick={toggleLoop}
              className={`px-3 py-1.5 rounded text-sm transition ${
                loop
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={loop ? 'Loop enabled' : 'Loop disabled'}
              aria-label="Toggle loop"
              aria-pressed={loop}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1">
              <label
                htmlFor="speed-select"
                className="text-xs text-gray-500"
              >
                Speed:
              </label>
              <select
                id="speed-select"
                value={speed}
                onChange={handleSpeedChange}
                className="px-2 py-1 text-sm bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 transition cursor-pointer"
                aria-label="Playback speed"
              >
                {ANIMATION_SPEED_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
