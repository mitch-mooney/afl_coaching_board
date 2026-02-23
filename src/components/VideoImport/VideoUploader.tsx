import { useState, useRef, useCallback } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { usePlaybookStore } from '../../store/playbookStore';
import { VideoTrimmer } from './VideoTrimmer';
import {
  validateVideoFile,
  getAcceptedMimeTypes,
  getSupportedFormats,
  formatFileSize,
  calculateAspectRatio,
  LARGE_FILE_WARNING_BYTES,
  VideoError,
  VideoErrorCode,
  VideoErrorInfo,
  createVideoError,
  mediaErrorToVideoErrorCode,
} from '../../utils/videoUtils';

/**
 * Loading phase for video import
 */
type LoadingPhase = 'idle' | 'validating' | 'loading' | 'processing' | 'ready';

/**
 * Top-level step in the import flow
 */
type ImportStep = 'upload' | 'trim';

/**
 * Loading progress state
 */
interface LoadingProgress {
  phase: LoadingPhase;
  percent: number;
  message: string;
}

/**
 * Creates a video element from a File object with progress tracking.
 * Uses streaming approach for memory efficiency - the blob URL references the file
 * without loading it entirely into memory.
 *
 * @param file - The video file
 * @param onProgress - Optional progress callback
 * @returns Promise that resolves with the video element and its URL
 */
function createVideoElementWithProgress(
  file: File,
  onProgress?: (progress: LoadingProgress) => void
): Promise<{ element: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    // Create object URL - this is memory-efficient as it references the file
    // directly rather than loading the entire file into memory
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');

    // Track if this is a large file that needs streaming awareness
    const isLargeFile = file.size > LARGE_FILE_WARNING_BYTES;

    // Configure video for efficient loading
    video.preload = isLargeFile ? 'metadata' : 'auto';
    video.muted = true; // Required for autoplay in some browsers
    video.playsInline = true;

    let hasResolved = false;

    // Report initial progress
    onProgress?.({
      phase: 'loading',
      percent: 10,
      message: 'Creating video element...',
    });

    const handleLoadedMetadata = () => {
      if (hasResolved) return;

      onProgress?.({
        phase: 'processing',
        percent: 50,
        message: 'Processing video metadata...',
      });
    };

    const handleLoadedData = () => {
      if (hasResolved) return;

      onProgress?.({
        phase: 'processing',
        percent: 75,
        message: 'Preparing video for playback...',
      });
    };

    const handleCanPlay = () => {
      if (hasResolved) return;
      hasResolved = true;

      onProgress?.({
        phase: 'ready',
        percent: 100,
        message: 'Video ready!',
      });

      cleanup();
      resolve({ element: video, url });
    };

    const handleCanPlayThrough = () => {
      // Also resolve on canplaythrough if canplay didn't fire
      if (hasResolved) return;
      hasResolved = true;

      onProgress?.({
        phase: 'ready',
        percent: 100,
        message: 'Video ready!',
      });

      cleanup();
      resolve({ element: video, url });
    };

    // For large files, we can resolve earlier on loadedmetadata
    // since we don't want to wait for the entire file to buffer
    const handleLoadedMetadataForLargeFile = () => {
      if (hasResolved || !isLargeFile) return;

      // Give a short delay to ensure video dimensions are available
      setTimeout(() => {
        if (hasResolved) return;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          hasResolved = true;

          onProgress?.({
            phase: 'ready',
            percent: 100,
            message: 'Video ready (streaming mode)',
          });

          cleanup();
          resolve({ element: video, url });
        }
      }, 100);
    };

    const handleProgress = () => {
      if (hasResolved) return;

      // Calculate approximate progress from buffered ranges
      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferPercent = Math.min((bufferedEnd / video.duration) * 100, 100);
        // Map buffer progress to 20-90% of our progress bar
        const displayPercent = 20 + (bufferPercent * 0.7);

        onProgress?.({
          phase: 'loading',
          percent: Math.round(displayPercent),
          message: `Loading video data (${Math.round(bufferPercent)}% buffered)...`,
        });
      }
    };

    const handleError = () => {
      if (hasResolved) return;
      hasResolved = true;

      cleanup();
      URL.revokeObjectURL(url);

      // Convert MediaError to VideoError for consistent error handling
      const errorCode = video.error?.code;
      const videoErrorCode = errorCode
        ? mediaErrorToVideoErrorCode(errorCode)
        : VideoErrorCode.UNKNOWN_LOAD_ERROR;

      reject(new VideoError(videoErrorCode));
    };

    // Timeout handler for very large files that may take too long
    const timeoutId = setTimeout(() => {
      if (hasResolved) return;

      // If we have metadata but video hasn't fully loaded, resolve anyway
      // This allows streaming playback to work
      if (video.readyState >= 1 && video.videoWidth > 0) {
        hasResolved = true;

        onProgress?.({
          phase: 'ready',
          percent: 100,
          message: 'Video ready (streaming mode)',
        });

        cleanup();
        resolve({ element: video, url });
      }
    }, 30000); // 30 second timeout for metadata

    const cleanup = () => {
      clearTimeout(timeoutId);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadedmetadata', handleLoadedMetadataForLargeFile);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('error', handleError);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadedmetadata', handleLoadedMetadataForLargeFile);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('error', handleError);

    video.src = url;
    video.load();
  });
}

