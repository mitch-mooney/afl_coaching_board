import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  getGlobalShortcutRegistry,
  isMac,
  useHelpOverlayShortcuts,
} from '../../hooks/useKeyboardShortcuts';
import type { ShortcutGroup, ShortcutDisplayInfo } from '../../types/shortcuts';

/**
 * Selector for all focusable elements within a container
 */
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Gets all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(elements);
}

/**
 * Custom hook for trapping focus within a container element.
 * Handles Tab/Shift+Tab key navigation to cycle through focusable elements.
 */
function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) {
      return;
    }

    const container = containerRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      // Shift+Tab from first element goes to last
      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      // Tab from last element goes to first
      else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
      // If focus is outside the container, move it inside
      else if (!container.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}

/**
 * Custom hook to manage focus when a dialog opens and closes.
 * - Stores the previously focused element
 * - Focuses the first focusable element in the container on open
 * - Restores focus to the previous element on close
 */
function useFocusManagement(
  containerRef: React.RefObject<HTMLElement | null>,
  closeButtonRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean
) {
  // Store the element that was focused before the dialog opened
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element before dialog opens
      previouslyFocusedRef.current = document.activeElement as HTMLElement;

      // Focus the close button (or first focusable element) when dialog opens
      // Use requestAnimationFrame to ensure the DOM is fully rendered
      requestAnimationFrame(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        } else if (containerRef.current) {
          const focusableElements = getFocusableElements(containerRef.current);
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          }
        }
      });
    } else {
      // Restore focus to the previously focused element when dialog closes
      if (previouslyFocusedRef.current && previouslyFocusedRef.current.focus) {
        previouslyFocusedRef.current.focus();
        previouslyFocusedRef.current = null;
      }
    }
  }, [isOpen, containerRef, closeButtonRef]);
}

/**
 * Renders a single key badge with visual styling
 */
function KeyBadge({ keyText }: { keyText: string }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 mx-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono font-medium text-gray-700 shadow-sm">
      {keyText}
    </span>
  );
}

/**
 * Parses a formatted key string and renders it as visual key badges.
 * Handles both Mac (no separator, uses symbols) and Windows (+ separator) formats.
 */
function ShortcutKeyDisplay({ keys }: { keys: string }) {
  const onMac = isMac();

  // Mac uses symbols without separator, Windows uses + separator
  const keyParts = useMemo(() => {
    if (onMac) {
      // Mac format: symbols like ⌘⇧Z or single keys like S
      // Split by known modifier symbols while keeping them
      const parts: string[] = [];
      let remaining = keys;
      const modifiers = ['⌘', '⌥', '⇧', '⌃'];

      for (const mod of modifiers) {
        if (remaining.startsWith(mod)) {
          parts.push(mod);
          remaining = remaining.slice(mod.length);
        }
      }

      if (remaining) {
        parts.push(remaining);
      }

      return parts;
    } else {
      // Windows format: Ctrl+Shift+Z
      return keys.split('+').map(k => k.trim());
    }
  }, [keys, onMac]);

  return (
    <span className="inline-flex items-center">
      {keyParts.map((part, index) => (
        <KeyBadge key={index} keyText={part} />
      ))}
    </span>
  );
}

/**
 * Renders a single shortcut row with key badge(s) and description
 */
function ShortcutRow({ shortcut }: { shortcut: ShortcutDisplayInfo }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
      <span className="text-gray-600 mr-4">{shortcut.description}</span>
      <ShortcutKeyDisplay keys={shortcut.keys} />
    </div>
  );
}

/**
 * Renders a category section with all its shortcuts
 */
function ShortcutCategorySection({ group }: { group: ShortcutGroup }) {
  if (group.shortcuts.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 last:mb-0">
      <h4 className="font-medium text-gray-800 mb-2 pb-1 border-b border-gray-200">
        {group.label}
      </h4>
      <div className="space-y-0.5">
        {group.shortcuts.map((shortcut, index) => (
          <ShortcutRow key={`${group.category}-${index}`} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

/**
 * Main keyboard shortcuts section for the help overlay
 */
function KeyboardShortcutsSection() {
  const groups = useMemo(() => {
    const registry = getGlobalShortcutRegistry();
    return registry.getGroupedShortcuts();
  }, []);

  const onMac = isMac();

  if (groups.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="font-semibold text-lg mb-3">Keyboard Shortcuts</h3>
      <div className="text-xs text-gray-500 mb-3">
        {onMac ? 'Using Mac shortcuts (⌘ = Command)' : 'Using Windows/Linux shortcuts'}
      </div>
      <div className="bg-gray-50 rounded-lg p-4">
        {groups.map((group) => (
          <ShortcutCategorySection key={group.category} group={group} />
        ))}
      </div>
    </section>
  );
}

export function HelpOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  // Refs for focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Register keyboard shortcuts for opening (?) and closing (Esc) help
  useHelpOverlayShortcuts(isOpen, setIsOpen);

  // Trap focus within the dialog when open
  useFocusTrap(dialogRef, isOpen);

  // Manage focus when dialog opens/closes
  useFocusManagement(dialogRef, closeButtonRef, isOpen);

  // Handle click on backdrop (outside the dialog content) to close
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Only close if clicking directly on the backdrop, not the content
      if (event.target === event.currentTarget) {
        setIsOpen(false);
      }
    },
    []
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 right-4 z-10 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition text-sm"
        title="Press ? for keyboard shortcuts"
        aria-haspopup="dialog"
      >
        ❓ Help
      </button>
    );
  }

  return (
    <div
      className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-overlay-title"
        aria-describedby="help-overlay-description"
        className="bg-white rounded-lg shadow-xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto"
        tabIndex={-1}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 id="help-overlay-title" className="text-2xl font-bold">Help & Instructions</h2>
          <button
            ref={closeButtonRef}
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none px-2 py-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close help dialog"
            title="Press Esc to close"
            type="button"
          >
            ×
          </button>
        </div>
        <p id="help-overlay-description" className="sr-only">
          Help dialog with keyboard shortcuts and instructions for using the AFL Coaching Board application.
        </p>

        <div className="space-y-4 text-sm">
          <KeyboardShortcutsSection />

          <section>
            <h3 className="font-semibold text-lg mb-2">Camera Controls</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Rotate:</strong> Left-click and drag</li>
              <li><strong>Zoom:</strong> Scroll wheel or pinch gesture</li>
              <li><strong>Pan:</strong> Right-click and drag (or middle mouse button)</li>
              <li><strong>Preset Views:</strong> Use toolbar buttons for quick camera positions</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Player Controls</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Select Player:</strong> Click on a player</li>
              <li><strong>Move Player:</strong> Click and drag a player to reposition</li>
              <li><strong>Reset Players:</strong> Use "Reset Players" button in toolbar</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Video Recording</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Click "Start Recording" to begin capturing</li>
              <li>Click "Stop Recording" to finish and download the video</li>
              <li>Videos are exported as WebM format</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Playbooks</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Save your current scenario with "Save Playbook"</li>
              <li>Load saved scenarios from the Playbooks panel</li>
              <li>Playbooks are stored locally in your browser</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-2">Annotations</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Select an annotation tool from the bottom toolbar</li>
              <li>Click and drag on the field to draw</li>
              <li>Change colors and thickness using the toolbar</li>
              <li>Clear all annotations with the "Clear" button</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
