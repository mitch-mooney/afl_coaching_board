import { useState, useCallback, useEffect, useMemo } from 'react';
import { useVideoStore, ExportSettings } from '../../store/videoStore';
import { useVideoExport } from '../../hooks/useVideoExport';
import {
  formatTime,
  supportsMediaRecorder,
  createVideoError,
  VideoErrorCode,
  VideoErrorInfo,
} from '../../utils/videoUtils';

/**
 * Format options for video export
 */
const FORMAT_OPTIONS: { value: ExportSettings['format']; label: string; description: string }[] = [
  { value: 'webm', label: 'WebM', description: 'Best browser support' },
  { value: 'mp4', label: 'MP4', description: 'Universal compatibility' },
];

/**
 * Resolution options for video export
 */
const RESOLUTION_OPTIONS: {
  value: ExportSettings['resolution'];
  label: string;
  dimensions: string;
}[] = [
  { value: '1080p', label: '1080p (Full HD)', dimensions: '1920×1080' },
  { value: '720p', label: '720p (HD)', dimensions: '1280×720' },
  { value: 'original', label: 'Original', dimensions: 'Match video' },
];

/**
 * Props for the VideoExporter component
 */
interface VideoExporterProps {
  /** Canvas element to capture for export */
  canvas: HTMLCanvasElement | null;
  /** Whether the panel is expanded */
  isExpanded?: boolean;
  /** Callback when panel expansion state changes */
  onToggleExpand?: () => void;
}

/**
 * VideoExporter - A UI component for configuring and initiating video export.
 *
 * Features:
 * - Export button with format selection (WebM, MP4)
 * - Resolution selector (720p, 1080p, original)
 * - Progress bar during export
 * - Cancel export button
 * - Auto-download on completion
 * - Error messages for export failures
 * - Disabled state when no video loaded
 *
 * @example
 * ```tsx
 * const { canvasRef, setCanvasRef } = useVideoCanvasRef();
 *
 * <VideoCanvas onCanvasReady={setCanvasRef} />
 * <VideoExporter
 *   canvas={canvasRef.current}
 *   isExpanded={isExportOpen}
 *   onToggleExpand={() => setIsExportOpen(!isExportOpen)}
 * />
 * ```
 */
