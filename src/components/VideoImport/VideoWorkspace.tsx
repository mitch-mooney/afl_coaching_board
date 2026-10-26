import { useState, useCallback, useEffect, useRef } from 'react';
import { VideoTimeline } from './VideoTimeline';
import { PlaybackControls } from './PlaybackControls';
import { useVideoStore } from '../../store/videoStore';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';
import { useVideoElementSync } from '../../hooks/useVideoElementSync';
import { usePlayStore } from '../../store/playStore';
import { useUIStore } from '../../store/uiStore';
import { formatVideoTime } from '../../utils/videoUtils';
import { VideoUploader } from './VideoUploader';
import {
  dialogButton,
  dialogHint,
  dialogLit,
  dialogPrimaryButton,
} from '../UI/dialogStyles';

/** Where the workspace's own chrome starts: below the editor top bar. */
const WORKSPACE_TOP = 'calc(env(safe-area-inset-top, 0px) + 72px)';

/** A control over the video: Concrete glass edged in Steel. */
const chromeButton =
  'flex items-center gap-xs px-md min-h-[44px] bg-concrete/85 hover:bg-steel text-chalk text-label border border-steel rounded-control touch-manipulation motion-safe:transition-colors';

/**
 * A mark in the Link to Play bar: a start, an end, a quarter. Lit once set. The
 * lit and resting colours never share a class list, because Tailwind resolves
 * a clash by stylesheet order rather than by the order the classes are written.
 */
function markButton(lit: boolean) {
  return `px-sm min-h-[44px] min-w-[44px] text-label border rounded-chip whitespace-nowrap touch-manipulation ${
    lit ? dialogLit : 'text-chalk/80 bg-steel/40 border-steel'
  }`;
}

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

  // No video yet: this is where Link Video Moment lands, so the tab offers the
  // import and a way back rather than rendering nothing (issue 108).
  if (!isLoaded) {
    return (
      <div
        className="w-full h-full overflow-y-auto bg-concrete text-chalk flex flex-col items-center gap-lg px-lg"
        style={{
          paddingTop: WORKSPACE_TOP,
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        }}
        role="region"
        aria-label="Video workspace"
      >
        <VideoUploader title="Link a video moment" />
        <p className={`${dialogHint} max-w-md text-center`}>
          Choose the match video, then mark where the moment starts and ends.
        </p>
        <button onClick={handleExitToPiP} className={dialogButton} aria-label="Back to board">
          ← Board
        </button>
      </div>
    );
  }

  return (
    <div
      ref={workspaceRef}
      className="w-full h-full relative flex bg-concrete"
      role="region"
      aria-label="Video workspace"
    >
      <div className="flex-1 relative overflow-hidden">
        {/* Plain video player. Letterboxed on Concrete, not black: the video is
            the only picture on screen. */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain bg-concrete"
          playsInline
          onClick={togglePlayPause}
        />

        {/* Video name and exit controls, below the editor top bar */}
        <div
          className="absolute left-lg right-lg z-10 flex items-center justify-between gap-md"
          style={{ top: WORKSPACE_TOP }}
        >
          <div className="flex items-center gap-sm bg-concrete/85 border border-steel rounded-control px-md py-sm min-w-0 text-chalk">
            <svg className="w-4 h-4 text-chalk/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-label truncate max-w-xs">{videoFile?.name || 'Video'}</span>
          </div>

          <div className="flex items-center gap-sm flex-shrink-0">
            <button
              onClick={handleToggleFullscreen}
              className={chromeButton}
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
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
              <span className="hidden md:inline">{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
            </button>

            {/* Back to Board (the video floats as a PiP window there) */}
            <button
              onClick={handleExitToPiP}
              className={chromeButton}
              aria-label="Back to board"
              title="Back to board (video floats as a PiP window)"
            >
              <span>← Board</span>
            </button>

            {/* Close the video. Destructive, so a dashed edge rather than a colour. */}
            <button
              onClick={handleExitVideoMode}
              className={`${chromeButton} border-dashed border-chalk/50`}
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
        <div className="absolute left-lg right-lg z-10 flex flex-col gap-md" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex items-center justify-center gap-lg">
            <PlaybackControls />
          </div>

          {/* Link to Play: mark a start and an end, then link. A marked point
              is a state, so it is lit in Floodlight. */}
          {activePlayId != null && (
            <div className="bg-concrete/90 border border-steel rounded-control px-md py-sm flex items-center gap-sm flex-wrap text-chalk">
              <button
                onClick={() => setPendingStart(currentTime)}
                className={markButton(pendingStart != null)}
              >
                {pendingStart != null ? `Start: ${formatVideoTime(pendingStart)}` : '▶ Set start'}
              </button>

              <button
                onClick={() => setPendingEnd(currentTime)}
                className={markButton(pendingEnd != null)}
              >
                {pendingEnd != null ? `End: ${formatVideoTime(pendingEnd)}` : '■ Set end'}
              </button>

              <div className="flex gap-xs">
                {(['Q1', 'Q2', 'Q3', 'Q4', 'ET'] as const).map(q => (
                  <button
                    key={q}
                    onClick={() => setPendingQuarter(prev => prev === q ? null : q)}
                    className={markButton(pendingQuarter === q)}
                    aria-pressed={pendingQuarter === q}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <input
                value={pendingLabel}
                onChange={e => setPendingLabel(e.target.value.slice(0, 40))}
                placeholder="Event label…"
                maxLength={40}
                className="min-h-[44px] w-[140px] px-sm text-body bg-steel/40 text-chalk placeholder:text-chalk/40 border border-steel rounded-chip outline-none"
              />

              <button
                onClick={handleLinkToPlay}
                disabled={!linkReady}
                className={dialogPrimaryButton}
              >
                🎬 Link to Play
              </button>
            </div>
          )}

          <VideoTimeline />

          {/* Keyboard Shortcuts Hint */}
          <div className="hidden md:flex justify-center">
            <span className="text-caption text-chalk/60 bg-concrete/70 px-md py-xs rounded-chip">
              Space: Play/Pause | J/K/L: Speed | F: Fullscreen | Esc: Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoWorkspace;
