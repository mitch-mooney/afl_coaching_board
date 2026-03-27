import { useRef, useEffect, useState, useCallback } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';

// Size constraints
const MIN_WIDTH = 240;
const MIN_HEIGHT = 180;
const MAX_WIDTH = 960;
const MAX_HEIGHT = 720;
const DEFAULT_WIDTH = 360;

// Resize handle types
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

// Corner snap positions
type SnapCorner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

const SNAP_MARGIN = 16;

function getSnapPosition(corner: SnapCorner, width: number, height: number) {
  switch (corner) {
    case 'top-right':
      return { x: window.innerWidth - width - SNAP_MARGIN, y: 72 };
    case 'top-left':
      return { x: SNAP_MARGIN, y: 72 };
    case 'bottom-right':
      return { x: window.innerWidth - width - SNAP_MARGIN, y: window.innerHeight - height - SNAP_MARGIN - 32 };
    case 'bottom-left':
      return { x: SNAP_MARGIN, y: window.innerHeight - height - SNAP_MARGIN - 32 };
  }
}

/**
 * VideoPiP - Picture-in-Picture video display component.
 *
 * Shows the video in a small window in the top right corner of the screen.
 * Provides basic playback controls, fullscreen, volume, and concert-mode sync.
 * Window can be dragged and resized. Snaps to screen corners.
 */
