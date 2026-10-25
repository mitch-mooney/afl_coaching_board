import { useState, useEffect } from 'react';
import {
  dialogBody,
  dialogButton,
  dialogPanel,
  dialogPrimaryButton,
  dialogScrim,
} from './dialogStyles';

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
      className={`fixed inset-0 z-[100] flex items-center justify-center p-lg motion-safe:transition-opacity motion-safe:duration-300 ${
        animateIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className={dialogScrim}
        onClick={handleDismiss}
      />

      {/* Modal. A column whose middle scrolls, so on a short phone the
          header and the footer's buttons both stay on screen. */}
      <div
        className={`${dialogPanel} max-w-lg max-h-full flex flex-col overflow-hidden transform motion-safe:transition-transform motion-safe:duration-300 ${
          animateIn ? 'scale-100 translate-y-0' : 'motion-safe:scale-95 motion-safe:translate-y-4'
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-steel/40 border-b border-steel p-lg sm:p-xl text-chalk">
          <div className="flex items-start justify-between gap-md">
            <div>
              <span className="inline-block px-md py-xs bg-steel rounded-pill text-caption mb-sm">
                ✨ New feature
              </span>
              <h2 className="font-display text-heading mb-xs">
                Fullscreen telestration mode
              </h2>
              <p className={dialogBody}>
                Draw and annotate directly over fullscreen video
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center hover:bg-steel/50 rounded-control motion-safe:transition-colors"
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
        <div className="min-h-0 overflow-y-auto p-lg sm:p-xl space-y-lg">
          {/* Feature highlights */}
          <div className="space-y-md">
            <div className="flex items-start gap-md">
              <div className="flex-shrink-0 w-8 h-8 bg-steel rounded-chip flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-chalk"
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
                <h3 className="text-label text-chalk">Fullscreen video</h3>
                <p className={dialogBody}>
                  Video fills the entire screen for immersive review and analysis
                </p>
              </div>
            </div>
            <div className="flex items-start gap-md">
              <div className="flex-shrink-0 w-8 h-8 bg-steel rounded-chip flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-chalk"
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
                <h3 className="text-label text-chalk">Telestration tools</h3>
                <p className={dialogBody}>
                  Draw lines, arrows, circles, rectangles, and text directly over video
                </p>
              </div>
            </div>
            <div className="flex items-start gap-md">
              <div className="flex-shrink-0 w-8 h-8 bg-steel rounded-chip flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-chalk"
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
                <h3 className="text-label text-chalk">Smart controls</h3>
                <p className={dialogBody}>
                  Auto-hiding controls, clickable seek bar, and keyboard shortcuts
                </p>
              </div>
            </div>
            <div className="flex items-start gap-md">
              <div className="flex-shrink-0 w-8 h-8 bg-steel rounded-chip flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-chalk"
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
                <h3 className="text-label text-chalk">Export annotations</h3>
                <p className={dialogBody}>
                  Download video with annotations burned in for sharing
                </p>
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="bg-steel/40 rounded-control p-lg">
            <h4 className="text-label text-chalk mb-sm">Quick tips</h4>
            <div className="text-caption text-chalk/70 space-y-xs">
              <div className="flex items-center gap-sm">
                <kbd className="px-sm py-xs font-sans bg-steel/40 border border-steel rounded-chip text-caption text-chalk">
                  Esc
                </kbd>
                <span>Exit fullscreen</span>
              </div>
              <div className="flex items-center gap-sm">
                <kbd className="px-sm py-xs font-sans bg-steel/40 border border-steel rounded-chip text-caption text-chalk">
                  Space / K
                </kbd>
                <span>Play / pause</span>
              </div>
              <div className="flex items-center gap-sm">
                <kbd className="px-sm py-xs font-sans bg-steel/40 border border-steel rounded-chip text-caption text-chalk">
                  ← →
                </kbd>
                <span>Scrub ±5 seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with CTA */}
        <div className="flex-shrink-0 border-t border-steel px-lg sm:px-xl py-md flex items-center justify-between gap-md">
          <button
            onClick={handleDismiss}
            className={dialogButton}
          >
            Maybe later
          </button>
          <button
            onClick={handleDismiss}
            className={dialogPrimaryButton}
          >
            Try it now
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeatureNotification;
