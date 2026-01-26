/**
 * Video utility functions for file validation, time formatting,
 * format checking, aspect ratio calculations, and error handling.
 */

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Error codes for video operations.
 * These provide a standardized way to identify and handle specific error conditions.
 */
export enum VideoErrorCode {
  // File validation errors
  NO_FILE = 'NO_FILE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_CORRUPTED = 'FILE_CORRUPTED',

  // Video loading errors
  LOAD_ABORTED = 'LOAD_ABORTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DECODE_ERROR = 'DECODE_ERROR',
  FORMAT_NOT_SUPPORTED = 'FORMAT_NOT_SUPPORTED',
  LOAD_TIMEOUT = 'LOAD_TIMEOUT',
  UNKNOWN_LOAD_ERROR = 'UNKNOWN_LOAD_ERROR',

  // Export errors
  EXPORT_NOT_SUPPORTED = 'EXPORT_NOT_SUPPORTED',
  NO_VIDEO_LOADED = 'NO_VIDEO_LOADED',
  CANVAS_NOT_AVAILABLE = 'CANVAS_NOT_AVAILABLE',
  NO_EXPORT_FORMAT = 'NO_EXPORT_FORMAT',
  RECORDING_FAILED = 'RECORDING_FAILED',
  EXPORT_CANCELLED = 'EXPORT_CANCELLED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  UNKNOWN_EXPORT_ERROR = 'UNKNOWN_EXPORT_ERROR',

  // Playback errors
  PLAYBACK_FAILED = 'PLAYBACK_FAILED',
  SEEK_FAILED = 'SEEK_FAILED',

  // Generic errors
  UNKNOWN = 'UNKNOWN',
}

/**
 * Information about a video error for user display.
 */
export interface VideoErrorInfo {
  /** Error code for programmatic handling */
  code: VideoErrorCode;
  /** User-friendly error title */
  title: string;
  /** User-friendly error message */
  message: string;
  /** Suggested recovery actions */
  recovery: string[];
  /** Whether the error is likely temporary/transient */
  isRetryable: boolean;
}

/**
 * Map of error codes to user-friendly error information
 */
