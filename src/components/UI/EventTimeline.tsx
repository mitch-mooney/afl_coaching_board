import { useCallback, useRef, useState, useEffect } from 'react';
import {
  useAnimationStore,
  ANIMATION_SPEED_PRESETS,
  AnimationSpeed,
} from '../../store/animationStore';
import { useEventStore, formatEventTime } from '../../store/eventStore';
import { useResponsive } from '../../hooks/useResponsive';

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
 *
 * Responsive behavior:
 * - Mobile (<768px): Compact layout with stacked controls
 * - Desktop (>=768px): Full horizontal layout with all controls visible
 * - Touch-friendly 44px minimum tap targets on all buttons
 */
export function EventTimeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { isMobile } = useResponsive();

  // Animation store state
  const isPlaying = useAnimationStore((state) => state.isPlaying);
  const speed = useAnimationStore((state) => state.speed);
  const loop = useAnimationStore((state) => state.loop);
  const togglePlayback = useAnimationStore((state) => state.togglePlayback);
  const play = useAnimationStore((state) => state.play);
  const stop = useAnimationStore((state) => state.stop);
  const setSpeed = useAnimationStore((state) => state.setSpeed);
  const toggleLoop = useAnimationStore((state) => state.toggleLoop);

  // Event store state
  const globalTime = useEventStore((state) => state.globalTime);
  const activeEventId = useEventStore((state) => state.activeEventId);
  const getActiveEvent = useEventStore((state) => state.getActiveEvent);
  const setGlobalTime = useEventStore((state) => state.setGlobalTime);
  const pausedAtPhaseIndex = useEventStore((state) => state.pausedAtPhaseIndex);
  const setPausedAtPhaseIndex = useEventStore((state) => state.setPausedAtPhaseIndex);

  // Get active event
  const activeEvent = getActiveEvent();
  const duration = activeEvent?.duration ?? 0;

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

  // Phase helpers
  const sortedPhases = [...(activeEvent?.phases ?? [])].sort(
    (a, b) => a.startTime - b.startTime
  );

  // Determine which phase we're currently in (for the badge)
  const currentPhaseNumber = (() => {
    if (!activeEvent || sortedPhases.length === 0) return null;
    let phase = 1;
    for (let i = sortedPhases.length - 1; i >= 0; i--) {
      if (globalTime >= sortedPhases[i].startTime) {
        phase = i + 1;
        break;
      }
    }
    return phase;
  })();

  /**
   * Continue past a phase break
   */
  const handleContinue = useCallback(() => {
    setPausedAtPhaseIndex(-1);
    play();
  }, [setPausedAtPhaseIndex, play]);

  // Don't render if no active event
  if (!activeEventId || !activeEvent) {
    return null;
  }

  return (
    <div className={`
      absolute z-10
      ${isMobile
        ? 'bottom-2 left-2 right-2'
        : 'bottom-4 left-4 right-4'
      }
    `}>
      <div className={`
        bg-white/95 backdrop-blur-sm rounded-lg shadow-lg
        ${isMobile ? 'p-2 sm:p-3' : 'p-4'}
      `}>
        {/* Event Name Header */}
        <div className={`
          flex items-center justify-between
          ${isMobile ? 'mb-2' : 'mb-3'}
        `}>
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className={`
              font-semibold text-gray-700 truncate
              ${isMobile ? 'text-xs max-w-[45%]' : 'text-sm max-w-xs'}
            `}>
              {activeEvent.name}
            </h3>
            {sortedPhases.length > 1 && currentPhaseNumber !== null && (
              <span className="flex-shrink-0 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-semibold rounded-full whitespace-nowrap">
                Phase {currentPhaseNumber} / {sortedPhases.length}
              </span>
            )}
          </div>
          <span className={`
            text-gray-500
            ${isMobile ? 'text-[10px]' : 'text-xs'}
          `}>
            {isMobile ? formatEventTime(duration) : `Duration: ${formatEventTime(duration)}`}
          </span>
        </div>

        {/* Phase-break banner */}
        {pausedAtPhaseIndex >= 0 && sortedPhases[pausedAtPhaseIndex] && (
          <div className="mb-2 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-yellow-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block flex-shrink-0" />
                <span className="truncate">{sortedPhases[pausedAtPhaseIndex].name}</span>
              </div>
              {sortedPhases[pausedAtPhaseIndex].description && (
                <div className="text-xs text-yellow-700 mt-0.5 truncate">
                  {sortedPhases[pausedAtPhaseIndex].description}
                </div>
              )}
            </div>
            <button
              onClick={handleContinue}
              className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 transition whitespace-nowrap touch-manipulation min-h-[36px] flex-shrink-0"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Timeline Scrubber */}
        <div
          ref={timelineRef}
          className={`
            relative bg-gray-200 rounded-full cursor-pointer group touch-manipulation
            ${isMobile ? 'h-4 mb-2' : 'h-3 mb-3'}
          `}
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

          {/* Playhead - larger on mobile for easier touch */}
          <div
            className={`
              absolute top-1/2 -translate-y-1/2 bg-white border-2 border-blue-500 rounded-full shadow transition-transform
              ${isMobile
                ? 'w-5 h-5'
                : 'w-4 h-4'
              }
              ${isDragging ? 'scale-125' : 'group-hover:scale-110'}
            `}
            style={{ left: `calc(${progress * 100}% - ${isMobile ? 10 : 8}px)` }}
          />

          {/* Tick marks - hidden on mobile */}
          {!isMobile && (
            <div className="absolute inset-0 flex justify-between px-1">
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                <div
                  key={tick}
                  className="w-px h-1 bg-gray-400 opacity-50"
                  style={{ marginTop: '4px' }}
                />
              ))}
            </div>
          )}

          {/* Phase boundary markers */}
          {sortedPhases
            .filter((p) => p.startTime > 0)
            .map((phase) => (
              <div
                key={phase.id}
                className="absolute top-0 bottom-0 w-px bg-yellow-400 pointer-events-none"
                style={{ left: `${(phase.startTime / duration) * 100}%` }}
              >
                {!isMobile && (
                  <span className="absolute -top-5 left-1 text-[9px] text-yellow-600 whitespace-nowrap font-medium leading-none">
                    {phase.name}
                  </span>
                )}
              </div>
            ))}
        </div>

        {/* Controls Row - responsive layout */}
        <div className={`
          flex items-center
          ${isMobile
            ? 'flex-col gap-2'
            : 'justify-between'
          }
        `}>
          {/* Mobile: Time Display on top row */}
          {isMobile && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-mono text-sm font-semibold text-gray-800">
                {formatEventTime(globalTime)}
              </span>
              <span className="text-gray-400 text-xs">/</span>
              <span className="font-mono text-xs text-gray-500">
                {formatEventTime(duration)}
              </span>
            </div>
          )}

          {/* Main Controls Row */}
          <div className={`
            flex items-center
            ${isMobile
              ? 'justify-center gap-1.5 w-full'
              : 'gap-2'
            }
          `}>
            {/* Step Backward */}
            <button
              onClick={handleStepBackward}
              className={`
                flex items-center justify-center bg-gray-100 text-gray-600 rounded
                hover:bg-gray-200 active:bg-gray-300 transition touch-manipulation
                ${isMobile ? 'w-9 h-9 min-w-[36px] min-h-[36px]' : 'w-8 h-8'}
              `}
              title="Step backward 1 second"
              aria-label="Step backward"
            >
              <svg
                className={isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}
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
              className={`
                flex items-center justify-center bg-gray-500 text-white rounded-full
                hover:bg-gray-600 active:bg-gray-700 transition touch-manipulation
                ${isMobile ? 'w-9 h-9 min-w-[36px] min-h-[36px]' : 'w-10 h-10'}
              `}
              title="Stop and reset to start"
              aria-label="Stop"
            >
              <svg
                className={isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>

            {/* Play/Pause - Primary button, always touch-friendly */}
            <button
              onClick={togglePlayback}
              className={`
                flex items-center justify-center rounded-full transition touch-manipulation
                ${isPlaying
                  ? 'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white'
                  : 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white'
                }
                ${isMobile ? 'w-11 h-11 min-w-[44px] min-h-[44px]' : 'w-12 h-12'}
              `}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? (
                <svg
                  className={isMobile ? 'w-4 h-4' : 'w-5 h-5'}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg
                  className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} ml-0.5`}
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
              className={`
                flex items-center justify-center bg-gray-100 text-gray-600 rounded
                hover:bg-gray-200 active:bg-gray-300 transition touch-manipulation
                ${isMobile ? 'w-9 h-9 min-w-[36px] min-h-[36px]' : 'w-8 h-8'}
              `}
              title="Step forward 1 second"
              aria-label="Step forward"
            >
              <svg
                className={isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}
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

            {/* Loop Toggle - compact on mobile */}
            <button
              onClick={toggleLoop}
              className={`
                flex items-center justify-center rounded transition touch-manipulation
                ${loop
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:bg-blue-300'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'
                }
                ${isMobile ? 'w-9 h-9 min-w-[36px] min-h-[36px]' : 'px-3 py-1.5'}
              `}
              title={loop ? 'Loop enabled' : 'Loop disabled'}
              aria-label="Toggle loop"
              aria-pressed={loop}
            >
              <svg
                className={isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}
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

            {/* Speed Selector - compact on mobile */}
            <select
              id="speed-select"
              value={speed}
              onChange={handleSpeedChange}
              className={`
                bg-gray-100 border border-gray-200 rounded
                hover:bg-gray-200 transition cursor-pointer touch-manipulation
                ${isMobile
                  ? 'px-1.5 py-1.5 text-xs min-h-[36px]'
                  : 'px-2 py-1 text-sm'
                }
              `}
              aria-label="Playback speed"
            >
              {ANIMATION_SPEED_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {isMobile ? preset.label.replace(' ', '') : preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop: Time Display - center position */}
          {!isMobile && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-semibold text-gray-800">
                {formatEventTime(globalTime)}
              </span>
              <span className="text-gray-400">/</span>
              <span className="font-mono text-sm text-gray-500">
                {formatEventTime(duration)}
              </span>
            </div>
          )}

          {/* Desktop: Speed and Loop Controls - right side */}
          {!isMobile && (
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
                  htmlFor="speed-select-desktop"
                  className="text-xs text-gray-500"
                >
                  Speed:
                </label>
                <select
                  id="speed-select-desktop"
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
          )}
        </div>
      </div>
    </div>
  );
}
