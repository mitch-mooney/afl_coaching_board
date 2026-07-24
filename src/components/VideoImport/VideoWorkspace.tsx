import { useState, useCallback, useEffect, useRef } from 'react';
import { VideoTimeline } from './VideoTimeline';
import { PlaybackControls } from './PlaybackControls';
import { useVideoStore } from '../../store/videoStore';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';
import { useVideoElementSync } from '../../hooks/useVideoElementSync';
import { usePlayStore } from '../../store/playStore';
import { useUIStore } from '../../store/uiStore';
import { formatVideoTime } from '../../utils/videoUtils';

/**
 * Props for the VideoWorkspace component
 */
interface VideoWorkspaceProps {
  /** Callback when user exits video mode */
  onExitVideoMode?: () => void;
}

/**
 * VideoWorkspace - Full-screen video review surface (the "Video" editor tab).
 *
 * A plain video player for reviewing an imported match clip and marking a
 * moment (in/out points) to link to the active play. It intentionally does NOT
 * overlay the 3D board on the video — the field-over-video calibration mode was
 * removed in the lean; board work happens on the Board tab, with the clip
 * available as a picture-in-picture window.
 *
 * Keyboard Shortcuts:
 * - Space / K: Play/Pause      - Left/Right Arrow: Frame step
 * - J: Slow down   L: Speed up  F: Fullscreen   Esc: Close video
 */
