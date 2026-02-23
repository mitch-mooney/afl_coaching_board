import { useState, useCallback, useEffect, useRef } from 'react';
import { VideoCanvas, useVideoCanvasRef } from './VideoCanvas';
import { VideoTimeline } from './VideoTimeline';
import { PlaybackControls } from './PlaybackControls';
import { PerspectiveCalibration } from './PerspectiveCalibration';
import { VideoExporter } from './VideoExporter';
import { CalibrationGridControls, useCalibrationGrid } from './CalibrationGrid';
import { useVideoStore } from '../../store/videoStore';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';

/**
 * Panel types for the right sidebar
 */
type SidebarPanel = 'calibration' | 'export' | 'grid' | null;

/**
 * Props for the VideoWorkspace component
 */
interface VideoWorkspaceProps {
  /** Callback when user exits video mode */
  onExitVideoMode?: () => void;
  /** Whether to show the field overlay by default */
  showFieldOverlay?: boolean;
}

/**
 * VideoWorkspace - The main container component for video import mode.
 *
 * This component combines all video-related components into a unified workspace:
 * - VideoCanvas as the main 3D view with video background
 * - VideoTimeline positioned at the bottom for scrubbing
 * - PlaybackControls for speed, loop, and volume
 * - Sidebar panels for calibration, grid, and export controls
 * - Close/exit video mode button
 *
 * Features:
 * - Responsive layout that maximizes canvas space
 * - Collapsible sidebar panels for calibration tools
 * - Keyboard shortcuts for video playback control
 * - Integrated video export functionality
 *
 * Keyboard Shortcuts:
 * - Space: Play/Pause
 * - Left/Right Arrow: Frame step
 * - Shift + Left/Right: Skip 5 seconds
 * - J: Slow down playback
 * - K: Play/Pause
 * - L: Speed up playback
 * - Escape: Exit video mode
 *
 * @example
 * ```tsx
 * <VideoWorkspace
 *   onExitVideoMode={() => setIsVideoMode(false)}
 *   showFieldOverlay={true}
 * />
 * ```
 */
