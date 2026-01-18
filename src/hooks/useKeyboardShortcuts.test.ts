/**
 * useKeyboardShortcuts Hook Tests
 *
 * Comprehensive tests for the keyboard shortcuts system including:
 * - Key press detection
 * - preventDefault being called
 * - Focus detection (input field handling)
 * - Modifier key combinations
 * - Platform detection (Mac/Windows)
 * - Shortcut registry management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  isMac,
  resetPlatformCache,
  getPrimaryModifierKey,
  isPrimaryModifierPressed,
  getPrimaryModifierLabel,
  withPrimaryModifier,
  withCrossplatformModifier,
  isTypingInInput,
  modifiersMatch,
  createShortcutRegistry,
  formatShortcutKeys,
  useKeyboardShortcuts,
  getGlobalShortcutRegistry,
  resetGlobalShortcutRegistry,
  registerCameraPresetShortcuts,
  unregisterCameraPresetShortcuts,
  registerToolSelectionShortcuts,
  unregisterToolSelectionShortcuts,
  registerEditOperationShortcuts,
  unregisterEditOperationShortcuts,
  registerAnimationControlShortcuts,
  unregisterAnimationControlShortcuts,
  registerHelpOverlayShortcuts,
  unregisterHelpOverlayShortcuts,
} from './useKeyboardShortcuts';
import type { ShortcutDefinition, ModifierKeys } from '../types/shortcuts';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a mock KeyboardEvent with specified properties
 */
function createKeyboardEvent(
  type: string,
  options: {
    code?: string;
    key?: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    target?: EventTarget | null;
  } = {}
): KeyboardEvent {
  const event = new KeyboardEvent(type, {
    code: options.code ?? 'KeyA',
    key: options.key ?? 'a',
    ctrlKey: options.ctrlKey ?? false,
    shiftKey: options.shiftKey ?? false,
    altKey: options.altKey ?? false,
    metaKey: options.metaKey ?? false,
    bubbles: true,
    cancelable: true,
  });

  // Override target if provided
  if (options.target) {
    Object.defineProperty(event, 'target', {
      value: options.target,
      writable: false,
    });
  }

  return event;
}

/**
 * Creates a mock HTMLInputElement
 */
function createInputElement(type: string = 'text'): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  document.body.appendChild(input);
  return input;
}

/**
 * Creates a mock HTMLTextAreaElement
 */
function createTextareaElement(): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  document.body.appendChild(textarea);
  return textarea;
}

/**
 * Creates a mock contentEditable element
 */
function createContentEditableElement(): HTMLDivElement {
  const div = document.createElement('div');
  div.contentEditable = 'true';
  document.body.appendChild(div);
  return div;
}

/**
 * Creates a mock dialog element
 */
function createDialogElement(): HTMLDivElement {
  const div = document.createElement('div');
  div.setAttribute('role', 'dialog');
  document.body.appendChild(div);
  return div;
}

// ============================================================================
// Platform Detection Tests
// ============================================================================

describe('Platform Detection', () => {
  beforeEach(() => {
    resetPlatformCache();
  });

  afterEach(() => {
    resetPlatformCache();
    vi.restoreAllMocks();
  });

  describe('isMac()', () => {
    it('should return true for Mac platform', () => {
      vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
      resetPlatformCache();
      expect(isMac()).toBe(true);
    });

    it('should return true for mac in platform (lowercase)', () => {
      vi.stubGlobal('navigator', { platform: 'macOS', userAgent: '' });
      resetPlatformCache();
      expect(isMac()).toBe(true);
    });

    it('should return false for Windows platform', () => {
      vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
      resetPlatformCache();
      expect(isMac()).toBe(false);
    });

    it('should return false for Linux platform', () => {
      vi.stubGlobal('navigator', { platform: 'Linux x86_64', userAgent: '' });
      resetPlatformCache();
      expect(isMac()).toBe(false);
    });

    it('should fall back to userAgent if platform does not contain mac', () => {
      vi.stubGlobal('navigator', {
        platform: '',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      });
      resetPlatformCache();
      expect(isMac()).toBe(true);
    });

    it('should cache the result', () => {
      vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
      resetPlatformCache();
      const firstCall = isMac();
      // Change navigator - should still return cached value
      vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
      const secondCall = isMac();
      expect(firstCall).toBe(secondCall);
    });

    it('should return false when navigator is undefined (SSR)', () => {
      vi.stubGlobal('navigator', undefined);
      resetPlatformCache();
      expect(isMac()).toBe(false);
    });
  });

  describe('getPrimaryModifierKey()', () => {
    it('should return "meta" on Mac', () => {
      vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
      resetPlatformCache();
      expect(getPrimaryModifierKey()).toBe('meta');
    });

    it('should return "ctrl" on Windows', () => {
      vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
      resetPlatformCache();
      expect(getPrimaryModifierKey()).toBe('ctrl');
    });
  });

  describe('isPrimaryModifierPressed()', () => {
    it('should check metaKey on Mac', () => {
      vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
      resetPlatformCache();

      const eventWithMeta = createKeyboardEvent('keydown', { metaKey: true });
      const eventWithCtrl = createKeyboardEvent('keydown', { ctrlKey: true });

      expect(isPrimaryModifierPressed(eventWithMeta)).toBe(true);
      expect(isPrimaryModifierPressed(eventWithCtrl)).toBe(false);
    });

    it('should check ctrlKey on Windows', () => {
      vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
      resetPlatformCache();

      const eventWithMeta = createKeyboardEvent('keydown', { metaKey: true });
      const eventWithCtrl = createKeyboardEvent('keydown', { ctrlKey: true });

      expect(isPrimaryModifierPressed(eventWithMeta)).toBe(false);
      expect(isPrimaryModifierPressed(eventWithCtrl)).toBe(true);
    });
  });

  describe('getPrimaryModifierLabel()', () => {
    it('should return command symbol on Mac', () => {
      vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
      resetPlatformCache();
      expect(getPrimaryModifierLabel()).toBe('\u2318');
    });

    it('should return "Ctrl" on Windows', () => {
      vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
      resetPlatformCache();
      expect(getPrimaryModifierLabel()).toBe('Ctrl');
    });
  });

  describe('withPrimaryModifier()', () => {
    it('should create modifiers with meta on Mac', () => {
      vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
      resetPlatformCache();

      const modifiers = withPrimaryModifier();
      expect(modifiers).toEqual({ meta: true });
    });

    it('should create modifiers with ctrl on Windows', () => {
      vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
      resetPlatformCache();

      const modifiers = withPrimaryModifier();
      expect(modifiers).toEqual({ ctrl: true });
    });

    it('should include additional modifiers', () => {
      vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
      resetPlatformCache();

      const modifiers = withPrimaryModifier({ shift: true });
      expect(modifiers).toEqual({ ctrl: true, shift: true });
    });
  });

  describe('withCrossplatformModifier()', () => {
    it('should create modifiers with both ctrl and meta', () => {
      const modifiers = withCrossplatformModifier();
      expect(modifiers).toEqual({ ctrl: true, meta: true });
    });

    it('should include additional modifiers', () => {
      const modifiers = withCrossplatformModifier({ shift: true });
      expect(modifiers).toEqual({ ctrl: true, meta: true, shift: true });
    });
  });
});

