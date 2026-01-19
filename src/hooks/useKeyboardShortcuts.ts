/**
 * useKeyboardShortcuts Hook
 *
 * Core hook for managing keyboard shortcuts in the AFL Coaching Board application.
 * Handles event listener setup, focus detection, and modifier key handling.
 */

import { useEffect, useCallback, useRef } from 'react';
import type {
  ShortcutDefinition,
  ShortcutRegistry,
  ShortcutCategory,
  ShortcutGroup,
  ModifierKeys,
  UseKeyboardShortcutsOptions,
} from '../types/shortcuts';
import { SHORTCUT_CATEGORY_LABELS } from '../types/shortcuts';
import { useCameraStore } from '../store/cameraStore';
import { useAnnotationStore, type AnnotationType } from '../store/annotationStore';
import { useAnimationStore } from '../store/animationStore';

// ============================================================================
// Platform Detection Utilities
// ============================================================================

/**
 * Cached platform detection result to avoid repeated navigator checks
 */
let cachedIsMac: boolean | null = null;

/**
 * Detects if the current platform is macOS.
 * Uses navigator.platform with fallback to navigator.userAgent.
 *
 * @returns true if running on macOS, false otherwise
 */
export function isMac(): boolean {
  if (cachedIsMac !== null) {
    return cachedIsMac;
  }

  // Check for server-side rendering
  if (typeof navigator === 'undefined') {
    cachedIsMac = false;
    return false;
  }

  // Primary detection using navigator.platform (most reliable)
  const platform = navigator.platform?.toLowerCase() || '';
  if (platform.includes('mac')) {
    cachedIsMac = true;
    return true;
  }

  // Fallback to userAgent for edge cases
  const userAgent = navigator.userAgent?.toLowerCase() || '';
  cachedIsMac = userAgent.includes('macintosh') || userAgent.includes('mac os');
  return cachedIsMac;
}

/**
 * Resets the cached platform detection (useful for testing)
 */
export function resetPlatformCache(): void {
  cachedIsMac = null;
}

/**
 * Type representing the primary modifier key name based on platform
 */
export type PrimaryModifierKey = 'meta' | 'ctrl';

/**
 * Gets the appropriate primary modifier key name for the current platform.
 * Returns 'meta' (Cmd) for Mac, 'ctrl' for Windows/Linux.
 *
 * @returns 'meta' on Mac, 'ctrl' on other platforms
 */
export function getPrimaryModifierKey(): PrimaryModifierKey {
  return isMac() ? 'meta' : 'ctrl';
}

/**
 * Checks if the primary modifier key is pressed in a keyboard event.
 * On Mac, checks metaKey (Cmd). On Windows/Linux, checks ctrlKey.
 *
 * @param event - The keyboard event to check
 * @returns true if the primary modifier is pressed
 */
export function isPrimaryModifierPressed(event: KeyboardEvent): boolean {
  return isMac() ? event.metaKey : event.ctrlKey;
}

/**
 * Gets the display label for the primary modifier key.
 * Returns '⌘' (Cmd) for Mac, 'Ctrl' for Windows/Linux.
 *
 * @returns Platform-appropriate modifier key label
 */
