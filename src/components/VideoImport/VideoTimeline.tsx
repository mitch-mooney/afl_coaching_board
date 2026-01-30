import { useState, useRef, useCallback, useEffect } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';
import { formatTime } from '../../utils/videoUtils';

/**
 * VideoTimeline component provides timeline scrubber, time display,
 * and playback controls for video playback management.
 *
 * Features:
 * - Timeline slider showing current position relative to duration
 * - Draggable scrubber for seeking to any position
 * - Current time and duration display in mm:ss format
 * - Play/pause button with visual state indication
 * - Frame step buttons (forward/back) for fine control
 * - Keyboard shortcuts (spacebar for play/pause, arrow keys for frame step)
 * - Full accessibility with ARIA labels and screen reader support
 */
export function VideoTimeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState<number>(0);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Store state
  const currentTime = useVideoStore((state) => state.currentTime);
  const duration = useVideoStore((state) => state.duration);
  const isPlaying = useVideoStore((state) => state.isPlaying);
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const setCurrentTime = useVideoStore((state) => state.setCurrentTime);

  // Playback controls from hook
  const {
    togglePlayPause,
    seekTo,
    stepFrameForward,
    stepFrameBackward,
    seekForward,
    seekBackward,
  } = useVideoPlayback();

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  /**
   * Convert mouse position on timeline to time value
   */
  const getTimeFromPosition = useCallback(
    (clientX: number): number => {
      if (!timelineRef.current || duration === 0) return 0;

      const rect = timelineRef.current.getBoundingClientRect();
      const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return position * duration;
    },
    [duration]
  );

  /**
   * Handle timeline click to seek
   */
  const handleTimelineClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isLoaded) return;

      const time = getTimeFromPosition(event.clientX);
      setCurrentTime(time);
      seekTo(time);
    },
    [isLoaded, getTimeFromPosition, setCurrentTime, seekTo]
  );

  /**
   * Handle drag start on timeline
   */
  const handleDragStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isLoaded) return;

      event.preventDefault();
      setIsDragging(true);

      const time = getTimeFromPosition(event.clientX);
      setCurrentTime(time);
      seekTo(time);
    },
    [isLoaded, getTimeFromPosition, setCurrentTime, seekTo]
  );

  /**
   * Handle mouse move during drag or hover
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const position = (event.clientX - rect.left) / rect.width;
      setHoverPosition(Math.max(0, Math.min(1, position)) * 100);

      const time = getTimeFromPosition(event.clientX);
      setHoverTime(time);

      if (isDragging && isLoaded) {
        setCurrentTime(time);
        seekTo(time);
      }
    },
    [isDragging, isLoaded, getTimeFromPosition, setCurrentTime, seekTo]
  );

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Handle mouse enter on timeline
   */
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  /**
   * Handle mouse leave on timeline
   */
  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setIsHovering(false);
    }
  }, [isDragging]);

  /**
   * Handle timeline mouse move for hover preview
   */
  const handleTimelineMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const position = (event.clientX - rect.left) / rect.width;
      setHoverPosition(Math.max(0, Math.min(1, position)) * 100);

      const time = getTimeFromPosition(event.clientX);
      setHoverTime(time);
    },
    [getTimeFromPosition]
  );

  /**
   * Global mouse move and up listeners for drag behavior
   */
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleDragEnd]);

  /**
   * Handle keyboard navigation on the timeline slider
   */
  const handleTimelineKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isLoaded || duration === 0) return;

      const step = duration * 0.01; // 1% of duration
      const largeStep = duration * 0.1; // 10% of duration

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) {
            const newTime = Math.min(duration, currentTime + largeStep);
            setCurrentTime(newTime);
            seekTo(newTime);
            setStatusMessage(`Skipped forward to ${formatTime(newTime)}`);
          } else {
            const newTime = Math.min(duration, currentTime + step);
            setCurrentTime(newTime);
            seekTo(newTime);
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) {
            const newTime = Math.max(0, currentTime - largeStep);
            setCurrentTime(newTime);
            seekTo(newTime);
            setStatusMessage(`Skipped backward to ${formatTime(newTime)}`);
          } else {
            const newTime = Math.max(0, currentTime - step);
            setCurrentTime(newTime);
            seekTo(newTime);
          }
          break;
        case 'Home':
          event.preventDefault();
          event.stopPropagation();
          setCurrentTime(0);
          seekTo(0);
          setStatusMessage('Jumped to start');
          break;
        case 'End':
          event.preventDefault();
          event.stopPropagation();
          setCurrentTime(duration);
          seekTo(duration);
          setStatusMessage('Jumped to end');
          break;
      }
    },
    [isLoaded, duration, currentTime, setCurrentTime, seekTo]
  );

  /**
   * Announce play/pause state changes for screen readers
   */
  const handlePlayPauseClick = useCallback(() => {
    togglePlayPause();
    setStatusMessage(isPlaying ? 'Paused' : 'Playing');
  }, [togglePlayPause, isPlaying]);

  /**
   * Keyboard shortcuts for playback control
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (!isLoaded) return;

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (event.shiftKey) {
            // Shift+Right: Skip forward 5 seconds
            seekForward(5);
          } else {
            // Right: Step forward 1 frame
            stepFrameForward(1);
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (event.shiftKey) {
            // Shift+Left: Skip backward 5 seconds
            seekBackward(5);
          } else {
            // Left: Step backward 1 frame
            stepFrameBackward(1);
          }
          break;
        case 'Home':
          event.preventDefault();
          seekTo(0);
          break;
        case 'End':
          event.preventDefault();
          seekTo(duration);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isLoaded,
    togglePlayPause,
    stepFrameForward,
    stepFrameBackward,
    seekForward,
    seekBackward,
    seekTo,
    duration,
  ]);

  return (
    <div
      className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 w-full"
      role="region"
      aria-label="Video playback controls"
    >
      {/* Screen reader status announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusMessage}
      </div>

      {/* Playback Controls */}
      <div
        className="flex items-center gap-3 mb-2"
        role="group"
        aria-label="Playback buttons"
      >
        {/* Skip Backward Button */}
        <button
          onClick={() => seekBackward(5)}
          disabled={!isLoaded}
          className="p-2 rounded hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
          aria-label="Skip backward 5 seconds"
          title="Skip backward 5 seconds (Shift+←)"
        >
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
            />
          </svg>
        </button>

        {/* Frame Backward Button */}
        <button
          onClick={() => stepFrameBackward(1)}
          disabled={!isLoaded}
          className="p-2 rounded hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
          aria-label="Step backward 1 frame"
          title="Step backward 1 frame (←)"
        >
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPauseClick}
          disabled={!isLoaded}
          className={`p-3 rounded-full transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
            isPlaying
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          aria-pressed={isPlaying}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Frame Forward Button */}
        <button
          onClick={() => stepFrameForward(1)}
          disabled={!isLoaded}
          className="p-2 rounded hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
          aria-label="Step forward 1 frame"
          title="Step forward 1 frame (→)"
        >
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Skip Forward Button */}
        <button
          onClick={() => seekForward(5)}
          disabled={!isLoaded}
          className="p-2 rounded hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
          aria-label="Skip forward 5 seconds"
          title="Skip forward 5 seconds (Shift+→)"
        >
          <svg
            className="w-5 h-5 text-gray-700"
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Time Display */}
        <div
          className="flex items-center gap-2 text-sm font-mono"
          role="timer"
          aria-label={`Current time: ${formatTime(currentTime)} of ${formatTime(duration)}`}
        >
          <span
            className="text-gray-800 min-w-[50px] text-right"
            aria-hidden="true"
          >
            {formatTime(currentTime)}
          </span>
          <span className="text-gray-400" aria-hidden="true">/</span>
          <span className="text-gray-500 min-w-[50px]" aria-hidden="true">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div
        ref={timelineRef}
        className={`relative h-3 bg-gray-200 rounded-full cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
          !isLoaded ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={handleTimelineClick}
        onMouseDown={handleDragStart}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleTimelineMouseMove}
        onKeyDown={handleTimelineKeyDown}
        role="slider"
        aria-label="Video timeline - Use left and right arrow keys to seek, Home for start, End for end"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        aria-orientation="horizontal"
        tabIndex={isLoaded ? 0 : -1}
      >
        {/* Progress Fill */}
        <div
          className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />

        {/* Hover Preview Line */}
        {isHovering && isLoaded && (
          <div
            className="absolute top-0 h-full w-0.5 bg-blue-300 pointer-events-none"
            style={{ left: `${hoverPosition}%`, transform: 'translateX(-50%)' }}
          />
        )}

        {/* Scrubber Handle */}
        <div
          className={`absolute top-1/2 w-4 h-4 bg-blue-500 rounded-full shadow-md transform -translate-y-1/2 -translate-x-1/2 transition-transform ${
            isDragging || isHovering ? 'scale-125' : 'scale-100 group-hover:scale-110'
          } ${!isLoaded ? 'hidden' : ''}`}
          style={{ left: `${progress}%` }}
        />

        {/* Hover Time Tooltip */}
        {isHovering && isLoaded && (
          <div
            className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap transform -translate-x-1/2"
            style={{ left: `${hoverPosition}%` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div
        className="mt-2 text-xs text-gray-400 text-center"
        aria-label="Keyboard shortcuts available"
      >
        <span className="hidden sm:inline" aria-hidden="true">
          Space: Play/Pause • ←/→: Frame step • Shift+←/→: Skip 5s
        </span>
        <span className="sr-only">
          Keyboard shortcuts: Space bar to play or pause, left and right arrows to step frames,
          Shift with arrows to skip 5 seconds, Home for start, End for end of video.
        </span>
      </div>
    </div>
  );
}
