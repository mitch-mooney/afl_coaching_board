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
 * Formats shortcut keys for display in the help overlay
 */
export function formatShortcutKeys(shortcut: ShortcutDefinition): string {
  const parts: string[] = [];

  if (shortcut.modifiers.ctrl) {
    parts.push('Ctrl');
  }
  if (shortcut.modifiers.meta) {
    parts.push('Cmd');
  }
  if (shortcut.modifiers.alt) {
    parts.push('Alt');
  }
  if (shortcut.modifiers.shift) {
    parts.push('Shift');
  }

  parts.push(shortcut.key);

  return parts.join('+');
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
