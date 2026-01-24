import { useState, useRef, useCallback } from 'react';
import { useVideoStore } from '../../store/videoStore';
import {
  validateVideoFile,
  getAcceptedMimeTypes,
  getSupportedFormats,
  formatFileSize,
  createVideoElement,
  calculateAspectRatio,
} from '../../utils/videoUtils';

interface VideoUploaderProps {
  onClose?: () => void;
}

export function VideoUploader({ onClose }: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

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
  } = useVideoStore();

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Clear previous messages
      setError(null);
      setWarning(null);

      // Validate the file
      const validation = validateVideoFile(file);

      if (!validation.isValid) {
        setError(validation.error || 'Invalid video file');
        return;
      }

      if (validation.warning) {
        setWarning(validation.warning);
      }

      // Set loading state
      setIsLoading(true);
      setVideoFile(file);

      try {
        // Create video element and load metadata
        // Note: url is managed internally by the video element
        const { element } = await createVideoElement(file);

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

        // Call onClose to dismiss the uploader if provided
        if (onClose) {
          onClose();
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load video file';
        setError(errorMessage);
        setStoreError(errorMessage);
        setVideoFile(null);
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
      onClose,
    ]
  );

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
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600">Loading video...</p>
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

      {/* Error Message */}
      {error && (
        <div
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
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
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Warning Message */}
      {warning && !error && (
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