// ============================================================================
// Focus Detection Tests
// ============================================================================

describe('Focus Detection', () => {
  describe('isTypingInInput()', () => {
    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should return true for input elements', () => {
      const input = createInputElement();
      expect(isTypingInInput(input)).toBe(true);
    });

    it('should return true for different input types', () => {
      const textInput = createInputElement('text');
      const emailInput = createInputElement('email');
      const passwordInput = createInputElement('password');
      const numberInput = createInputElement('number');

      expect(isTypingInInput(textInput)).toBe(true);
      expect(isTypingInInput(emailInput)).toBe(true);
      expect(isTypingInInput(passwordInput)).toBe(true);
      expect(isTypingInInput(numberInput)).toBe(true);
    });

    it('should return true for textarea elements', () => {
      const textarea = createTextareaElement();
      expect(isTypingInInput(textarea)).toBe(true);
    });

    it('should return true for select elements', () => {
      const select = document.createElement('select');
      document.body.appendChild(select);
      expect(isTypingInInput(select)).toBe(true);
    });

    it('should return true for contentEditable elements', () => {
      const contentEditable = createContentEditableElement();
      expect(isTypingInInput(contentEditable)).toBe(true);
    });

    it('should return false for regular divs', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      expect(isTypingInInput(div)).toBe(false);
    });

    it('should return false for buttons', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      expect(isTypingInInput(button)).toBe(false);
    });

    it('should return false for null target', () => {
      expect(isTypingInInput(null)).toBe(false);
    });

    it('should return false for non-HTMLElement targets', () => {
      const event = new Event('keydown');
      expect(isTypingInInput(event.target)).toBe(false);
    });
  });
});

// ============================================================================
// Modifier Key Matching Tests
// ============================================================================

describe('Modifier Key Matching', () => {
  describe('modifiersMatch()', () => {
    it('should match when no modifiers are required and none pressed', () => {
      const event = createKeyboardEvent('keydown', {});
      expect(modifiersMatch(event, {})).toBe(true);
    });

    it('should not match when modifiers are pressed but not required', () => {
      const event = createKeyboardEvent('keydown', { ctrlKey: true });
      expect(modifiersMatch(event, {})).toBe(false);
    });

    it('should match Ctrl modifier', () => {
      const event = createKeyboardEvent('keydown', { ctrlKey: true });
      expect(modifiersMatch(event, { ctrl: true })).toBe(true);
    });

    it('should not match when Ctrl is required but not pressed', () => {
      const event = createKeyboardEvent('keydown', {});
      expect(modifiersMatch(event, { ctrl: true })).toBe(false);
    });

    it('should match Shift modifier', () => {
      const event = createKeyboardEvent('keydown', { shiftKey: true });
      expect(modifiersMatch(event, { shift: true })).toBe(true);
    });

    it('should match Alt modifier', () => {
      const event = createKeyboardEvent('keydown', { altKey: true });
      expect(modifiersMatch(event, { alt: true })).toBe(true);
    });

    it('should match Meta modifier', () => {
      const event = createKeyboardEvent('keydown', { metaKey: true });
      expect(modifiersMatch(event, { meta: true })).toBe(true);
    });

    it('should match multiple modifiers Ctrl+Shift', () => {
      const event = createKeyboardEvent('keydown', {
        ctrlKey: true,
        shiftKey: true,
      });
      expect(modifiersMatch(event, { ctrl: true, shift: true })).toBe(true);
    });

    it('should not match when extra modifiers are pressed', () => {
      const event = createKeyboardEvent('keydown', {
        ctrlKey: true,
        shiftKey: true,
      });
      // Only Ctrl required, but Shift is also pressed
      expect(modifiersMatch(event, { ctrl: true })).toBe(false);
    });

    it('should match Ctrl+Shift+Z combination', () => {
      const event = createKeyboardEvent('keydown', {
        code: 'KeyZ',
        ctrlKey: true,
        shiftKey: true,
      });
      expect(modifiersMatch(event, { ctrl: true, shift: true })).toBe(true);
    });

    it('should match all four modifiers', () => {
      const event = createKeyboardEvent('keydown', {
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
        metaKey: true,
      });
      const modifiers: Partial<ModifierKeys> = {
        ctrl: true,
        shift: true,
        alt: true,
        meta: true,
      };
      expect(modifiersMatch(event, modifiers)).toBe(true);
    });
  });
});

