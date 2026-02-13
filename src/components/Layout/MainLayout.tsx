import { Canvas } from '@react-three/fiber';
import { Field } from '../Scene/Field';
import { PlayerManager } from '../Scene/PlayerManager';
import { CameraController } from '../Scene/CameraController';
import { AnnotationLayer } from '../Scene/AnnotationLayer';
import { BallComponent } from '../Scene/Ball';
import { PathManager } from '../Scene/Path';
import { Toolbar } from '../UI/Toolbar';
import { PlaybookPanel } from '../UI/PlaybookPanel';
import { AnnotationToolbar } from '../UI/AnnotationToolbar';
import { HelpOverlay } from '../UI/HelpOverlay';
import { EventTimeline } from '../UI/EventTimeline';
import { VideoWorkspace } from '../VideoImport/VideoWorkspace';
import { VideoPiP } from '../VideoImport/VideoPiP';
import { usePlayerStore } from '../../store/playerStore';
import { useBallStore } from '../../store/ballStore';
import { usePathStore } from '../../store/pathStore';
import { useVideoStore } from '../../store/videoStore';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAnnotationInteraction } from '../../hooks/useAnnotationInteraction';
import {
  useKeyboardShortcuts,
  useCameraPresetShortcuts,
  useToolSelectionShortcuts,
  useAnimationControlShortcuts,
  useHelpOverlayShortcuts,
  useEditOperationShortcuts,
  getGlobalShortcutRegistry,
} from '../../hooks/useKeyboardShortcuts';


export function MainLayout() {
  const initializePlayers = usePlayerStore((state) => state.initializePlayers);
  const initializeBall = useBallStore((state) => state.initializeBall);
  const ball = useBallStore((state) => state.ball);
  const paths = usePathStore((state) => state.paths);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Video mode state from video store
  const isVideoMode = useVideoStore((state) => state.isVideoMode);
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const displayMode = useVideoStore((state) => state.displayMode);

  // Determine if we should show video workspace (full calibration mode)
  const showVideoWorkspace = isVideoMode && isLoaded && displayMode === 'calibration';
  // Determine if we should show PiP (picture-in-picture mode)
  const showVideoPiP = isVideoMode && isLoaded && displayMode === 'pip';

  // Initialize keyboard shortcuts
  const registry = getGlobalShortcutRegistry();
  useKeyboardShortcuts(registry);
  useCameraPresetShortcuts(registry);
  useToolSelectionShortcuts(registry);
  useAnimationControlShortcuts(registry);
  useHelpOverlayShortcuts(helpOpen, setHelpOpen, registry);
  useEditOperationShortcuts({}, registry);

  useEffect(() => {
    initializePlayers();
    initializeBall();
  }, [initializePlayers, initializeBall]);

  // Touch event prevention handler for canvas - prevents browser gestures like pinch-to-zoom
  const preventTouchDefault = useCallback((e: TouchEvent) => {
    // Prevent browser pinch-to-zoom and scroll on canvas
    if (e.touches.length >= 1) {
      e.preventDefault();
    }
  }, []);

  // Setup and cleanup touch event listeners on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasReady) return;

    // Use passive: false to allow preventDefault()
    canvas.addEventListener('touchmove', preventTouchDefault, { passive: false });
    canvas.addEventListener('touchstart', preventTouchDefault, { passive: false });

    return () => {
      canvas.removeEventListener('touchmove', preventTouchDefault);
      canvas.removeEventListener('touchstart', preventTouchDefault);
    };
  }, [preventTouchDefault, canvasReady]);

  // When in video mode, render VideoWorkspace as full-screen experience
  if (showVideoWorkspace) {
    return (
      <div className="w-full h-full min-h-screen max-w-full overflow-hidden relative">
        <VideoWorkspace showFieldOverlay={true} />
      </div>
    );
  }

  // Normal field view (with optional PiP overlay)
  return (
    <div className="w-full h-full min-h-screen max-w-full overflow-hidden relative">
      <Canvas
        shadows
        camera={{ position: [0, 100, 150], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ touchAction: 'none' }}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement;
          setCanvasReady(true);
        }}
      >
        <Field />
        <PlayerManager />
        {ball && <BallComponent ball={ball} />}
        <PathManager paths={paths} />
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

      {/* Event Timeline (renders when event is active) */}
      <EventTimeline />

      {/* Video PiP overlay when in pip mode */}
      {showVideoPiP && <VideoPiP />}
    </div>
  );
}


// Component to handle annotation interactions
function AnnotationInteractionHandler() {
  useAnnotationInteraction();
  return null;
}