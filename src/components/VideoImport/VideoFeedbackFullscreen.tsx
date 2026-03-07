import { useRef, useEffect, useState, useCallback } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';
import { VideoCanvas } from './VideoCanvas';
import { AnnotationToolbar } from '../UI/AnnotationToolbar';
import { PlaybackControls } from './PlaybackControls';

/**
 * VideoFeedbackFullscreen - Fullscreen video feedback mode with telestration tools.
 * 
 * This component provides a full-screen video review experience with:
 * - Fullscreen video playback (fills entire screen)
 * - Always-visible AnnotationToolbar for telestrations
 * - Playback controls (play/pause, seek, speed, loop, volume)
 * - Export functionality to download video with annotations burned in
 * - Persistent annotations across fullscreen sessions
 * - Smooth transitions between PiP and fullscreen modes
 * 
 * Use cases:
 * - Video review and analysis
 * - Drawing plays directly over video footage
 * - Creating annotated video highlights
 * - Coaching feedback sessions
 * 
 * @example
 * ```tsx
 * <VideoFeedbackFullscreen
 *   onExitFullscreen={() => setFullscreen(false)}
 * />
 * ```
 */
export function VideoFeedbackFullscreen() {
  const videoElement = useVideoStore((state) => state.videoElement);
  const videoMetadata = useVideoStore((state) => state.videoMetadata);
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const displayMode = useVideoStore((state) => state.displayMode);
  const setFullscreen = useVideoStore((state) => state.setFullscreen);
  const setDisplayMode = useVideoStore((state) => state.setDisplayMode);
  
  const { togglePlayPause, seekTo } = useVideoPlayback();
  
  // Local state for UI
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Handle exit fullscreen mode
   */
  const handleExitFullscreen = useCallback(() => {
    setFullscreen(false);
    setDisplayMode('pip');
  }, [setFullscreen, setDisplayMode]);
  
  /**
   * Reset controls visibility timer
   */
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);
  
  /**
   * Handle mouse movement to show controls
   */
  const handleMouseMove = useCallback(() => {
    if (displayMode === 'calibration' || displayMode === 'pip') {
      resetControlsTimer();
    }
  }, [displayMode, resetControlsTimer]);
  
  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case 'Escape':
        e.preventDefault();
        handleExitFullscreen();
        break;
      case 'Space':
      case 'KeyK':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        seekTo(Math.max(0, useVideoStore.getState().currentTime - 5));
        break;
      case 'ArrowRight':
        e.preventDefault();
        seekTo(Math.min(useVideoStore.getState().duration, useVideoStore.getState().currentTime + 5));
        break;
    }
  }, [handleExitFullscreen, togglePlayPause, seekTo]);
  
  useEffect(() => {
    if (displayMode === 'calibration' && isLoaded) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('keydown', handleKeyDown);
      
      // Initialize controls visibility
      resetControlsTimer();
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('keydown', handleKeyDown);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      };
    }
  }, [displayMode, isLoaded, handleMouseMove, handleKeyDown, resetControlsTimer]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (!isLoaded || !videoElement) {
    return null;
  }
  
  return (
    <div 
      className="w-full h-full bg-black relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Video Canvas Layer */}
      <div className="absolute inset-0">
        <VideoCanvas
          showField={false}
          enableControls={false}
          onCanvasReady={() => {}}
        />
      </div>
      
      {/* Exit Button - Always visible */}
      <button
        onClick={handleExitFullscreen}
        className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition"
        title="Exit fullscreen (Esc)"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
          />
        </svg>
        <span className="font-medium">Exit Fullscreen</span>
      </button>
      
      {/* Video Info - Top Left */}
      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-white"
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
          <span className="text-white text-sm font-medium truncate max-w-xs">
            {videoMetadata?.fileName || 'Video'}
          </span>
        </div>
      </div>
      
      {/* Bottom Controls Layer - Always visible in fullscreen mode */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        }`}
      >
        {/* Progress Bar */}
        <ProgressOverlay seekTo={seekTo} />
        
        {/* Controls Row */}
        <div className="bg-gradient-to-t from-black/80 via-black/60 to-transparent px-4 py-3">
          <div className="flex items-center justify-center gap-4">
            {/* Playback Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlayPause}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition"
                title={useVideoStore.getState().isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {useVideoStore.getState().isPlaying ? (
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              
              <div className="flex items-center gap-2 text-white text-sm">
                <span className="font-mono">
                  {formatTime(useVideoStore.getState().currentTime)} / {formatTime(useVideoStore.getState().duration)}
                </span>
              </div>
            </div>
            
            {/* Additional Playback Controls */}
            <PlaybackControls />
          </div>
        </div>
      </div>
      
      {/* Annotation Toolbar - Always visible at top */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
        <AnnotationToolbar fullscreen={true} />
      </div>
    </div>
  );
}

/**
 * Progress bar overlay component
 */
function ProgressOverlay({ seekTo }: { seekTo: (time: number) => void }) {
  const currentTime = useVideoStore((state) => state.currentTime);
  const duration = useVideoStore((state) => state.duration);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration === 0) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    seekTo(newTime);
  }, [duration, seekTo]);
  
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  return (
    <div
      ref={progressBarRef}
      onClick={handleProgressClick}
      className="h-2 bg-black/40 cursor-pointer hover:h-3 transition-all"
      title="Click to seek"
    >
      <div
        className="h-full bg-blue-500 hover:bg-blue-400 transition-colors"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );
}

/**
 * Compact fullscreen mode for quick access
 */
export function VideoFeedbackFullscreenCompact() {
  return <VideoFeedbackFullscreen />;
}

export default VideoFeedbackFullscreen;