// ============================================================================
// Shortcut Registry Tests
// ============================================================================

describe('Shortcut Registry', () => {
  let registry: ReturnType<typeof createShortcutRegistry>;

  beforeEach(() => {
    registry = createShortcutRegistry();
  });

  describe('register()', () => {
    it('should register a new shortcut', () => {
      const shortcut: ShortcutDefinition = {
        id: 'test-shortcut',
        code: 'KeyA',
        key: 'A',
        modifiers: {},
        description: 'Test shortcut',
        handler: vi.fn(),
        category: 'general',
      };

      registry.register(shortcut);
      expect(registry.get('test-shortcut')).toEqual(shortcut);
    });

    it('should replace existing shortcut with same ID', () => {
      const shortcut1: ShortcutDefinition = {
        id: 'test-shortcut',
        code: 'KeyA',
        key: 'A',
        modifiers: {},
        description: 'First shortcut',
        handler: vi.fn(),
        category: 'general',
      };

      const shortcut2: ShortcutDefinition = {
        id: 'test-shortcut',
        code: 'KeyB',
        key: 'B',
        modifiers: {},
        description: 'Replaced shortcut',
        handler: vi.fn(),
        category: 'general',
      };

      registry.register(shortcut1);
      registry.register(shortcut2);

      expect(registry.shortcuts.length).toBe(1);
      expect(registry.get('test-shortcut')?.code).toBe('KeyB');
    });
  });

  describe('unregister()', () => {
    it('should remove a registered shortcut', () => {
      const shortcut: ShortcutDefinition = {
        id: 'test-shortcut',
        code: 'KeyA',
        key: 'A',
        modifiers: {},
        description: 'Test shortcut',
        handler: vi.fn(),
        category: 'general',
      };

      registry.register(shortcut);
      registry.unregister('test-shortcut');

      expect(registry.get('test-shortcut')).toBeUndefined();
    });

    it('should handle unregistering non-existent shortcut gracefully', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('get()', () => {
    it('should return shortcut by ID', () => {
      const shortcut: ShortcutDefinition = {
        id: 'test-shortcut',
        code: 'KeyA',
        key: 'A',
        modifiers: {},
        description: 'Test shortcut',
        handler: vi.fn(),
        category: 'general',
      };

      registry.register(shortcut);
      expect(registry.get('test-shortcut')).toEqual(shortcut);
    });

    it('should return undefined for non-existent shortcut', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('getByCategory()', () => {
    it('should return shortcuts by category', () => {
      const cameraShortcut: ShortcutDefinition = {
        id: 'camera-1',
        code: 'Digit1',
        key: '1',
        modifiers: {},
        description: 'Camera 1',
        handler: vi.fn(),
        category: 'camera',
      };

      const toolShortcut: ShortcutDefinition = {
        id: 'tool-select',
        code: 'KeyS',
        key: 'S',
        modifiers: {},
        description: 'Select tool',
        handler: vi.fn(),
        category: 'tools',
      };

      registry.register(cameraShortcut);
      registry.register(toolShortcut);

      const cameraShortcuts = registry.getByCategory('camera');
      expect(cameraShortcuts).toHaveLength(1);
      expect(cameraShortcuts[0].id).toBe('camera-1');
    });

    it('should return empty array for category with no shortcuts', () => {
      expect(registry.getByCategory('animation')).toEqual([]);
    });
  });

  describe('getGroupedShortcuts()', () => {
    it('should return shortcuts grouped by category', () => {
      const cameraShortcut: ShortcutDefinition = {
        id: 'camera-1',
        code: 'Digit1',
        key: '1',
        modifiers: {},
        description: 'Camera 1',
        handler: vi.fn(),
        category: 'camera',
      };

      const toolShortcut: ShortcutDefinition = {
        id: 'tool-select',
        code: 'KeyS',
        key: 'S',
        modifiers: {},
        description: 'Select tool',
        handler: vi.fn(),
        category: 'tools',
      };

      registry.register(cameraShortcut);
      registry.register(toolShortcut);

      const groups = registry.getGroupedShortcuts();

      // Should only include groups with shortcuts
      expect(groups.some((g) => g.category === 'camera')).toBe(true);
      expect(groups.some((g) => g.category === 'tools')).toBe(true);
      expect(groups.some((g) => g.category === 'animation')).toBe(false);
    });
  });

  describe('findMatch()', () => {
    it('should find matching shortcut by event code', () => {
      const shortcut: ShortcutDefinition = {
        id: 'test-shortcut',
        code: 'KeyA',
        key: 'A',
        modifiers: {},
        description: 'Test shortcut',
        handler: vi.fn(),
        category: 'general',
      };

      registry.register(shortcut);

      const event = createKeyboardEvent('keydown', { code: 'KeyA', key: 'a' });
      const match = registry.findMatch(event);

      expect(match).toEqual(shortcut);
    });

    it('should match shortcuts with modifiers', () => {
      const shortcut: ShortcutDefinition = {
        id: 'save-shortcut',
        code: 'KeyS',
        key: 'S',
        modifiers: { ctrl: true },
        description: 'Save',
        handler: vi.fn(),
        category: 'edit',
      };

      registry.register(shortcut);

      const event = createKeyboardEvent('keydown', {
        code: 'KeyS',
        key: 's',
        ctrlKey: true,
      });
      const match = registry.findMatch(event);

      expect(match).toEqual(shortcut);
    });

    it('should not match when modifiers do not match', () => {
      const shortcut: ShortcutDefinition = {
        id: 'save-shortcut',
        code: 'KeyS',
        key: 'S',
        modifiers: { ctrl: true },
        description: 'Save',
        handler: vi.fn(),
        category: 'edit',
      };

      registry.register(shortcut);

      // Event without Ctrl pressed
      const event = createKeyboardEvent('keydown', { code: 'KeyS', key: 's' });
      const match = registry.findMatch(event);

      expect(match).toBeUndefined();
    });

    it('should return undefined when no match found', () => {
      const event = createKeyboardEvent('keydown', { code: 'KeyZ', key: 'z' });
      const match = registry.findMatch(event);

      expect(match).toBeUndefined();
    });

    it('should distinguish between similar shortcuts with different modifiers', () => {
      const undoShortcut: ShortcutDefinition = {
        id: 'undo',
        code: 'KeyZ',
        key: 'Z',
        modifiers: { ctrl: true },
        description: 'Undo',
        handler: vi.fn(),
        category: 'edit',
      };

      const redoShortcut: ShortcutDefinition = {
        id: 'redo',
        code: 'KeyZ',
        key: 'Z',
        modifiers: { ctrl: true, shift: true },
        description: 'Redo',
        handler: vi.fn(),
        category: 'edit',
      };

      registry.register(undoShortcut);
      registry.register(redoShortcut);

      const undoEvent = createKeyboardEvent('keydown', {
        code: 'KeyZ',
        ctrlKey: true,
      });
      const redoEvent = createKeyboardEvent('keydown', {
        code: 'KeyZ',
        ctrlKey: true,
        shiftKey: true,
      });

      expect(registry.findMatch(undoEvent)?.id).toBe('undo');
      expect(registry.findMatch(redoEvent)?.id).toBe('redo');
    });
  });
});

// ============================================================================
// Format Shortcut Keys Tests
// ============================================================================

describe('formatShortcutKeys()', () => {
  beforeEach(() => {
    resetPlatformCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetPlatformCache();
  });

  it('should format simple key without modifiers', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
    resetPlatformCache();

    const shortcut: ShortcutDefinition = {
      id: 'test',
      code: 'Digit1',
      key: '1',
      modifiers: {},
      description: 'Test',
      handler: vi.fn(),
      category: 'general',
    };

    expect(formatShortcutKeys(shortcut)).toBe('1');
  });

  it('should format Ctrl+S on Windows', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
    resetPlatformCache();

    const shortcut: ShortcutDefinition = {
      id: 'save',
      code: 'KeyS',
      key: 'S',
      modifiers: { ctrl: true },
      description: 'Save',
      handler: vi.fn(),
      category: 'edit',
    };

    expect(formatShortcutKeys(shortcut)).toBe('Ctrl+S');
  });

  it('should format Cmd+S on Mac', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
    resetPlatformCache();

    const shortcut: ShortcutDefinition = {
      id: 'save',
      code: 'KeyS',
      key: 'S',
      modifiers: { meta: true },
      description: 'Save',
      handler: vi.fn(),
      category: 'edit',
    };

    expect(formatShortcutKeys(shortcut)).toBe('\u2318S');
  });

  it('should format cross-platform shortcut on Mac', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
    resetPlatformCache();

    const shortcut: ShortcutDefinition = {
      id: 'save',
      code: 'KeyS',
      key: 'S',
      modifiers: { ctrl: true, meta: true },
      description: 'Save',
      handler: vi.fn(),
      category: 'edit',
    };

    expect(formatShortcutKeys(shortcut)).toBe('\u2318S');
  });

  it('should format cross-platform shortcut on Windows', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
    resetPlatformCache();

    const shortcut: ShortcutDefinition = {
      id: 'save',
      code: 'KeyS',
      key: 'S',
      modifiers: { ctrl: true, meta: true },
      description: 'Save',
      handler: vi.fn(),
      category: 'edit',
    };

    expect(formatShortcutKeys(shortcut)).toBe('Ctrl+S');
  });

  it('should format Ctrl+Shift+Z on Windows', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
    resetPlatformCache();

    const shortcut: ShortcutDefinition = {
      id: 'redo',
      code: 'KeyZ',
      key: 'Z',
      modifiers: { ctrl: true, shift: true },
      description: 'Redo',
      handler: vi.fn(),
      category: 'edit',
    };

    expect(formatShortcutKeys(shortcut)).toBe('Ctrl+Shift+Z');
  });

  it('should format Cmd+Shift+Z on Mac', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
    resetPlatformCache();

    const shortcut: ShortcutDefinition = {
      id: 'redo',
      code: 'KeyZ',
      key: 'Z',
      modifiers: { ctrl: true, shift: true },
      description: 'Redo',
      handler: vi.fn(),
      category: 'edit',
    };

    // On Mac, ctrl shows as ⌃, shift as ⇧
    expect(formatShortcutKeys(shortcut)).toBe('\u2303\u21e7Z');
  });

  it('should format Alt modifier on Windows', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
    resetPlatformCache();

    const shortcut: ShortcutDefinition = {
      id: 'test',
      code: 'KeyA',
      key: 'A',
      modifiers: { alt: true },
      description: 'Test',
      handler: vi.fn(),
      category: 'general',
    };

    expect(formatShortcutKeys(shortcut)).toBe('Alt+A');
  });

  it('should format Option modifier on Mac', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
    resetPlatformCache();

    const shortcut: ShortcutDefinition = {
      id: 'test',
      code: 'KeyA',
      key: 'A',
      modifiers: { alt: true },
      description: 'Test',
      handler: vi.fn(),
      category: 'general',
    };

    // On Mac, alt shows as ⌥
    expect(formatShortcutKeys(shortcut)).toBe('\u2325A');
  });
});