interface VideoUploaderProps {
  onClose?: () => void;
}

export function VideoUploader({ onClose }: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorInfo, setErrorInfo] = useState<VideoErrorInfo | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    phase: 'idle',
    percent: 0,
    message: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [readyFile, setReadyFile] = useState<File | null>(null);
  const [readyDuration, setReadyDuration] = useState(0);

  const {
    isLoading,
    setVideoFile,
    setVideoElement,
    setVideoMetadata,
    setDuration,
    setIsLoaded,
    setIsLoading,
    setError: setStoreError,
    setIsVideoMode,
    saveVideoBlob,
  } = useVideoStore();
  const { currentPlaybook, savePlaybook } = usePlaybookStore();

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Clear previous messages
      setErrorInfo(null);
      setWarning(null);
      setSelectedFile(file);
      setLastFailedFile(null);

      // Update progress: validating
      setLoadingProgress({
        phase: 'validating',
        percent: 5,
        message: 'Validating video file...',
      });

      // Validate the file
      const validation = validateVideoFile(file);

      if (!validation.isValid) {
        // Convert validation error to VideoErrorInfo
        let errorCode = VideoErrorCode.UNKNOWN;
        if (validation.error?.includes('Unsupported')) {
          errorCode = VideoErrorCode.UNSUPPORTED_FORMAT;
        } else if (validation.error?.includes('too large')) {
          errorCode = VideoErrorCode.FILE_TOO_LARGE;
        } else if (validation.error?.includes('No file')) {
          errorCode = VideoErrorCode.NO_FILE;
        }

        const videoError = new VideoError(errorCode, {
          message: validation.error,
        });
        setErrorInfo(videoError.getErrorInfo());
        setLoadingProgress({ phase: 'idle', percent: 0, message: '' });
        setSelectedFile(null);
        setLastFailedFile(file);
        return;
      }

      if (validation.warning) {
        setWarning(validation.warning);
      }

      // Set loading state
      setIsLoading(true);
      setVideoFile(file);

      // Update progress: loading
      setLoadingProgress({
        phase: 'loading',
        percent: 10,
        message: 'Loading video file...',
      });

      try {
        // Create video element with progress tracking
        // Uses streaming approach - the blob URL references the file
        // without loading it entirely into memory
        const { element } = await createVideoElementWithProgress(file, setLoadingProgress);

        // Calculate aspect ratio
        const aspectRatio = calculateAspectRatio(element.videoWidth, element.videoHeight);

        // Update store with video metadata
        setVideoMetadata({
          fileName: file.name,
          fileSize: file.size,
          width: element.videoWidth,
          height: element.videoHeight,
          aspectRatio: aspectRatio.ratio,
        });

        setDuration(element.duration);
        setVideoElement(element);
        setIsLoaded(true);
        setIsVideoMode(true);

        // Reset progress state
        setLoadingProgress({ phase: 'idle', percent: 0, message: '' });
        setLastFailedFile(null);

        // Transition to trim step so user can optionally trim and save to playbook
        setReadyFile(file);
        setReadyDuration(element.duration);
        setSelectedFile(null);
        setImportStep('trim');
      } catch (err) {
        // Convert to VideoError for structured error handling
        const videoError = createVideoError(err, VideoErrorCode.UNKNOWN_LOAD_ERROR);
        setErrorInfo(videoError.getErrorInfo());
        setStoreError(videoError.message);
        setVideoFile(null);
        setLoadingProgress({ phase: 'idle', percent: 0, message: '' });
        setSelectedFile(null);
        setLastFailedFile(file);
      } finally {
        setIsLoading(false);
      }
    },
    [
      setVideoFile,
      setVideoElement,
      setVideoMetadata,
      setDuration,
      setIsLoaded,
      setIsLoading,
      setStoreError,
      setIsVideoMode,
    ]
  );

  /**
   * Retry loading the last failed file
   */
  const handleRetry = useCallback(() => {
    if (lastFailedFile) {
      handleFileSelect(lastFailedFile);
    }
  }, [lastFailedFile, handleFileSelect]);

  /**
   * Dismiss the error and clear the last failed file
   */
  const handleDismissError = useCallback(() => {
    setErrorInfo(null);
    setLastFailedFile(null);
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so the same file can be selected again
    event.target.value = '';
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const supportedFormats = getSupportedFormats();

  // Trim step: show VideoTrimmer after video is loaded
  if (importStep === 'trim' && readyFile) {
    const handleTrimSave = async (blob: Blob) => {
      try {
        const videoId = `${readyFile.name}-${Date.now()}`;
        const blobDbId = await saveVideoBlob(videoId, blob);
        // If there's an active playbook, associate the video blob with it
        if (currentPlaybook) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, createdAt: _createdAt, ...playbookData } = currentPlaybook;
          await savePlaybook({ ...playbookData, videoBlobId: blobDbId });
        }
      } catch (err) {
        // Non-fatal: video is already loaded, just couldn't save to playbook
        console.warn('Could not save video blob to playbook:', err);
      }
      if (onClose) onClose();
    };

    const handleTrimSkip = () => {
      if (onClose) onClose();
    };

    return (
      <VideoTrimmer
        file={readyFile}
        duration={readyDuration}
        onSkip={handleTrimSkip}
        onSave={handleTrimSave}
      />
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-6 max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Import Video</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
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
        )}
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }
          ${isLoading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
        `}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
        aria-label="Drop video file here or click to browse"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedMimeTypes()}
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-2">
            {/* File info */}
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg
                  className="w-5 h-5 text-blue-500"
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
                <span className="truncate max-w-[200px]" title={selectedFile.name}>
                  {selectedFile.name}
                </span>
                <span className="text-gray-400">
                  ({formatFileSize(selectedFile.size)})
                </span>
              </div>
            )}

            {/* Progress bar */}
            <div className="w-full max-w-xs">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {loadingProgress.message || 'Loading...'}
                </span>
                <span className="text-xs font-medium text-blue-600">
                  {loadingProgress.percent}%
                </span>
              </div>
            </div>

            {/* Large file streaming notice */}
            {selectedFile && selectedFile.size > LARGE_FILE_WARNING_BYTES && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Large file - using streaming mode for efficiency</span>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Upload Icon */}
            <div className="mb-4">
              <svg
                className={`w-12 h-12 mx-auto ${
                  isDragActive ? 'text-blue-500' : 'text-gray-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <p className="text-gray-700 font-medium mb-1">
              {isDragActive ? 'Drop video here' : 'Drag and drop video file'}
            </p>
            <p className="text-gray-500 text-sm mb-3">or click to browse</p>

            <button
              type="button"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
            >
              Browse Files
            </button>
          </>
        )}
      </div>

      {/* Error Message with Recovery Suggestions */}
      {errorInfo && (
        <div
          className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
        >
          {/* Error Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium text-red-800">{errorInfo.title}</p>
                <p className="text-sm text-red-700 mt-0.5">{errorInfo.message}</p>
              </div>
            </div>
            {/* Dismiss button */}
            <button
              onClick={handleDismissError}
              className="text-red-400 hover:text-red-600 transition p-1"
              aria-label="Dismiss error"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Recovery Suggestions */}
          {errorInfo.recovery.length > 0 && (
            <div className="mt-3 pl-7">
              <p className="text-xs font-medium text-red-700 mb-1">Try the following:</p>
              <ul className="text-xs text-red-600 space-y-1">
                {errorInfo.recovery.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Retry Button for retryable errors */}
          {errorInfo.isRetryable && lastFailedFile && (
            <div className="mt-3 pl-7">
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Warning Message */}
      {warning && !errorInfo && (
        <div
          className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{warning}</span>
          </div>
        </div>
      )}

      {/* Supported Formats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">Supported formats:</p>
        <div className="flex flex-wrap gap-2">
          {supportedFormats.map((format) => (
            <span
              key={format.extension}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
              title={format.description}
            >
              {format.extension.toUpperCase().replace('.', '')}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Maximum file size: {formatFileSize(500 * 1024 * 1024)}
        </p>
      </div>
    </div>
  );
}
