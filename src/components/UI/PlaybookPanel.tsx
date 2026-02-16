import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlaybookStore } from '../../store/playbookStore';
import { usePlaybook } from '../../hooks/usePlaybook';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * PlaybookPanel - Responsive panel for loading and managing saved playbooks.
 *
 * Responsive behavior:
 * - Mobile (<768px): Full-width panel sliding in from right with backdrop
 * - Desktop (>=768px): Fixed-position panel on right side
 *
 * Features:
 * - Load saved playbooks
 * - Delete playbooks with confirmation
 * - Touch-friendly 44px minimum tap targets
 * - Escape key and outside click to close
 * - Scrollable content for many playbooks
 */
export function PlaybookPanel() {
  const { playbooks, isLoading, loadPlaybooks } = usePlaybookStore();
  const { loadScenario } = usePlaybook();
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile } = useResponsive();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPlaybooks();
  }, [loadPlaybooks]);

  // Handle close
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle click outside to close (mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isMobile || !isOpen) return;

      const target = event.target as HTMLElement;
      // Don't close if clicking the toggle button
      if (target.closest('[data-playbook-toggle]')) {
        return;
      }

      if (panelRef.current && !panelRef.current.contains(target)) {
        handleClose();
      }
    };

    if (isOpen && isMobile) {
      // Add small delay to prevent immediate close from same click that opened panel
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, isMobile, handleClose]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  const handleLoad = async (id: number) => {
    try {
      await loadScenario(id);
      setIsOpen(false);
    } catch (error) {
      alert('Failed to load playbook. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this playbook?')) {
      try {
        await usePlaybookStore.getState().deletePlaybook(id);
      } catch (error) {
        alert('Failed to delete playbook. Please try again.');
      }
    }
  };

  // Animation variants for mobile slide-in
  const panelVariants = {
    closed: {
      x: '100%',
      opacity: 0,
      transition: {
        duration: 0.25,
        ease: [0.4, 0, 1, 1],
      },
    },
    open: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: [0, 0, 0.2, 1],
      },
    },
  };

  // Animation variants for desktop fade-in
  const desktopPanelVariants = {
    closed: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 1, 1],
      },
    },
    open: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.25,
        ease: [0, 0, 0.2, 1],
      },
    },
  };

  const backdropVariants = {
    closed: {
      opacity: 0,
      transition: {
        duration: 0.15,
      },
    },
    open: {
      opacity: 1,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <>
      {/* Toggle button - responsive positioning */}
      <button
        data-playbook-toggle
        onClick={() => setIsOpen(!isOpen)}
        className={`
          absolute z-10
          px-3 py-2 sm:px-4 sm:py-2
          min-h-[44px]
          bg-white/90 backdrop-blur-sm rounded-lg shadow-lg
          hover:bg-white active:bg-gray-50
          transition-colors touch-manipulation
          font-medium text-sm sm:text-base
          ${isMobile
            ? 'top-2 right-2'
            : 'top-4 right-4'
          }
        `}
        aria-label={isOpen ? 'Close playbooks panel' : 'Open playbooks panel'}
        aria-expanded={isOpen}
      >
        {isOpen ? '← Close' : '📚 Playbooks'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop - mobile only */}
            {isMobile && (
              <motion.div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                variants={backdropVariants}
                initial="closed"
                animate="open"
                exit="closed"
                onClick={handleClose}
                aria-hidden="true"
              />
            )}

            {/* Panel - responsive layout */}
            <motion.div
              ref={panelRef}
              className={`
                z-50 bg-white/95 backdrop-blur-md shadow-xl
                overflow-hidden
                ${isMobile
                  ? 'fixed top-0 right-0 bottom-0 w-full max-w-sm rounded-l-xl border-l border-gray-200/50'
                  : 'absolute top-16 right-4 w-80 rounded-lg border border-gray-200/50 max-h-[calc(100vh-120px)]'
                }
              `}
              variants={isMobile ? panelVariants : desktopPanelVariants}
              initial="closed"
              animate="open"
              exit="closed"
              role="dialog"
              aria-label="Playbooks panel"
            >
              {/* Header - fixed on mobile */}
              <div className={`
                flex items-center justify-between
                p-4 border-b border-gray-200
                bg-white/90 backdrop-blur-sm
                ${isMobile ? 'sticky top-0 z-10' : ''}
              `}>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Saved Playbooks
                </h2>
                {isMobile && (
                  <button
                    onClick={handleClose}
                    className="
                      p-2 min-w-[44px] min-h-[44px]
                      rounded-lg
                      hover:bg-gray-100 active:bg-gray-200
                      transition-colors touch-manipulation
                    "
                    aria-label="Close panel"
                  >
                    <svg
                      className="w-6 h-6 text-gray-600"
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

              {/* Content - scrollable */}
              <div className={`
                p-4 overflow-y-auto overflow-x-hidden
                ${isMobile
                  ? 'max-h-[calc(100vh-80px-env(safe-area-inset-bottom))]'
                  : 'max-h-[calc(100vh-200px)]'
                }
              `}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full" />
                    <span className="ml-3 text-gray-600">Loading...</span>
                  </div>
                ) : playbooks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📂</div>
                    <p className="text-gray-500">No saved playbooks</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Save a playbook from the toolbar to see it here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {playbooks.map((playbook) => (
                      <div
                        key={playbook.id}
                        className="
                          bg-gray-50 hover:bg-gray-100
                          border border-gray-200 rounded-lg
                          p-3 sm:p-4
                          transition-colors
                        "
                      >
                        <div className="mb-2">
                          <h3 className="font-semibold text-gray-900 text-base">
                            {playbook.name}
                          </h3>
                          {playbook.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {playbook.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1.5">
                            {new Date(playbook.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>

                        {/* Action buttons - touch-friendly */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => playbook.id && handleLoad(playbook.id)}
                            className="
                              flex-1 px-4 py-2.5
                              min-h-[44px]
                              bg-blue-500 text-white
                              text-sm font-medium
                              rounded-lg
                              hover:bg-blue-600 active:bg-blue-700
                              transition-colors touch-manipulation
                            "
                          >
                            Load
                          </button>
                          <button
                            onClick={() => playbook.id && handleDelete(playbook.id)}
                            className="
                              px-4 py-2.5
                              min-h-[44px]
                              bg-red-100 text-red-700
                              text-sm font-medium
                              rounded-lg
                              hover:bg-red-200 active:bg-red-300
                              transition-colors touch-manipulation
                            "
                            aria-label={`Delete ${playbook.name}`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer - mobile only, provides safe area padding */}
              {isMobile && (
                <div className="
                  sticky bottom-0
                  p-4 border-t border-gray-200
                  bg-white/90 backdrop-blur-sm
                  pb-[calc(1rem+env(safe-area-inset-bottom))]
                ">
                  <button
                    onClick={handleClose}
                    className="
                      w-full py-3 px-4
                      min-h-[44px]
                      bg-gray-100 hover:bg-gray-200 active:bg-gray-300
                      text-gray-700 font-medium
                      rounded-lg
                      transition-colors touch-manipulation
                    "
                  >
                    Close Panel
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
