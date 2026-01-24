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
  /** Get the best supported MIME type for export */
  getBestMimeType: () => string | null;
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
 * Custom hook for handling video export with 3D overlay.
 *
 * Features:
 * - Captures Three.js canvas output using captureStream()
 * - Encodes video using MediaRecorder API
 * - Synchronizes export with original video playback timing
 * - Supports WebM and MP4 output formats
 * - Provides progress tracking for UI updates
 * - Handles export cancellation
 * - Proper error handling for unsupported browsers
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
   * Get the best MIME type for the requested format
   */
  const getBestMimeType = useCallback((): string | null => {
    if (!isSupported || supportedFormats.length === 0) {
      return null;
    }

    const format = exportSettings.format;

    if (format === 'webm') {
      // Prefer VP9, fallback to VP8, then basic webm
      if (supportedFormats.includes('video/webm;codecs=vp9')) {
        return 'video/webm;codecs=vp9';
      }
      if (supportedFormats.includes('video/webm;codecs=vp8')) {
        return 'video/webm;codecs=vp8';
      }
      if (supportedFormats.includes('video/webm')) {
        return 'video/webm';
      }
    }

    if (format === 'mp4') {
      // MP4 support is limited in browsers
      if (supportedFormats.includes('video/mp4')) {
        return 'video/mp4';
      }
      // Fall back to webm if mp4 not supported
      return getBestWebmMimeType();
    }

    // Default to first available format
    return supportedFormats[0] || null;
  }, [isSupported, supportedFormats, exportSettings.format]);

  /**
   * Helper to get best WebM MIME type
   */
  const getBestWebmMimeType = useCallback((): string | null => {
    if (supportedFormats.includes('video/webm;codecs=vp9')) {
      return 'video/webm;codecs=vp9';
    }
    if (supportedFormats.includes('video/webm;codecs=vp8')) {
      return 'video/webm;codecs=vp8';
    }
    if (supportedFormats.includes('video/webm')) {
      return 'video/webm';
    }
    return null;
  }, [supportedFormats]);

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
   * Create an audio context and destination for capturing audio
   */
  const captureAudioStream = useCallback(
    (video: HTMLVideoElement): MediaStream | null => {
      try {
        // Check if video has audio tracks
        if (!video.captureStream) {
          return null;
        }

        const videoStream = video.captureStream();
        const audioTracks = videoStream.getAudioTracks();

        if (audioTracks.length === 0) {
          return null;
        }

        // Create a stream with just audio tracks
        const audioStream = new MediaStream(audioTracks);
        return audioStream;
      } catch {
        // Audio capture not supported or failed
        return null;
      }
    },
    []
  );

  /**
   * Combine canvas video stream with audio stream
   */
  const combineStreams = useCallback(
    (videoStream: MediaStream, audioStream: MediaStream | null): MediaStream => {
      if (!audioStream) {
        return videoStream;
      }

      // Create a new stream with video tracks from canvas and audio tracks from video
      const combined = new MediaStream();

      // Add video tracks from canvas stream
      videoStream.getVideoTracks().forEach((track) => {
        combined.addTrack(track);
      });

      // Add audio tracks from video stream
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
      });

      try {
        // Get MIME type
        const mimeType = getBestMimeType();
        if (!mimeType) {
          throw new Error('No supported video format available');
        }

        setExportState((prev) => ({
          ...prev,
          phase: 'Setting up video stream...',
          progress: 5,
        }));

        // Capture canvas stream
        const canvasStream = canvas.captureStream(frameRate);
        canvasStreamRef.current = canvasStream;

        // Capture audio stream if requested
        let audioStream: MediaStream | null = null;
        if (includeAudio) {
          setExportState((prev) => ({
            ...prev,
            phase: 'Capturing audio...',
            progress: 10,
          }));
          audioStream = captureAudioStream(videoElement);
        }

        // Combine streams
        const combinedStream = combineStreams(canvasStream, audioStream);
        combinedStreamRef.current = combinedStream;

        setExportState((prev) => ({
          ...prev,
          phase: 'Creating encoder...',
          progress: 15,
        }));

        // Create MediaRecorder
        const mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: videoBitrate,
        });
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

              setExportState({
                isExporting: false,
                progress: 100,
                phase: 'Export complete!',
                error: null,
                isCancelled: false,
              });

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

        // Start recording
        mediaRecorder.start(1000); // Collect data every second

        setExportState((prev) => ({
          ...prev,
          phase: 'Rendering video...',
          progress: 20,
        }));

        // Seek video to start time
        videoElement.currentTime = startTime;

        // Wait for seek to complete
        await new Promise<void>((resolve) => {
          const handleSeeked = () => {
            videoElement.removeEventListener('seeked', handleSeeked);
            resolve();
          };
          videoElement.addEventListener('seeked', handleSeeked);
        });

        // Play video and track progress
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
