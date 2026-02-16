import { useState, useEffect, useCallback, useRef } from 'react';
import { useUIStore, BREAKPOINTS } from '../store/uiStore';

/**
 * Breakpoint type definitions
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Responsive state returned by the hook
 */
export interface ResponsiveState {
  /** Current breakpoint category */
  breakpoint: Breakpoint;
  /** Whether the screen is mobile-sized (< 768px) */
  isMobile: boolean;
  /** Whether the screen is tablet-sized (768px - 1023px) */
  isTablet: boolean;
  /** Whether the screen is desktop-sized (>= 1024px) */
  isDesktop: boolean;
  /** Current window width in pixels */
  width: number;
  /** Current window height in pixels */
  height: number;
}

/**
 * Configuration options for the hook
 */
export interface ResponsiveConfig {
  /** Debounce delay in milliseconds (default: 150ms) */
  debounceMs?: number;
  /** Whether to listen for resize events (default: true) */
  enabled?: boolean;
}

const DEFAULT_CONFIG: Required<ResponsiveConfig> = {
  debounceMs: 150,
  enabled: true,
};

/**
 * Determines the current breakpoint based on window width
 */
function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.mobile) {
    return 'mobile';
  } else if (width < BREAKPOINTS.tablet) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Gets current window dimensions (handles SSR case)
 */
function getWindowDimensions(): { width: number; height: number } {
  if (typeof window !== 'undefined') {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  return {
    width: BREAKPOINTS.mobile,
    height: 768,
  };
}

/**
 * Creates the responsive state object from dimensions
 */
function createResponsiveState(width: number, height: number): ResponsiveState {
  const breakpoint = getBreakpoint(width);
  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    width,
    height,
  };
}

/**
 * Custom hook for responsive breakpoint detection with debounced resize handling.
 *
 * Provides current breakpoint information and integrates with the UI store
 * for centralized responsive state management.
 *
 * @param config - Configuration options for the hook
 * @returns ResponsiveState object with breakpoint information
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { breakpoint, isMobile, isDesktop, width } = useResponsive();
 *
 *   return (
 *     <div>
 *       {isMobile && <MobileMenu />}
 *       {isDesktop && <DesktopToolbar />}
 *       <p>Current breakpoint: {breakpoint}</p>
 *       <p>Window width: {width}px</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom debounce
 * const { breakpoint } = useResponsive({ debounceMs: 100 });
 * ```
 */
export function useResponsive(config: ResponsiveConfig = {}): ResponsiveState {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { updateScreenSize } = useUIStore();

  // Get initial dimensions
  const initialDimensions = getWindowDimensions();
  const [state, setState] = useState<ResponsiveState>(() =>
    createResponsiveState(initialDimensions.width, initialDimensions.height)
  );

  // Ref to track timeout for cleanup
  const timeoutRef = useRef<number | null>(null);

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      const { width, height } = getWindowDimensions();
      const newState = createResponsiveState(width, height);

      setState(newState);
      // Sync with UI store
      updateScreenSize(width);

      timeoutRef.current = null;
    }, mergedConfig.debounceMs);
  }, [mergedConfig.debounceMs, updateScreenSize]);

  // Set up resize listener
  useEffect(() => {
    if (!mergedConfig.enabled || typeof window === 'undefined') {
      return;
    }

    // Initial sync with UI store
    const { width, height } = getWindowDimensions();
    updateScreenSize(width);
    setState(createResponsiveState(width, height));

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      // Clear any pending timeout
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [mergedConfig.enabled, handleResize, updateScreenSize]);

  return state;
}

/**
 * Hook that returns only the current breakpoint string.
 * Useful when you only need the breakpoint name.
 *
 * @param config - Configuration options
 * @returns Current breakpoint ('mobile' | 'tablet' | 'desktop')
 *
 * @example
 * ```tsx
 * const breakpoint = useBreakpoint();
 * // breakpoint === 'mobile' | 'tablet' | 'desktop'
 * ```
 */
export function useBreakpoint(config: ResponsiveConfig = {}): Breakpoint {
  const { breakpoint } = useResponsive(config);
  return breakpoint;
}

/**
 * Hook that returns a boolean for a specific breakpoint query.
 * Useful for conditional rendering based on screen size.
 *
 * @param query - The breakpoint query to check
 * @param config - Configuration options
 * @returns Boolean indicating if the query matches
 *
 * @example
 * ```tsx
 * const isMobile = useBreakpointQuery('mobile');
 * const isTabletOrAbove = useBreakpointQuery('tablet-up');
 * const isMobileOrTablet = useBreakpointQuery('mobile-or-tablet');
 * ```
 */
export function useBreakpointQuery(
  query: 'mobile' | 'tablet' | 'desktop' | 'mobile-or-tablet' | 'tablet-up' | 'desktop-up',
  config: ResponsiveConfig = {}
): boolean {
  const { breakpoint } = useResponsive(config);

  switch (query) {
    case 'mobile':
      return breakpoint === 'mobile';
    case 'tablet':
      return breakpoint === 'tablet';
    case 'desktop':
      return breakpoint === 'desktop';
    case 'mobile-or-tablet':
      return breakpoint === 'mobile' || breakpoint === 'tablet';
    case 'tablet-up':
      return breakpoint === 'tablet' || breakpoint === 'desktop';
    case 'desktop-up':
      return breakpoint === 'desktop';
    default:
      return false;
  }
}

// Re-export breakpoints for convenience
export { BREAKPOINTS };
