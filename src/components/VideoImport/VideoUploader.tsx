import { useState, useRef, useCallback } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { useOverlayOpen } from '../../hooks/useOverlayOpen';
import {
  dialogBody,
  dialogButton,
  dialogError,
  dialogHint,
  dialogPanel,
  dialogPrimaryButton,
  dialogSubheading,
  dialogTitle,
} from '../UI/dialogStyles';
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
  /** The panel's title. The Video tab names the flow it is part of. */
  title?: string;
}

export function VideoUploader({ onClose, title = 'Import video' }: VideoUploaderProps) {
  useOverlayOpen(); // blocking modal — suppress board shortcuts while open
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

  const {
    isLoading,
    setVideoFile,
    setVideoElement,
    setVideoMetadata,
    setDuration,
    saveVideoMetadata,
    setIsLoaded,
    setIsLoading,
    setError: setStoreError,
    setIsVideoMode,
  } = useVideoStore();

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

        // Persist the loaded video's metadata so it gets a stable saved id. This
        // sets currentSavedVideoId, which the Video-tab "Link to Play" flow
        // requires; without it, linking always refuses with "No video loaded".
        try {
          await saveVideoMetadata();
        } catch (err) {
          // Non-fatal: the video still plays this session; only its saved id +
          // cross-session metadata row are missing.
          console.error('[VideoUploader] failed to persist video metadata', err);
        }

        // Reset progress state
        setLoadingProgress({ phase: 'idle', percent: 0, message: '' });
        setLastFailedFile(null);

        // Video is loaded and now shows as a floating PiP window — close the uploader.
        setSelectedFile(null);
        if (onClose) onClose();
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
      saveVideoMetadata,
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

  return (
    <div className={`${dialogPanel} max-w-md p-xl`}>
      <div className="flex justify-between items-center mb-lg">
        <h2 className={dialogTitle}>{title}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-chalk/60 hover:text-chalk touch-manipulation"
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
          relative border-2 border-dashed rounded-control p-xl text-center motion-safe:transition-colors
          ${
            isDragActive
              ? 'border-floodlight bg-floodlight/10'
              : 'border-steel hover:border-chalk/40'
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
          <div className="flex flex-col items-center gap-lg py-xs">
            {/* File info */}
            {selectedFile && (
              <div className={`flex items-center gap-sm ${dialogBody}`}>
                <svg
                  className="w-5 h-5 text-chalk/60"
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
                <span className="text-chalk/50">
                  ({formatFileSize(selectedFile.size)})
                </span>
              </div>
            )}

            {/* Progress bar. The fill is a measure, not a state, so it is Chalk. */}
            <div className="w-full max-w-xs">
              <div className="h-2 bg-steel rounded-pill overflow-hidden">
                <div
                  className="h-full bg-chalk rounded-pill motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out"
                  style={{ width: `${loadingProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-sm">
                <span className={dialogHint}>
                  {loadingProgress.message || 'Loading…'}
                </span>
                <span className="text-caption text-chalk">
                  {loadingProgress.percent}%
                </span>
              </div>
            </div>

            {/* Large file streaming notice */}
            {selectedFile && selectedFile.size > LARGE_FILE_WARNING_BYTES && (
              <p className={dialogHint}>Large file: streaming it rather than loading it all at once.</p>
            )}
          </div>
        ) : (
          <>
            {/* Upload Icon */}
            <div className="mb-lg">
              <svg
                className={`w-12 h-12 mx-auto ${
                  isDragActive ? 'text-floodlight' : 'text-chalk/40'
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

            <p className="text-label text-chalk mb-xs">
              {isDragActive ? 'Drop the video here' : 'Drag a video file here'}
            </p>
            <p className={`${dialogHint} mb-md`}>or tap to browse</p>

            <button
              type="button"
              className={dialogPrimaryButton}
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
            >
              Browse files
            </button>
          </>
        )}
      </div>

      {/* Error, with recovery suggestions. There is no error colour: an error
          is Chalk at full strength with a Chalk rule beside it. */}
      {errorInfo && (
        <div className={`mt-lg ${dialogError}`} role="alert">
          <div className="flex items-start justify-between gap-sm">
            <div>
              <p>{errorInfo.title}</p>
              <p className={`${dialogBody} mt-xxs`}>{errorInfo.message}</p>
            </div>
            <button
              onClick={handleDismissError}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-chalk/60 hover:text-chalk touch-manipulation"
              aria-label="Dismiss error"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {errorInfo.recovery.length > 0 && (
            <div className="mt-md">
              <p className={dialogSubheading}>Try the following:</p>
              <ul className={`${dialogHint} mt-xs space-y-xs`}>
                {errorInfo.recovery.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-xs">
                    <span>•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errorInfo.isRetryable && lastFailedFile && (
            <button onClick={handleRetry} className={`${dialogButton} mt-md`}>
              Try again
            </button>
          )}
        </div>
      )}

      {/* Warning Message */}
      {warning && !errorInfo && (
        <p className={`mt-lg ${dialogBody}`} role="alert">
          {warning}
        </p>
      )}

      {/* Supported Formats */}
      <div className="mt-lg pt-lg border-t border-steel">
        <p className={`${dialogHint} mb-sm`}>Supported formats:</p>
        <div className="flex flex-wrap gap-sm">
          {supportedFormats.map((format) => (
            <span
              key={format.extension}
              className="px-sm py-xs bg-steel text-chalk/75 text-caption rounded-chip"
              title={format.description}
            >
              {format.extension.toUpperCase().replace('.', '')}
            </span>
          ))}
        </div>
        <p className={`${dialogHint} mt-sm`}>
          Maximum file size: {formatFileSize(500 * 1024 * 1024)}
        </p>
      </div>
    </div>
  );
}
