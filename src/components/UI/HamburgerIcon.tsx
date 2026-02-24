import { motion } from 'framer-motion';
import { useUIStore } from '../../store/uiStore';

interface HamburgerIconProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Animated hamburger menu icon that transforms to X when open.
 * Uses Framer Motion for smooth animations.
 * Touch-friendly with minimum 44px tap target.
 * Shows a pulsing ring when the user hasn't opened the menu yet (onboarding).
 */
export function HamburgerIcon({ isOpen, onClick, className = '' }: HamburgerIconProps) {
  const showMenuPulse = useUIStore((state) => state.showMenuPulse);
  // Top line: rotates 45deg and moves down to form X
  const topLineVariants = {
    closed: {
      rotate: 0,
      y: 0,
    },
    open: {
      rotate: 45,
      y: 8,
    },
  };

  // Middle line: fades out when open
  const middleLineVariants = {
    closed: {
      opacity: 1,
      scaleX: 1,
    },
    open: {
      opacity: 0,
      scaleX: 0,
    },
  };

  // Bottom line: rotates -45deg and moves up to form X
  const bottomLineVariants = {
    closed: {
      rotate: 0,
      y: 0,
    },
    open: {
      rotate: -45,
      y: -8,
    },
  };

  // Transition settings for smooth animation
  const transition = {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1], // Tailwind's ease-out equivalent
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Onboarding pulse ring — shown until user opens menu for the first time */}
      {showMenuPulse && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-blue-400 pointer-events-none"
          animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        />
      )}
      <button
        type="button"
        onClick={onClick}
        className={`
          flex items-center justify-center
          min-w-[44px] min-h-[44px] w-11 h-11
          bg-white/90 backdrop-blur-sm
          rounded-lg shadow-lg
          hover:bg-white
          active:bg-gray-100
          transition-colors
          touch-manipulation
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${className}
        `}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-gray-700"
      >
        {/* Top line */}
        <motion.rect
          x="4"
          y="6"
          width="16"
          height="2"
          rx="1"
          fill="currentColor"
          variants={topLineVariants}
          animate={isOpen ? 'open' : 'closed'}
          initial={false}
          transition={transition}
          style={{ originX: '50%', originY: '50%' }}
        />

        {/* Middle line */}
        <motion.rect
          x="4"
          y="11"
          width="16"
          height="2"
          rx="1"
          fill="currentColor"
          variants={middleLineVariants}
          animate={isOpen ? 'open' : 'closed'}
          initial={false}
          transition={transition}
          style={{ originX: '50%', originY: '50%' }}
        />

        {/* Bottom line */}
        <motion.rect
          x="4"
          y="16"
          width="16"
          height="2"
          rx="1"
          fill="currentColor"
          variants={bottomLineVariants}
          animate={isOpen ? 'open' : 'closed'}
          initial={false}
          transition={transition}
          style={{ originX: '50%', originY: '50%' }}
        />
      </svg>
      </button>
    </div>
  );
}
