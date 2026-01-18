import { Canvas } from '@react-three/fiber';
import { Field } from '../Scene/Field';
import { PlayerManager } from '../Scene/PlayerManager';
import { CameraController } from '../Scene/CameraController';
import { AnnotationLayer } from '../Scene/AnnotationLayer';
import { Toolbar } from '../UI/Toolbar';
import { PlaybookPanel } from '../UI/PlaybookPanel';
import { AnnotationToolbar } from '../UI/AnnotationToolbar';
import { HelpOverlay } from '../UI/HelpOverlay';
import { usePlayerStore } from '../../store/playerStore';
import { useKeyboardStore } from '../../store/keyboardStore';
import { useEffect, useRef } from 'react';
import { useAnnotationInteraction } from '../../hooks/useAnnotationInteraction';
import {
  useKeyboardShortcuts,
  useCameraPresetShortcuts,
  useToolSelectionShortcuts,
  useEditOperationShortcuts,
  useAnimationControlShortcuts,
  getGlobalShortcutRegistry,
} from '../../hooks/useKeyboardShortcuts';


export function MainLayout() {
  const initializePlayers = usePlayerStore((state) => state.initializePlayers);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);


  useEffect(() => {
    initializePlayers();
  }, [initializePlayers]);


  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{ position: [0, 100, 150], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement;
        }}
      >
        <Field />
        <PlayerManager />
        <CameraController />
        <AnnotationLayer />


        {/* FIX: moved inside Canvas so R3F hooks work */}
        <AnnotationInteractionHandler />
      </Canvas>


      {/* All DOM-layer UI stays outside */}
      <Toolbar canvas={canvasRef.current} />
      <PlaybookPanel />
      <AnnotationToolbar />
      <HelpOverlay />

      {/* Global keyboard shortcuts handler */}
      <KeyboardShortcutsHandler />
    </div>
  );
}


// Component to handle annotation interactions
function AnnotationInteractionHandler() {
  useAnnotationInteraction();
  return null;
}


/**
 * Component that handles all keyboard shortcuts at the root level.
 * This ensures all shortcuts work from any part of the application
 * and avoids duplicate event listeners.
 *
 * Shortcuts registered:
 * - Camera presets: 1-4 for quick view switching
 * - Tool selection: S (select), L (line), A (arrow), C (circle), R (rectangle), T (text)
 * - Edit operations: Ctrl+Z (undo), Ctrl+Shift+Z/Ctrl+Y (redo)
 * - Animation: Spacebar (play/pause)
 * - Help: ? (open), Esc (close) - handled by HelpOverlay component
 *
 * Shortcuts are automatically disabled when:
 * - Modals/dialogs are open (save dialog, help overlay)
 * - User has explicitly disabled shortcuts
 *
 * Note: Ctrl+S (save) handler is wired up via keyboardStore in a separate integration
 */
function KeyboardShortcutsHandler() {
  // Get active state from keyboard store
  // areShortcutsActive() checks: shortcutsEnabled && openModalCount === 0 && !helpOverlayOpen
  const areShortcutsActive = useKeyboardStore((state) => state.areShortcutsActive());

  // Get the global shortcut registry
  const registry = getGlobalShortcutRegistry();

  // Register camera preset shortcuts (keys 1-4)
  useCameraPresetShortcuts(registry);

  // Register tool selection shortcuts (S, L, A, C, R, T)
  useToolSelectionShortcuts(registry);

  // Register edit operation shortcuts (undo/redo)
  // Note: onSave handler will be wired up via keyboardStore integration
  useEditOperationShortcuts({}, registry);

  // Register animation control shortcuts (spacebar)
  useAnimationControlShortcuts(registry);

  // Activate the core keyboard shortcuts handler
  // Disabled when modals are open or shortcuts globally disabled
  useKeyboardShortcuts(registry, { enabled: areShortcutsActive });

  return null;
}