export function VideoPiP() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeHandle>(null);
  const [position, setPosition] = useState({ x: -1, y: -1 }); // -1 means "use CSS default"
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

  // Video store state
  const videoElement = useVideoStore((state) => state.videoElement);
  const videoMetadata = useVideoStore((state) => state.videoMetadata);
  const isPlaying = useVideoStore((state) => state.isPlaying);
  const currentTime = useVideoStore((state) => state.currentTime);
  const duration = useVideoStore((state) => state.duration);
  const volume = useVideoStore((state) => state.volume);
  const isMuted = useVideoStore((state) => state.isMuted);
  const isSyncedWithAnimation = useVideoStore((state) => state.isSyncedWithAnimation);
  const setDisplayMode = useVideoStore((state) => state.setDisplayMode);
  const clearVideo = useVideoStore((state) => state.clearVideo);
  const setVolume = useVideoStore((state) => state.setVolume);
  const toggleMute = useVideoStore((state) => state.toggleMute);
  const toggleSyncWithAnimation = useVideoStore((state) => state.toggleSyncWithAnimation);

  // Playback controls
  const { togglePlayPause, seekTo } = useVideoPlayback();
  const setFullscreen = useVideoStore((state) => state.setFullscreen);

  // Sync video element (src, playback, time, volume)
  useEffect(() => {
    if (videoRef.current && videoElement) {
      if (videoElement.src && videoRef.current.src !== videoElement.src) {
        videoRef.current.src = videoElement.src;
      }

      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }

      if (Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
        videoRef.current.currentTime = currentTime;
      }

      // Apply volume/mute from store
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [videoElement, isPlaying, currentTime, volume, isMuted]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  // Calculate aspect ratio from video metadata
  const aspectRatio = videoMetadata ? videoMetadata.width / videoMetadata.height : 16 / 9;

  // Get actual height based on width and aspect ratio
  const actualHeight = size.height > 0 ? size.height : size.width / aspectRatio;

  // Fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

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
      const posX = position.x >= 0 ? position.x : window.innerWidth - rect.width - SNAP_MARGIN;
      const posY = position.y >= 0 ? position.y : 72;
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
        posX,
        posY,
      };
    }
  }, [position]);

  // Dragging movement
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - (containerRef.current?.offsetWidth || size.width);
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight || actualHeight + 80);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, size.width, actualHeight]);

  // Resize movement
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.current.x;
      const deltaY = e.clientY - resizeStart.current.y;
      let newWidth = resizeStart.current.width;
      let newHeight = resizeStart.current.height;
      let newPosX = resizeStart.current.posX;
      let newPosY = resizeStart.current.posY;

      switch (isResizing) {
        case 'e': newWidth += deltaX; break;
        case 'w': newWidth -= deltaX; newPosX += deltaX; break;
        case 's': newHeight += deltaY; break;
        case 'n': newHeight -= deltaY; newPosY += deltaY; break;
        case 'se': newWidth += deltaX; newHeight += deltaY; break;
        case 'sw': newWidth -= deltaX; newHeight += deltaY; newPosX += deltaX; break;
        case 'ne': newWidth += deltaX; newHeight -= deltaY; newPosY += deltaY; break;
        case 'nw': newWidth -= deltaX; newHeight -= deltaY; newPosX += deltaX; newPosY += deltaY; break;
      }

      newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
      if (newPosX < 0) { newWidth = resizeStart.current.width + resizeStart.current.posX; newPosX = 0; }
      if (newPosY < 0) { newHeight = resizeStart.current.height + resizeStart.current.posY; newPosY = 0; }

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newPosX, y: newPosY });
    };

    const handleMouseUp = () => setIsResizing(null);
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

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekTo(percent * duration);
  };

  const handleEnterCalibration = () => setDisplayMode('calibration');

  const handleSnapTo = (corner: SnapCorner) => {
    const pos = getSnapPosition(corner, size.width, actualHeight + 80);
    setPosition(pos);
  };

  const getCursor = () => {
    if (isDragging) return 'grabbing';
    switch (isResizing) {
      case 'n': case 's': return 'ns-resize';
      case 'e': case 'w': return 'ew-resize';
      case 'ne': case 'sw': return 'nesw-resize';
      case 'nw': case 'se': return 'nwse-resize';
    }
    return 'default';
  };

  // Use CSS positioning when at default position (top-right)
  const isDefaultPosition = position.x < 0 && position.y < 0;
  const positionStyle = isDefaultPosition
    ? { right: `${SNAP_MARGIN}px`, top: '72px' }
    : { left: `${position.x}px`, top: `${position.y}px` };

  if (isMinimized) {
    return (
      <div
        ref={containerRef}
        className="fixed z-50 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl cursor-move border border-white/10"
        style={positionStyle}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-white text-xs truncate max-w-[120px]">{videoMetadata?.fileName || 'Video'}</span>
          {isSyncedWithAnimation && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1">SYNC</span>
          )}
          <button onClick={() => setIsMinimized(false)} className="p-1 hover:bg-white/20 rounded transition ml-1" title="Expand">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <button onClick={clearVideo} className="p-1 hover:bg-red-500/50 rounded transition" title="Close video">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl overflow-visible border border-white/10"
      style={{
        width: `${size.width}px`,
        cursor: getCursor(),
        ...positionStyle,
      }}
    >
      {/* Resize Handles */}
      <div className="resize-handle absolute -top-1 -left-1 w-3 h-3 cursor-nwse-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
      <div className="resize-handle absolute -top-1 -right-1 w-3 h-3 cursor-nesw-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
      <div className="resize-handle absolute -bottom-1 -left-1 w-3 h-3 cursor-nesw-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
      <div className="resize-handle absolute -bottom-1 -right-1 w-3 h-3 cursor-nwse-resize z-10 bg-white/20 rounded-full hover:bg-white/40 transition" onMouseDown={(e) => handleResizeStart(e, 'se')} />
      <div className="resize-handle absolute -top-1 left-3 right-3 h-2 cursor-ns-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'n')} />
      <div className="resize-handle absolute -bottom-1 left-3 right-3 h-2 cursor-ns-resize z-10" onMouseDown={(e) => handleResizeStart(e, 's')} />
      <div className="resize-handle absolute top-3 bottom-3 -left-1 w-2 cursor-ew-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'w')} />
      <div className="resize-handle absolute top-3 bottom-3 -right-1 w-2 cursor-ew-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'e')} />

      <div className="rounded-xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-gray-800/90 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-white text-xs font-medium truncate" style={{ maxWidth: `${size.width - 160}px` }}>
              {videoMetadata?.fileName || 'Video'}
            </span>
            {isSyncedWithAnimation && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1 py-0.5 flex-shrink-0">
                SYNC
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Snap to corners */}
            <div className="flex gap-0.5 mr-1">
              {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as SnapCorner[]).map((corner) => (
                <button
                  key={corner}
                  onClick={() => handleSnapTo(corner)}
                  className="w-4 h-4 hover:bg-white/20 rounded transition flex items-center justify-center"
                  title={`Snap to ${corner.replace('-', ' ')}`}
                >
                  <div className={`w-2 h-2 rounded-sm border border-white/40 ${
                    corner === 'top-left' ? 'border-r-0 border-b-0' :
                    corner === 'top-right' ? 'border-l-0 border-b-0' :
                    corner === 'bottom-left' ? 'border-r-0 border-t-0' :
                    'border-l-0 border-t-0'
                  }`} />
                </button>
              ))}
            </div>

            <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/20 rounded transition" title="Minimize">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button onClick={handleToggleFullscreen} className="p-1 hover:bg-white/20 rounded transition" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {isFullscreen ? (
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 15v4.5M9 15H4.5M15 9h4.5M15 9V4.5M15 15h4.5M15 15v4.5" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
            <button onClick={clearVideo} className="p-1 hover:bg-red-500/50 rounded transition" title="Close video">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Video */}
        <div
          className="relative bg-black"
          style={{
            height: size.height > 0 ? `${size.height - 84}px` : 'auto',
            aspectRatio: size.height > 0 ? undefined : `${aspectRatio}`,
          }}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
          />

          {/* Play/Pause overlay (only shows when paused) */}
          {!isPlaying && (
            <button
              onClick={togglePlayPause}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition group"
            >
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition shadow-lg">
                <svg className="w-7 h-7 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-700 cursor-pointer group relative" onClick={handleProgressClick}>
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition -ml-1.5"
            style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Controls bar */}
        <div className="px-3 py-2 bg-gray-800/90 flex items-center justify-between gap-2">
          {/* Left: play + time */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className="p-1.5 hover:bg-white/20 rounded-lg transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <span className="text-white text-xs tabular-nums whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right: volume, concert mode, fullscreen */}
          <div className="flex items-center gap-1.5">
            {/* Volume control */}
            <div className="relative">
              <button
                onClick={() => setShowVolumeSlider((v) => !v)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536A5 5 0 006 12a5 5 0 002.464 4.536M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              {showVolumeSlider && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-white/10 rounded-lg p-3 shadow-xl z-20 flex flex-col items-center gap-2 w-10">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (v > 0 && isMuted) toggleMute();
                    }}
                    className="w-20 accent-amber-400"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '80px', width: '4px' }}
                    title="Volume"
                  />
                  <button
                    onClick={toggleMute}
                    className="text-xs text-gray-400 hover:text-white transition"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? 'unmute' : 'mute'}
                  </button>
                </div>
              )}
            </div>

            {/* Concert mode toggle */}
            <button
              onClick={toggleSyncWithAnimation}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                isSyncedWithAnimation
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
              }`}
              title={isSyncedWithAnimation ? 'Disable sync with 3D animation' : 'Sync playback with 3D animation'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden sm:inline">{isSyncedWithAnimation ? 'Synced' : 'Sync'}</span>
            </button>

            {/* Fullscreen telestration button */}
            <button
              onClick={() => setFullscreen(true)}
              className="flex items-center gap-1 px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition"
              title="Enter fullscreen telestration mode"
            >
              <svg
                className="w-3.5 h-3.5"
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
          </div>
        </div>
      </div>

      {/* Resize grip indicator */}
      <div className="absolute bottom-1.5 right-1.5 pointer-events-none opacity-30">
        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
        </svg>
      </div>
    </div>
  );
}

export default VideoPiP;
