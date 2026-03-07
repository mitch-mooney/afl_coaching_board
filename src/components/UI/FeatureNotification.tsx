import { useState, useEffect } from 'react';

function useLocalStorage(key: string, initialValue: boolean): [boolean, (value: boolean) => void] {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: boolean) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

/**
 * FeatureNotification - Modal popup to announce new features after login.
 * 
 * Shows a one-time notification popup after successful login to highlight
 * the latest feature: Fullscreen Video Telestration Mode.
 * 
 * Features:
 * - Displays only once per user (stored in localStorage)
 * - Beautiful modal with feature highlights
 * - Call-to-action button to try the feature
 * - Dismiss button to close
 * 
 * @example
 * ```tsx
 * <FeatureNotification />
 * ```
 */
export function FeatureNotification() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useLocalStorage('feature-notification-dismissed', false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    // Show notification only once and only if not dismissed
    if (!dismissed) {
      // Small delay for smooth appearance
      const timer = setTimeout(() => {
        setShow(true);
        setAnimateIn(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  const handleDismiss = () => {
    setAnimateIn(false);
    setTimeout(() => {
      setShow(false);
      setDismissed(true);
    }, 300);
  };

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        animateIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all duration-300 ${
          animateIn ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium mb-3">
                ✨ New Feature
              </span>
              <h2 className="text-2xl font-bold mb-2">
                Fullscreen Telestration Mode
              </h2>
              <p className="text-purple-100 text-sm">
                Draw and annotate directly over fullscreen video
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/20 rounded-lg transition"
              title="Dismiss"
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
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Feature highlights */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Fullscreen Video</h3>
                <p className="text-sm text-gray-600">
                  Video fills the entire screen for immersive review and analysis
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Telestration Tools</h3>
                <p className="text-sm text-gray-600">
                  Draw lines, arrows, circles, rectangles, and text directly over video
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
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
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Smart Controls</h3>
                <p className="text-sm text-gray-600">
                  Auto-hiding controls, clickable seek bar, and keyboard shortcuts
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-orange-600"
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
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Export Annotations</h3>
                <p className="text-sm text-gray-600">
                  Download video with annotations burned in for sharing
                </p>
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Quick Tips</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                  Esc
                </kbd>
                <span>Exit fullscreen</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                  Space / K
                </kbd>
                <span>Play / Pause</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                  ← →
                </kbd>
                <span>Scrub ±5 seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with CTA */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleDismiss}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium transition"
          >
            Maybe Later
          </button>
          <button
            onClick={handleDismiss}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-lg"
          >
            Try It Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeatureNotification;
