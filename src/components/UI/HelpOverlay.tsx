import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Responsive Help Overlay component that adapts to screen size with proper
 * scrolling and sizing constraints. Uses Framer Motion for smooth animations.
 */
export function HelpOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  }, []);

  // Animation variants matching MobileMenu pattern
  const overlayVariants = {
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

  const modalVariants = {
    closed: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 1, 1],
      },
    },
    open: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: [0, 0, 0.2, 1],
      },
    },
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="
          absolute bottom-4 right-4 z-10
          px-3 py-2
          md:px-4 md:py-2
          bg-white/90 backdrop-blur-sm
          rounded-lg shadow-lg
          hover:bg-white
          transition-colors
          text-sm
          min-h-[44px] min-w-[44px]
          touch-manipulation
          flex items-center justify-center gap-2
        "
        aria-label="Open help"
      >
        <span className="text-base">❓</span>
        <span className="hidden sm:inline">Help</span>
      </button>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="
            fixed inset-0 z-50
            bg-black/50 backdrop-blur-sm
            flex items-center justify-center
            p-3 sm:p-4 md:p-6
          "
          variants={overlayVariants}
          initial="closed"
          animate="open"
          exit="closed"
          onClick={handleBackdropClick}
        >
          <motion.div
            className="
              relative
              bg-white rounded-xl shadow-2xl
              w-full max-w-full
              sm:max-w-lg md:max-w-2xl lg:max-w-3xl
              max-h-[calc(100vh-1.5rem)]
              sm:max-h-[calc(100vh-2rem)]
              md:max-h-[calc(100vh-3rem)]
              overflow-hidden
              flex flex-col
            "
            variants={modalVariants}
            initial="closed"
            animate="open"
            exit="closed"
            role="dialog"
            aria-labelledby="help-title"
            aria-modal="true"
          >
            {/* Fixed Header */}
            <div className="
              flex-shrink-0
              flex justify-between items-center
              p-4 sm:p-5 md:p-6
              border-b border-gray-200
              bg-white
            ">
              <h2
                id="help-title"
                className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900"
              >
                Help & Instructions
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="
                  flex items-center justify-center
                  w-10 h-10 sm:w-11 sm:h-11
                  min-h-[44px] min-w-[44px]
                  rounded-lg
                  text-gray-500 hover:text-gray-700
                  hover:bg-gray-100
                  transition-colors
                  touch-manipulation
                  text-2xl leading-none
                "
                aria-label="Close help"
              >
                ×
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="
              flex-1
              overflow-y-auto
              overflow-x-hidden
              p-4 sm:p-5 md:p-6
            ">
              <div className="space-y-4 md:space-y-5">
                <HelpSection title="Camera Controls">
                  <HelpList>
                    <HelpItem term="Rotate">Left-click and drag</HelpItem>
                    <HelpItem term="Zoom">Scroll wheel or pinch gesture</HelpItem>
                    <HelpItem term="Pan">Right-click and drag (or middle mouse button)</HelpItem>
                    <HelpItem term="Preset Views">Use toolbar buttons for quick camera positions</HelpItem>
                  </HelpList>
                </HelpSection>

                <HelpSection title="Player Controls">
                  <HelpList>
                    <HelpItem term="Select Player">Click on a player</HelpItem>
                    <HelpItem term="Move Player">Click and drag a player to reposition</HelpItem>
                    <HelpItem term="Reset Players">Use "Reset Players" button in toolbar</HelpItem>
                  </HelpList>
                </HelpSection>

                <HelpSection title="Video Recording">
                  <HelpList>
                    <li>Click "Start Recording" to begin capturing</li>
                    <li>Click "Stop Recording" to finish and download the video</li>
                    <li>Videos are exported as WebM format</li>
                  </HelpList>
                </HelpSection>

                <HelpSection title="Playbooks">
                  <HelpList>
                    <li>Save your current scenario with "Save Playbook"</li>
                    <li>Load saved scenarios from the Playbooks panel</li>
                    <li>Playbooks are stored locally in your browser</li>
                  </HelpList>
                </HelpSection>

                <HelpSection title="Annotations">
                  <HelpList>
                    <li>Select an annotation tool from the bottom toolbar</li>
                    <li>Click and drag on the field to draw</li>
                    <li>Change colors and thickness using the toolbar</li>
                    <li>Clear all annotations with the "Clear" button</li>
                  </HelpList>
                </HelpSection>

                <HelpSection title="Video Import">
                  <HelpList>
                    <HelpItem term="Import Video">Click "Import Video" in the toolbar to load game footage (MP4 or WebM)</HelpItem>
                    <HelpItem term="Drag & Drop">You can also drag video files directly onto the upload area</HelpItem>
                    <HelpItem term="Video Workspace">Once loaded, you'll enter the video workspace with timeline controls</HelpItem>
                    <HelpItem term="Overlay Players">Position 3D player models over the video to analyze plays</HelpItem>
                    <HelpItem term="Exit Video Mode">Click the "X" button or press Escape to return to normal field view</HelpItem>
                  </HelpList>
                </HelpSection>

                <HelpSection title="Video Playback Shortcuts">
                  <HelpList className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    <HelpItem term="Space">Play/Pause video</HelpItem>
                    <HelpItem term="Left/Right">Step back/forward one frame</HelpItem>
                    <HelpItem term="Shift + Left/Right">Skip back/forward 5 seconds</HelpItem>
                    <HelpItem term="Home / End">Jump to start/end of video</HelpItem>
                    <HelpItem term="J">Slow down playback speed</HelpItem>
                    <HelpItem term="K">Pause playback</HelpItem>
                    <HelpItem term="L">Speed up playback</HelpItem>
                    <HelpItem term="Tab">Toggle sidebar visibility</HelpItem>
                    <HelpItem term="Escape">Exit video mode</HelpItem>
                  </HelpList>
                </HelpSection>

                <HelpSection title="Perspective Calibration">
                  <HelpList>
                    <HelpItem term="Open Calibration Panel">Click the "Calibration" tab in the sidebar</HelpItem>
                    <HelpItem term="Camera Position">Adjust X, Y, Z sliders to move the camera viewpoint</HelpItem>
                    <HelpItem term="Camera Rotation">Use Pitch, Yaw, Roll sliders to rotate the view</HelpItem>
                    <HelpItem term="Field of View">Widen or narrow the perspective (30° - 120°)</HelpItem>
                    <HelpItem term="Field Scale">Resize the 3D field to match the video</HelpItem>
                    <HelpItem term="Field Opacity">Make the field semi-transparent to see through it</HelpItem>
                    <HelpItem term="Calibration Mode">Lock orbit controls for precise adjustments</HelpItem>
                    <HelpItem term="Calibration Grid">Enable grid overlay to help align field markings</HelpItem>
                    <HelpItem term="Save Calibration">Save your settings for future sessions</HelpItem>
                  </HelpList>
                </HelpSection>

                <HelpSection title="Video Export">
                  <HelpList>
                    <HelpItem term="Open Export Panel">Click the "Export" tab in the sidebar</HelpItem>
                    <HelpItem term="Format Selection">Choose WebM or MP4 output format</HelpItem>
                    <HelpItem term="Resolution">Select 720p, 1080p, or original resolution</HelpItem>
                    <HelpItem term="Include Audio">Toggle to include the original audio track</HelpItem>
                    <HelpItem term="Export">Click "Start Export" to render and download the video with 3D overlays</HelpItem>
                    <HelpItem term="Cancel">Stop an in-progress export if needed</HelpItem>
                  </HelpList>
                </HelpSection>
              </div>
            </div>

            {/* Fixed Footer for mobile - close button always accessible */}
            <div className="
              flex-shrink-0
              p-3 sm:p-4
              border-t border-gray-200
              bg-white
              md:hidden
            ">
              <button
                onClick={() => setIsOpen(false)}
                className="
                  w-full
                  py-3 px-4
                  min-h-[44px]
                  bg-gray-100 hover:bg-gray-200 active:bg-gray-300
                  text-gray-700 font-medium
                  rounded-lg
                  transition-colors
                  touch-manipulation
                "
              >
                Close Help
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Section component for organizing help content
 */
function HelpSection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-semibold text-base sm:text-lg text-gray-900">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * List component for help items with consistent styling
 */
function HelpList({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ul className={`
      list-disc list-inside
      space-y-1
      ml-1 sm:ml-2
      text-sm sm:text-base
      text-gray-700
      ${className}
    `}>
      {children}
    </ul>
  );
}

/**
 * Help item with optional term (bold label)
 */
function HelpItem({
  term,
  children
}: {
  term?: string;
  children: React.ReactNode;
}) {
  if (term) {
    return (
      <li className="leading-relaxed">
        <strong className="text-gray-900">{term}:</strong>{' '}
        <span className="text-gray-600">{children}</span>
      </li>
    );
  }
  return <li className="leading-relaxed">{children}</li>;
}