const VIDEO_ERROR_INFO: Record<VideoErrorCode, Omit<VideoErrorInfo, 'code'>> = {
  // File validation errors
  [VideoErrorCode.NO_FILE]: {
    title: 'No File Selected',
    message: 'Please select a video file to import.',
    recovery: ['Click the "Browse Files" button or drag and drop a video file.'],
    isRetryable: true,
  },
  [VideoErrorCode.UNSUPPORTED_FORMAT]: {
    title: 'Unsupported Video Format',
    message: 'The selected file format is not supported.',
    recovery: [
      'Convert your video to MP4 or WebM format.',
      'Use a video converter tool like HandBrake (free).',
      'Try a different video file.',
    ],
    isRetryable: false,
  },
  [VideoErrorCode.FILE_TOO_LARGE]: {
    title: 'File Too Large',
    message: 'The video file exceeds the maximum allowed size of 500MB.',
    recovery: [
      'Use a video editing tool to reduce the file size.',
      'Trim the video to a shorter duration.',
      'Lower the video resolution or bitrate.',
    ],
    isRetryable: false,
  },
  [VideoErrorCode.FILE_CORRUPTED]: {
    title: 'File Corrupted',
    message: 'The video file appears to be damaged or corrupted.',
    recovery: [
      'Re-download the video file if it came from the internet.',
      'Try a different video file.',
      'Check if the file plays in your system video player.',
    ],
    isRetryable: false,
  },

  // Video loading errors
  [VideoErrorCode.LOAD_ABORTED]: {
    title: 'Loading Cancelled',
    message: 'Video loading was cancelled.',
    recovery: ['Try importing the video again.'],
    isRetryable: true,
  },
  [VideoErrorCode.NETWORK_ERROR]: {
    title: 'Network Error',
    message: 'A network error occurred while loading the video.',
    recovery: [
      'Check your internet connection.',
      'Try importing the video again.',
      'If the file is local, ensure it is accessible.',
    ],
    isRetryable: true,
  },
  [VideoErrorCode.DECODE_ERROR]: {
    title: 'Video Decode Error',
    message: 'The video file could not be decoded. It may be corrupted or use an unsupported codec.',
    recovery: [
      'Convert the video to a standard codec (H.264 for MP4, VP9 for WebM).',
      'Try re-encoding the video with a tool like HandBrake.',
      'Verify the video plays correctly in your system video player.',
    ],
    isRetryable: false,
  },
  [VideoErrorCode.FORMAT_NOT_SUPPORTED]: {
    title: 'Format Not Supported',
    message: 'Your browser does not support this video format.',
    recovery: [
      'Convert your video to MP4 (H.264) or WebM (VP9) format.',
      'Try using Chrome or Firefox for better format support.',
    ],
    isRetryable: false,
  },
  [VideoErrorCode.LOAD_TIMEOUT]: {
    title: 'Loading Timeout',
    message: 'The video took too long to load.',
    recovery: [
      'Try with a smaller video file.',
      'Check your system resources and close other applications.',
      'Try importing the video again.',
    ],
    isRetryable: true,
  },
  [VideoErrorCode.UNKNOWN_LOAD_ERROR]: {
    title: 'Loading Failed',
    message: 'An unexpected error occurred while loading the video.',
    recovery: [
      'Try importing the video again.',
      'Refresh the page and try again.',
      'Try a different video file.',
    ],
    isRetryable: true,
  },

  // Export errors
  [VideoErrorCode.EXPORT_NOT_SUPPORTED]: {
    title: 'Export Not Supported',
    message: 'Video export is not supported in this browser.',
    recovery: [
      'Use Chrome, Edge, or Firefox for export functionality.',
      'Update your browser to the latest version.',
    ],
    isRetryable: false,
  },
  [VideoErrorCode.NO_VIDEO_LOADED]: {
    title: 'No Video Loaded',
    message: 'Please import a video before exporting.',
    recovery: ['Import a video file first, then try exporting again.'],
    isRetryable: true,
  },
  [VideoErrorCode.CANVAS_NOT_AVAILABLE]: {
    title: 'Canvas Not Available',
    message: 'The video canvas could not be accessed.',
    recovery: [
      'Refresh the page and try again.',
      'Check if WebGL is enabled in your browser.',
    ],
    isRetryable: true,
  },
  [VideoErrorCode.NO_EXPORT_FORMAT]: {
    title: 'No Export Format Available',
    message: 'No supported video export format is available in your browser.',
    recovery: [
      'Try using Chrome, which has the best export format support.',
      'Update your browser to the latest version.',
    ],
    isRetryable: false,
  },
  [VideoErrorCode.RECORDING_FAILED]: {
    title: 'Recording Failed',
    message: 'An error occurred while recording the video.',
    recovery: [
      'Try exporting again.',
      'Try a lower resolution or shorter duration.',
      'Close other browser tabs to free up resources.',
    ],
    isRetryable: true,
  },
  [VideoErrorCode.EXPORT_CANCELLED]: {
    title: 'Export Cancelled',
    message: 'The video export was cancelled.',
    recovery: ['Start a new export when ready.'],
    isRetryable: true,
  },
  [VideoErrorCode.MEMORY_LIMIT_EXCEEDED]: {
    title: 'Memory Limit Exceeded',
    message: 'The export ran out of memory. The video may be too long or high resolution.',
    recovery: [
      'Try exporting at a lower resolution (720p).',
      'Export a shorter portion of the video.',
      'Close other browser tabs and applications.',
      'Restart your browser and try again.',
    ],
    isRetryable: true,
  },
  [VideoErrorCode.UNKNOWN_EXPORT_ERROR]: {
    title: 'Export Failed',
    message: 'An unexpected error occurred during export.',
    recovery: [
      'Try exporting again.',
      'Try a different format or resolution.',
      'Refresh the page and try again.',
    ],
    isRetryable: true,
  },

  // Playback errors
  [VideoErrorCode.PLAYBACK_FAILED]: {
    title: 'Playback Failed',
    message: 'The video could not be played.',
    recovery: [
      'Try pausing and playing again.',
      'Reload the video.',
      'Check if the video file is accessible.',
    ],
    isRetryable: true,
  },
  [VideoErrorCode.SEEK_FAILED]: {
    title: 'Seek Failed',
    message: 'Could not jump to the requested position in the video.',
    recovery: [
      'Try seeking to a different position.',
      'Wait for more of the video to buffer.',
    ],
    isRetryable: true,
  },

  // Generic errors
  [VideoErrorCode.UNKNOWN]: {
    title: 'Unknown Error',
    message: 'An unexpected error occurred.',
    recovery: [
      'Refresh the page and try again.',
      'Try a different video file.',
    ],
    isRetryable: true,
  },
};

/**
 * Custom error class for video-related errors.
 * Provides structured error information with user-friendly messages.
 */
export class VideoError extends Error {
  /** Error code for programmatic handling */
  readonly code: VideoErrorCode;
  /** User-friendly error title */
  readonly title: string;
  /** Suggested recovery actions */
  readonly recovery: string[];
  /** Whether the error is likely temporary/transient */
  readonly isRetryable: boolean;
  /** Original error if this wraps another error */
  readonly originalError?: Error;

