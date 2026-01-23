/**
 * Video utility functions for file validation, time formatting,
 * format checking, and aspect ratio calculations.
 */

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