export function getPrimaryModifierLabel(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/**
 * Creates a ModifierKeys object with the primary modifier enabled.
 * Useful for defining platform-aware shortcuts.
 *
 * @param additionalModifiers - Optional additional modifiers to include
 * @returns ModifierKeys with the primary modifier enabled
 */
export function withPrimaryModifier(
  additionalModifiers: Partial<Omit<ModifierKeys, 'ctrl' | 'meta'>> = {}
): Partial<ModifierKeys> {
  const primaryKey = getPrimaryModifierKey();
  return {
    ...additionalModifiers,
    [primaryKey]: true,
  };
}

/**
 * Creates a ModifierKeys object for cross-platform shortcuts.
 * Sets both ctrl and meta to true, allowing the shortcut to work with
 * either Ctrl (Windows/Linux) or Cmd (Mac).
 *
 * Use this for shortcuts like Ctrl+S/Cmd+S, Ctrl+Z/Cmd+Z, etc.
 *
 * @param additionalModifiers - Optional additional modifiers to include
 * @returns ModifierKeys with both ctrl and meta enabled
 */
export function withCrossplatformModifier(
  additionalModifiers: Partial<Omit<ModifierKeys, 'ctrl' | 'meta'>> = {}
): Partial<ModifierKeys> {
  return {
    ...additionalModifiers,
    ctrl: true,
    meta: true,
  };
}

/**
 * Checks if the event target is an element where typing should be allowed
 * without triggering shortcuts (input, textarea, contentEditable)
 */
export function isTypingInInput(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  // Check for standard form inputs
  if (['input', 'textarea', 'select'].includes(tagName)) {
    return true;
  }

  // Check for contentEditable elements
  if (target.isContentEditable) {
    return true;
  }

  return false;
}

/**
 * Checks if the modifier keys match the event
 */
export function modifiersMatch(
  event: KeyboardEvent,
  modifiers: Partial<ModifierKeys>
): boolean {
  const eventModifiers: ModifierKeys = {
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey,
  };

  // Check each modifier that's specified in the shortcut
  // Default to false if not specified
  const ctrlMatch = (modifiers.ctrl ?? false) === eventModifiers.ctrl;
  const shiftMatch = (modifiers.shift ?? false) === eventModifiers.shift;
  const altMatch = (modifiers.alt ?? false) === eventModifiers.alt;
  const metaMatch = (modifiers.meta ?? false) === eventModifiers.meta;

  return ctrlMatch && shiftMatch && altMatch && metaMatch;
}

/**
 * Creates a shortcut registry for managing keyboard shortcuts
 */
export function createShortcutRegistry(): ShortcutRegistry {
  const shortcuts: ShortcutDefinition[] = [];

  const register = (shortcut: ShortcutDefinition): void => {
    // Check for duplicate IDs
    const existingIndex = shortcuts.findIndex((s) => s.id === shortcut.id);
    if (existingIndex >= 0) {
      // Replace existing shortcut with same ID
      shortcuts[existingIndex] = shortcut;
    } else {
      shortcuts.push(shortcut);
    }
  };

  const unregister = (id: string): void => {
    const index = shortcuts.findIndex((s) => s.id === id);
    if (index >= 0) {
      shortcuts.splice(index, 1);
    }
  };

  const get = (id: string): ShortcutDefinition | undefined => {
    return shortcuts.find((s) => s.id === id);
  };

  const getByCategory = (category: ShortcutCategory): ShortcutDefinition[] => {
    return shortcuts.filter((s) => s.category === category);
  };

  const getGroupedShortcuts = (): ShortcutGroup[] => {
    const categories: ShortcutCategory[] = [
      'camera',
      'tools',
      'edit',
      'animation',
      'general',
    ];

    return categories
      .map((category) => {
        const categoryShortcuts = getByCategory(category);
        return {
          category,
          label: SHORTCUT_CATEGORY_LABELS[category],
          shortcuts: categoryShortcuts.map((s) => ({
            keys: formatShortcutKeys(s),
            description: s.description,
          })),
        };
      })
      .filter((group) => group.shortcuts.length > 0);
  };

  const findMatch = (event: KeyboardEvent): ShortcutDefinition | undefined => {
    return shortcuts.find((shortcut) => {
      // Match the event code (e.g., 'KeyS', 'Digit1')
      if (shortcut.code !== event.code) {
        return false;
      }

      // Check if modifiers match
      return modifiersMatch(event, shortcut.modifiers);
    });
  };

  return {
    shortcuts,
    register,
    unregister,
    get,
    getByCategory,
    getGroupedShortcuts,
    findMatch,
  };
}

/**
 * Formats shortcut keys for display in the help overlay.
 * Displays platform-appropriate modifier key labels:
 * - Mac: ⌘ (Cmd), ⌥ (Alt), ⇧ (Shift), ⌃ (Ctrl)
 * - Windows/Linux: Ctrl, Alt, Shift
 */
export function formatShortcutKeys(shortcut: ShortcutDefinition): string {
  const parts: string[] = [];
  const onMac = isMac();

  // On Mac, show meta (Cmd) as ⌘, on Windows show ctrl as Ctrl
  // This handles platform-specific shortcuts (where only one is set)
  // and cross-platform shortcuts (where handler checks both)
  if (shortcut.modifiers.ctrl && shortcut.modifiers.meta) {
    // Cross-platform shortcut - show platform-appropriate key
    parts.push(onMac ? '⌘' : 'Ctrl');
  } else if (shortcut.modifiers.ctrl) {
    parts.push(onMac ? '⌃' : 'Ctrl');
  } else if (shortcut.modifiers.meta) {
    parts.push(onMac ? '⌘' : 'Ctrl');
  }

  if (shortcut.modifiers.alt) {
    parts.push(onMac ? '⌥' : 'Alt');
  }
  if (shortcut.modifiers.shift) {
    parts.push(onMac ? '⇧' : 'Shift');
  }

  parts.push(shortcut.key);

  return parts.join(onMac ? '' : '+');
}

/**
 * Default options for the keyboard shortcuts hook
 */
const DEFAULT_OPTIONS: UseKeyboardShortcutsOptions = {
  enabled: true,
  allowInModal: false,
};

/**
 * Hook for managing keyboard shortcuts
 *
 * @param registry - The shortcut registry to use
 * @param options - Hook configuration options
 */
export function useKeyboardShortcuts(
  registry: ShortcutRegistry,
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { enabled, allowInModal } = { ...DEFAULT_OPTIONS, ...options };

  // Use refs to avoid stale closures in event handlers
  const enabledRef = useRef(enabled);
  const registryRef = useRef(registry);
  const allowInModalRef = useRef(allowInModal);

  // Update refs when values change
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    registryRef.current = registry;
  }, [registry]);

  useEffect(() => {
    allowInModalRef.current = allowInModal;
  }, [allowInModal]);

  /**
   * Handles keydown events and dispatches to registered shortcuts
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if shortcuts are disabled
    if (!enabledRef.current) {
      return;
    }

    // Skip if user is typing in an input field
    if (isTypingInInput(event.target)) {
      return;
    }

    // Find a matching shortcut
    const matchedShortcut = registryRef.current.findMatch(event);

    if (!matchedShortcut) {
      return;
    }

    // Check if we should process this shortcut when in a modal
    if (!allowInModalRef.current && !matchedShortcut.allowInModal) {
      // Check if a modal/dialog is currently open
      const activeElement = document.activeElement;
      const isInDialog =
        activeElement?.closest('[role="dialog"]') !== null ||
        activeElement?.closest('[role="alertdialog"]') !== null ||
        document.querySelector('[role="dialog"]') !== null;

      if (isInDialog) {
        return;
      }
    }

    // Prevent browser default behavior for this key combination
    event.preventDefault();

    // Execute the shortcut handler
    matchedShortcut.handler(event);
  }, []);

  // Attach/detach event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Creates and returns a singleton shortcut registry instance
 * This ensures all components share the same registry
 */