export function VideoWorkspace({ onExitVideoMode }: VideoWorkspaceProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Video store state
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const videoFile = useVideoStore((state) => state.videoFile);
  const clearVideo = useVideoStore((state) => state.clearVideo);
  const setIsVideoMode = useVideoStore((state) => state.setIsVideoMode);
  const playbackRate = useVideoStore((state) => state.playbackRate);
  const currentTime = useVideoStore((state) => state.currentTime);

  // Play store
  const activePlayId = usePlayStore((state) => state.activePlayId);
  const updatePlay = usePlayStore((state) => state.updatePlay);

  // UI store
  const setEditorTab = useUIStore((state) => state.setEditorTab);

  // Link to Play pending state
  const [pendingStart, setPendingStart] = useState<number | null>(null);
  const [pendingEnd, setPendingEnd] = useState<number | null>(null);
  const [pendingQuarter, setPendingQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ET' | null>(null);
  const [pendingLabel, setPendingLabel] = useState('');

  // Check if link to play button is ready
  const linkReady = pendingStart != null && pendingEnd != null && Math.abs((pendingEnd ?? 0) - (pendingStart ?? 0)) >= 1;

  // Playback controls from hook
  const { togglePlayPause, setRate } = useVideoPlayback();

  // Keep the local <video> mirrored to the shared store playback state.
  useVideoElementSync(videoRef);

  // Fullscreen change listener
  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const el = workspaceRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

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
   * Return to the Board tab (keeps the video; it floats as a PiP window there)
   */
  const handleExitToPiP = useCallback(() => {
    setEditorTab('board');
  }, [setEditorTab]);

  /**
   * Link the current pending start/end timestamps to the active play
   */
  const handleLinkToPlay = useCallback(async () => {
    if (activePlayId == null || pendingStart == null || pendingEnd == null) return;
    const start = Math.min(pendingStart, pendingEnd);
    const end = Math.max(pendingStart, pendingEnd);
    if (end - start < 1) return;

    const videoId = useVideoStore.getState().currentSavedVideoId;
    if (videoId == null) {
      alert('No video loaded. Import a video first.');
      return;
    }

    try {
      await updatePlay(activePlayId, {
        linkedVideoMoment: {
          videoId,
          startTime: start,
          endTime: end,
          quarter: pendingQuarter ?? undefined,
          label: pendingLabel.trim().slice(0, 40) || undefined,
        },
      });
    } catch (err) {
      console.error('[VideoWorkspace] failed to link video moment', err);
      return;
    }

    setPendingStart(null);
    setPendingEnd(null);
    setPendingQuarter(null);
    setPendingLabel('');
    setEditorTab('board');
  }, [activePlayId, pendingStart, pendingEnd, pendingQuarter, pendingLabel, updatePlay, setEditorTab]);

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
      setRate(1);
    }
  }, [playbackRate, setRate]);

  /**
   * Keyboard shortcuts for video playback control.
   * Space / Arrow keys are handled by VideoTimeline; this adds J/K/L, F, Esc.
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
        case 'KeyF':
          event.preventDefault();
          handleToggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoaded, handleSlowDown, handleSpeedUp, togglePlayPause, handleExitVideoMode, handleToggleFullscreen]);

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
      <div className="flex-1 relative overflow-hidden">
        {/* Plain video player */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          playsInline
          onClick={togglePlayPause}
        />

        {/* Top Bar with Video Info and Exit Buttons */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-3">
          {/* Video Info */}
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 min-w-0">
            <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-white text-sm font-medium truncate max-w-xs">{videoFile?.name || 'Video'}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Fullscreen toggle */}
            <button
              onClick={handleToggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white rounded-lg transition shadow-lg"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 15v4.5M9 15H4.5M15 9h4.5M15 9V4.5M15 15h4.5M15 15v4.5" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
              <span className="hidden md:inline">{isFullscreen ? 'Exit FS' : 'Fullscreen'}</span>
            </button>

            {/* Back to Board (video floats as PiP there) */}
            <button
              onClick={handleExitToPiP}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/80 hover:bg-blue-600 backdrop-blur-sm text-white rounded-lg transition shadow-lg"
              aria-label="Back to board"
              title="Back to board (video floats as a PiP window)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
              <span className="hidden sm:inline">Board</span>
            </button>

            {/* Close Video Button */}
            <button
              onClick={handleExitVideoMode}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm text-white rounded-lg transition shadow-lg"
              aria-label="Close video"
              title="Close video (Esc)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </div>

        {/* Bottom Controls Container */}
        <div className="absolute left-4 right-4 z-10 flex flex-col gap-3" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          {/* Playback Controls Row */}
          <div className="flex items-center justify-center gap-4">
            <PlaybackControls />
          </div>

          {/* Link to Play action bar */}
          {activePlayId != null && (
            <div style={{
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0,212,170,0.2)', borderRadius: 8,
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              margin: '4px 0',
            }}>
              {/* Set Start */}
              <button
                onClick={() => setPendingStart(currentTime)}
                style={{
                  background: pendingStart != null ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${pendingStart != null ? '#00d4aa' : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: 5, padding: '4px 10px',
                  color: pendingStart != null ? '#00d4aa' : '#aaa',
                  fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {pendingStart != null ? `Start: ${formatVideoTime(pendingStart)}` : '▶ Set Start'}
              </button>

              {/* Set End */}
              <button
                onClick={() => setPendingEnd(currentTime)}
                style={{
                  background: pendingEnd != null ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${pendingEnd != null ? '#00d4aa' : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: 5, padding: '4px 10px',
                  color: pendingEnd != null ? '#00d4aa' : '#aaa',
                  fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {pendingEnd != null ? `End: ${formatVideoTime(pendingEnd)}` : '■ Set End'}
              </button>

              {/* Quarter picker */}
              <div style={{ display: 'flex', gap: 3 }}>
                {(['Q1', 'Q2', 'Q3', 'Q4', 'ET'] as const).map(q => (
                  <button
                    key={q}
                    onClick={() => setPendingQuarter(prev => prev === q ? null : q)}
                    style={{
                      background: pendingQuarter === q ? 'rgba(0,153,255,0.25)' : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${pendingQuarter === q ? '#0099ff' : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: 4, padding: '3px 6px',
                      color: pendingQuarter === q ? '#0099ff' : '#888',
                      fontSize: 10, cursor: 'pointer',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Label input */}
              <input
                value={pendingLabel}
                onChange={e => setPendingLabel(e.target.value.slice(0, 40))}
                placeholder="Event label…"
                maxLength={40}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 5, padding: '4px 8px', color: '#ddd', fontSize: 11,
                  outline: 'none', width: 120,
                }}
              />

              {/* Confirm button */}
              <button
                onClick={handleLinkToPlay}
                disabled={!linkReady}
                style={{
                  background: linkReady ? 'linear-gradient(135deg, #00d4aa, #0099ff)' : 'rgba(255,255,255,0.1)',
                  border: 'none', borderRadius: 5, padding: '5px 12px',
                  color: linkReady ? '#000' : '#555',
                  fontSize: 11, fontWeight: 700, cursor: linkReady ? 'pointer' : 'default',
                  whiteSpace: 'nowrap', opacity: linkReady ? 1 : 0.5,
                }}
              >
                🎬 Link to Play
              </button>
            </div>
          )}

          {/* Timeline */}
          <VideoTimeline />

          {/* Keyboard Shortcuts Hint */}
          <div className="flex justify-center">
            <span className="text-xs text-white/60 bg-black/30 backdrop-blur-sm px-3 py-1 rounded">
              Space: Play/Pause | J/K/L: Speed | F: Fullscreen | Esc: Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoWorkspace;