  constructor(code: VideoErrorCode, options?: { message?: string; originalError?: Error }) {
    const info = VIDEO_ERROR_INFO[code];
    const message = options?.message || info.message;

    super(message);

    this.name = 'VideoError';
    this.code = code;
    this.title = info.title;
    this.recovery = info.recovery;
    this.isRetryable = info.isRetryable;
    this.originalError = options?.originalError;

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VideoError);
    }
  }

  /**
   * Get the full error info object
   */
  getErrorInfo(): VideoErrorInfo {
    return {
      code: this.code,
      title: this.title,
      message: this.message,
      recovery: this.recovery,
      isRetryable: this.isRetryable,
    };
  }
}

/**
 * Get user-friendly error information for a VideoErrorCode
 * @param code - The error code
 * @param customMessage - Optional custom message to override the default
 * @returns VideoErrorInfo object with user-friendly messages
 */
export function getVideoErrorInfo(code: VideoErrorCode, customMessage?: string): VideoErrorInfo {
  const info = VIDEO_ERROR_INFO[code];
  return {
    code,
    ...info,
    message: customMessage || info.message,
  };
}

/**
 * Convert a MediaError code to a VideoErrorCode
 * @param mediaErrorCode - The MediaError code from a video element
 * @returns Corresponding VideoErrorCode
 */
export function mediaErrorToVideoErrorCode(mediaErrorCode: number): VideoErrorCode {
  switch (mediaErrorCode) {
    case MediaError.MEDIA_ERR_ABORTED:
      return VideoErrorCode.LOAD_ABORTED;
    case MediaError.MEDIA_ERR_NETWORK:
      return VideoErrorCode.NETWORK_ERROR;
    case MediaError.MEDIA_ERR_DECODE:
      return VideoErrorCode.DECODE_ERROR;
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return VideoErrorCode.FORMAT_NOT_SUPPORTED;
    default:
      return VideoErrorCode.UNKNOWN_LOAD_ERROR;
  }
}

/**
 * Create a VideoError from a MediaError
 * @param mediaError - The MediaError from a video element
 * @returns VideoError with appropriate code and message
 */
export function createVideoErrorFromMediaError(mediaError: MediaError): VideoError {
  const code = mediaErrorToVideoErrorCode(mediaError.code);
  return new VideoError(code, {
    message: mediaError.message || undefined,
  });
}

/**
 * Create a VideoError from an unknown error
 * @param error - The error to convert
 * @param defaultCode - Default error code if error type is unknown
 * @returns VideoError
 */
export function createVideoError(
  error: unknown,
  defaultCode: VideoErrorCode = VideoErrorCode.UNKNOWN
): VideoError {
  if (error instanceof VideoError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for specific error messages to determine the code
    const message = error.message.toLowerCase();

    if (message.includes('aborted')) {
      return new VideoError(VideoErrorCode.LOAD_ABORTED, { originalError: error });
    }
    if (message.includes('network')) {
      return new VideoError(VideoErrorCode.NETWORK_ERROR, { originalError: error });
    }
    if (message.includes('decode') || message.includes('corrupt')) {
      return new VideoError(VideoErrorCode.DECODE_ERROR, { originalError: error });
    }
    if (message.includes('not supported') || message.includes('unsupported')) {
      return new VideoError(VideoErrorCode.FORMAT_NOT_SUPPORTED, { originalError: error });
    }
    if (message.includes('timeout')) {
      return new VideoError(VideoErrorCode.LOAD_TIMEOUT, { originalError: error });
    }
    if (message.includes('memory') || message.includes('out of memory')) {
      return new VideoError(VideoErrorCode.MEMORY_LIMIT_EXCEEDED, { originalError: error });
    }
    if (message.includes('cancel')) {
      return new VideoError(VideoErrorCode.EXPORT_CANCELLED, { originalError: error });
    }

    return new VideoError(defaultCode, {
      message: error.message,
      originalError: error,
    });
  }

  return new VideoError(defaultCode);
}

/**
 * Format an error for display in the UI
 * @param error - The error to format
 * @returns Object with title and message for display
 */
