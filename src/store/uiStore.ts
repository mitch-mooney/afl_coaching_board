import { create } from 'zustand';

// Breakpoint threshold - matches Tailwind's md breakpoint
const MOBILE_BREAKPOINT = 768;

interface UIState {
  // Menu state
  isMenuOpen: boolean;
  // Onboarding: pulse hamburger until user opens menu for the first time
  showMenuPulse: boolean;

  // Responsive state
  isMobile: boolean;
  screenWidth: number;

  // Number of blocking overlays (modals) currently open — read by the keyboard
  // layer to suppress shortcuts while a modal is up.
  overlayOpenCount: number;

  // Menu actions
  toggleMenu: () => void;
  openMenu: () => void;
  closeMenu: () => void;

  // Responsive actions
  updateScreenSize: (width: number) => void;

  // Overlay ref-count actions
  pushOverlay: () => void;
  popOverlay: () => void;

  // Board sub-mode: setup (move players only) vs draw (record paths)
  boardSubMode: 'setup' | 'draw';
  setBoardSubMode: (mode: 'setup' | 'draw') => void;
  toggleBoardSubMode: () => void;

  // Editor tab: board view vs video view vs training mode
  editorTab: 'board' | 'video' | 'training';
  setEditorTab: (tab: 'board' | 'video' | 'training') => void;

  // Active formation preset (last applied formation ID)
  activeFormationId: string | null;
  setActiveFormationId: (id: string | null) => void;

  // Training Mode: which drill is shown in the detail panel
  activeDrillId: string | null;
  setActiveDrillId: (id: string | null) => void;
}

/**
 * Pulse is shown until the user opens the menu for the first time.
 * Uses localStorage so it persists across page reloads.
 */
const getInitialMenuPulse = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('hasSeenMenu') === null;
  }
  return false;
};

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
    showMenuPulse: getInitialMenuPulse(),
    isMobile: isMobileWidth(initialWidth),
    screenWidth: initialWidth,
    overlayOpenCount: 0,

    // Menu actions
    toggleMenu: () => {
      set((state) => {
        const opening = !state.isMenuOpen;
        if (opening) {
          localStorage.setItem('hasSeenMenu', '1');
        }
        return {
          isMenuOpen: opening,
          showMenuPulse: opening ? false : state.showMenuPulse,
        };
      });
    },

    openMenu: () => {
      localStorage.setItem('hasSeenMenu', '1');
      set({ isMenuOpen: true, showMenuPulse: false });
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

    pushOverlay: () => {
      set((state) => ({ overlayOpenCount: state.overlayOpenCount + 1 }));
    },

    popOverlay: () => {
      set((state) => ({ overlayOpenCount: Math.max(0, state.overlayOpenCount - 1) }));
    },

    // Board sub-mode
    boardSubMode: 'setup',
    setBoardSubMode: (mode) => set({ boardSubMode: mode }),
    toggleBoardSubMode: () =>
      set((s) => ({ boardSubMode: s.boardSubMode === 'setup' ? 'draw' : 'setup' })),

    // Editor tab
    editorTab: 'board',
    setEditorTab: (tab) => set({ editorTab: tab }),

    // Training Mode: which drill is shown in the detail panel
    activeDrillId: null,
    setActiveDrillId: (id: string | null) => set({ activeDrillId: id }),

    // Active formation preset
    activeFormationId: null,
    setActiveFormationId: (id) => set({ activeFormationId: id }),
  };
});

// Export breakpoint constant for use in other components
export const BREAKPOINTS = {
  mobile: MOBILE_BREAKPOINT,
  tablet: 1024,
  desktop: 1280,
} as const;
