import { useCallback, useEffect, useRef, useState } from 'react';
import { useVideoStore } from '../store/videoStore';
import { supportsVideoFrameCallback, clampTime } from '../utils/videoUtils';

/**
 * Frame metadata from requestVideoFrameCallback
 */
interface VideoFrameMetadata {
  presentationTime: number;
  expectedDisplayTime: number;
  width: number;
  height: number;
  mediaTime: number;
  presentedFrames: number;
  processingDuration?: number;
}

/**
 * Extended HTMLVideoElement type with requestVideoFrameCallback support
 */
interface VideoElementWithFrameCallback extends HTMLVideoElement {
  requestVideoFrameCallback?: (
    callback: (now: DOMHighResTimeStamp, metadata: VideoFrameMetadata) => void
  ) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
}

/**
 * Buffer state information for streaming video
 */
export interface BufferState {
  /** Whether the video is currently buffering */
  isBuffering: boolean;
  /** Percentage of video that has been buffered (0-100) */
  bufferedPercent: number;
  /** Array of buffered time ranges */
  bufferedRanges: Array<{ start: number; end: number }>;
  /** Whether enough data is buffered for smooth playback */
  canPlayThrough: boolean;
}

/**
 * Return type for the useVideoPlayback hook
 */
export interface UseVideoPlaybackReturn {
  /** Reference to the video element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Current frame number (based on assumed 30fps) */
  currentFrame: number;
  /** Whether browser supports frame-accurate callbacks */
  supportsFrameCallback: boolean;
  /** Buffer state for streaming large videos */
  bufferState: BufferState;
  /** Play the video */
  play: () => Promise<void>;
  /** Pause the video */
  pause: () => void;
  /** Toggle play/pause */
  togglePlayPause: () => Promise<void>;
  /** Seek to a specific time */
  seekTo: (time: number) => void;
  /** Seek forward by seconds */
  seekForward: (seconds: number) => void;
  /** Seek backward by seconds */
  seekBackward: (seconds: number) => void;
  /** Step forward by frames */
  stepFrameForward: (frames?: number) => void;
  /** Step backward by frames */
  stepFrameBackward: (frames?: number) => void;
  /** Set playback rate */
  setRate: (rate: number) => void;
  /** Set volume (0-1) */
  setVolume: (volume: number) => void;
  /** Toggle mute */
  toggleMute: () => void;
  /** Toggle looping */
  toggleLoop: () => void;
}

// Assumed frame rate for frame-based operations
const ASSUMED_FRAME_RATE = 30;

/**
 * Custom hook for managing video playback with frame-accurate synchronization.
 *
 * Features:
 * - Manages video element lifecycle
 * - Synchronizes playback state with videoStore
 * - Uses requestVideoFrameCallback for frame-accurate timing when available
 * - Falls back to requestAnimationFrame for browsers without support
 * - Handles play/pause/seek operations
 * - Proper cleanup on unmount
 *
 * @returns Object containing video ref, playback controls, and state
 */
/**
 * Default buffer state when no video is loaded
 */
const DEFAULT_BUFFER_STATE: BufferState = {
  isBuffering: false,
  bufferedPercent: 0,
  bufferedRanges: [],
  canPlayThrough: false,
};

/**
 * Helper function to get buffered ranges from a video element
 */
function getBufferedRanges(video: HTMLVideoElement): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < video.buffered.length; i++) {
    ranges.push({
      start: video.buffered.start(i),
      end: video.buffered.end(i),
    });
  }
  return ranges;
}

/**
 * Helper function to calculate buffered percentage
 */
function calculateBufferedPercent(video: HTMLVideoElement): number {
  if (!video.duration || video.duration === 0) return 0;
  if (video.buffered.length === 0) return 0;

  // Get total buffered time
  let totalBuffered = 0;
  for (let i = 0; i < video.buffered.length; i++) {
    totalBuffered += video.buffered.end(i) - video.buffered.start(i);
  }

  return Math.min((totalBuffered / video.duration) * 100, 100);
}

