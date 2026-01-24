import { useState, useCallback } from 'react';
import { useVideoStore } from '../../store/videoStore';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';

/**
 * Available playback rate options
 */
const PLAYBACK_RATES = [0.25, 0.5, 1, 1.5, 2] as const;

/**
 * PlaybackControls component provides additional video playback controls
 * including playback rate selector, loop toggle, and volume controls.
 *
 * Features:
 * - Playback rate selector (0.25x, 0.5x, 1x, 1.5x, 2x)
 * - Loop toggle button
 * - Volume control with mute/unmute button
 * - Volume slider for fine control
 * - Keyboard-accessible controls
 * - Integrates with videoStore for state management
 */
export function PlaybackControls() {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showRateDropdown, setShowRateDropdown] = useState(false);

  // Store state
  const playbackRate = useVideoStore((state) => state.playbackRate);
  const isLooping = useVideoStore((state) => state.isLooping);
  const volume = useVideoStore((state) => state.volume);
  const isMuted = useVideoStore((state) => state.isMuted);
  const isLoaded = useVideoStore((state) => state.isLoaded);

  // Playback controls from hook
  const { setRate, setVolume, toggleMute, toggleLoop } = useVideoPlayback();

  /**
   * Handle playback rate change
   */
  const handleRateChange = useCallback(
    (rate: number) => {
      setRate(rate);
      setShowRateDropdown(false);
    },
    [setRate]
  );

  /**
   * Handle volume slider change
   */
  const handleVolumeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(event.target.value);
      setVolume(newVolume);
    },
    [setVolume]
  );

  /**
   * Get volume icon based on current volume level and mute state
   */
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return (
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
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      );
    }
    if (volume < 0.5) {
      return (
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
            d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      );
    }
    return (
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
          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
      </svg>
    );
  };

  return (
    <div className="flex items-center gap-3">
      {/* Playback Rate Selector */}
      <div className="relative">
        <button
          onClick={() => setShowRateDropdown(!showRateDropdown)}
          disabled={!isLoaded}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed min-w-[60px]"
          aria-label={`Playback speed: ${playbackRate}x`}
          aria-haspopup="listbox"
          aria-expanded={showRateDropdown}
          title="Playback speed"
        >
          {playbackRate}x
        </button>

        {/* Rate Dropdown */}
        {showRateDropdown && isLoaded && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowRateDropdown(false)}
            />
            <div
              className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[80px]"
              role="listbox"
              aria-label="Select playback speed"
            >
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleRateChange(rate)}
                  className={`w-full px-4 py-1.5 text-left text-sm hover:bg-gray-100 transition ${
                    rate === playbackRate
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700'
                  }`}
                  role="option"
                  aria-selected={rate === playbackRate}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300" />

      {/* Loop Toggle */}
      <button
        onClick={toggleLoop}
        disabled={!isLoaded}
        className={`p-2 rounded transition disabled:opacity-40 disabled:cursor-not-allowed ${
          isLooping
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
        aria-pressed={isLooping}
        title={isLooping ? 'Loop enabled' : 'Loop disabled'}
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
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300" />

      {/* Volume Control */}
      <div
        className="relative"
        onMouseEnter={() => setShowVolumeSlider(true)}
        onMouseLeave={() => setShowVolumeSlider(false)}
      >
        <button
          onClick={toggleMute}
          disabled={!isLoaded}
          className={`p-2 rounded transition disabled:opacity-40 disabled:cursor-not-allowed ${
            isMuted
              ? 'text-gray-400 hover:bg-gray-100'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          aria-pressed={isMuted}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {getVolumeIcon()}
        </button>

        {/* Volume Slider Popup */}
        {showVolumeSlider && isLoaded && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-20">
            <div className="flex flex-col items-center gap-2">
              {/* Volume percentage display */}
              <span className="text-xs text-gray-500 font-medium">
                {isMuted ? '0' : Math.round(volume * 100)}%
              </span>

              {/* Vertical volume slider */}
              <div className="h-24 flex items-center">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 -rotate-90 origin-center"
                  aria-label="Volume"
                  title={`Volume: ${Math.round(volume * 100)}%`}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
