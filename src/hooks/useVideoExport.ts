import { useCallback, useRef, useState } from 'react';
import { useVideoStore, ExportSettings } from '../store/videoStore';
import {
  supportsMediaRecorder,
  getSupportedExportFormats,
  formatTime,
} from '../utils/videoUtils';

/**
 * Export state for tracking progress
 */
export interface ExportState {
  /** Whether export is currently in progress */
  isExporting: boolean;
  /** Export progress as a percentage (0-100) */
  progress: number;
  /** Current export phase description */
  phase: string;
  /** Error message if export failed */
  error: string | null;
  /** Whether export was cancelled */
  isCancelled: boolean;
  /** Whether audio is included in the export */
  hasAudio: boolean;
}

/**
 * Export options for customizing the export process
 */
export interface ExportOptions {
  /** Start time in seconds (default: 0) */
  startTime?: number;
  /** End time in seconds (default: video duration) */
  endTime?: number;
  /** Frame rate for export (default: 30) */
  frameRate?: number;
  /** Video bitrate in bits per second (default: 2500000 for 2.5 Mbps) */
  videoBitrate?: number;
  /** Audio bitrate in bits per second (default: 128000 for 128 kbps) */
  audioBitrate?: number;
  /** Whether to include audio (default: true) */
  includeAudio?: boolean;
  /** Custom filename (default: auto-generated) */
  filename?: string;
}

/**
 * Return type for the useVideoExport hook
 */
export interface UseVideoExportReturn {
  /** Current export state */
  exportState: ExportState;
  /** Whether MediaRecorder is supported */
  isSupported: boolean;
  /** List of supported export MIME types */
  supportedFormats: string[];
  /** Start the video export */
  startExport: (canvas: HTMLCanvasElement, options?: ExportOptions) => Promise<void>;
  /** Cancel an ongoing export */
  cancelExport: () => void;
  /** Reset export state to initial values */
  resetExportState: () => void;
  /** Get the best supported MIME type for export (pass true to prefer audio codecs) */
  getBestMimeType: (withAudio?: boolean) => string | null;
}

/** Default export options */
const DEFAULT_OPTIONS: Required<Omit<ExportOptions, 'filename'>> & { filename: string | null } = {
  startTime: 0,
  endTime: 0, // Will be set to duration
  frameRate: 30,
  videoBitrate: 2500000,
  audioBitrate: 128000,
  includeAudio: true,
  filename: null,
};

/** Initial export state */
const INITIAL_EXPORT_STATE: ExportState = {
  isExporting: false,
  progress: 0,
  phase: '',
  error: null,
  isCancelled: false,
  hasAudio: false,
};

/**
 * Resolution presets for export
 */
export const RESOLUTION_PRESETS = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  original: null, // Use original video dimensions
} as const;

/**
 * MIME types with audio codec specifications for better synchronization.
 * Audio codec (opus) is specified for WebM to ensure proper audio encoding.
 */
const MIME_TYPES_WITH_AUDIO = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
] as const;

const MIME_TYPES_VIDEO_ONLY = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
] as const;

/**
 * Custom hook for handling video export with 3D overlay.
 *
 * Features:
 * - Captures Three.js canvas output using captureStream()
 * - Encodes video using MediaRecorder API
 * - Synchronizes export with original video playback timing
 * - Captures and synchronizes original audio track with overlay
 * - Supports WebM and MP4 output formats
 * - Provides progress tracking for UI updates
 * - Handles export cancellation
 * - Proper error handling for unsupported browsers
 *
 * Audio Synchronization Strategy:
 * 1. Seek video to export start time before capturing audio stream
 * 2. Capture audio from video element's captureStream() which stays synced with playback
 * 3. Clone audio tracks to avoid interference with original video
 * 4. Use MIME types with explicit audio codec (opus) for proper encoding
 * 5. Record combined stream as video plays to maintain natural sync
 *
 * @returns Object containing export state, controls, and capabilities
 */
