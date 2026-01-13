import { create } from 'zustand';

/**
 * Reasons why shortcuts might be disabled
 */
export type ShortcutDisabledReason =
  | 'modal_open'
  | 'user_disabled'
  | 'input_focused'
  | null;

/**
 * State interface for keyboard shortcuts management
 */
interface KeyboardState {
  /** Whether keyboard shortcuts are globally enabled */
  shortcutsEnabled: boolean;
  /** Whether the help overlay is currently visible */
  helpOverlayOpen: boolean;
  /** Reason why shortcuts are currently disabled (null if enabled) */
  disabledReason: ShortcutDisabledReason;
  /** Count of open modals (to handle nested modals) */
  openModalCount: number;

  // Actions - Enable/Disable shortcuts
  /** Enable all keyboard shortcuts */
  enableShortcuts: () => void;
  /** Disable all keyboard shortcuts */
  disableShortcuts: (reason?: ShortcutDisabledReason) => void;
  /** Toggle shortcuts enabled state */
  toggleShortcuts: () => void;

  // Actions - Help overlay
  /** Open the help overlay */
  openHelpOverlay: () => void;
  /** Close the help overlay */
  closeHelpOverlay: () => void;
  /** Toggle the help overlay visibility */
  toggleHelpOverlay: () => void;
  /** Set help overlay state directly */
  setHelpOverlayOpen: (isOpen: boolean) => void;

  // Actions - Modal tracking (for auto-disable)
  /** Register that a modal has been opened */
  registerModalOpen: () => void;
  /** Register that a modal has been closed */
  registerModalClose: () => void;

  // Derived state helpers
  /** Check if shortcuts are currently active (enabled and no modals) */
  areShortcutsActive: () => boolean;

  // Reset
  /** Reset keyboard state to defaults */
  reset: () => void;
}

/**
 * Default state values
 */
const DEFAULT_STATE = {
  shortcutsEnabled: true,
  helpOverlayOpen: false,
  disabledReason: null as ShortcutDisabledReason,
  openModalCount: 0,
};

/**
 * Zustand store for managing keyboard shortcut state.
 *
 * This store tracks:
 * - Global enabled/disabled state for keyboard shortcuts
 * - Help overlay visibility
 * - Modal dialog count (for auto-disabling shortcuts when modals are open)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const shortcutsEnabled = useKeyboardStore((state) => state.shortcutsEnabled);
 *   const toggleShortcuts = useKeyboardStore((state) => state.toggleShortcuts);
 *
 *   return (
 *     <button onClick={toggleShortcuts}>
 *       Shortcuts: {shortcutsEnabled ? 'On' : 'Off'}
 *     </button>
 *   );
 * }
 * ```
 */
export const useKeyboardStore = create<KeyboardState>((set, get) => ({
  shortcutsEnabled: DEFAULT_STATE.shortcutsEnabled,
  helpOverlayOpen: DEFAULT_STATE.helpOverlayOpen,
  disabledReason: DEFAULT_STATE.disabledReason,
  openModalCount: DEFAULT_STATE.openModalCount,

  enableShortcuts: () => {
    set({
      shortcutsEnabled: true,
      disabledReason: null,
    });
  },

  disableShortcuts: (reason: ShortcutDisabledReason = 'user_disabled') => {
    set({
      shortcutsEnabled: false,
      disabledReason: reason,
    });
  },

  toggleShortcuts: () => {
    const { shortcutsEnabled } = get();
    if (shortcutsEnabled) {
      set({
        shortcutsEnabled: false,
        disabledReason: 'user_disabled',
      });
    } else {
      set({
        shortcutsEnabled: true,
        disabledReason: null,
      });
    }
  },

  openHelpOverlay: () => {
    set({ helpOverlayOpen: true });
  },

  closeHelpOverlay: () => {
    set({ helpOverlayOpen: false });
  },

  toggleHelpOverlay: () => {
    set((state) => ({ helpOverlayOpen: !state.helpOverlayOpen }));
  },

  setHelpOverlayOpen: (isOpen: boolean) => {
    set({ helpOverlayOpen: isOpen });
  },

  registerModalOpen: () => {
    const { openModalCount } = get();
    const newCount = openModalCount + 1;
    set({
      openModalCount: newCount,
      // Only set disabledReason if not already disabled for another reason
      disabledReason: get().disabledReason ?? 'modal_open',
    });
  },

  registerModalClose: () => {
    const { openModalCount, disabledReason } = get();
    const newCount = Math.max(0, openModalCount - 1);
    set({
      openModalCount: newCount,
      // Clear the modal_open reason if all modals are closed
      disabledReason:
        newCount === 0 && disabledReason === 'modal_open'
          ? null
          : disabledReason,
    });
  },

  areShortcutsActive: () => {
    const { shortcutsEnabled, openModalCount, helpOverlayOpen } = get();
    // Shortcuts are active if:
    // 1. They are globally enabled
    // 2. No modals are open (except help overlay has special handling)
    // Note: Help overlay uses allowInModal for Esc key
    return shortcutsEnabled && openModalCount === 0 && !helpOverlayOpen;
  },

  reset: () => {
    set({
      shortcutsEnabled: DEFAULT_STATE.shortcutsEnabled,
      helpOverlayOpen: DEFAULT_STATE.helpOverlayOpen,
      disabledReason: DEFAULT_STATE.disabledReason,
      openModalCount: DEFAULT_STATE.openModalCount,
    });
  },
}));

/**
 * Selector to get shortcuts enabled state
 */
export const selectShortcutsEnabled = (state: KeyboardState): boolean =>
  state.shortcutsEnabled;

/**
 * Selector to get help overlay open state
 */
export const selectHelpOverlayOpen = (state: KeyboardState): boolean =>
  state.helpOverlayOpen;

/**
 * Selector to get the reason shortcuts are disabled
 */
export const selectDisabledReason = (
  state: KeyboardState
): ShortcutDisabledReason => state.disabledReason;

/**
 * Selector to check if shortcuts are currently active
 */
export const selectAreShortcutsActive = (state: KeyboardState): boolean =>
  state.areShortcutsActive();

/**
 * Hook to track modal state and auto-disable shortcuts.
 * Call this in modal components to register/unregister when they open/close.
 *
 * @example
 * ```tsx
 * function MyModal({ isOpen }: { isOpen: boolean }) {
 *   const { registerModalOpen, registerModalClose } = useKeyboardStore();
 *
 *   useEffect(() => {
 *     if (isOpen) {
 *       registerModalOpen();
 *       return () => registerModalClose();
 *     }
 *   }, [isOpen, registerModalOpen, registerModalClose]);
 *
 *   return isOpen ? <div>Modal content</div> : null;
 * }
 * ```
 */