let globalRegistry: ShortcutRegistry | null = null;

export function getGlobalShortcutRegistry(): ShortcutRegistry {
  if (!globalRegistry) {
    globalRegistry = createShortcutRegistry();
  }
  return globalRegistry;
}

/**
 * Resets the global registry (useful for testing)
 */
export function resetGlobalShortcutRegistry(): void {
  globalRegistry = createShortcutRegistry();
}

// ============================================================================
// Camera Preset Shortcuts
// ============================================================================

/**
 * Camera preset mapping for number keys 1-3
 */
const CAMERA_PRESET_MAP: Record<string, { code: string; key: string; preset: 'top' | 'sideline' | 'end-to-end'; description: string }> = {
  'Digit1': { code: 'Digit1', key: '1', preset: 'top', description: 'Top view (overhead)' },
  'Digit2': { code: 'Digit2', key: '2', preset: 'sideline', description: 'Sideline view' },
  'Digit3': { code: 'Digit3', key: '3', preset: 'end-to-end', description: 'End-to-end view' },
};

/**
 * Registers camera preset shortcuts (keys 1-3) to the given registry.
 *
 * - Key 1: Top view (overhead)
 * - Key 2: Sideline view
 * - Key 3: End-to-end view
 *
 * Keys 4-0 are intentionally ignored as only 3 presets exist.
 *
 * @param registry - The shortcut registry to register shortcuts to
 * @param setPresetView - Function to call when switching camera presets
 */
