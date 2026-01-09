/**
 * Keyboard Shortcuts Type Definitions
 *
 * Defines interfaces and types for the keyboard shortcuts system including
 * shortcut definitions, handlers, categories, and the registry system.
 */

/**
 * Modifier keys that can be combined with shortcuts
 */
export interface ModifierKeys {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

/**
 * Handler function type for keyboard shortcuts
 * @param event - The original keyboard event
 * @returns void or false to prevent default behavior
 */
export type ShortcutHandler = (event: KeyboardEvent) => void;

/**
 * Categories for organizing shortcuts in the help overlay
 */
export type ShortcutCategory =
  | 'camera'
  | 'tools'
  | 'edit'
  | 'animation'
  | 'general';

/**
 * Definition of a single keyboard shortcut
 */
export interface ShortcutDefinition {
  /** Unique identifier for the shortcut */
  id: string;
  /** The keyboard event code (e.g., 'KeyS', 'Digit1', 'Space') */
  code: string;
  /** Human-readable key representation for display (e.g., 'S', '1', 'Space') */
  key: string;
  /** Modifier keys required for this shortcut */
  modifiers: Partial<ModifierKeys>;
  /** Human-readable description of the shortcut's action */
  description: string;
  /** The action to execute when the shortcut is triggered */
  handler: ShortcutHandler;
  /** Category for grouping in help overlay */
  category: ShortcutCategory;
  /** Whether this shortcut should work when a dialog/modal is open */
  allowInModal?: boolean;
}

/**
 * Group of shortcuts organized by category for display
 */
export interface ShortcutGroup {
  /** Category identifier */
  category: ShortcutCategory;
  /** Display label for the category */
  label: string;
  /** Shortcuts belonging to this category */
  shortcuts: ShortcutDisplayInfo[];
}

/**
 * Simplified shortcut info for display in help overlay
 */
export interface ShortcutDisplayInfo {
  /** Human-readable key combination (e.g., 'Ctrl+S', '1') */
  keys: string;
  /** Description of what the shortcut does */
  description: string;
}

/**
 * Options for the keyboard shortcuts hook
 */
export interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Whether to process shortcuts when in modal/dialog */
  allowInModal?: boolean;
}

/**
 * Registry for managing keyboard shortcuts
 */
export interface ShortcutRegistry {
  /** All registered shortcuts */
  shortcuts: ShortcutDefinition[];
  /** Register a new shortcut */
  register: (shortcut: ShortcutDefinition) => void;
  /** Unregister a shortcut by id */
  unregister: (id: string) => void;
  /** Get a shortcut by id */
  get: (id: string) => ShortcutDefinition | undefined;
  /** Get all shortcuts in a category */
  getByCategory: (category: ShortcutCategory) => ShortcutDefinition[];
  /** Get all shortcuts grouped by category for display */
  getGroupedShortcuts: () => ShortcutGroup[];
  /** Find a shortcut matching a keyboard event */
  findMatch: (event: KeyboardEvent) => ShortcutDefinition | undefined;
}

/**
 * State for the keyboard shortcuts system
 */
export interface KeyboardShortcutsState {
  /** Whether shortcuts are globally enabled */
  enabled: boolean;
  /** Whether the help overlay is currently visible */
  helpVisible: boolean;
  /** Enable or disable shortcuts globally */
  setEnabled: (enabled: boolean) => void;
  /** Show or hide the help overlay */
  setHelpVisible: (visible: boolean) => void;
  /** Toggle help overlay visibility */
  toggleHelp: () => void;
}

/**
 * Category display labels for the help overlay
 */
export const SHORTCUT_CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  camera: 'Camera Views',
  tools: 'Annotation Tools',
  edit: 'Edit Operations',
  animation: 'Animation',
  general: 'General',
};
