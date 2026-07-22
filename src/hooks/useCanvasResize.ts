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
  // Destructure to PRIMITIVE deps. `config` is typically a fresh object literal
  // every render; depending on the object (as this hook used to) re-ran the
  // observer effect every render and setState'd a new dimensions object each
  // time — an infinite render loop ("Maximum update depth exceeded").
  const {
    debounceMs = DEFAULT_CONFIG.debounceMs,
    minWidth = DEFAULT_CONFIG.minWidth,
    minHeight = DEFAULT_CONFIG.minHeight,
    onResize,
  } = config;

  // Ref for the container element to observe
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Ref for the ResizeObserver instance
  const observerRef = useRef<ResizeObserver | null>(null);

  // Ref for debounce timeout
  const timeoutRef = useRef<number | null>(null);

  // Keep the latest onResize in a ref so it never needs to be an effect dep
  // (callers commonly pass a fresh inline function each render).
  const onResizeRef = useRef(onResize);
  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  // State for current dimensions
  const [dimensions, setDimensions] = useState<CanvasDimensions>({
    width: minWidth,
    height: minHeight,
  });

  // State to track if initial measurement is complete
  const [isReady, setIsReady] = useState(false);

  // Apply a measured size. Bails out when the (rounded, min-clamped) size is
  // unchanged so we never schedule a needless re-render — this is what stops
  // the resize → setState → re-render → resize cycle.
  const applyDimensions = useCallback(
    (rawWidth: number, rawHeight: number) => {
      const width = Math.max(Math.round(rawWidth), minWidth);
      const height = Math.max(Math.round(rawHeight), minHeight);
      setDimensions((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
      setIsReady(true);
      onResizeRef.current?.({ width, height });
    },
    [minWidth, minHeight]
  );

  // Debounced resize handler
  const handleResize = useCallback(
    (entries: ResizeObserverEntry[]) => {
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

          applyDimensions(newWidth, newHeight);
        }

        timeoutRef.current = null;
      }, debounceMs);
    },
    [debounceMs, applyDimensions]
  );

  // Set up ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check for ResizeObserver support
    if (typeof ResizeObserver === 'undefined') {
      // Fallback: use initial container dimensions
      const rect = container.getBoundingClientRect();
      applyDimensions(rect.width, rect.height);
      return;
    }

    // Create ResizeObserver
    observerRef.current = new ResizeObserver(handleResize);

    // Start observing
    observerRef.current.observe(container);

    // Get initial dimensions immediately
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      applyDimensions(rect.width, rect.height);
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
  }, [handleResize, applyDimensions]);

  // Force recalculate dimensions (useful for imperative updates)
  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    applyDimensions(rect.width, rect.height);
  }, [applyDimensions]);

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
  const { recalculate } = canvasResize;

  // Also listen to window resize for additional coverage. Depend on the stable
  // `recalculate` callback, not the whole canvasResize object (which is a new
  // reference every render and would re-bind the listeners each time).
  useEffect(() => {
    const handleWindowResize = () => {
      // Recalculate after a short delay to allow layout to settle
      setTimeout(() => {
        recalculate();
      }, 50);
    };

    window.addEventListener('resize', handleWindowResize);

    // Also handle orientation change on mobile/tablet devices
    window.addEventListener('orientationchange', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, [recalculate]);

  return canvasResize;
}

export default useCanvasResize;