// ============================================================================
// Global Registry Tests
// ============================================================================

describe('Global Shortcut Registry', () => {
  beforeEach(() => {
    resetGlobalShortcutRegistry();
  });

  it('should return the same registry instance', () => {
    const registry1 = getGlobalShortcutRegistry();
    const registry2 = getGlobalShortcutRegistry();
    expect(registry1).toBe(registry2);
  });

  it('should reset to a new registry', () => {
    const registry1 = getGlobalShortcutRegistry();
    registry1.register({
      id: 'test',
      code: 'KeyA',
      key: 'A',
      modifiers: {},
      description: 'Test',
      handler: vi.fn(),
      category: 'general',
    });

    resetGlobalShortcutRegistry();
    const registry2 = getGlobalShortcutRegistry();

    expect(registry2.shortcuts.length).toBe(0);
  });
});

// ============================================================================
// useKeyboardShortcuts Hook Tests
// ============================================================================

describe('useKeyboardShortcuts Hook', () => {
  let registry: ReturnType<typeof createShortcutRegistry>;

  beforeEach(() => {
    registry = createShortcutRegistry();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Key Press Detection', () => {
    it('should call handler when shortcut key is pressed', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'KeyA',
        key: 'A',
        modifiers: {},
        description: 'Test',
        handler,
        category: 'general',
      });

      renderHook(() => useKeyboardShortcuts(registry));

      act(() => {
        const event = createKeyboardEvent('keydown', { code: 'KeyA', key: 'a' });
        window.dispatchEvent(event);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not call handler for unregistered keys', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'KeyA',
        key: 'A',
        modifiers: {},
        description: 'Test',
        handler,
        category: 'general',
      });

      renderHook(() => useKeyboardShortcuts(registry));

      act(() => {
        const event = createKeyboardEvent('keydown', { code: 'KeyB', key: 'b' });
        window.dispatchEvent(event);
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should match by event.code not event.key', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'KeyS',
        key: 'S',
        modifiers: {},
        description: 'Test',
        handler,
        category: 'general',
      });

      renderHook(() => useKeyboardShortcuts(registry));

      // Different key value but same code (e.g., different keyboard layout)
      act(() => {
        const event = createKeyboardEvent('keydown', {
          code: 'KeyS',
          key: '\u0441', // Cyrillic 's'
        });
        window.dispatchEvent(event);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('preventDefault Behavior', () => {
    it('should call preventDefault when shortcut matches', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'KeyS',
        key: 'S',
        modifiers: { ctrl: true },
        description: 'Save',
        handler,
        category: 'edit',
      });

      renderHook(() => useKeyboardShortcuts(registry));

      const event = createKeyboardEvent('keydown', {
        code: 'KeyS',
        key: 's',
        ctrlKey: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not call preventDefault when shortcut does not match', () => {
      registry.register({
        id: 'test',
        code: 'KeyS',
        key: 'S',
        modifiers: { ctrl: true },
        description: 'Save',
        handler: vi.fn(),
        category: 'edit',
      });

      renderHook(() => useKeyboardShortcuts(registry));

      const event = createKeyboardEvent('keydown', { code: 'KeyA', key: 'a' });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('Input Field Handling', () => {
    it('should not trigger shortcuts when typing in input', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'KeyS',
        key: 'S',
        modifiers: {},
        description: 'Test',
        handler,
        category: 'general',
      });

      renderHook(() => useKeyboardShortcuts(registry));

      const input = createInputElement();

      act(() => {
        const event = createKeyboardEvent('keydown', {
          code: 'KeyS',
          key: 's',
          target: input,
        });
        window.dispatchEvent(event);
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not trigger shortcuts when typing in textarea', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'KeyS',
        key: 'S',
        modifiers: {},
        description: 'Test',
        handler,
        category: 'general',
      });

      renderHook(() => useKeyboardShortcuts(registry));

      const textarea = createTextareaElement();

      act(() => {
        const event = createKeyboardEvent('keydown', {
          code: 'KeyS',
          key: 's',
          target: textarea,
        });
        window.dispatchEvent(event);
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not trigger shortcuts when typing in contentEditable', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'KeyS',
        key: 'S',
        modifiers: {},
        description: 'Test',
        handler,
        category: 'general',
      });

      renderHook(() => useKeyboardShortcuts(registry));

      const contentEditable = createContentEditableElement();

      act(() => {
        const event = createKeyboardEvent('keydown', {
          code: 'KeyS',
          key: 's',
          target: contentEditable,
        });
        window.dispatchEvent(event);
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Enabled/Disabled State', () => {
    it('should not trigger shortcuts when disabled', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'KeyA',
        key: 'A',
        modifiers: {},
        description: 'Test',
        handler,
        category: 'general',
      });

      renderHook(() => useKeyboardShortcuts(registry, { enabled: false }));

      act(() => {
        const event = createKeyboardEvent('keydown', { code: 'KeyA', key: 'a' });
        window.dispatchEvent(event);
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should trigger shortcuts when enabled', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'KeyA',
        key: 'A',
        modifiers: {},
        description: 'Test',
        handler,
        category: 'general',
      });

      renderHook(() => useKeyboardShortcuts(registry, { enabled: true }));

      act(() => {
        const event = createKeyboardEvent('keydown', { code: 'KeyA', key: 'a' });
        window.dispatchEvent(event);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should respond to enabled state changes', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'KeyA',
        key: 'A',
        modifiers: {},
        description: 'Test',
        handler,
        category: 'general',
      });

      const { rerender } = renderHook(
        ({ enabled }) => useKeyboardShortcuts(registry, { enabled }),
        { initialProps: { enabled: false } }
      );

      // Should not fire when disabled
      act(() => {
        const event = createKeyboardEvent('keydown', { code: 'KeyA', key: 'a' });
        window.dispatchEvent(event);
      });
      expect(handler).not.toHaveBeenCalled();

      // Re-enable
      rerender({ enabled: true });

      // Should fire when enabled
      act(() => {
        const event = createKeyboardEvent('keydown', { code: 'KeyA', key: 'a' });
        window.dispatchEvent(event);
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal/Dialog Handling', () => {
    it('should not trigger shortcuts when dialog is open', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'KeyA',
        key: 'A',
        modifiers: {},
        description: 'Test',
        handler,
        category: 'general',
      });

      renderHook(() => useKeyboardShortcuts(registry));

      // Create a dialog element
      createDialogElement();

      act(() => {
        const event = createKeyboardEvent('keydown', { code: 'KeyA', key: 'a' });
        window.dispatchEvent(event);
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should trigger shortcuts with allowInModal when dialog is open', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'Escape',
        key: 'Escape',
        modifiers: {},
        description: 'Close dialog',
        handler,
        category: 'general',
        allowInModal: true,
      });

      renderHook(() => useKeyboardShortcuts(registry));

      // Create a dialog element
      createDialogElement();

      act(() => {
        const event = createKeyboardEvent('keydown', {
          code: 'Escape',
          key: 'Escape',
        });
        window.dispatchEvent(event);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const handler = vi.fn();
      registry.register({
        id: 'test',
        code: 'KeyA',
        key: 'A',
        modifiers: {},
        description: 'Test',
        handler,
        category: 'general',
      });

      const { unmount } = renderHook(() => useKeyboardShortcuts(registry));

      // Unmount the hook
      unmount();

      // Event should not trigger the handler
      act(() => {
        const event = createKeyboardEvent('keydown', { code: 'KeyA', key: 'a' });
        window.dispatchEvent(event);
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Shortcut Registration Function Tests
// ============================================================================

describe('Shortcut Registration Functions', () => {
  let registry: ReturnType<typeof createShortcutRegistry>;

  beforeEach(() => {
    registry = createShortcutRegistry();
    resetPlatformCache();
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetPlatformCache();
  });

  describe('Camera Preset Shortcuts', () => {
    it('should register all 4 camera preset shortcuts', () => {
      const setPresetView = vi.fn();
      registerCameraPresetShortcuts(registry, setPresetView);

      expect(registry.get('camera-preset-1')).toBeDefined();
      expect(registry.get('camera-preset-2')).toBeDefined();
      expect(registry.get('camera-preset-3')).toBeDefined();
      expect(registry.get('camera-preset-4')).toBeDefined();
    });

    it('should call setPresetView with correct preset', () => {
      const setPresetView = vi.fn();
      registerCameraPresetShortcuts(registry, setPresetView);

      const shortcut1 = registry.get('camera-preset-1');
      const shortcut2 = registry.get('camera-preset-2');
      const shortcut3 = registry.get('camera-preset-3');
      const shortcut4 = registry.get('camera-preset-4');

      shortcut1?.handler(createKeyboardEvent('keydown'));
      expect(setPresetView).toHaveBeenCalledWith('top');

      shortcut2?.handler(createKeyboardEvent('keydown'));
      expect(setPresetView).toHaveBeenCalledWith('sideline');

      shortcut3?.handler(createKeyboardEvent('keydown'));
      expect(setPresetView).toHaveBeenCalledWith('end-to-end');

      shortcut4?.handler(createKeyboardEvent('keydown'));
      expect(setPresetView).toHaveBeenCalledWith('broadcast');
    });

    it('should unregister all camera preset shortcuts', () => {
      const setPresetView = vi.fn();
      registerCameraPresetShortcuts(registry, setPresetView);
      unregisterCameraPresetShortcuts(registry);

      expect(registry.get('camera-preset-1')).toBeUndefined();
      expect(registry.get('camera-preset-2')).toBeUndefined();
      expect(registry.get('camera-preset-3')).toBeUndefined();
      expect(registry.get('camera-preset-4')).toBeUndefined();
    });

    it('should have camera category for all shortcuts', () => {
      const setPresetView = vi.fn();
      registerCameraPresetShortcuts(registry, setPresetView);

      const cameraShortcuts = registry.getByCategory('camera');
      expect(cameraShortcuts).toHaveLength(4);
    });
  });

  describe('Tool Selection Shortcuts', () => {
    it('should register all tool selection shortcuts', () => {
      const setSelectedTool = vi.fn();
      registerToolSelectionShortcuts(registry, setSelectedTool);

      expect(registry.get('tool-s')).toBeDefined();
      expect(registry.get('tool-l')).toBeDefined();
      expect(registry.get('tool-a')).toBeDefined();
      expect(registry.get('tool-c')).toBeDefined();
      expect(registry.get('tool-r')).toBeDefined();
      expect(registry.get('tool-t')).toBeDefined();
    });

    it('should call setSelectedTool with correct tool', () => {
      const setSelectedTool = vi.fn();
      registerToolSelectionShortcuts(registry, setSelectedTool);

      registry.get('tool-s')?.handler(createKeyboardEvent('keydown'));
      expect(setSelectedTool).toHaveBeenCalledWith(null); // Select mode

      registry.get('tool-l')?.handler(createKeyboardEvent('keydown'));
      expect(setSelectedTool).toHaveBeenCalledWith('line');

      registry.get('tool-a')?.handler(createKeyboardEvent('keydown'));
      expect(setSelectedTool).toHaveBeenCalledWith('arrow');

      registry.get('tool-c')?.handler(createKeyboardEvent('keydown'));
      expect(setSelectedTool).toHaveBeenCalledWith('circle');

      registry.get('tool-r')?.handler(createKeyboardEvent('keydown'));
      expect(setSelectedTool).toHaveBeenCalledWith('rectangle');

      registry.get('tool-t')?.handler(createKeyboardEvent('keydown'));
      expect(setSelectedTool).toHaveBeenCalledWith('text');
    });

    it('should unregister all tool selection shortcuts', () => {
      const setSelectedTool = vi.fn();
      registerToolSelectionShortcuts(registry, setSelectedTool);
      unregisterToolSelectionShortcuts(registry);

      expect(registry.get('tool-s')).toBeUndefined();
      expect(registry.get('tool-l')).toBeUndefined();
      expect(registry.get('tool-a')).toBeUndefined();
      expect(registry.get('tool-c')).toBeUndefined();
      expect(registry.get('tool-r')).toBeUndefined();
      expect(registry.get('tool-t')).toBeUndefined();
    });
  });

  describe('Edit Operation Shortcuts', () => {
    it('should register undo and redo shortcuts by default', () => {
      registerEditOperationShortcuts(registry);

      expect(registry.get('edit-undo')).toBeDefined();
      expect(registry.get('edit-redo-shift-z')).toBeDefined();
      expect(registry.get('edit-redo-y')).toBeDefined();
    });

    it('should not register save shortcut without handler', () => {
      registerEditOperationShortcuts(registry);

      expect(registry.get('edit-save')).toBeUndefined();
    });

    it('should register save shortcut when handler provided', () => {
      const onSave = vi.fn();
      registerEditOperationShortcuts(registry, { onSave });

      expect(registry.get('edit-save')).toBeDefined();
    });

    it('should call custom handlers when provided', () => {
      const onSave = vi.fn();
      const onUndo = vi.fn();
      const onRedo = vi.fn();

      registerEditOperationShortcuts(registry, { onSave, onUndo, onRedo });

      registry.get('edit-save')?.handler(createKeyboardEvent('keydown'));
      expect(onSave).toHaveBeenCalled();

      registry.get('edit-undo')?.handler(createKeyboardEvent('keydown'));
      expect(onUndo).toHaveBeenCalled();

      registry.get('edit-redo-shift-z')?.handler(createKeyboardEvent('keydown'));
      expect(onRedo).toHaveBeenCalled();
    });

    it('should unregister all edit operation shortcuts', () => {
      registerEditOperationShortcuts(registry, { onSave: vi.fn() });
      unregisterEditOperationShortcuts(registry);

      expect(registry.get('edit-save')).toBeUndefined();
      expect(registry.get('edit-undo')).toBeUndefined();
      expect(registry.get('edit-redo-shift-z')).toBeUndefined();
      expect(registry.get('edit-redo-y')).toBeUndefined();
    });

    it('should use platform-appropriate modifiers', () => {
      vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' });
      resetPlatformCache();

      registerEditOperationShortcuts(registry, { onSave: vi.fn() });

      const saveShortcut = registry.get('edit-save');
      expect(saveShortcut?.modifiers.ctrl).toBe(true);
      expect(saveShortcut?.modifiers.meta).toBeUndefined();
    });
  });

  describe('Animation Control Shortcuts', () => {
    it('should register spacebar shortcut', () => {
      const togglePlayback = vi.fn();
      registerAnimationControlShortcuts(registry, togglePlayback);

      expect(registry.get('animation-toggle-playback')).toBeDefined();
    });

    it('should call togglePlayback when spacebar pressed', () => {
      const togglePlayback = vi.fn();
      registerAnimationControlShortcuts(registry, togglePlayback);

      registry
        .get('animation-toggle-playback')
        ?.handler(createKeyboardEvent('keydown'));
      expect(togglePlayback).toHaveBeenCalled();
    });

    it('should unregister animation control shortcuts', () => {
      const togglePlayback = vi.fn();
      registerAnimationControlShortcuts(registry, togglePlayback);
      unregisterAnimationControlShortcuts(registry);

      expect(registry.get('animation-toggle-playback')).toBeUndefined();
    });
  });

  describe('Help Overlay Shortcuts', () => {
    it('should register ? key to open help', () => {
      const handlers = { onOpen: vi.fn(), onClose: vi.fn() };
      registerHelpOverlayShortcuts(registry, handlers);

      expect(registry.get('help-open')).toBeDefined();
      expect(registry.get('help-open')?.modifiers.shift).toBe(true);
    });

    it('should register Escape key to close help with allowInModal', () => {
      const handlers = { onOpen: vi.fn(), onClose: vi.fn() };
      registerHelpOverlayShortcuts(registry, handlers);

      const closeShortcut = registry.get('help-close');
      expect(closeShortcut).toBeDefined();
      expect(closeShortcut?.allowInModal).toBe(true);
    });

    it('should call handlers', () => {
      const handlers = { onOpen: vi.fn(), onClose: vi.fn() };
      registerHelpOverlayShortcuts(registry, handlers);

      registry.get('help-open')?.handler(createKeyboardEvent('keydown'));
      expect(handlers.onOpen).toHaveBeenCalled();

      registry.get('help-close')?.handler(createKeyboardEvent('keydown'));
      expect(handlers.onClose).toHaveBeenCalled();
    });

    it('should unregister help overlay shortcuts', () => {
      const handlers = { onOpen: vi.fn(), onClose: vi.fn() };
      registerHelpOverlayShortcuts(registry, handlers);
      unregisterHelpOverlayShortcuts(registry);

      expect(registry.get('help-open')).toBeUndefined();
      expect(registry.get('help-close')).toBeUndefined();
    });
  });
});

// ============================================================================
// Modifier Key Combination Tests
// ============================================================================

describe('Modifier Key Combinations', () => {
  let registry: ReturnType<typeof createShortcutRegistry>;

  beforeEach(() => {
    registry = createShortcutRegistry();
  });

  it('should match Ctrl+S exactly', () => {
    const handler = vi.fn();
    registry.register({
      id: 'ctrl-s',
      code: 'KeyS',
      key: 'S',
      modifiers: { ctrl: true },
      description: 'Ctrl+S',
      handler,
      category: 'edit',
    });

    renderHook(() => useKeyboardShortcuts(registry));

    // Should match Ctrl+S
    act(() => {
      window.dispatchEvent(
        createKeyboardEvent('keydown', { code: 'KeyS', ctrlKey: true })
      );
    });
    expect(handler).toHaveBeenCalledTimes(1);

    // Should not match Ctrl+Shift+S
    act(() => {
      window.dispatchEvent(
        createKeyboardEvent('keydown', {
          code: 'KeyS',
          ctrlKey: true,
          shiftKey: true,
        })
      );
    });
    expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
  });

  it('should match Ctrl+Shift+Z exactly', () => {
    const undoHandler = vi.fn();
    const redoHandler = vi.fn();

    registry.register({
      id: 'undo',
      code: 'KeyZ',
      key: 'Z',
      modifiers: { ctrl: true },
      description: 'Undo',
      handler: undoHandler,
      category: 'edit',
    });

    registry.register({
      id: 'redo',
      code: 'KeyZ',
      key: 'Z',
      modifiers: { ctrl: true, shift: true },
      description: 'Redo',
      handler: redoHandler,
      category: 'edit',
    });

    renderHook(() => useKeyboardShortcuts(registry));

    // Ctrl+Z should call undo
    act(() => {
      window.dispatchEvent(
        createKeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true })
      );
    });
    expect(undoHandler).toHaveBeenCalledTimes(1);
    expect(redoHandler).not.toHaveBeenCalled();

    // Ctrl+Shift+Z should call redo
    act(() => {
      window.dispatchEvent(
        createKeyboardEvent('keydown', {
          code: 'KeyZ',
          ctrlKey: true,
          shiftKey: true,
        })
      );
    });
    expect(redoHandler).toHaveBeenCalledTimes(1);
    expect(undoHandler).toHaveBeenCalledTimes(1); // Still 1
  });

  it('should match Ctrl+Alt+S', () => {
    const handler = vi.fn();
    registry.register({
      id: 'ctrl-alt-s',
      code: 'KeyS',
      key: 'S',
      modifiers: { ctrl: true, alt: true },
      description: 'Ctrl+Alt+S',
      handler,
      category: 'edit',
    });

    renderHook(() => useKeyboardShortcuts(registry));

    act(() => {
      window.dispatchEvent(
        createKeyboardEvent('keydown', {
          code: 'KeyS',
          ctrlKey: true,
          altKey: true,
        })
      );
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  let registry: ReturnType<typeof createShortcutRegistry>;

  beforeEach(() => {
    registry = createShortcutRegistry();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should handle rapid key presses', () => {
    const handler = vi.fn();
    registry.register({
      id: 'test',
      code: 'KeyA',
      key: 'A',
      modifiers: {},
      description: 'Test',
      handler,
      category: 'general',
    });

    renderHook(() => useKeyboardShortcuts(registry));

    // Simulate rapid key presses
    act(() => {
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(
          createKeyboardEvent('keydown', { code: 'KeyA', key: 'a' })
        );
      }
    });

    expect(handler).toHaveBeenCalledTimes(10);
  });

  it('should handle multiple shortcuts registered to same category', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    registry.register({
      id: 'test1',
      code: 'KeyA',
      key: 'A',
      modifiers: {},
      description: 'Test 1',
      handler: handler1,
      category: 'tools',
    });

    registry.register({
      id: 'test2',
      code: 'KeyB',
      key: 'B',
      modifiers: {},
      description: 'Test 2',
      handler: handler2,
      category: 'tools',
    });

    expect(registry.getByCategory('tools')).toHaveLength(2);
  });

  it('should handle empty registry gracefully', () => {
    renderHook(() => useKeyboardShortcuts(registry));

    // Should not throw
    act(() => {
      window.dispatchEvent(
        createKeyboardEvent('keydown', { code: 'KeyA', key: 'a' })
      );
    });
  });

  it('should handle event with null target', () => {
    const handler = vi.fn();
    registry.register({
      id: 'test',
      code: 'KeyA',
      key: 'A',
      modifiers: {},
      description: 'Test',
      handler,
      category: 'general',
    });

    renderHook(() => useKeyboardShortcuts(registry));

    act(() => {
      const event = createKeyboardEvent('keydown', {
        code: 'KeyA',
        key: 'a',
        target: null,
      });
      window.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