export function VideoExporter({
  canvas,
  isExpanded = true,
  onToggleExpand,
}: VideoExporterProps) {
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showResolutionDropdown, setShowResolutionDropdown] = useState(false);

  // Video store state
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const duration = useVideoStore((state) => state.duration);
  const exportSettings = useVideoStore((state) => state.exportSettings);
  const setExportSettings = useVideoStore((state) => state.setExportSettings);

  // Video export hook
  const {
    exportState,
    isSupported,
    supportedFormats,
    startExport,
    cancelExport,
    resetExportState,
    getBestMimeType,
  } = useVideoExport();

  // Check if MP4 format is supported
  const isMp4Supported = supportedFormats.some((f) => f.includes('mp4'));

  // Convert export error to structured VideoErrorInfo for better display
  const exportErrorInfo = useMemo((): VideoErrorInfo | null => {
    if (!exportState.error) {
      return null;
    }

    // Determine the appropriate error code based on the error message
    let errorCode = VideoErrorCode.UNKNOWN_EXPORT_ERROR;
    const errorMessage = exportState.error.toLowerCase();

    if (errorMessage.includes('not supported')) {
      errorCode = VideoErrorCode.EXPORT_NOT_SUPPORTED;
    } else if (errorMessage.includes('no video')) {
      errorCode = VideoErrorCode.NO_VIDEO_LOADED;
    } else if (errorMessage.includes('canvas')) {
      errorCode = VideoErrorCode.CANVAS_NOT_AVAILABLE;
    } else if (errorMessage.includes('no supported')) {
      errorCode = VideoErrorCode.NO_EXPORT_FORMAT;
    } else if (errorMessage.includes('recording') || errorMessage.includes('failed')) {
      errorCode = VideoErrorCode.RECORDING_FAILED;
    } else if (errorMessage.includes('memory') || errorMessage.includes('quota')) {
      errorCode = VideoErrorCode.MEMORY_LIMIT_EXCEEDED;
    } else if (errorMessage.includes('cancel')) {
      errorCode = VideoErrorCode.EXPORT_CANCELLED;
    }

    const videoError = createVideoError(new Error(exportState.error), errorCode);
    return videoError.getErrorInfo();
  }, [exportState.error]);

  /**
   * Handle format selection
   */
  const handleFormatChange = useCallback(
    (format: ExportSettings['format']) => {
      setExportSettings({ format });
      setShowFormatDropdown(false);
    },
    [setExportSettings]
  );

  /**
   * Handle resolution selection
   */
  const handleResolutionChange = useCallback(
    (resolution: ExportSettings['resolution']) => {
      setExportSettings({ resolution });
      setShowResolutionDropdown(false);
    },
    [setExportSettings]
  );

  /**
   * Handle export button click
   */
  const handleStartExport = useCallback(async () => {
    if (!canvas || !isLoaded) return;

    try {
      await startExport(canvas);
    } catch {
      // Error is handled by the hook and stored in exportState.error
    }
  }, [canvas, isLoaded, startExport]);

  /**
   * Handle cancel button click
   */
  const handleCancelExport = useCallback(() => {
    cancelExport();
  }, [cancelExport]);

  /**
   * Clear error message
   */
  const handleDismissError = useCallback(() => {
    resetExportState();
  }, [resetExportState]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowFormatDropdown(false);
      setShowResolutionDropdown(false);
    };

    if (showFormatDropdown || showResolutionDropdown) {
      // Use setTimeout to avoid immediate trigger
      const timeout = setTimeout(() => {
        document.addEventListener('click', handleClickOutside, { once: true });
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [showFormatDropdown, showResolutionDropdown]);

  // Get current resolution display text
  const getCurrentResolutionLabel = () => {
    const option = RESOLUTION_OPTIONS.find((opt) => opt.value === exportSettings.resolution);
    return option?.label || 'Select Resolution';
  };

  // Get current format display text
  const getCurrentFormatLabel = () => {
    const option = FORMAT_OPTIONS.find((opt) => opt.value === exportSettings.format);
    return option?.label || 'Select Format';
  };

  // Check if export can start
  const canExport = isLoaded && canvas && isSupported && !exportState.isExporting;

  // Check if browser supports MediaRecorder
  if (!supportsMediaRecorder()) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-white">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-orange-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-medium text-gray-800">Export Not Available</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Video export is not supported in this browser. Please use Chrome, Edge, or Firefox
            for export functionality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
      {/* Panel Header */}
      <button
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-green-50 to-white hover:from-green-100 transition"
        aria-expanded={isExpanded}
        aria-controls="video-export-panel"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-green-600"
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
          <span className="font-medium text-gray-800">Export Video</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Panel Content */}
      {isExpanded && (
        <div
          id="video-export-panel"
          className="px-4 py-3 border-t border-gray-100 space-y-4"
        >
          {/* Export not available when no video is loaded */}
          {!isLoaded && (
            <div className="text-center py-4 text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-2 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm">Import a video to enable export</p>
            </div>
          )}

          {/* Export settings when video is loaded */}
          {isLoaded && (
            <>
              {/* Video info */}
              <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <span>Video Duration</span>
                <span className="font-medium">{formatTime(duration)}</span>
              </div>

              {/* Format Selection */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Format</label>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFormatDropdown(!showFormatDropdown);
                      setShowResolutionDropdown(false);
                    }}
                    disabled={exportState.isExporting}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-haspopup="listbox"
                    aria-expanded={showFormatDropdown}
                  >
                    <span>{getCurrentFormatLabel()}</span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        showFormatDropdown ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Format Dropdown */}
                  {showFormatDropdown && (
                    <div
                      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20"
                      role="listbox"
                      aria-label="Select export format"
                    >
                      {FORMAT_OPTIONS.map((format) => {
                        const isDisabled = format.value === 'mp4' && !isMp4Supported;
                        return (
                          <button
                            key={format.value}
                            onClick={() => !isDisabled && handleFormatChange(format.value)}
                            disabled={isDisabled}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition flex items-center justify-between ${
                              exportSettings.format === format.value
                                ? 'bg-green-50 text-green-700'
                                : ''
                            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            role="option"
                            aria-selected={exportSettings.format === format.value}
                          >
                            <div>
                              <span className="font-medium">{format.label}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {format.description}
                                {isDisabled && ' (Not supported)'}
                              </span>
                            </div>
                            {exportSettings.format === format.value && (
                              <svg
                                className="w-4 h-4 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution Selection */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Resolution</label>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowResolutionDropdown(!showResolutionDropdown);
                      setShowFormatDropdown(false);
                    }}
                    disabled={exportState.isExporting}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-haspopup="listbox"
                    aria-expanded={showResolutionDropdown}
                  >
                    <span>{getCurrentResolutionLabel()}</span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        showResolutionDropdown ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Resolution Dropdown */}
                  {showResolutionDropdown && (
                    <div
                      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20"
                      role="listbox"
                      aria-label="Select export resolution"
                    >
                      {RESOLUTION_OPTIONS.map((resolution) => (
                        <button
                          key={resolution.value}
                          onClick={() => handleResolutionChange(resolution.value)}
                          className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition flex items-center justify-between ${
                            exportSettings.resolution === resolution.value
                              ? 'bg-green-50 text-green-700'
                              : ''
                          }`}
                          role="option"
                          aria-selected={exportSettings.resolution === resolution.value}
                        >
                          <div>
                            <span className="font-medium">{resolution.label}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {resolution.dimensions}
                            </span>
                          </div>
                          {exportSettings.resolution === resolution.value && (
                            <svg
                              className="w-4 h-4 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Section */}
              {exportState.isExporting && (
                <div className="space-y-2">
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-green-500 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${exportState.progress}%` }}
                      role="progressbar"
                      aria-valuenow={exportState.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Export progress"
                    />
                  </div>

                  {/* Progress Text */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{exportState.phase}</span>
                    <span className="font-medium text-gray-800">{exportState.progress}%</span>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {!exportState.isExporting && exportState.progress === 100 && !exportState.error && (
                <div
                  className="flex items-center gap-2 bg-green-100 text-green-700 rounded-lg px-3 py-2"
                  role="status"
                  aria-live="polite"
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm font-medium">Export complete! Download started.</span>
                </div>
              )}

              {/* Error Message with Recovery Suggestions */}
              {exportErrorInfo && (
                <div
                  className="bg-red-50 border border-red-200 rounded-lg px-3 py-3"
                  role="alert"
                  aria-live="assertive"
                >
                  {/* Error Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-800">{exportErrorInfo.title}</p>
                        <p className="text-xs text-red-700 mt-0.5">{exportErrorInfo.message}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDismissError}
                      className="text-red-400 hover:text-red-600 transition p-0.5"
                      aria-label="Dismiss error"
                    >
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Recovery Suggestions */}
                  {exportErrorInfo.recovery.length > 0 && (
                    <div className="mt-2 pl-7">
                      <p className="text-xs font-medium text-red-700 mb-1">Try the following:</p>
                      <ul className="text-xs text-red-600 space-y-0.5">
                        {exportErrorInfo.recovery.slice(0, 3).map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-1.5">
                            <span className="text-red-400 mt-0.5">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Retry Button for retryable errors */}
                  {exportErrorInfo.isRetryable && (
                    <div className="mt-2 pl-7">
                      <button
                        onClick={() => {
                          handleDismissError();
                          handleStartExport();
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {exportState.isExporting ? (
                  <button
                    onClick={handleCancelExport}
                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
                    aria-label="Cancel export"
                  >
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Cancel Export
                  </button>
                ) : (
                  <button
                    onClick={handleStartExport}
                    disabled={!canExport}
                    className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
                    aria-label="Start export"
                  >
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
                    Export Video
                  </button>
                )}
              </div>

              {/* Format info */}
              <p className="text-xs text-gray-500 text-center">
                {getBestMimeType() ? (
                  <>
                    Exporting as{' '}
                    <span className="font-medium">{exportSettings.format.toUpperCase()}</span> at{' '}
                    <span className="font-medium">{getCurrentResolutionLabel()}</span>
                  </>
                ) : (
                  'No supported export format available'
                )}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version of the export panel for inline use
 */
export function VideoExporterCompact({
  canvas,
}: {
  canvas: HTMLCanvasElement | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <VideoExporter
      canvas={canvas}
      isExpanded={isExpanded}
      onToggleExpand={() => setIsExpanded(!isExpanded)}
    />
  );
}

export default VideoExporter;