export function registerCameraPresetShortcuts(
  registry: ShortcutRegistry,
  setPresetView: (preset: 'top' | 'sideline' | 'end-to-end') => void
): void {
  Object.values(CAMERA_PRESET_MAP).forEach(({ code, key, preset, description }) => {
    registry.register({
      id: `camera-preset-${key}`,
      code,
      key,
      modifiers: {},
      description,
      handler: () => {
        setPresetView(preset);
      },
      category: 'camera',
    });
  });
}

/**
 * Unregisters camera preset shortcuts from the given registry.
 *
 * @param registry - The shortcut registry to unregister shortcuts from
 */
export function unregisterCameraPresetShortcuts(registry: ShortcutRegistry): void {
  Object.values(CAMERA_PRESET_MAP).forEach(({ key }) => {
    registry.unregister(`camera-preset-${key}`);
  });
}

/**
 * Hook that registers camera preset shortcuts (keys 1-3) and integrates
 * with the camera store for switching camera views.
 *
 * @param registry - The shortcut registry to use (defaults to global registry)
 *
 * @example
 * ```tsx
 * // In a component that should enable camera shortcuts
 * function MyComponent() {
 *   useCameraPresetShortcuts();
 *   return <div>Camera shortcuts enabled</div>;
 * }
 * ```
 */
export function useCameraPresetShortcuts(registry?: ShortcutRegistry): void {
  const setPresetView = useCameraStore((state) => state.setPresetView);
  const registryToUse = registry ?? getGlobalShortcutRegistry();

  useEffect(() => {
    registerCameraPresetShortcuts(registryToUse, setPresetView);

    return () => {
      unregisterCameraPresetShortcuts(registryToUse);
    };
  }, [registryToUse, setPresetView]);
}

// ============================================================================
// Tool Selection Shortcuts
// ============================================================================

/**
 * Tool type for shortcuts - null represents "select" mode (deselect tool)
 */
type ToolShortcutValue = AnnotationType | null;

/**
 * Tool selection mapping for single-key shortcuts
 * Maps keyboard codes to annotation tools
 */
const TOOL_SELECTION_MAP: Record<string, { code: string; key: string; tool: ToolShortcutValue; description: string }> = {
  'KeyS': { code: 'KeyS', key: 'S', tool: null, description: 'Select mode (deselect tool)' },
  'KeyL': { code: 'KeyL', key: 'L', tool: 'line', description: 'Line tool' },
  'KeyA': { code: 'KeyA', key: 'A', tool: 'arrow', description: 'Arrow tool' },
  'KeyC': { code: 'KeyC', key: 'C', tool: 'circle', description: 'Circle tool' },
  'KeyR': { code: 'KeyR', key: 'R', tool: 'rectangle', description: 'Rectangle tool' },
  'KeyT': { code: 'KeyT', key: 'T', tool: 'text', description: 'Text tool' },
};

/**
 * Registers tool selection shortcuts to the given registry.
 *
 * - S: Select mode (deselect tool)
 * - L: Line tool
 * - A: Arrow tool
 * - C: Circle tool
 * - R: Rectangle tool
 * - T: Text tool
 *
 * @param registry - The shortcut registry to register shortcuts to
 * @param setSelectedTool - Function to call when switching tools
 */
