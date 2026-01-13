import { useState, useMemo, useCallback } from 'react';
import {
  getGlobalShortcutRegistry,
  isMac,
  useHelpOverlayShortcuts,
} from '../../hooks/useKeyboardShortcuts';
import type { ShortcutGroup, ShortcutDisplayInfo } from '../../types/shortcuts';

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

  // Register keyboard shortcuts for opening (?) and closing (Esc) help
  useHelpOverlayShortcuts(isOpen, setIsOpen);

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
      >
        ❓ Help
      </button>
    );
  }

  return (
    <div
      className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-overlay-title"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 id="help-overlay-title" className="text-2xl font-bold">Help & Instructions</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Close help"
            title="Press Esc to close"
          >
            ×
          </button>
        </div>

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