export function VideoWorkspace({
  onExitVideoMode,
  showFieldOverlay = true,
}: VideoWorkspaceProps) {
  // Sidebar state
  const [activePanel, setActivePanel] = useState<SidebarPanel>('calibration');
  const [showSidebar, setShowSidebar] = useState(true);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Canvas reference for export
  const { canvasRef, setCanvasRef } = useVideoCanvasRef();

  // Calibration grid state
  const { gridSettings, updateGridSettings } = useCalibrationGrid();

  // Video store state
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const videoFile = useVideoStore((state) => state.videoFile);
  const clearVideo = useVideoStore((state) => state.clearVideo);
  const setIsVideoMode = useVideoStore((state) => state.setIsVideoMode);
  const setDisplayMode = useVideoStore((state) => state.setDisplayMode);
  const playbackRate = useVideoStore((state) => state.playbackRate);

  // Playback controls from hook
  const { togglePlayPause, setRate } = useVideoPlayback();

  /**
   * Handle exit video mode (close video completely)
   */
  const handleExitVideoMode = useCallback(() => {
    clearVideo();
    setIsVideoMode(false);
    if (onExitVideoMode) {
      onExitVideoMode();
    }
  }, [clearVideo, setIsVideoMode, onExitVideoMode]);

  /**
   * Handle exit to PiP mode (keep video, just switch display mode)
   */
  const handleExitToPiP = useCallback(() => {
    setDisplayMode('pip');
  }, [setDisplayMode]);

  /**
   * Toggle sidebar panel
   */
  const handlePanelToggle = useCallback((panel: SidebarPanel) => {
    setActivePanel((current) => (current === panel ? null : panel));
  }, []);

  /**
   * Toggle sidebar visibility
   */
  const toggleSidebar = useCallback(() => {
    setShowSidebar((prev) => !prev);
  }, []);

  /**
   * Handle J key - slow down playback
   */
  const handleSlowDown = useCallback(() => {
    const rates = [0.25, 0.5, 1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    if (currentIndex > 0) {
      setRate(rates[currentIndex - 1]);
    }
  }, [playbackRate, setRate]);

  /**
   * Handle L key - speed up playback
   */
  const handleSpeedUp = useCallback(() => {
    const rates = [0.25, 0.5, 1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    if (currentIndex < rates.length - 1) {
      setRate(rates[currentIndex + 1]);
    } else if (currentIndex === -1) {
      // If current rate is not in the list, set to 1x
      setRate(1);
    }
  }, [playbackRate, setRate]);

  /**
   * Keyboard shortcuts for video playback control
   * Note: Space, Arrow keys are already handled by VideoTimeline
   * This adds J/K/L shortcuts and Escape for exit
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
        case 'KeyJ':
          event.preventDefault();
          handleSlowDown();
          break;
        case 'KeyK':
          event.preventDefault();
          togglePlayPause();
          break;
        case 'KeyL':
          event.preventDefault();
          handleSpeedUp();
          break;
        case 'Escape':
          event.preventDefault();
          handleExitVideoMode();
          break;
        case 'Tab':
          // Toggle sidebar with Tab key
          event.preventDefault();
          toggleSidebar();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoaded, handleSlowDown, handleSpeedUp, togglePlayPause, handleExitVideoMode, toggleSidebar]);

  // Don't render if no video is loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <div
      ref={workspaceRef}
      className="w-full h-full relative flex bg-gray-900"
      role="region"
      aria-label="Video workspace"
    >
      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        <VideoCanvas
          showField={showFieldOverlay}
          enableControls={true}
          onCanvasReady={setCanvasRef}
          gridSettings={gridSettings}
        />

        {/* Top Bar with Video Info and Exit Button */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          {/* Video Info */}
          <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
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
              {videoFile?.name || 'Video'}
            </span>
          </div>

          {/* Exit Buttons */}
          <div className="flex items-center gap-2">
            {/* Exit to PiP Button */}
            <button
              onClick={handleExitToPiP}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/80 hover:bg-blue-600 backdrop-blur-sm text-white rounded-lg transition shadow-lg"
              aria-label="Exit to picture-in-picture"
              title="Exit to PiP view"
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
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                />
              </svg>
              <span className="hidden sm:inline">PiP</span>
            </button>

            {/* Close Video Button */}
            <button
              onClick={handleExitVideoMode}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm text-white rounded-lg transition shadow-lg"
              aria-label="Close video"
              title="Close video (Esc)"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </div>

        {/* Sidebar Toggle Button (when sidebar is hidden) */}
        {!showSidebar && (
          <button
            onClick={toggleSidebar}
            className="absolute top-1/2 right-0 transform -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-l-lg p-2 transition"
            aria-label="Show sidebar"
            title="Show tools (Tab)"
          >
            <svg
              className="w-5 h-5 text-gray-600"
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
        )}

        {/* Bottom Controls Container */}
        <div className="absolute left-4 right-4 z-10 flex flex-col gap-3" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          {/* Playback Controls Row */}
          <div className="flex items-center justify-center gap-4">
            <PlaybackControls />
          </div>

          {/* Timeline */}
          <VideoTimeline />

          {/* Keyboard Shortcuts Hint */}
          <div className="flex justify-center">
            <span className="text-xs text-white/60 bg-black/30 backdrop-blur-sm px-3 py-1 rounded">
              J/K/L: Speed Control | Tab: Toggle Panel | Esc: Exit
            </span>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-gray-100 border-l border-gray-300 flex flex-col overflow-hidden">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Video Tools</h2>
            <button
              onClick={toggleSidebar}
              className="p-1 hover:bg-gray-100 rounded transition"
              aria-label="Hide sidebar"
              title="Hide tools (Tab)"
            >
              <svg
                className="w-5 h-5 text-gray-600"
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
          </div>

          {/* Panel Navigation */}
          <div className="flex border-b border-gray-200 bg-white">
            <PanelTab
              active={activePanel === 'calibration'}
              onClick={() => handlePanelToggle('calibration')}
              icon={
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
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              }
              label="Calibrate"
            />
            <PanelTab
              active={activePanel === 'grid'}
              onClick={() => handlePanelToggle('grid')}
              icon={
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              }
              label="Grid"
            />
            <PanelTab
              active={activePanel === 'export'}
              onClick={() => handlePanelToggle('export')}
              icon={
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              }
              label="Export"
            />
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activePanel === 'calibration' && (
              <PerspectiveCalibration isExpanded={true} />
            )}

            {activePanel === 'grid' && (
              <CalibrationGridControls
                settings={gridSettings}
                onSettingsChange={updateGridSettings}
                isVideoLoaded={isLoaded}
              />
            )}

            {activePanel === 'export' && (
              <VideoExporter
                canvas={canvasRef.current}
                isExpanded={true}
              />
            )}

            {activePanel === null && (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">Select a tool from the tabs above</p>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="px-4 py-3 bg-white border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <p>
                <span className="font-medium">Tip:</span> Use the calibration tools to align the 3D
                field with your video.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Props for the PanelTab component
 */
interface PanelTabProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

/**
 * PanelTab - A tab button for the sidebar panel navigation
 */
function PanelTab({ active, onClick, icon, label }: PanelTabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 text-xs font-medium transition ${
        active
          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
      }`}
      role="tab"
      aria-selected={active}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/**
 * VideoWorkspaceCompact - A compact version of VideoWorkspace for smaller screens
 * or when used as an overlay on the main application
 */
export function VideoWorkspaceCompact({
  onExitVideoMode,
}: {
  onExitVideoMode?: () => void;
}) {
  return (
    <VideoWorkspace
      onExitVideoMode={onExitVideoMode}
      showFieldOverlay={true}
    />
  );
}

export default VideoWorkspace;
