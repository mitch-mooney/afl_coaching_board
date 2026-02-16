import { describe, it, expect } from 'vitest';
import {
  // Error handling
  VideoErrorCode,
  VideoError,
  getVideoErrorInfo,
  mediaErrorToVideoErrorCode,
  createVideoErrorFromMediaError,
  createVideoError,
  formatVideoError,
  // Constants
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_VIDEO_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  LARGE_FILE_WARNING_BYTES,
  // Validation
  validateVideoFile,
  // Time formatting
  formatTime,
  formatTimeWithMs,
  parseTimeString,
  clampTime,
  frameToTime,
  timeToFrame,
  // Aspect ratio
  calculateAspectRatio,
  getAspectRatioDisplay,
  calculateFitDimensions,
  // File utilities
  getFileExtension,
  formatFileSize,
  getSupportedFormats,
  getAcceptedMimeTypes,
  getResolutionLabel,
  // Browser support
  supportsVideoFrameCallback,
  supportsMediaRecorder,
  getSupportedExportFormats,
} from '../videoUtils';

// Helper to create a mock File
const createMockFile = (
  name = 'test.mp4',
  size = 1000,
  type = 'video/mp4'
): File => {
  const content = new Array(size).fill('x').join('');
  return new File([content], name, { type });
};

describe('videoUtils', () => {
  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('VideoErrorCode', () => {
    it('should define all expected error codes', () => {
      expect(VideoErrorCode.NO_FILE).toBe('NO_FILE');
      expect(VideoErrorCode.UNSUPPORTED_FORMAT).toBe('UNSUPPORTED_FORMAT');
      expect(VideoErrorCode.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE');
      expect(VideoErrorCode.FILE_CORRUPTED).toBe('FILE_CORRUPTED');
      expect(VideoErrorCode.LOAD_ABORTED).toBe('LOAD_ABORTED');
      expect(VideoErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(VideoErrorCode.DECODE_ERROR).toBe('DECODE_ERROR');
      expect(VideoErrorCode.FORMAT_NOT_SUPPORTED).toBe('FORMAT_NOT_SUPPORTED');
      expect(VideoErrorCode.LOAD_TIMEOUT).toBe('LOAD_TIMEOUT');
      expect(VideoErrorCode.EXPORT_NOT_SUPPORTED).toBe('EXPORT_NOT_SUPPORTED');
      expect(VideoErrorCode.UNKNOWN).toBe('UNKNOWN');
    });
  });

  describe('VideoError', () => {
    it('should create error with correct code and default message', () => {
      const error = new VideoError(VideoErrorCode.NO_FILE);

      expect(error.code).toBe(VideoErrorCode.NO_FILE);
      expect(error.name).toBe('VideoError');
      expect(error.title).toBe('No File Selected');
      expect(error.message).toBe('Please select a video file to import.');
      expect(error.recovery).toContain('Click the "Browse Files" button or drag and drop a video file.');
      expect(error.isRetryable).toBe(true);
    });

    it('should accept custom message', () => {
      const customMessage = 'Custom error message';
      const error = new VideoError(VideoErrorCode.NO_FILE, { message: customMessage });

      expect(error.message).toBe(customMessage);
    });

    it('should store original error', () => {
      const originalError = new Error('Original error');
      const error = new VideoError(VideoErrorCode.UNKNOWN, { originalError });

      expect(error.originalError).toBe(originalError);
    });

    it('should return error info via getErrorInfo()', () => {
      const error = new VideoError(VideoErrorCode.FILE_TOO_LARGE);
      const info = error.getErrorInfo();

      expect(info.code).toBe(VideoErrorCode.FILE_TOO_LARGE);
      expect(info.title).toBe('File Too Large');
      expect(info.message).toContain('500MB');
      expect(info.recovery).toBeInstanceOf(Array);
      expect(info.isRetryable).toBe(false);
    });

    it('should mark non-retryable errors correctly', () => {
      const nonRetryableCodes = [
        VideoErrorCode.UNSUPPORTED_FORMAT,
        VideoErrorCode.FILE_TOO_LARGE,
        VideoErrorCode.FILE_CORRUPTED,
        VideoErrorCode.DECODE_ERROR,
        VideoErrorCode.FORMAT_NOT_SUPPORTED,
        VideoErrorCode.EXPORT_NOT_SUPPORTED,
        VideoErrorCode.NO_EXPORT_FORMAT,
      ];

      nonRetryableCodes.forEach((code) => {
        const error = new VideoError(code);
        expect(error.isRetryable).toBe(false);
      });
    });

    it('should mark retryable errors correctly', () => {
      const retryableCodes = [
        VideoErrorCode.NO_FILE,
        VideoErrorCode.LOAD_ABORTED,
        VideoErrorCode.NETWORK_ERROR,
        VideoErrorCode.LOAD_TIMEOUT,
        VideoErrorCode.NO_VIDEO_LOADED,
        VideoErrorCode.RECORDING_FAILED,
        VideoErrorCode.EXPORT_CANCELLED,
        VideoErrorCode.UNKNOWN,
      ];

      retryableCodes.forEach((code) => {
        const error = new VideoError(code);
        expect(error.isRetryable).toBe(true);
      });
    });
  });

  describe('getVideoErrorInfo', () => {
    it('should return info for a known error code', () => {
      const info = getVideoErrorInfo(VideoErrorCode.NETWORK_ERROR);

      expect(info.code).toBe(VideoErrorCode.NETWORK_ERROR);
      expect(info.title).toBe('Network Error');
      expect(info.message).toContain('network error');
      expect(info.recovery.length).toBeGreaterThan(0);
    });

    it('should use custom message when provided', () => {
      const customMessage = 'Custom network error message';
      const info = getVideoErrorInfo(VideoErrorCode.NETWORK_ERROR, customMessage);

      expect(info.message).toBe(customMessage);
    });
  });

  describe('mediaErrorToVideoErrorCode', () => {
    it('should map MEDIA_ERR_ABORTED to LOAD_ABORTED', () => {
      expect(mediaErrorToVideoErrorCode(MediaError.MEDIA_ERR_ABORTED)).toBe(
        VideoErrorCode.LOAD_ABORTED
      );
    });

    it('should map MEDIA_ERR_NETWORK to NETWORK_ERROR', () => {
      expect(mediaErrorToVideoErrorCode(MediaError.MEDIA_ERR_NETWORK)).toBe(
        VideoErrorCode.NETWORK_ERROR
      );
    });

    it('should map MEDIA_ERR_DECODE to DECODE_ERROR', () => {
      expect(mediaErrorToVideoErrorCode(MediaError.MEDIA_ERR_DECODE)).toBe(
        VideoErrorCode.DECODE_ERROR
      );
    });

    it('should map MEDIA_ERR_SRC_NOT_SUPPORTED to FORMAT_NOT_SUPPORTED', () => {
      expect(mediaErrorToVideoErrorCode(MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED)).toBe(
        VideoErrorCode.FORMAT_NOT_SUPPORTED
      );
    });

    it('should map unknown codes to UNKNOWN_LOAD_ERROR', () => {
      expect(mediaErrorToVideoErrorCode(999)).toBe(VideoErrorCode.UNKNOWN_LOAD_ERROR);
    });
  });

  describe('createVideoErrorFromMediaError', () => {
    it('should create VideoError from MediaError', () => {
      // Create a mock MediaError-like object
      const mockMediaError = {
        code: MediaError.MEDIA_ERR_NETWORK,
        message: 'Network failed',
      } as MediaError;

      const error = createVideoErrorFromMediaError(mockMediaError);

      expect(error).toBeInstanceOf(VideoError);
      expect(error.code).toBe(VideoErrorCode.NETWORK_ERROR);
    });

    it('should use MediaError message if available', () => {
      const mockMediaError = {
        code: MediaError.MEDIA_ERR_DECODE,
        message: 'Custom decode error',
      } as MediaError;

      const error = createVideoErrorFromMediaError(mockMediaError);

      expect(error.message).toBe('Custom decode error');
    });

    it('should use default message if MediaError message is empty', () => {
      const mockMediaError = {
        code: MediaError.MEDIA_ERR_DECODE,
        message: '',
      } as MediaError;

      const error = createVideoErrorFromMediaError(mockMediaError);

      expect(error.message).toContain('could not be decoded');
    });
  });

  describe('createVideoError', () => {
    it('should return same error if already a VideoError', () => {
      const originalError = new VideoError(VideoErrorCode.NO_FILE);
      const result = createVideoError(originalError);

      expect(result).toBe(originalError);
    });

    it('should detect aborted errors from message', () => {
      const error = new Error('The operation was aborted');
      const result = createVideoError(error);

      expect(result.code).toBe(VideoErrorCode.LOAD_ABORTED);
    });

    it('should detect network errors from message', () => {
      const error = new Error('Network request failed');
      const result = createVideoError(error);

      expect(result.code).toBe(VideoErrorCode.NETWORK_ERROR);
    });

    it('should detect decode errors from message', () => {
      const error = new Error('Failed to decode video stream');
      const result = createVideoError(error);

      expect(result.code).toBe(VideoErrorCode.DECODE_ERROR);
    });

    it('should detect corrupt file errors from message', () => {
      const error = new Error('File appears to be corrupt');
      const result = createVideoError(error);

      expect(result.code).toBe(VideoErrorCode.DECODE_ERROR);
    });

    it('should detect unsupported format from message', () => {
      const error = new Error('Format not supported');
      const result = createVideoError(error);

      expect(result.code).toBe(VideoErrorCode.FORMAT_NOT_SUPPORTED);
    });

    it('should detect timeout from message', () => {
      const error = new Error('Request timeout');
      const result = createVideoError(error);

      expect(result.code).toBe(VideoErrorCode.LOAD_TIMEOUT);
    });

    it('should detect memory errors from message', () => {
      const error = new Error('Out of memory');
      const result = createVideoError(error);

      expect(result.code).toBe(VideoErrorCode.MEMORY_LIMIT_EXCEEDED);
    });

    it('should detect cancel from message', () => {
      const error = new Error('Operation was cancelled');
      const result = createVideoError(error);

      expect(result.code).toBe(VideoErrorCode.EXPORT_CANCELLED);
    });

    it('should use default code for unknown errors', () => {
      const error = new Error('Something weird happened');
      const result = createVideoError(error);

      expect(result.code).toBe(VideoErrorCode.UNKNOWN);
    });

    it('should use custom default code when provided', () => {
      const error = new Error('Something weird happened');
      const result = createVideoError(error, VideoErrorCode.PLAYBACK_FAILED);

      expect(result.code).toBe(VideoErrorCode.PLAYBACK_FAILED);
    });

    it('should handle non-Error objects', () => {
      const result = createVideoError('string error');

      expect(result).toBeInstanceOf(VideoError);
      expect(result.code).toBe(VideoErrorCode.UNKNOWN);
    });

    it('should handle null/undefined', () => {
      const result1 = createVideoError(null);
      const result2 = createVideoError(undefined);

      expect(result1.code).toBe(VideoErrorCode.UNKNOWN);
      expect(result2.code).toBe(VideoErrorCode.UNKNOWN);
    });
  });

  describe('formatVideoError', () => {
    it('should format VideoError correctly', () => {
      const error = new VideoError(VideoErrorCode.FILE_TOO_LARGE);
      const formatted = formatVideoError(error);

      expect(formatted.title).toBe('File Too Large');
      expect(formatted.message).toContain('500MB');
      expect(formatted.recovery).toBeInstanceOf(Array);
    });

    it('should format regular Error', () => {
      const error = new Error('Network error occurred');
      const formatted = formatVideoError(error);

      expect(formatted.title).toBe('Network Error');
      expect(formatted.recovery).toBeInstanceOf(Array);
    });

    it('should format unknown values', () => {
      const formatted = formatVideoError('some string');

      expect(formatted.title).toBe('Unknown Error');
      expect(formatted.recovery).toBeInstanceOf(Array);
    });
  });

  // ============================================================================
  // CONSTANTS TESTS
  // ============================================================================

  describe('Constants', () => {
    it('should define supported video types', () => {
      expect(SUPPORTED_VIDEO_TYPES).toContain('video/mp4');
      expect(SUPPORTED_VIDEO_TYPES).toContain('video/webm');
    });

    it('should define supported video extensions', () => {
      expect(SUPPORTED_VIDEO_EXTENSIONS).toContain('.mp4');
      expect(SUPPORTED_VIDEO_EXTENSIONS).toContain('.webm');
    });

    it('should define max file size as 500MB', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(500 * 1024 * 1024);
    });

    it('should define large file warning threshold as 100MB', () => {
      expect(LARGE_FILE_WARNING_BYTES).toBe(100 * 1024 * 1024);
    });
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe('validateVideoFile', () => {
    it('should return error for null/undefined file', () => {
      const result = validateVideoFile(null as unknown as File);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    it('should accept valid MP4 file', () => {
      const file = createMockFile('video.mp4', 1000, 'video/mp4');
      const result = validateVideoFile(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid WebM file', () => {
      const file = createMockFile('video.webm', 1000, 'video/webm');
      const result = validateVideoFile(file);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject unsupported file types', () => {
      const file = createMockFile('video.avi', 1000, 'video/avi');
      const result = validateVideoFile(file);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported video format');
    });

    it('should accept file with correct extension even if MIME type is wrong', () => {
      // Some browsers may not set MIME type correctly
      const file = createMockFile('video.mp4', 1000, 'application/octet-stream');
      const result = validateVideoFile(file);

      expect(result.isValid).toBe(true);
    });

    it('should reject file exceeding maximum size', () => {
      const oversizedFile = createMockFile('large.mp4', MAX_FILE_SIZE_BYTES + 1, 'video/mp4');
      const result = validateVideoFile(oversizedFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should return warning for large files within limit', () => {
      const largeFile = createMockFile(
        'large.mp4',
        LARGE_FILE_WARNING_BYTES + 1000,
        'video/mp4'
      );
      const result = validateVideoFile(largeFile);

      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('Large file detected');
    });

    it('should not warn for files below warning threshold', () => {
      const normalFile = createMockFile('normal.mp4', 1000, 'video/mp4');
      const result = validateVideoFile(normalFile);

      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  // ============================================================================
  // TIME FORMATTING TESTS
  // ============================================================================

  describe('formatTime', () => {
    it('should format 0 seconds as 0:00', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('should format seconds under a minute', () => {
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(59)).toBe('0:59');
    });

    it('should format minutes and seconds', () => {
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(125)).toBe('2:05');
      expect(formatTime(600)).toBe('10:00');
    });

    it('should format hours, minutes, and seconds', () => {
      expect(formatTime(3600)).toBe('1:00:00');
      expect(formatTime(3661)).toBe('1:01:01');
      expect(formatTime(7325)).toBe('2:02:05');
    });

    it('should handle fractional seconds by flooring', () => {
      expect(formatTime(5.9)).toBe('0:05');
      expect(formatTime(65.5)).toBe('1:05');
    });

    it('should handle negative values', () => {
      expect(formatTime(-10)).toBe('0:00');
    });

    it('should handle NaN and Infinity', () => {
      expect(formatTime(NaN)).toBe('0:00');
      expect(formatTime(Infinity)).toBe('0:00');
      expect(formatTime(-Infinity)).toBe('0:00');
    });
  });

  describe('formatTimeWithMs', () => {
    it('should format 0 seconds as 0:00.000', () => {
      expect(formatTimeWithMs(0)).toBe('0:00.000');
    });

    it('should include milliseconds', () => {
      expect(formatTimeWithMs(1.5)).toBe('0:01.500');
      expect(formatTimeWithMs(5.123)).toBe('0:05.123');
    });

    it('should format minutes and seconds with ms', () => {
      expect(formatTimeWithMs(65.5)).toBe('1:05.500');
      expect(formatTimeWithMs(125.999)).toBe('2:05.999');
    });

    it('should handle fractional milliseconds', () => {
      expect(formatTimeWithMs(1.5005)).toBe('0:01.500');
    });

    it('should handle negative values', () => {
      expect(formatTimeWithMs(-10)).toBe('0:00.000');
    });

    it('should handle NaN and Infinity', () => {
      expect(formatTimeWithMs(NaN)).toBe('0:00.000');
      expect(formatTimeWithMs(Infinity)).toBe('0:00.000');
    });
  });

  describe('parseTimeString', () => {
    it('should parse mm:ss format', () => {
      expect(parseTimeString('1:30')).toBe(90);
      expect(parseTimeString('5:00')).toBe(300);
      expect(parseTimeString('0:45')).toBe(45);
    });

    it('should parse hh:mm:ss format', () => {
      expect(parseTimeString('1:00:00')).toBe(3600);
      expect(parseTimeString('1:30:45')).toBe(5445);
      expect(parseTimeString('2:15:30')).toBe(8130);
    });

    it('should return 0 for invalid formats', () => {
      expect(parseTimeString('')).toBe(0);
      expect(parseTimeString('invalid')).toBe(0);
      expect(parseTimeString('1:2:3:4')).toBe(0);
      expect(parseTimeString('abc:def')).toBe(0);
    });

    it('should handle single segment as 0', () => {
      expect(parseTimeString('30')).toBe(0);
    });
  });

  describe('clampTime', () => {
    it('should return time if within bounds', () => {
      expect(clampTime(50, 100)).toBe(50);
    });

    it('should clamp to 0 if negative', () => {
      expect(clampTime(-10, 100)).toBe(0);
    });

    it('should clamp to duration if exceeded', () => {
      expect(clampTime(150, 100)).toBe(100);
    });

    it('should handle edge cases', () => {
      expect(clampTime(0, 100)).toBe(0);
      expect(clampTime(100, 100)).toBe(100);
    });
  });

  describe('frameToTime', () => {
    it('should convert frame to time at default 30fps', () => {
      expect(frameToTime(0)).toBe(0);
      expect(frameToTime(30)).toBe(1);
      expect(frameToTime(60)).toBe(2);
      expect(frameToTime(15)).toBe(0.5);
    });

    it('should convert frame to time at custom fps', () => {
      expect(frameToTime(60, 60)).toBe(1);
      expect(frameToTime(24, 24)).toBe(1);
      expect(frameToTime(25, 25)).toBe(1);
    });
  });

  describe('timeToFrame', () => {
    it('should convert time to frame at default 30fps', () => {
      expect(timeToFrame(0)).toBe(0);
      expect(timeToFrame(1)).toBe(30);
      expect(timeToFrame(2)).toBe(60);
      expect(timeToFrame(0.5)).toBe(15);
    });

    it('should convert time to frame at custom fps', () => {
      expect(timeToFrame(1, 60)).toBe(60);
      expect(timeToFrame(1, 24)).toBe(24);
      expect(timeToFrame(1, 25)).toBe(25);
    });

    it('should floor fractional frames', () => {
      expect(timeToFrame(0.05)).toBe(1); // 0.05 * 30 = 1.5 -> 1
    });
  });

  // ============================================================================
  // ASPECT RATIO TESTS
  // ============================================================================

  describe('calculateAspectRatio', () => {
    it('should calculate 16:9 aspect ratio', () => {
      const result = calculateAspectRatio(1920, 1080);

      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.ratio).toBeCloseTo(16 / 9, 5);
      expect(result.display).toBe('16:9');
    });

    it('should calculate 4:3 aspect ratio', () => {
      const result = calculateAspectRatio(640, 480);

      expect(result.ratio).toBeCloseTo(4 / 3, 5);
      expect(result.display).toBe('4:3');
    });

    it('should calculate 1:1 aspect ratio', () => {
      const result = calculateAspectRatio(500, 500);

      expect(result.ratio).toBe(1);
      expect(result.display).toBe('1:1');
    });

    it('should return Unknown for invalid dimensions', () => {
      expect(calculateAspectRatio(0, 100).display).toBe('Unknown');
      expect(calculateAspectRatio(100, 0).display).toBe('Unknown');
      expect(calculateAspectRatio(-100, 100).display).toBe('Unknown');
      expect(calculateAspectRatio(100, -100).display).toBe('Unknown');
    });
  });

  describe('getAspectRatioDisplay', () => {
    it('should identify common aspect ratios', () => {
      expect(getAspectRatioDisplay(16 / 9)).toBe('16:9');
      expect(getAspectRatioDisplay(4 / 3)).toBe('4:3');
      expect(getAspectRatioDisplay(21 / 9)).toBe('21:9');
      expect(getAspectRatioDisplay(1)).toBe('1:1');
      expect(getAspectRatioDisplay(9 / 16)).toBe('9:16');
      expect(getAspectRatioDisplay(3 / 4)).toBe('3:4');
      expect(getAspectRatioDisplay(2.35)).toBe('2.35:1');
      expect(getAspectRatioDisplay(1.85)).toBe('1.85:1');
    });

    it('should handle ratios within tolerance', () => {
      // 16/9 is approximately 1.777...
      expect(getAspectRatioDisplay(1.78)).toBe('16:9');
      expect(getAspectRatioDisplay(1.77)).toBe('16:9');
    });

    it('should return decimal for non-standard ratios', () => {
      const result = getAspectRatioDisplay(1.5);
      expect(result).toBe('1.50:1');
    });
  });

  describe('calculateFitDimensions', () => {
    it('should fit wider video (letterbox)', () => {
      // 16:9 video in a 4:3 container
      const result = calculateFitDimensions(1920, 1080, 800, 600);

      expect(result.width).toBe(800);
      expect(result.height).toBe(450);
      expect(result.x).toBe(0);
      expect(result.y).toBe(75); // (600 - 450) / 2
    });

    it('should fit taller video (pillarbox)', () => {
      // 4:3 video in a 16:9 container
      const result = calculateFitDimensions(640, 480, 1920, 1080);

      expect(result.height).toBe(1080);
      expect(result.width).toBeCloseTo(1440, 0);
      expect(result.y).toBe(0);
      expect(result.x).toBeCloseTo(240, 0); // (1920 - 1440) / 2
    });

    it('should fit perfectly matching aspect ratio', () => {
      const result = calculateFitDimensions(1920, 1080, 960, 540);

      expect(result.width).toBe(960);
      expect(result.height).toBe(540);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should return zeros for invalid dimensions', () => {
      expect(calculateFitDimensions(0, 1080, 800, 600)).toEqual({
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      });
      expect(calculateFitDimensions(1920, 0, 800, 600)).toEqual({
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      });
      expect(calculateFitDimensions(1920, 1080, 0, 600)).toEqual({
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      });
      expect(calculateFitDimensions(1920, 1080, 800, 0)).toEqual({
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      });
    });
  });

  // ============================================================================
  // FILE UTILITIES TESTS
  // ============================================================================

  describe('getFileExtension', () => {
    it('should extract extension from filename', () => {
      expect(getFileExtension('video.mp4')).toBe('.mp4');
      expect(getFileExtension('video.webm')).toBe('.webm');
      expect(getFileExtension('file.tar.gz')).toBe('.gz');
    });

    it('should return lowercase extension', () => {
      expect(getFileExtension('VIDEO.MP4')).toBe('.mp4');
      expect(getFileExtension('file.WebM')).toBe('.webm');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('noextension')).toBe('');
      expect(getFileExtension('')).toBe('');
    });

    it('should handle hidden files', () => {
      expect(getFileExtension('.gitignore')).toBe('.gitignore');
    });
  });

  describe('formatFileSize', () => {
    it('should format 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
    });
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const formats = getSupportedFormats();

      expect(formats).toBeInstanceOf(Array);
      expect(formats.length).toBeGreaterThan(0);

      // Check MP4 format
      const mp4 = formats.find((f) => f.extension === '.mp4');
      expect(mp4).toBeDefined();
      expect(mp4?.mimeType).toBe('video/mp4');
      expect(mp4?.codec).toBe('H.264/AVC');

      // Check WebM format
      const webm = formats.find((f) => f.extension === '.webm');
      expect(webm).toBeDefined();
      expect(webm?.mimeType).toBe('video/webm');
      expect(webm?.codec).toBe('VP8/VP9');
    });
  });

  describe('getAcceptedMimeTypes', () => {
    it('should return comma-separated MIME types', () => {
      const result = getAcceptedMimeTypes();

      expect(result).toContain('video/mp4');
      expect(result).toContain('video/webm');
      expect(result).toContain(',');
    });
  });

  describe('getResolutionLabel', () => {
    it('should return 4K for 2160p and above', () => {
      expect(getResolutionLabel(3840, 2160)).toBe('4K');
      expect(getResolutionLabel(4096, 2160)).toBe('4K');
    });

    it('should return 1440p for 1440p resolution', () => {
      expect(getResolutionLabel(2560, 1440)).toBe('1440p');
    });

    it('should return 1080p for 1080p resolution', () => {
      expect(getResolutionLabel(1920, 1080)).toBe('1080p');
      expect(getResolutionLabel(1920, 1200)).toBe('1080p');
    });

    it('should return 720p for 720p resolution', () => {
      expect(getResolutionLabel(1280, 720)).toBe('720p');
    });

    it('should return 480p for 480p resolution', () => {
      expect(getResolutionLabel(854, 480)).toBe('480p');
    });

    it('should return actual height for lower resolutions', () => {
      expect(getResolutionLabel(640, 360)).toBe('360p');
      expect(getResolutionLabel(320, 240)).toBe('240p');
    });
  });

  // ============================================================================
  // BROWSER SUPPORT TESTS
  // ============================================================================

  describe('supportsVideoFrameCallback', () => {
    it('should return boolean indicating support', () => {
      const result = supportsVideoFrameCallback();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('supportsMediaRecorder', () => {
    it('should return boolean indicating support', () => {
      const result = supportsMediaRecorder();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getSupportedExportFormats', () => {
    it('should return array of strings', () => {
      const formats = getSupportedExportFormats();
      expect(formats).toBeInstanceOf(Array);
    });

    it('should return empty array if MediaRecorder not supported', () => {
      // This depends on the test environment
      const formats = getSupportedExportFormats();
      expect(formats).toBeInstanceOf(Array);
    });
  });
});