export function registerToolSelectionShortcuts(
  registry: ShortcutRegistry,
  setSelectedTool: (tool: AnnotationType | null) => void
): void {
  Object.values(TOOL_SELECTION_MAP).forEach(({ code, key, tool, description }) => {
    registry.register({
      id: `tool-${key.toLowerCase()}`,
      code,
      key,
      modifiers: {},
      description,
      handler: () => {
        setSelectedTool(tool);
      },
      category: 'tools',
    });
  });
}

/**
 * Unregisters tool selection shortcuts from the given registry.
 *
 * @param registry - The shortcut registry to unregister shortcuts from
 */
export function unregisterToolSelectionShortcuts(registry: ShortcutRegistry): void {
  Object.values(TOOL_SELECTION_MAP).forEach(({ key }) => {
    registry.unregister(`tool-${key.toLowerCase()}`);
  });
}

/**
 * Hook that registers tool selection shortcuts and integrates
 * with the annotation store for switching tools.
 *
 * @param registry - The shortcut registry to use (defaults to global registry)
 *
 * @example
 * ```tsx
 * // In a component that should enable tool shortcuts
 * function MyComponent() {
 *   useToolSelectionShortcuts();
 *   return <div>Tool shortcuts enabled</div>;
 * }
 * ```
 */
export function useToolSelectionShortcuts(registry?: ShortcutRegistry): void {
  const setSelectedTool = useAnnotationStore((state) => state.setSelectedTool);
  const registryToUse = registry ?? getGlobalShortcutRegistry();

  useEffect(() => {
    registerToolSelectionShortcuts(registryToUse, setSelectedTool);

    return () => {
      unregisterToolSelectionShortcuts(registryToUse);
    };
  }, [registryToUse, setSelectedTool]);
}

// ============================================================================
// Edit Operation Shortcuts (Save, Undo, Redo)
// ============================================================================

// Import stores - Note: Undo/Redo functionality requires historyStore
// which may not be implemented in the base codebase
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { usePlayerStore as _usePlayerStore } from '../store/playerStore';

/**
 * Performs undo operation by restoring the previous state from history.
 * Note: This is a stub implementation. Full undo/redo requires historyStore
 * integration which can be added later.
 */
export function performUndo(): boolean {
  console.warn('Undo functionality requires historyStore implementation');
  // TODO: Implement with historyStore when available
  return false;
}

/**
 * Performs redo operation by restoring the next state from future history.
 * Note: This is a stub implementation. Full undo/redo requires historyStore
 * integration which can be added later.
 */
export function performRedo(): boolean {
  console.warn('Redo functionality requires historyStore implementation');
  // TODO: Implement with historyStore when available
  return false;
}

/**
 * Options for registering edit operation shortcuts.
 */
export interface EditOperationShortcutHandlers {
  /** Handler for save action - typically opens a save dialog */
  onSave?: () => void;
  /** Handler for undo action - if not provided, uses default performUndo */
  onUndo?: () => void;
  /** Handler for redo action - if not provided, uses default performRedo */
  onRedo?: () => void;
}

/**
 * Registers edit operation shortcuts to the given registry.
 *
 * - Ctrl+S (Cmd+S on Mac): Save
 * - Ctrl+Z (Cmd+Z on Mac): Undo
 * - Ctrl+Shift+Z (Cmd+Shift+Z on Mac): Redo
 * - Ctrl+Y (Cmd+Y on Mac): Redo (alternative)
 *
 * Uses platform-specific modifier keys (Cmd on Mac, Ctrl on Windows/Linux).
 *
 * @param registry - The shortcut registry to register shortcuts to
 * @param handlers - Optional handlers for save/undo/redo actions
 */