export function useVideoPlayback(): UseVideoPlaybackReturn {
  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameCallbackIdRef = useRef<number | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const objectUrlRef = useRef<string | null>(null);

  // Buffer state for streaming large videos
  const [bufferState, setBufferState] = useState<BufferState>(DEFAULT_BUFFER_STATE);

  // Store state and actions
  const videoElement = useVideoStore((state) => state.videoElement);
  const videoFile = useVideoStore((state) => state.videoFile);
  const isPlaying = useVideoStore((state) => state.isPlaying);
  const currentTime = useVideoStore((state) => state.currentTime);
  const duration = useVideoStore((state) => state.duration);
  const playbackRate = useVideoStore((state) => state.playbackRate);
  const isLooping = useVideoStore((state) => state.isLooping);
  const volume = useVideoStore((state) => state.volume);
  const isMuted = useVideoStore((state) => state.isMuted);

  const setCurrentTime = useVideoStore((state) => state.setCurrentTime);
  const setDuration = useVideoStore((state) => state.setDuration);
  const setIsPlaying = useVideoStore((state) => state.setIsPlaying);
  const setPlaybackRate = useVideoStore((state) => state.setPlaybackRate);
  const setIsLooping = useVideoStore((state) => state.setIsLooping);
  const setVolume = useVideoStore((state) => state.setVolume);
  const setIsMuted = useVideoStore((state) => state.setIsMuted);
  const toggleMute = useVideoStore((state) => state.toggleMute);
  const toggleLooping = useVideoStore((state) => state.toggleLooping);
  const stepForward = useVideoStore((state) => state.stepForward);
  const stepBackward = useVideoStore((state) => state.stepBackward);

  // Check for requestVideoFrameCallback support
  const supportsFrameCallback = supportsVideoFrameCallback();

  /**
   * Frame callback handler for requestVideoFrameCallback
   * Provides frame-accurate time synchronization
   */
  const handleFrameCallback = useCallback(
    (now: DOMHighResTimeStamp, metadata: VideoFrameMetadata) => {
      const video = videoRef.current as VideoElementWithFrameCallback;
      if (!video || video.paused || isSeekingRef.current) return;

      // Update current time from actual video playback
      if (Math.abs(metadata.mediaTime - lastSyncTimeRef.current) > 0.01) {
        setCurrentTime(metadata.mediaTime);
        lastSyncTimeRef.current = metadata.mediaTime;
      }

      // Schedule next frame callback
      if (video.requestVideoFrameCallback && !video.paused) {
        frameCallbackIdRef.current = video.requestVideoFrameCallback(handleFrameCallback);
      }
    },
    [setCurrentTime]
  );

  /**
   * Fallback animation frame handler for browsers without requestVideoFrameCallback
   */
  const handleAnimationFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.paused || isSeekingRef.current) return;

    // Sync time from video element
    if (Math.abs(video.currentTime - lastSyncTimeRef.current) > 0.01) {
      setCurrentTime(video.currentTime);
      lastSyncTimeRef.current = video.currentTime;
    }

    // Continue animation frame loop
    animationFrameIdRef.current = requestAnimationFrame(handleAnimationFrame);
  }, [setCurrentTime]);

  /**
   * Start time synchronization based on browser support
   */
  const startTimeSync = useCallback(() => {
    const video = videoRef.current as VideoElementWithFrameCallback;
    if (!video) return;

    // Cancel any existing callbacks
    if (frameCallbackIdRef.current !== null && video.cancelVideoFrameCallback) {
      video.cancelVideoFrameCallback(frameCallbackIdRef.current);
      frameCallbackIdRef.current = null;
    }
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    // Use requestVideoFrameCallback if available, otherwise fallback to RAF
    if (supportsFrameCallback && video.requestVideoFrameCallback) {
      frameCallbackIdRef.current = video.requestVideoFrameCallback(handleFrameCallback);
    } else {
      animationFrameIdRef.current = requestAnimationFrame(handleAnimationFrame);
    }
  }, [supportsFrameCallback, handleFrameCallback, handleAnimationFrame]);

  /**
   * Stop time synchronization
   */
  const stopTimeSync = useCallback(() => {
    const video = videoRef.current as VideoElementWithFrameCallback;

    if (frameCallbackIdRef.current !== null) {
      if (video?.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(frameCallbackIdRef.current);
      }
      frameCallbackIdRef.current = null;
    }

    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  }, []);

  /**
   * Play the video
   */
  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      await video.play();
      setIsPlaying(true);
      startTimeSync();
    } catch (error) {
      // Handle play interruption (e.g., user interaction required)
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Play was interrupted, this is normal
        return;
      }
      throw error;
    }
  }, [setIsPlaying, startTimeSync]);

  /**
   * Pause the video
   */
  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    setIsPlaying(false);
    stopTimeSync();

    // Sync final time
    setCurrentTime(video.currentTime);
  }, [setIsPlaying, stopTimeSync, setCurrentTime]);

  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      await play();
    } else {
      pause();
    }
  }, [play, pause]);

  /**
   * Seek to a specific time
   */
  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;

      const clampedTime = clampTime(time, video.duration || duration);
      isSeekingRef.current = true;
      video.currentTime = clampedTime;
    },
    [duration]
  );

  /**
   * Seek forward by a number of seconds
   */
  const seekForward = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;

      const newTime = clampTime(video.currentTime + seconds, video.duration);
      seekTo(newTime);
    },
    [seekTo]
  );

  /**
   * Seek backward by a number of seconds
   */
  const seekBackward = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;

      const newTime = clampTime(video.currentTime - seconds, video.duration);
      seekTo(newTime);
    },
    [seekTo]
  );

  /**
   * Step forward by frames
   */
  const stepFrameForward = useCallback(
    (frames: number = 1) => {
      const video = videoRef.current;
      if (!video) return;

      // Pause if playing for frame-accurate stepping
      if (!video.paused) {
        pause();
      }

      const frameDuration = 1 / ASSUMED_FRAME_RATE;
      const newTime = clampTime(video.currentTime + frames * frameDuration, video.duration);
      seekTo(newTime);
      stepForward(frames);
    },
    [pause, seekTo, stepForward]
  );

  /**
   * Step backward by frames
   */
  const stepFrameBackward = useCallback(
    (frames: number = 1) => {
      const video = videoRef.current;
      if (!video) return;

      // Pause if playing for frame-accurate stepping
      if (!video.paused) {
        pause();
      }

      const frameDuration = 1 / ASSUMED_FRAME_RATE;
      const newTime = clampTime(video.currentTime - frames * frameDuration, video.duration);
      seekTo(newTime);
      stepBackward(frames);
    },
    [pause, seekTo, stepBackward]
  );

  /**
   * Set playback rate
   */
  const setRate = useCallback(
    (rate: number) => {
      const video = videoRef.current;
      if (!video) return;

      // Clamp rate to reasonable values
      const clampedRate = Math.max(0.25, Math.min(4, rate));
      video.playbackRate = clampedRate;
      setPlaybackRate(clampedRate);
    },
    [setPlaybackRate]
  );

  /**
   * Set volume
   */
  const handleSetVolume = useCallback(
    (newVolume: number) => {
      const video = videoRef.current;
      if (!video) return;

      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      video.volume = clampedVolume;
      setVolume(clampedVolume);
    },
    [setVolume]
  );

  /**
   * Toggle mute
   */
  const handleToggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    toggleMute();
  }, [toggleMute]);

  /**
   * Toggle loop
   */
  const handleToggleLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.loop = !video.loop;
    toggleLooping();
  }, [toggleLooping]);

  // Calculate current frame based on current time
  const currentFrame = Math.floor(currentTime * ASSUMED_FRAME_RATE);

  /**
   * Effect: Sync with video element from store
   */
  useEffect(() => {
    if (videoElement && videoElement !== videoRef.current) {
      videoRef.current = videoElement;
    }
  }, [videoElement]);

  /**
   * Effect: Create video element from file if not already created
   */
  useEffect(() => {
    // If there's already a video element from the store, use it
    if (videoElement) {
      videoRef.current = videoElement;
      return;
    }

    // If there's a video file but no element, this hook won't create one
    // (VideoUploader handles initial element creation)
    // This effect just ensures the ref stays in sync
  }, [videoFile, videoElement]);

  /**
   * Effect: Set up video event listeners
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      // Apply current settings to the video element
      video.playbackRate = playbackRate;
      video.loop = isLooping;
      video.volume = volume;
      video.muted = isMuted;
    };

    const handleTimeUpdate = () => {
      // This is a fallback for when frame callbacks aren't active
      if (
        frameCallbackIdRef.current === null &&
        animationFrameIdRef.current === null &&
        !isSeekingRef.current
      ) {
        setCurrentTime(video.currentTime);
      }
    };

    const handleSeeked = () => {
      isSeekingRef.current = false;
      setCurrentTime(video.currentTime);
      lastSyncTimeRef.current = video.currentTime;
    };

    const handleSeeking = () => {
      isSeekingRef.current = true;
    };

    const handlePlay = () => {
      setIsPlaying(true);
      startTimeSync();
    };

    const handlePause = () => {
      setIsPlaying(false);
      stopTimeSync();
    };

    const handleEnded = () => {
      if (!video.loop) {
        setIsPlaying(false);
        stopTimeSync();
        setCurrentTime(video.duration);
      }
    };

    const handleRateChange = () => {
      setPlaybackRate(video.playbackRate);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    // Buffering event handlers for streaming large videos
    const handleWaiting = () => {
      // Video is waiting for more data - buffering
      setBufferState((prev) => ({
        ...prev,
        isBuffering: true,
      }));
    };

    const handleCanPlay = () => {
      // Enough data to start playing
      setBufferState((prev) => ({
        ...prev,
        isBuffering: false,
        bufferedPercent: calculateBufferedPercent(video),
        bufferedRanges: getBufferedRanges(video),
      }));
    };

    const handleCanPlayThrough = () => {
      // Enough data buffered to play through without interruption
      setBufferState({
        isBuffering: false,
        bufferedPercent: calculateBufferedPercent(video),
        bufferedRanges: getBufferedRanges(video),
        canPlayThrough: true,
      });
    };

    const handleProgress = () => {
      // New data has been downloaded
      setBufferState((prev) => ({
        ...prev,
        bufferedPercent: calculateBufferedPercent(video),
        bufferedRanges: getBufferedRanges(video),
      }));
    };

    const handleStalled = () => {
      // Download has stalled unexpectedly
      setBufferState((prev) => ({
        ...prev,
        isBuffering: true,
      }));
    };

    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('volumechange', handleVolumeChange);
    // Buffering events
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('stalled', handleStalled);

    // If metadata is already loaded, apply settings
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    // Initialize buffer state if video already has buffered data
    if (video.buffered.length > 0) {
      setBufferState({
        isBuffering: false,
        bufferedPercent: calculateBufferedPercent(video),
        bufferedRanges: getBufferedRanges(video),
        canPlayThrough: video.readyState >= 4,
      });
    }

    // Cleanup
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      // Buffering events
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('stalled', handleStalled);
    };
  }, [
    setDuration,
    setCurrentTime,
    setIsPlaying,
    setPlaybackRate,
    setVolume,
    setIsMuted,
    startTimeSync,
    stopTimeSync,
    playbackRate,
    isLooping,
    volume,
    isMuted,
  ]);

  /**
   * Effect: Sync store state changes to video element
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Sync currentTime from store (e.g., when user drags timeline)
    if (Math.abs(video.currentTime - currentTime) > 0.05 && !isSeekingRef.current) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  /**
   * Effect: Sync playback rate
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.playbackRate !== playbackRate) {
      video.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  /**
   * Effect: Sync loop setting
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.loop !== isLooping) {
      video.loop = isLooping;
    }
  }, [isLooping]);

  /**
   * Effect: Sync volume
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.volume !== volume) {
      video.volume = volume;
    }
  }, [volume]);

  /**
   * Effect: Sync mute state
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.muted !== isMuted) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  /**
   * Effect: Handle play/pause from store
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && video.paused) {
      video.play().catch(() => {
        // Handle autoplay restrictions silently
        setIsPlaying(false);
      });
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying, setIsPlaying]);

  /**
   * Effect: Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Stop all time synchronization
      stopTimeSync();

      // Revoke any object URLs we created
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      // Reset buffer state
      setBufferState(DEFAULT_BUFFER_STATE);
    };
  }, [stopTimeSync]);

  return {
    videoRef,
    currentFrame,
    supportsFrameCallback,
    bufferState,
    play,
    pause,
    togglePlayPause,
    seekTo,
    seekForward,
    seekBackward,
    stepFrameForward,
    stepFrameBackward,
    setRate,
    setVolume: handleSetVolume,
    toggleMute: handleToggleMute,
    toggleLoop: handleToggleLoop,
  };
}
