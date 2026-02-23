import { create } from 'zustand';

// Breakpoint threshold - matches Tailwind's md breakpoint
const MOBILE_BREAKPOINT = 768;

interface UIState {
  // Menu state
  isMenuOpen: boolean;

  // Responsive state
  isMobile: boolean;
  screenWidth: number;

  // Apple Pencil / pen drawing state
  isPenDrawing: boolean;

  // Menu actions
  toggleMenu: () => void;
  openMenu: () => void;
  closeMenu: () => void;

  // Responsive actions
  updateScreenSize: (width: number) => void;

  // Pen drawing actions
  setPenDrawing: (val: boolean) => void;
}

/**
 * Get initial screen width (handles SSR case)
 */
const getInitialScreenWidth = (): number => {
  if (typeof window !== 'undefined') {
    return window.innerWidth;
  }
  return MOBILE_BREAKPOINT; // Default to mobile breakpoint if window not available
};

/**
 * Check if screen is mobile based on width
 */
const isMobileWidth = (width: number): boolean => {
  return width < MOBILE_BREAKPOINT;
};

export const useUIStore = create<UIState>((set) => {
  const initialWidth = getInitialScreenWidth();

  return {
    // Initial state
    isMenuOpen: false,
    isMobile: isMobileWidth(initialWidth),
    screenWidth: initialWidth,
    isPenDrawing: false,

    // Menu actions
    toggleMenu: () => {
      set((state) => ({ isMenuOpen: !state.isMenuOpen }));
    },

    openMenu: () => {
      set({ isMenuOpen: true });
    },

    closeMenu: () => {
      set({ isMenuOpen: false });
    },

    // Responsive actions
    updateScreenSize: (width: number) => {
      const newIsMobile = isMobileWidth(width);
      set({
        screenWidth: width,
        isMobile: newIsMobile,
      });
    },

    // Pen drawing actions
    setPenDrawing: (val: boolean) => {
      set({ isPenDrawing: val });
    },
  };
});

// Export breakpoint constant for use in other components
export const BREAKPOINTS = {
  mobile: MOBILE_BREAKPOINT,
  tablet: 1024,
  desktop: 1280,
} as const;
