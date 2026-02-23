import { useState, useRef, useEffect } from 'react';
import { trimAndConvertVideo, ConversionProgress } from '../../utils/ffmpegConverter';

interface VideoTrimmerProps {
  file: File;
  duration: number;
  onSkip: () => void;
  onSave: (trimmedBlob: Blob) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const MAX_SAVE_BYTES = 50 * 1024 * 1024; // 50 MB

export function VideoTrimmer({ file, duration, onSkip, onSave }: VideoTrimmerProps) {
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(duration);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Create a preview URL for the video file
  useEffect(() => {
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    if (previewRef.current) {
      previewRef.current.src = url;
    }
    return () => {
      URL.revokeObjectURL(url);
      previewUrlRef.current = null;
    };
  }, [file]);

  // Seek preview video when trim start changes
  useEffect(() => {
    if (previewRef.current && previewRef.current.readyState >= 1) {
      previewRef.current.currentTime = trimStart;
    }
  }, [trimStart]);

  const trimDuration = trimEnd - trimStart;
  const estimatedSize = duration > 0 ? (file.size / duration) * trimDuration : 0;
  const isTooBig = estimatedSize > MAX_SAVE_BYTES;

  const handleTrim = async () => {
    setError(null);
    setIsProcessing(true);
    setProgress({ phase: 'loading', progress: 0 });
    try {
      const { blob } = await trimAndConvertVideo(file, trimStart, trimEnd, setProgress);
      onSave(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trim failed. Please try again.');
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const progressPercent = progress
    ? progress.phase === 'loading'
      ? Math.round(progress.progress * 40)
      : progress.phase === 'converting'
        ? 40 + Math.round(progress.progress * 55)
        : 100
    : 0;

  const progressLabel =
    progress?.phase === 'loading' ? 'Loading FFmpeg…' :
    progress?.phase === 'converting' ? 'Trimming video…' :
    progress?.phase === 'done' ? 'Done!' : '';

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-6 max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Trim Video</h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {file.name.length > 20 ? file.name.slice(0, 18) + '…' : file.name}
        </span>
      </div>

      {/* Video preview */}
      <div className="mb-4 bg-black rounded overflow-hidden aspect-video">
        <video
          ref={previewRef}
          className="w-full h-full object-contain"
          muted
          playsInline
          preload="metadata"
        />
      </div>

      {/* Time info */}
      <div className="mb-3 flex justify-between text-sm text-gray-600 font-mono bg-gray-50 rounded px-3 py-2">
        <span>Start: {formatTime(trimStart)}</span>
        <span className="font-semibold text-blue-600">Duration: {formatTime(trimDuration)}</span>
        <span>End: {formatTime(trimEnd)}</span>
      </div>

      {/* Trim start slider */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Trim start: {formatTime(trimStart)}
        </label>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={trimStart}
          onChange={(e) => {
            const val = Math.min(Number(e.target.value), trimEnd - 0.5);
            setTrimStart(val);
          }}
          disabled={isProcessing}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Trim end slider */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Trim end: {formatTime(trimEnd)}
        </label>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={trimEnd}
          onChange={(e) => {
            const val = Math.max(Number(e.target.value), trimStart + 0.5);
            setTrimEnd(val);
          }}
          disabled={isProcessing}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Estimated size */}
      <div className={`mb-4 text-xs px-3 py-2 rounded flex items-center gap-2 ${isTooBig ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>
          Estimated size: <strong>{formatSize(estimatedSize)}</strong>
          {isTooBig && ' — exceeds 50 MB limit. Shorten trim or use a smaller source file.'}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Progress bar */}
      {isProcessing && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">{progressLabel}</span>
            <span className="text-xs font-medium text-blue-600">{progressPercent}%</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleTrim}
          disabled={isProcessing || isTooBig || trimDuration < 0.5}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isProcessing ? 'Processing…' : 'Trim & Save to Playbook'}
        </button>
        <button
          onClick={onSkip}
          disabled={isProcessing}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded font-medium hover:bg-gray-200 transition disabled:opacity-50 text-sm"
        >
          Skip
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-400 text-center">
        "Skip" uses the full video without saving to playbook storage.
      </p>
    </div>
  );
}