export function registerEditOperationShortcuts(
  registry: ShortcutRegistry,
  handlers: EditOperationShortcutHandlers = {}
): void {
  const { onSave, onUndo, onRedo } = handlers;

  // Ctrl+S / Cmd+S for Save
  if (onSave) {
    registry.register({
      id: 'edit-save',
      code: 'KeyS',
      key: 'S',
      modifiers: withPrimaryModifier(),
      description: 'Save playbook',
      handler: onSave,
      category: 'edit',
    });
  }

  // Ctrl+Z / Cmd+Z for Undo
  registry.register({
    id: 'edit-undo',
    code: 'KeyZ',
    key: 'Z',
    modifiers: withPrimaryModifier(),
    description: 'Undo',
    handler: onUndo ?? performUndo,
    category: 'edit',
  });

  // Ctrl+Shift+Z / Cmd+Shift+Z for Redo
  registry.register({
    id: 'edit-redo-shift-z',
    code: 'KeyZ',
    key: 'Z',
    modifiers: withPrimaryModifier({ shift: true }),
    description: 'Redo',
    handler: onRedo ?? performRedo,
    category: 'edit',
  });

  // Ctrl+Y / Cmd+Y for Redo (alternative)
  registry.register({
    id: 'edit-redo-y',
    code: 'KeyY',
    key: 'Y',
    modifiers: withPrimaryModifier(),
    description: 'Redo',
    handler: onRedo ?? performRedo,
    category: 'edit',
  });
}

/**
 * Unregisters edit operation shortcuts from the given registry.
 *
 * @param registry - The shortcut registry to unregister shortcuts from
 */
export function unregisterEditOperationShortcuts(registry: ShortcutRegistry): void {
  registry.unregister('edit-save');
  registry.unregister('edit-undo');
  registry.unregister('edit-redo-shift-z');
  registry.unregister('edit-redo-y');
}

/**
 * Hook that registers edit operation shortcuts (save, undo, redo).
 *
 * - Ctrl+S / Cmd+S: Opens save dialog (if onSave handler provided)
 * - Ctrl+Z / Cmd+Z: Undo
 * - Ctrl+Shift+Z / Cmd+Shift+Z: Redo
 * - Ctrl+Y / Cmd+Y: Redo (alternative)
 *
 * @param handlers - Optional handlers for save/undo/redo actions
 * @param registry - The shortcut registry to use (defaults to global registry)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [showSaveDialog, setShowSaveDialog] = useState(false);
 *
 *   useEditOperationShortcuts({
 *     onSave: () => setShowSaveDialog(true),
 *   });
 *
 *   return <div>Edit shortcuts enabled</div>;
 * }
 * ```
 */
export function useEditOperationShortcuts(
  handlers: EditOperationShortcutHandlers = {},
  registry?: ShortcutRegistry
): void {
  const registryToUse = registry ?? getGlobalShortcutRegistry();

  // Memoize handlers to prevent unnecessary re-registrations
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    // Create stable wrapper functions that use the ref
    const stableHandlers: EditOperationShortcutHandlers = {
      onSave: handlersRef.current.onSave
        ? () => handlersRef.current.onSave?.()
        : undefined,
      onUndo: handlersRef.current.onUndo,
      onRedo: handlersRef.current.onRedo,
    };

    registerEditOperationShortcuts(registryToUse, stableHandlers);

    return () => {
      unregisterEditOperationShortcuts(registryToUse);
    };
  }, [registryToUse]);
}

// ============================================================================
// Animation Control Shortcuts
// ============================================================================

/**
 * Registers animation control shortcuts to the given registry.
 *
 * - Spacebar: Toggle animation play/pause
 *
 * @param registry - The shortcut registry to register shortcuts to
 * @param togglePlayback - Function to call when toggling playback
 */
export function registerAnimationControlShortcuts(
  registry: ShortcutRegistry,
  togglePlayback: () => void
): void {
  // Spacebar for play/pause toggle
  registry.register({
    id: 'animation-toggle-playback',
    code: 'Space',
    key: 'Space',
    modifiers: {},
    description: 'Play/Pause animation',
    handler: () => {
      togglePlayback();
    },
    category: 'animation',
  });
}

/**
 * Unregisters animation control shortcuts from the given registry.
 *
 * @param registry - The shortcut registry to unregister shortcuts from
 */
export function unregisterAnimationControlShortcuts(registry: ShortcutRegistry): void {
  registry.unregister('animation-toggle-playback');
}

