import { useRef, useEffect, useState, useCallback } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';

// Size constraints
const MIN_WIDTH = 240;
const MIN_HEIGHT = 180;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const DEFAULT_WIDTH = 320;

// Resize handle types
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

/**
 * VideoPiP - Picture-in-Picture video display component.
 *
 * Shows the video in a small window in the top right corner of the screen.
 * Provides basic playback controls and a button to enter calibration mode.
 * Window can be dragged and resized.
 */
export function VideoPiP() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeHandle>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: 0 }); // height 0 means auto (aspect ratio)
  const [isMinimized, setIsMinimized] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

  // Video store state
  const videoElement = useVideoStore((state) => state.videoElement);
  const videoMetadata = useVideoStore((state) => state.videoMetadata);
  const isPlaying = useVideoStore((state) => state.isPlaying);
  const currentTime = useVideoStore((state) => state.currentTime);
  const duration = useVideoStore((state) => state.duration);
  const setDisplayMode = useVideoStore((state) => state.setDisplayMode);
  const clearVideo = useVideoStore((state) => state.clearVideo);

  // Playback controls
  const { togglePlayPause, seekTo } = useVideoPlayback();

  // Sync video playback state
  useEffect(() => {
    if (videoRef.current && videoElement) {
      // Copy the video source to our local video element
      if (videoElement.src && videoRef.current.src !== videoElement.src) {
        videoRef.current.src = videoElement.src;
      }

      // Sync playback state
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }

      // Sync current time (only if difference is significant)
      if (Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
        videoRef.current.currentTime = currentTime;
      }
    }
  }, [videoElement, isPlaying, currentTime]);

  // Calculate aspect ratio from video metadata
  const aspectRatio = videoMetadata ? videoMetadata.width / videoMetadata.height : 16 / 9;

  // Get actual height based on width and aspect ratio
  const actualHeight = size.height > 0 ? size.height : size.width / aspectRatio;

  // Handle dragging (header only)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('.resize-handle')) return;

    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(handle);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
        posX: position.x || (window.innerWidth - rect.width - 16),
        posY: position.y || 80,
      };
    }
  }, [position]);

  // Handle dragging movement
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      // Keep within viewport bounds
      const maxX = window.innerWidth - (containerRef.current?.offsetWidth || size.width);
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight || actualHeight + 80);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, size.width, actualHeight]);

  // Handle resize movement
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.current.x;
      const deltaY = e.clientY - resizeStart.current.y;

      let newWidth = resizeStart.current.width;
      let newHeight = resizeStart.current.height;
      let newPosX = resizeStart.current.posX;
      let newPosY = resizeStart.current.posY;

      // Calculate new dimensions based on which handle is being dragged
      switch (isResizing) {
        case 'e':
          newWidth = resizeStart.current.width + deltaX;
          break;
        case 'w':
          newWidth = resizeStart.current.width - deltaX;
          newPosX = resizeStart.current.posX + deltaX;
          break;
        case 's':
          newHeight = resizeStart.current.height + deltaY;
          break;
        case 'n':
          newHeight = resizeStart.current.height - deltaY;
          newPosY = resizeStart.current.posY + deltaY;
          break;
        case 'se':
          newWidth = resizeStart.current.width + deltaX;
          newHeight = resizeStart.current.height + deltaY;
          break;
        case 'sw':
          newWidth = resizeStart.current.width - deltaX;
          newHeight = resizeStart.current.height + deltaY;
          newPosX = resizeStart.current.posX + deltaX;
          break;
        case 'ne':
          newWidth = resizeStart.current.width + deltaX;
          newHeight = resizeStart.current.height - deltaY;
          newPosY = resizeStart.current.posY + deltaY;
          break;
        case 'nw':
          newWidth = resizeStart.current.width - deltaX;
          newHeight = resizeStart.current.height - deltaY;
          newPosX = resizeStart.current.posX + deltaX;
          newPosY = resizeStart.current.posY + deltaY;
          break;
      }

      // Apply constraints
      newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));

      // Prevent position from going negative
      if (newPosX < 0) {
        newWidth = resizeStart.current.width + resizeStart.current.posX;
        newPosX = 0;
      }
      if (newPosY < 0) {
        newHeight = resizeStart.current.height + resizeStart.current.posY;
        newPosY = 0;
      }

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newPosX, y: newPosY });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Format time as MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    seekTo(newTime);
  };

  // Enter calibration mode
  const handleEnterCalibration = () => {
    setDisplayMode('calibration');
  };

  // Calculate default position (top right)
  const defaultPosition = {
    right: position.x === 0 && position.y === 0 ? '16px' : 'auto',
    top: position.x === 0 && position.y === 0 ? '80px' : 'auto',
    left: position.x !== 0 || position.y !== 0 ? `${position.x}px` : 'auto',
    top2: position.x !== 0 || position.y !== 0 ? `${position.y}px` : '80px',
  };

  if (isMinimized) {
    return (
      <div
        ref={containerRef}
        className="fixed z-50 bg-gray-900 rounded-lg shadow-2xl cursor-move"
        style={{
          right: defaultPosition.right,
          top: defaultPosition.top,
          left: defaultPosition.left !== 'auto' ? defaultPosition.left : undefined,
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="text-white text-xs truncate max-w-[100px]">
            {videoMetadata?.fileName || 'Video'}
          </span>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 hover:bg-white/20 rounded transition"
            title="Expand"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
          <button
            onClick={clearVideo}
            className="p-1 hover:bg-red-500/50 rounded transition"
            title="Close video"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Determine cursor based on state
  const getCursor = () => {
    if (isDragging) return 'grabbing';
    if (isResizing) {
      switch (isResizing) {
        case 'n':
        case 's':
          return 'ns-resize';
        case 'e':
        case 'w':
          return 'ew-resize';
        case 'ne':
        case 'sw':
          return 'nesw-resize';
        case 'nw':
        case 'se':
          return 'nwse-resize';
      }
    }
    return 'default';
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-gray-900 rounded-lg shadow-2xl overflow-visible"
      style={{
        width: `${size.width}px`,
        right: position.x === 0 && position.y === 0 ? '16px' : 'auto',
        top: position.x === 0 && position.y === 0 ? '80px' : `${position.y}px`,
        left: position.x !== 0 ? `${position.x}px` : 'auto',
        cursor: getCursor(),
      }}
    >
      {/* Resize Handles */}
      {/* Corner handles */}
      <div
        className="resize-handle absolute -top-1 -left-1 w-3 h-3 cursor-nwse-resize z-10"
        onMouseDown={(e) => handleResizeStart(e, 'nw')}
      />
      <div
        className="resize-handle absolute -top-1 -right-1 w-3 h-3 cursor-nesw-resize z-10"
        onMouseDown={(e) => handleResizeStart(e, 'ne')}
      />
      <div
        className="resize-handle absolute -bottom-1 -left-1 w-3 h-3 cursor-nesw-resize z-10"
        onMouseDown={(e) => handleResizeStart(e, 'sw')}
      />
      <div
        className="resize-handle absolute -bottom-1 -right-1 w-3 h-3 cursor-nwse-resize z-10 bg-white/30 rounded-full hover:bg-white/50"
        onMouseDown={(e) => handleResizeStart(e, 'se')}
      />
      {/* Edge handles */}
      <div
        className="resize-handle absolute -top-1 left-3 right-3 h-2 cursor-ns-resize z-10"
        onMouseDown={(e) => handleResizeStart(e, 'n')}
      />
      <div
        className="resize-handle absolute -bottom-1 left-3 right-3 h-2 cursor-ns-resize z-10"
        onMouseDown={(e) => handleResizeStart(e, 's')}
      />
      <div
        className="resize-handle absolute top-3 bottom-3 -left-1 w-2 cursor-ew-resize z-10"
        onMouseDown={(e) => handleResizeStart(e, 'w')}
      />
      <div
        className="resize-handle absolute top-3 bottom-3 -right-1 w-2 cursor-ew-resize z-10"
        onMouseDown={(e) => handleResizeStart(e, 'e')}
      />

      {/* Main content container with overflow hidden */}
      <div className="rounded-lg overflow-hidden">
        {/* Header - draggable */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-white flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span className="text-white text-xs font-medium truncate" style={{ maxWidth: `${size.width - 120}px` }}>
              {videoMetadata?.fileName || 'Video'}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-white/20 rounded transition"
              title="Minimize"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            </button>
            <button
              onClick={clearVideo}
              className="p-1 hover:bg-red-500/50 rounded transition"
              title="Close video"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Video */}
        <div
          className="relative bg-black"
          style={{ height: size.height > 0 ? `${size.height - 80}px` : 'auto', aspectRatio: size.height > 0 ? undefined : `${aspectRatio}` }}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            muted
            playsInline
          />

          {/* Play/Pause overlay */}
          <button
            onClick={togglePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition group"
          >
            {!isPlaying && (
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition">
                <svg
                  className="w-6 h-6 text-gray-800 ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
          </button>
        </div>

        {/* Progress bar */}
        <div
          className="h-1 bg-gray-700 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Controls */}
        <div className="px-3 py-2 bg-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className="p-1 hover:bg-white/20 rounded transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <span className="text-white text-xs whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Calibrate button */}
          <button
            onClick={handleEnterCalibration}
            className="flex items-center gap-1 px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded transition flex-shrink-0"
            title="Enter calibration mode to overlay video on field"
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
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
            Calibrate
          </button>
        </div>
      </div>

      {/* Resize indicator in bottom-right corner */}
      <div className="absolute bottom-1 right-1 pointer-events-none opacity-50">
        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
        </svg>
      </div>
    </div>
  );
}

export default VideoPiP;