export function useVideoExport(): UseVideoExportReturn {
  // State
  const [exportState, setExportState] = useState<ExportState>(INITIAL_EXPORT_STATE);

  // Refs for managing export lifecycle
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const exportVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // Store state
  const videoElement = useVideoStore((state) => state.videoElement);
  const duration = useVideoStore((state) => state.duration);
  const exportSettings = useVideoStore((state) => state.exportSettings);
  const videoMetadata = useVideoStore((state) => state.videoMetadata);

  // Check browser support
  const isSupported = supportsMediaRecorder();
  const supportedFormats = getSupportedExportFormats();

  /**
   * Get the best MIME type for the requested format.
   * When audio is included, prefers MIME types with opus audio codec.
   *
   * @param withAudio - Whether to prefer MIME types with audio codec support
   */
  const getBestMimeType = useCallback(
    (withAudio: boolean = false): string | null => {
      if (!isSupported) {
        return null;
      }

      const format = exportSettings.format;

      // Select MIME type candidates based on audio requirement
      const mimeTypes = withAudio ? MIME_TYPES_WITH_AUDIO : MIME_TYPES_VIDEO_ONLY;

      if (format === 'webm') {
        // Try each WebM MIME type in order of preference
        for (const mimeType of mimeTypes) {
          if (mimeType.startsWith('video/webm') && MediaRecorder.isTypeSupported(mimeType)) {
            return mimeType;
          }
        }
      }

      if (format === 'mp4') {
        // MP4 support is limited in browsers
        if (MediaRecorder.isTypeSupported('video/mp4')) {
          return 'video/mp4';
        }
        // Fall back to webm if mp4 not supported
        return getBestWebmMimeType(withAudio);
      }

      // Default: try all supported formats
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          return mimeType;
        }
      }

      return null;
    },
    [isSupported, exportSettings.format]
  );

  /**
   * Helper to get best WebM MIME type
   * @param withAudio - Whether to prefer MIME types with audio codec support
   */
  const getBestWebmMimeType = useCallback((withAudio: boolean = false): string | null => {
    const mimeTypes = withAudio ? MIME_TYPES_WITH_AUDIO : MIME_TYPES_VIDEO_ONLY;

    for (const mimeType of mimeTypes) {
      if (mimeType.startsWith('video/webm') && MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    return null;
  }, []);

  /**
   * Clean up all resources used during export
   */
  const cleanup = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore errors during cleanup
      }
    }
    mediaRecorderRef.current = null;

    // Stop canvas stream tracks
    if (canvasStreamRef.current) {
      canvasStreamRef.current.getTracks().forEach((track) => track.stop());
      canvasStreamRef.current = null;
    }

    // Stop audio stream tracks (cloned tracks from video)
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    // Stop combined stream tracks
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach((track) => track.stop());
      combinedStreamRef.current = null;
    }

    // Clean up export video element
    if (exportVideoElementRef.current) {
      exportVideoElementRef.current.pause();
      exportVideoElementRef.current.src = '';
      exportVideoElementRef.current = null;
    }

    // Clear chunks
    chunksRef.current = [];
  }, []);

  /**
   * Reset export state to initial values
   */
  const resetExportState = useCallback(() => {
    setExportState(INITIAL_EXPORT_STATE);
    isCancelledRef.current = false;
  }, []);

  /**
   * Cancel an ongoing export
   */
  const cancelExport = useCallback(() => {
    isCancelledRef.current = true;
    setExportState((prev) => ({
      ...prev,
      isCancelled: true,
      phase: 'Cancelling...',
    }));
    cleanup();
    setExportState((prev) => ({
      ...prev,
      isExporting: false,
      phase: 'Export cancelled',
    }));
  }, [cleanup]);

  /**
   * Generate a filename for the export
   */
  const generateFilename = useCallback(
    (mimeType: string, customName?: string | null): string => {
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      if (customName) {
        // Remove any existing extension and add the correct one
        const baseName = customName.replace(/\.[^/.]+$/, '');
        return `${baseName}.${extension}`;
      }

      const date = new Date().toISOString().slice(0, 10);
      const time = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
      const baseName = videoMetadata?.fileName?.replace(/\.[^/.]+$/, '') || 'video-export';
      return `${baseName}-overlay-${date}-${time}.${extension}`;
    },
    [videoMetadata?.fileName]
  );

  /**
   * Get resolution dimensions based on settings
   */
  const getExportDimensions = useCallback(
    (canvas: HTMLCanvasElement): { width: number; height: number } => {
      const resolution = exportSettings.resolution;

      if (resolution === 'original') {
        // Use canvas dimensions
        return {
          width: canvas.width,
          height: canvas.height,
        };
      }

      const preset = RESOLUTION_PRESETS[resolution];
      if (preset) {
        return preset;
      }

      // Default to canvas dimensions
      return {
        width: canvas.width,
        height: canvas.height,
      };
    },
    [exportSettings.resolution]
  );

  /**
   * Capture and clone audio stream from video element.
   *
   * AUDIO SYNCHRONIZATION DETAILS:
   * - Uses HTMLVideoElement.captureStream() which produces a live MediaStream
   * - This stream is inherently synchronized with the video element's playback
   * - When the video element plays, seeks, or pauses, the audio stream follows
   * - We clone the audio tracks to avoid interfering with the original video's audio output
   * - The cloned tracks remain synchronized because they're derived from the same source
   *
   * IMPORTANT: Call this function AFTER seeking the video to the desired start time.
   * The captured stream will be at the video's current position and stay in sync
   * as the video plays during export.
   *
   * @param video - The video element to capture audio from
   * @returns MediaStream with cloned audio tracks, or null if unavailable
   */
  const captureAudioStream = useCallback(
    (video: HTMLVideoElement): MediaStream | null => {
      try {
        // Check if captureStream is supported
        if (!video.captureStream) {
          return null;
        }

        // Check if video element has a source loaded
        if (!video.src && !video.currentSrc) {
          return null;
        }

        // Capture the live stream from video element
        // This stream is inherently synchronized with the video's playback state
        const videoStream = video.captureStream();
        const audioTracks = videoStream.getAudioTracks();

        if (audioTracks.length === 0) {
          // Video has no audio track - this is normal for some videos
          return null;
        }

        // Clone audio tracks to avoid interference with original video playback
        // Cloned tracks maintain synchronization with the source but can be
        // independently controlled (e.g., stopped without affecting original)
        const clonedTracks = audioTracks.map((track) => {
          const clonedTrack = track.clone();
          // Ensure cloned track is enabled for recording
          clonedTrack.enabled = true;
          return clonedTrack;
        });

        // Verify at least one track is live and enabled
        const validTracks = clonedTracks.filter(
          (track) => track.readyState === 'live' && track.enabled
        );

        if (validTracks.length === 0) {
          // Clean up cloned tracks if none are valid
          clonedTracks.forEach((track) => track.stop());
          return null;
        }

        // Create a new stream with the valid cloned audio tracks
        // This stream will stay synchronized with the video element's playback
        const audioStream = new MediaStream(validTracks);
        return audioStream;
      } catch {
        // Audio capture not supported or failed - handle gracefully
        // This can happen if:
        // - Browser doesn't support captureStream
        // - Video source has CORS restrictions
        // - Audio track is encrypted (DRM)
        return null;
      }
    },
    []
  );

  /**
   * Combine canvas video stream with audio stream for synchronized recording.
   *
   * SYNCHRONIZATION MECHANISM:
   * - The canvas video stream captures the Three.js rendered output at the specified frame rate
   * - The audio stream is captured from the original video element's live playback
   * - Both streams are added to a single MediaStream for the MediaRecorder
   * - The MediaRecorder records both tracks together, maintaining their temporal relationship
   * - Since the audio stream is derived from the video element's playback, and the canvas
   *   renders the same video's frames, they stay inherently synchronized
   *
   * @param videoStream - Canvas capture stream (from Three.js canvas)
   * @param audioStream - Audio stream from original video element (or null)
   * @returns Combined MediaStream with both video and audio tracks
   */
  const combineStreams = useCallback(
    (videoStream: MediaStream, audioStream: MediaStream | null): MediaStream => {
      if (!audioStream) {
        return videoStream;
      }

      // Create a new stream with video tracks from canvas and audio tracks from video
      const combined = new MediaStream();

      // Add video tracks from canvas stream (the 3D overlay rendering)
      videoStream.getVideoTracks().forEach((track) => {
        combined.addTrack(track);
      });

      // Add audio tracks from video stream (original video audio)
      // These tracks are synchronized with the video element's playback
      audioStream.getAudioTracks().forEach((track) => {
        combined.addTrack(track);
      });

      return combined;
    },
    []
  );

  /**
   * Start the video export process
   */
  const startExport = useCallback(
    async (canvas: HTMLCanvasElement, options?: ExportOptions): Promise<void> => {
      // Validate prerequisites
      if (!isSupported) {
        setExportState({
          ...INITIAL_EXPORT_STATE,
          error: 'Video export is not supported in this browser. Please use Chrome or Firefox.',
        });
        return;
      }

      if (!videoElement) {
        setExportState({
          ...INITIAL_EXPORT_STATE,
          error: 'No video loaded. Please import a video first.',
        });
        return;
      }

      if (!canvas) {
        setExportState({
          ...INITIAL_EXPORT_STATE,
          error: 'Canvas not available. Please try again.',
        });
        return;
      }

      // Merge options with defaults
      const mergedOptions: Required<Omit<ExportOptions, 'filename'>> & { filename: string | null } = {
        ...DEFAULT_OPTIONS,
        endTime: options?.endTime ?? duration,
        ...options,
        filename: options?.filename ?? null,
      };

      const { startTime, endTime, frameRate, videoBitrate, includeAudio, filename } = mergedOptions;

      // Reset state
      isCancelledRef.current = false;
      chunksRef.current = [];

      setExportState({
        isExporting: true,
        progress: 0,
        phase: 'Initializing export...',
        error: null,
        isCancelled: false,
        hasAudio: false,
      });

      try {
        setExportState((prev) => ({
          ...prev,
          phase: 'Preparing video...',
          progress: 5,
        }));

        // AUDIO SYNCHRONIZATION STEP 1:
        // Seek video to start time BEFORE capturing audio stream.
        // This ensures the audio stream starts from the correct position.
        videoElement.currentTime = startTime;

        // Wait for seek to complete before capturing streams
        await new Promise<void>((resolve) => {
          const handleSeeked = () => {
            videoElement.removeEventListener('seeked', handleSeeked);
            resolve();
          };
          // If already at the start time, resolve immediately
          if (Math.abs(videoElement.currentTime - startTime) < 0.1) {
            resolve();
          } else {
            videoElement.addEventListener('seeked', handleSeeked);
          }
        });

        if (isCancelledRef.current) {
          return;
        }

        setExportState((prev) => ({
          ...prev,
          phase: 'Setting up video stream...',
          progress: 10,
        }));

        // Capture canvas stream
        const canvasStream = canvas.captureStream(frameRate);
        canvasStreamRef.current = canvasStream;

        // AUDIO SYNCHRONIZATION STEP 2:
        // Capture audio stream AFTER seeking to ensure synchronization.
        // The captured stream is tied to the video element's current playback position.
        let audioStream: MediaStream | null = null;
        let hasAudioTrack = false;

        if (includeAudio) {
          setExportState((prev) => ({
            ...prev,
            phase: 'Capturing audio...',
            progress: 15,
          }));

          audioStream = captureAudioStream(videoElement);
          audioStreamRef.current = audioStream;

          // Check if we successfully captured audio
          if (audioStream && audioStream.getAudioTracks().length > 0) {
            hasAudioTrack = true;
            // Verify audio tracks are active and ready for recording
            const audioTracks = audioStream.getAudioTracks();
            const hasActiveTrack = audioTracks.some(
              (track) => track.readyState === 'live' && track.enabled
            );
            if (!hasActiveTrack) {
              hasAudioTrack = false;
            }
          }

          // Update state with audio status
          setExportState((prev) => ({
            ...prev,
            hasAudio: hasAudioTrack,
          }));
        }

        if (isCancelledRef.current) {
          return;
        }

        // AUDIO SYNCHRONIZATION STEP 3:
        // Select MIME type AFTER determining audio availability.
        // When audio is present, prefer MIME types with audio codec (opus) for better encoding.
        const mimeType = getBestMimeType(hasAudioTrack);
        if (!mimeType) {
          throw new Error('No supported video format available');
        }

        // Combine streams - this creates a single stream with both video and audio
        // that the MediaRecorder will encode together, maintaining synchronization
        const combinedStream = combineStreams(canvasStream, audioStream);
        combinedStreamRef.current = combinedStream;

        setExportState((prev) => ({
          ...prev,
          phase: 'Creating encoder...',
          progress: 20,
        }));

        // Create MediaRecorder with appropriate settings for video and audio
        const recorderOptions: MediaRecorderOptions = {
          mimeType,
          videoBitsPerSecond: videoBitrate,
        };

        // Add audio bitrate if we have audio for better quality encoding
        if (hasAudioTrack && mergedOptions.audioBitrate) {
          recorderOptions.audioBitsPerSecond = mergedOptions.audioBitrate;
        }

        const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
        mediaRecorderRef.current = mediaRecorder;

        // Set up data handler
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && !isCancelledRef.current) {
            chunksRef.current.push(event.data);
          }
        };

        // Create promise for export completion
        const exportPromise = new Promise<void>((resolve, reject) => {
          mediaRecorder.onstop = () => {
            if (isCancelledRef.current) {
              resolve();
              return;
            }

            setExportState((prev) => ({
              ...prev,
              phase: 'Finalizing video...',
              progress: 95,
            }));

            // Create blob and trigger download
            try {
              const blob = new Blob(chunksRef.current, { type: mimeType });
              const url = URL.createObjectURL(blob);
              const downloadFilename = generateFilename(mimeType, filename);

              // Create download link
              const a = document.createElement('a');
              a.href = url;
              a.download = downloadFilename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);

              // Clean up URL after download
              setTimeout(() => {
                URL.revokeObjectURL(url);
              }, 1000);

              setExportState((prev) => ({
                ...prev,
                isExporting: false,
                progress: 100,
                phase: 'Export complete!',
                error: null,
                isCancelled: false,
              }));

              resolve();
            } catch (err) {
              reject(err);
            }
          };

          mediaRecorder.onerror = (event) => {
            const errorEvent = event as MediaRecorderErrorEvent;
            reject(new Error(errorEvent.error?.message || 'Recording failed'));
          };
        });

        // Start recording AFTER all streams are set up
        mediaRecorder.start(1000); // Collect data every second

        setExportState((prev) => ({
          ...prev,
          phase: hasAudioTrack ? 'Recording video with audio...' : 'Recording video (no audio)...',
          progress: 25,
        }));

        // AUDIO SYNCHRONIZATION STEP 4:
        // Play video to start recording. Audio synchronization is maintained because:
        // 1. We seeked to start time before capturing the audio stream
        // 2. The audio stream is captured from the video element's live captureStream()
        // 3. The canvas renders the video's frames via VideoTexture
        // 4. Both video and audio tracks are in the same MediaRecorder stream
        // 5. When the video plays, the audio stream automatically stays in sync
        //    because both are derived from the same video element playback
        videoElement.play();

        const totalDuration = endTime - startTime;

        // Update progress during playback
        const updateProgress = () => {
          if (isCancelledRef.current) {
            return;
          }

          const currentTime = videoElement.currentTime;
          const elapsed = currentTime - startTime;
          const progressPercent = Math.min(
            20 + (elapsed / totalDuration) * 70, // 20% to 90% for recording
            90
          );

          setExportState((prev) => ({
            ...prev,
            progress: Math.floor(progressPercent),
            phase: `Recording: ${formatTime(elapsed)} / ${formatTime(totalDuration)}`,
          }));

          // Check if we've reached the end time
          if (currentTime >= endTime || videoElement.ended) {
            videoElement.pause();
            mediaRecorder.stop();
            return;
          }

          animationFrameRef.current = requestAnimationFrame(updateProgress);
        };

        animationFrameRef.current = requestAnimationFrame(updateProgress);

        // Wait for export to complete
        await exportPromise;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Export failed';
        setExportState({
          isExporting: false,
          progress: 0,
          phase: '',
          error: errorMessage,
          isCancelled: false,
          hasAudio: false,
        });
      } finally {
        cleanup();
      }
    },
    [
      isSupported,
      videoElement,
      duration,
      getBestMimeType,
      captureAudioStream,
      combineStreams,
      generateFilename,
      cleanup,
    ]
  );

  return {
    exportState,
    isSupported,
    supportedFormats,
    startExport,
    cancelExport,
    resetExportState,
    getBestMimeType,
  };
}

/**
 * Utility type for MediaRecorder error events
 */
interface MediaRecorderErrorEvent extends Event {
  error?: DOMException;
}