export function formatVideoError(error: unknown): { title: string; message: string; recovery: string[] } {
  const videoError = createVideoError(error);
  return {
    title: videoError.title,
    message: videoError.message,
    recovery: videoError.recovery,
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Supported video MIME types
 */
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const;

/**
 * Supported video file extensions
 */
export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm'] as const;

/**
 * Maximum file size in bytes (500MB)
 * Large videos may cause memory issues during processing
 */
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

/**
 * Warning threshold for file size (100MB)
 * Videos above this may require streaming approach
 */
export const LARGE_FILE_WARNING_BYTES = 100 * 1024 * 1024;

/**
 * Result of video file validation
 */
export interface VideoValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Video aspect ratio information
 */
export interface AspectRatioInfo {
  width: number;
  height: number;
  ratio: number;
  display: string;
}

/**
 * Supported video format information
 */
export interface VideoFormatInfo {
  mimeType: string;
  extension: string;
  codec: string;
  description: string;
}

/**
 * Validates a video file for type and size constraints
 * @param file - The file to validate
 * @returns Validation result with error/warning messages
 */
export function validateVideoFile(file: File): VideoValidationResult {
  // Check if file is provided
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided',
    };
  }

  // Check file type
  const isValidType = SUPPORTED_VIDEO_TYPES.includes(file.type as typeof SUPPORTED_VIDEO_TYPES[number]);

  // Also check extension as fallback (some browsers may not set MIME type correctly)
  const extension = getFileExtension(file.name);
  const isValidExtension = SUPPORTED_VIDEO_EXTENSIONS.includes(extension as typeof SUPPORTED_VIDEO_EXTENSIONS[number]);

  if (!isValidType && !isValidExtension) {
    return {
      isValid: false,
      error: `Unsupported video format. Supported formats: ${SUPPORTED_VIDEO_EXTENSIONS.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE_BYTES)}`,
    };
  }

  // Check for large file warning
  if (file.size > LARGE_FILE_WARNING_BYTES) {
    return {
      isValid: true,
      warning: `Large file detected (${formatFileSize(file.size)}). Loading may take longer.`,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Formats seconds to mm:ss or hh:mm:ss format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  // Format with leading zeros where needed
  const secsStr = secs.toString().padStart(2, '0');
  const minsStr = hours > 0 ? minutes.toString().padStart(2, '0') : minutes.toString();

  if (hours > 0) {
    return `${hours}:${minsStr}:${secsStr}`;
  }

  return `${minsStr}:${secsStr}`;
}

/**
 * Formats time with milliseconds for frame-accurate display
 * @param seconds - Time in seconds
 * @returns Formatted time string with milliseconds
 */
export function formatTimeWithMs(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00.000';
  }

  const totalSeconds = Math.floor(seconds);
  const ms = Math.floor((seconds - totalSeconds) * 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  const secsStr = secs.toString().padStart(2, '0');
  const msStr = ms.toString().padStart(3, '0');

  return `${minutes}:${secsStr}.${msStr}`;
}

/**
 * Returns list of supported video MIME types and formats
 * @returns Array of supported format information
 */
export function getSupportedFormats(): VideoFormatInfo[] {
  return [
    {
      mimeType: 'video/mp4',
      extension: '.mp4',
      codec: 'H.264/AVC',
      description: 'MPEG-4 Video (widely supported)',
    },
    {
      mimeType: 'video/webm',
      extension: '.webm',
      codec: 'VP8/VP9',
      description: 'WebM Video (open format)',
    },
  ];
}

/**
 * Returns just the MIME types for file input accept attribute
 * @returns Comma-separated list of MIME types
 */
export function getAcceptedMimeTypes(): string {
  return SUPPORTED_VIDEO_TYPES.join(',');
}

/**
 * Calculates aspect ratio from video dimensions
 * @param width - Video width in pixels
 * @param height - Video height in pixels
 * @returns Aspect ratio information
 */
export function calculateAspectRatio(width: number, height: number): AspectRatioInfo {
  if (width <= 0 || height <= 0) {
    return {
      width: 0,
      height: 0,
      ratio: 0,
      display: 'Unknown',
    };
  }

  const ratio = width / height;
  const display = getAspectRatioDisplay(ratio);

  return {
    width,
    height,
    ratio,
    display,
  };
}

/**
 * Gets a human-readable aspect ratio string
 * @param ratio - The aspect ratio value
 * @returns Display string like "16:9" or "4:3"
 */
export function getAspectRatioDisplay(ratio: number): string {
  // Common aspect ratios with tolerance
  const aspectRatios: Array<{ name: string; value: number }> = [
    { name: '16:9', value: 16 / 9 },
    { name: '4:3', value: 4 / 3 },
    { name: '21:9', value: 21 / 9 },
    { name: '1:1', value: 1 },
    { name: '9:16', value: 9 / 16 },
    { name: '3:4', value: 3 / 4 },
    { name: '2.35:1', value: 2.35 },
    { name: '1.85:1', value: 1.85 },
  ];

  const tolerance = 0.05;

  for (const ar of aspectRatios) {
    if (Math.abs(ratio - ar.value) < tolerance) {
      return ar.name;
    }
  }

  // Return decimal ratio if no match
  return ratio.toFixed(2) + ':1';
}

/**
 * Extracts file extension from filename
 * @param filename - The filename to extract extension from
 * @returns Lowercase extension including dot
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return '';
  }
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Formats file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string like "25.5 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Calculates dimensions for fitting video into a container while preserving aspect ratio
 * @param videoWidth - Original video width
 * @param videoHeight - Original video height
 * @param containerWidth - Container width
 * @param containerHeight - Container height
 * @returns Fitted dimensions and positioning
 */
export function calculateFitDimensions(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number
): { width: number; height: number; x: number; y: number } {
  if (videoWidth <= 0 || videoHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { width: 0, height: 0, x: 0, y: 0 };
  }

  const videoRatio = videoWidth / videoHeight;
  const containerRatio = containerWidth / containerHeight;

  let width: number;
  let height: number;

  if (videoRatio > containerRatio) {
    // Video is wider than container - fit to width (letterbox)
    width = containerWidth;
    height = containerWidth / videoRatio;
  } else {
    // Video is taller than container - fit to height (pillarbox)
    height = containerHeight;
    width = containerHeight * videoRatio;
  }

  // Center in container
  const x = (containerWidth - width) / 2;
  const y = (containerHeight - height) / 2;

  return { width, height, x, y };
}

/**
 * Checks if the browser supports requestVideoFrameCallback for frame-accurate video sync
 * @returns True if supported
 */
export function supportsVideoFrameCallback(): boolean {
  return typeof HTMLVideoElement !== 'undefined' &&
         'requestVideoFrameCallback' in HTMLVideoElement.prototype;
}

/**
 * Checks if the browser supports MediaRecorder API for video export
 * @returns True if supported
 */
export function supportsMediaRecorder(): boolean {
  return typeof MediaRecorder !== 'undefined';
}

/**
 * Gets supported export MIME types for MediaRecorder
 * @returns Array of supported MIME types for export
 */
export function getSupportedExportFormats(): string[] {
  if (!supportsMediaRecorder()) {
    return [];
  }

  const formats = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  return formats.filter((format) => MediaRecorder.isTypeSupported(format));
}

/**
 * Parses time string (mm:ss or hh:mm:ss) to seconds
 * @param timeString - Time string in mm:ss or hh:mm:ss format
 * @returns Time in seconds, or 0 if invalid
 */
export function parseTimeString(timeString: string): number {
  const parts = timeString.split(':').map(Number);

  if (parts.some(isNaN)) {
    return 0;
  }

  if (parts.length === 2) {
    // mm:ss
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // hh:mm:ss
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

/**
 * Clamps a time value within valid video duration bounds
 * @param time - Time in seconds
 * @param duration - Video duration in seconds
 * @returns Clamped time value
 */
export function clampTime(time: number, duration: number): number {
  return Math.max(0, Math.min(time, duration));
}

/**
 * Converts frame number to time in seconds
 * @param frameNumber - The frame number
 * @param frameRate - Frames per second (default 30)
 * @returns Time in seconds
 */
export function frameToTime(frameNumber: number, frameRate: number = 30): number {
  return frameNumber / frameRate;
}

/**
 * Converts time in seconds to frame number
 * @param time - Time in seconds
 * @param frameRate - Frames per second (default 30)
 * @returns Frame number
 */
export function timeToFrame(time: number, frameRate: number = 30): number {
  return Math.floor(time * frameRate);
}

/**
 * Creates a video element from a File object
 * @param file - The video file
 * @returns Promise that resolves with the video element and its URL
 */
export function createVideoElement(file: File): Promise<{ element: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');

    video.preload = 'metadata';
    video.muted = true; // Required for autoplay in some browsers
    video.playsInline = true;

    const handleLoadedMetadata = () => {
      cleanup();
      resolve({ element: video, url });
    };

    const handleError = () => {
      cleanup();
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video file'));
    };

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    video.src = url;
    video.load();
  });
}

/**
 * Generates a resolution label from dimensions
 * @param width - Video width
 * @param height - Video height
 * @returns Resolution label like "1080p" or "720p"
 */
export function getResolutionLabel(width: number, height: number): string {
  // Common resolution labels based on height
  if (height >= 2160) return '4K';
  if (height >= 1440) return '1440p';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  return `${height}p`;
}
