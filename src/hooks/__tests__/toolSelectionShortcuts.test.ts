/**
 * Tip-selection shortcuts, tested at the shortcut-registry seam.
 *
 * The registry is a plain object, so a test can register the real handlers
 * against a fresh registry, hand it a synthetic KeyboardEvent, and assert on the
 * pen store — no React rendering involved. See
 * `keyboardShortcuts.suppression.test.ts` for the same seam-level approach.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createShortcutRegistry,
  registerToolSelectionShortcuts,
  unregisterToolSelectionShortcuts,
  selectTip,
  isTypingInInput,
} from '../useKeyboardShortcuts';
import type { ShortcutRegistry } from '../../types/shortcuts';
import type { PenTip } from '../../utils/inputContract';
import { usePenStore } from '../../store/penStore';

/** Presses a bare key (no modifiers) against the registry, as the hook would. */
function press(registry: ShortcutRegistry, code: string): void {
  const event = new KeyboardEvent('keydown', { code });
  const match = registry.findMatch(event);
  expect(match, `no shortcut registered for ${code}`).toBeDefined();
  match!.handler(event);
}

describe('tip-selection shortcuts', () => {
  let registry: ShortcutRegistry;

  beforeEach(() => {
    usePenStore.setState({ armedTip: null });
    registry = createShortcutRegistry();
    registerToolSelectionShortcuts(registry, selectTip);
  });

  describe('the Path tip', () => {
    it('is armed by its key', () => {
      press(registry, 'KeyP');

      expect(usePenStore.getState().armedTip).toBe('path');
    });

    it('stays armed when its key is pressed twice', () => {
      press(registry, 'KeyP');
      press(registry, 'KeyP');

      expect(usePenStore.getState().armedTip).toBe('path');
    });

    it('is disarmed by the disarm shortcut', () => {
      press(registry, 'KeyP');
      press(registry, 'KeyS');

      expect(usePenStore.getState().armedTip).toBeNull();
    });

    it('replaces an armed Annotation tip', () => {
      press(registry, 'KeyL');
      press(registry, 'KeyP');

      expect(usePenStore.getState().armedTip).toBe('path');
    });

    it('is replaced by an Annotation tip', () => {
      press(registry, 'KeyP');
      press(registry, 'KeyC');

      expect(usePenStore.getState().armedTip).toBe('circle');
    });

    it('does not collide with any other registered shortcut', () => {
      const pathShortcuts = registry.shortcuts.filter((s) => s.code === 'KeyP');

      expect(pathShortcuts).toHaveLength(1);
    });
  });

  describe('the Annotation tips', () => {
    const annotationTips: Array<[code: string, tip: PenTip]> = [
      ['KeyL', 'line'],
      ['KeyA', 'arrow'],
      ['KeyC', 'circle'],
      ['KeyR', 'rectangle'],
      ['KeyT', 'text'],
    ];

    it.each(annotationTips)('%s arms the %s tip', (code, tip) => {
      press(registry, code);

      expect(usePenStore.getState().armedTip).toBe(tip);
    });

    it.each(annotationTips)('%s stays armed when pressed twice', (code, tip) => {
      press(registry, code);
      press(registry, code);

      expect(usePenStore.getState().armedTip).toBe(tip);
    });

    it.each(annotationTips)('%s is disarmed by the disarm shortcut', (code) => {
      press(registry, code);
      press(registry, 'KeyS');

      expect(usePenStore.getState().armedTip).toBeNull();
    });
  });

  describe('registration', () => {
    it('unregisters every tip shortcut, Path included', () => {
      unregisterToolSelectionShortcuts(registry);

      expect(registry.shortcuts).toHaveLength(0);
    });

    it('files every tip shortcut under the tools category', () => {
      expect(registry.getByCategory('tools')).toHaveLength(registry.shortcuts.length);
    });
  });

  describe('suppression while typing', () => {
    // The hook skips shortcut dispatch entirely when `isTypingInInput` is true,
    // so a coach naming a Play never arms a tip.
    it.each(['input', 'textarea', 'select'])('suppresses tips inside a <%s>', (tagName) => {
      const element = document.createElement(tagName);

      expect(isTypingInInput(element)).toBe(true);
    });

    it('suppresses tips inside a contentEditable element', () => {
      const element = document.createElement('div');
      element.contentEditable = 'true';
      // jsdom does not derive isContentEditable from the attribute.
      Object.defineProperty(element, 'isContentEditable', { value: true });

      expect(isTypingInInput(element)).toBe(true);
    });

    it('does not suppress tips on the board canvas', () => {
      expect(isTypingInInput(document.createElement('canvas'))).toBe(false);
    });
  });
});
