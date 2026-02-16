import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Canvas dimensions interface
 */
export interface CanvasDimensions {
  width: number;
  height: number;
}

/**
 * Configuration options for the useCanvasResize hook
 */
export interface CanvasResizeConfig {
  /** Debounce delay in milliseconds (default: 100ms) */
  debounceMs?: number;
  /** Minimum width to prevent canvas from getting too small */
  minWidth?: number;
  /** Minimum height to prevent canvas from getting too small */
  minHeight?: number;
  /** Callback when resize occurs */
  onResize?: (dimensions: CanvasDimensions) => void;
}

const DEFAULT_CONFIG: Required<Omit<CanvasResizeConfig, 'onResize'>> = {
  debounceMs: 100,
  minWidth: 320,
  minHeight: 200,
};

/**
 * Custom hook for handling canvas container resize using ResizeObserver.
 *
 * Provides precise container-based resize detection with debouncing
 * for smooth performance during window resize operations.
 *
 * @param config - Configuration options
 * @returns Object containing container ref, dimensions, and ready state
 *
 * @example
 * ```tsx
 * function MyCanvasComponent() {
 *   const { containerRef, dimensions, isReady } = useCanvasResize({
 *     debounceMs: 100,
 *     onResize: (dims) => console.log('Resized to:', dims),
 *   });
 *
 *   return (
 *     <div ref={containerRef} className="w-full h-full">
 *       {isReady && (
 *         <Canvas
 *           style={{ width: dimensions.width, height: dimensions.height }}
 *         >
 *           <Scene />
 *         </Canvas>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCanvasResize(config: CanvasResizeConfig = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Ref for the container element to observe
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Ref for the ResizeObserver instance
  const observerRef = useRef<ResizeObserver | null>(null);

  // Ref for debounce timeout
  const timeoutRef = useRef<number | null>(null);

  // State for current dimensions
  const [dimensions, setDimensions] = useState<CanvasDimensions>({
    width: mergedConfig.minWidth,
    height: mergedConfig.minHeight,
  });

  // State to track if initial measurement is complete
  const [isReady, setIsReady] = useState(false);

  // Debounced resize handler
  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    // Clear any pending timeout
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      for (const entry of entries) {
        // Use contentBoxSize for more accurate measurements
        // Fall back to contentRect for older browsers
        let newWidth: number;
        let newHeight: number;

        if (entry.contentBoxSize) {
          // Modern browsers return an array
          const boxSize = Array.isArray(entry.contentBoxSize)
            ? entry.contentBoxSize[0]
            : entry.contentBoxSize;
          newWidth = boxSize.inlineSize;
          newHeight = boxSize.blockSize;
        } else {
          // Fallback for older browsers
          newWidth = entry.contentRect.width;
          newHeight = entry.contentRect.height;
        }

        // Apply minimum constraints
        newWidth = Math.max(newWidth, mergedConfig.minWidth);
        newHeight = Math.max(newHeight, mergedConfig.minHeight);

        // Round to prevent subpixel rendering issues
        newWidth = Math.round(newWidth);
        newHeight = Math.round(newHeight);

        const newDimensions = { width: newWidth, height: newHeight };

        setDimensions(newDimensions);
        setIsReady(true);

        // Call callback if provided
        if (config.onResize) {
          config.onResize(newDimensions);
        }
      }

      timeoutRef.current = null;
    }, mergedConfig.debounceMs);
  }, [mergedConfig.debounceMs, mergedConfig.minWidth, mergedConfig.minHeight, config]);

  // Set up ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check for ResizeObserver support
    if (typeof ResizeObserver === 'undefined') {
      // Fallback: use initial container dimensions
      const rect = container.getBoundingClientRect();
      setDimensions({
        width: Math.max(Math.round(rect.width), mergedConfig.minWidth),
        height: Math.max(Math.round(rect.height), mergedConfig.minHeight),
      });
      setIsReady(true);
      return;
    }

    // Create ResizeObserver
    observerRef.current = new ResizeObserver(handleResize);

    // Start observing
    observerRef.current.observe(container);

    // Get initial dimensions immediately
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const initialDimensions = {
        width: Math.max(Math.round(rect.width), mergedConfig.minWidth),
        height: Math.max(Math.round(rect.height), mergedConfig.minHeight),
      };
      setDimensions(initialDimensions);
      setIsReady(true);

      if (config.onResize) {
        config.onResize(initialDimensions);
      }
    }

    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [handleResize, mergedConfig.minWidth, mergedConfig.minHeight, config]);

  // Force recalculate dimensions (useful for imperative updates)
  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newDimensions = {
      width: Math.max(Math.round(rect.width), mergedConfig.minWidth),
      height: Math.max(Math.round(rect.height), mergedConfig.minHeight),
    };

    setDimensions(newDimensions);

    if (config.onResize) {
      config.onResize(newDimensions);
    }
  }, [mergedConfig.minWidth, mergedConfig.minHeight, config]);

  return {
    /** Ref to attach to the container element */
    containerRef,
    /** Current canvas dimensions */
    dimensions,
    /** Whether the initial measurement is complete */
    isReady,
    /** Force recalculate dimensions */
    recalculate,
  };
}

/**
 * Hook that combines useCanvasResize with window resize events
 * for comprehensive resize handling.
 *
 * This is useful when you need to handle both container resize
 * (from layout changes) and window resize (from browser window changes).
 *
 * @param config - Configuration options
 * @returns Object containing container ref, dimensions, and ready state
 */
export function useCanvasResizeWithWindow(config: CanvasResizeConfig = {}) {
  const canvasResize = useCanvasResize(config);

  // Also listen to window resize for additional coverage
  useEffect(() => {
    const handleWindowResize = () => {
      // Recalculate after a short delay to allow layout to settle
      setTimeout(() => {
        canvasResize.recalculate();
      }, 50);
    };

    window.addEventListener('resize', handleWindowResize);

    // Also handle orientation change on mobile/tablet devices
    window.addEventListener('orientationchange', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, [canvasResize]);

  return canvasResize;
}

export default useCanvasResize;