/**
 * Hook that registers animation control shortcuts and integrates
 * with the animation store for controlling playback.
 *
 * - Spacebar: Toggle play/pause
 *
 * @param registry - The shortcut registry to use (defaults to global registry)
 *
 * @example
 * ```tsx
 * // In a component that should enable animation shortcuts
 * function MyComponent() {
 *   useAnimationControlShortcuts();
 *   return <div>Animation shortcuts enabled</div>;
 * }
 * ```
 */
export function useAnimationControlShortcuts(registry?: ShortcutRegistry): void {
  const togglePlayback = useAnimationStore((state) => state.togglePlayback);
  const registryToUse = registry ?? getGlobalShortcutRegistry();

  useEffect(() => {
    registerAnimationControlShortcuts(registryToUse, togglePlayback);

    return () => {
      unregisterAnimationControlShortcuts(registryToUse);
    };
  }, [registryToUse, togglePlayback]);
}

// ============================================================================
// Help Overlay Shortcuts
// ============================================================================

/**
 * Options for registering help overlay shortcuts.
 */
export interface HelpOverlayShortcutHandlers {
  /** Handler to open the help overlay */
  onOpen: () => void;
  /** Handler to close the help overlay */
  onClose: () => void;
}

/**
 * Registers help overlay shortcuts to the given registry.
 *
 * - ? (Shift + /) : Open help overlay
 * - Esc: Close help overlay (allowInModal so it works when dialog is open)
 *
 * @param registry - The shortcut registry to register shortcuts to
 * @param handlers - Handlers for open/close actions
 */
export function registerHelpOverlayShortcuts(
  registry: ShortcutRegistry,
  handlers: HelpOverlayShortcutHandlers
): void {
  const { onOpen, onClose } = handlers;

  // ? key (Shift + Slash) to open help
  registry.register({
    id: 'help-open',
    code: 'Slash',
    key: '?',
    modifiers: { shift: true },
    description: 'Open help',
    handler: onOpen,
    category: 'general',
  });

  // Escape to close help - allowInModal so it works when dialog is open
  registry.register({
    id: 'help-close',
    code: 'Escape',
    key: 'Esc',
    modifiers: {},
    description: 'Close help/dialog',
    handler: onClose,
    category: 'general',
    allowInModal: true,
  });
}

/**
 * Unregisters help overlay shortcuts from the given registry.
 *
 * @param registry - The shortcut registry to unregister shortcuts from
 */
export function unregisterHelpOverlayShortcuts(registry: ShortcutRegistry): void {
  registry.unregister('help-open');
  registry.unregister('help-close');
}

/**
 * Hook that registers help overlay shortcuts (? to open, Esc to close).
 *
 * - ? (Shift + /): Opens help overlay
 * - Esc: Closes help overlay (works even when dialog is open)
 *
 * @param isOpen - Current open state of the help overlay
 * @param setIsOpen - Function to set the open state
 * @param registry - The shortcut registry to use (defaults to global registry)
 *
 * @example
 * ```tsx
 * function HelpOverlay() {
 *   const [isOpen, setIsOpen] = useState(false);
 *   useHelpOverlayShortcuts(isOpen, setIsOpen);
 *   return isOpen ? <div>Help content</div> : null;
 * }
 * ```
 */
export function useHelpOverlayShortcuts(
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
  registry?: ShortcutRegistry
): void {
  const registryToUse = registry ?? getGlobalShortcutRegistry();

  // Use refs to track latest state/callbacks without causing re-registrations
  const isOpenRef = useRef(isOpen);
  const setIsOpenRef = useRef(setIsOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    setIsOpenRef.current = setIsOpen;
  }, [setIsOpen]);

  useEffect(() => {
    const handlers: HelpOverlayShortcutHandlers = {
      onOpen: () => {
        if (!isOpenRef.current) {
          setIsOpenRef.current(true);
        }
      },
      onClose: () => {
        if (isOpenRef.current) {
          setIsOpenRef.current(false);
        }
      },
    };

    registerHelpOverlayShortcuts(registryToUse, handlers);

    return () => {
      unregisterHelpOverlayShortcuts(registryToUse);
    };
  }, [registryToUse]);
}
