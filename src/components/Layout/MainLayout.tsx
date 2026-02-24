import { Canvas } from '@react-three/fiber';
import { GradientTexture } from '@react-three/drei';
import { BackSide } from 'three';
import { Field } from '../Scene/Field';
import { PlayerManager } from '../Scene/PlayerManager';
import { CameraController } from '../Scene/CameraController';
import { AnnotationLayer } from '../Scene/AnnotationLayer';
import { BallComponent } from '../Scene/Ball';
import { PathManager } from '../Scene/Path';
import { Scoreboard } from '../Scene/Scoreboard';
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
import { useCameraStore } from '../../store/cameraStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAnnotationInteraction } from '../../hooks/useAnnotationInteraction';
import { useCanvasResizeWithWindow } from '../../hooks/useCanvasResize';
import { getSharedPlaybook } from '../../services/sharingService';

/**
 * Stadium sky dome — large inverted sphere with a twilight gradient.
 * Colours run horizon (UV.y=0) → zenith (UV.y=1): warm light horizon,
 * mid stadium blue, dark navy at the top.
 */
function SkyDome() {
  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[800, 32, 16]} />
      <meshBasicMaterial side={BackSide} depthWrite={false}>
        <GradientTexture
          stops={[0, 0.25, 0.55, 1]}
          colors={['#6ba8cc', '#2f6da8', '#143d7a', '#0b1a30']}
          size={512}
        />
      </meshBasicMaterial>
    </mesh>
  );
}
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

  // Canvas resize handling with debounced ResizeObserver
  // React Three Fiber handles the actual resize through its built-in resize observer
  // This hook provides additional debouncing and container measurement for smooth transitions

  const {
    containerRef: canvasContainerRef,
    isReady: containerReady,
  } = useCanvasResizeWithWindow({
    debounceMs: 100,
    minWidth: 320,
    minHeight: 200,
  });

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

    // Check for ?loadShared=<token> query param from shared playbook links
    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get('loadShared');
    if (shareToken) {
      // Remove the param from the URL immediately so it won't reload on refresh
      window.history.replaceState({}, '', window.location.pathname);
      getSharedPlaybook(shareToken).then((shared) => {
        if (!shared) return;
        const data = shared.playbook_data;
        if (data.playerPositions) {
          usePlayerStore.setState({ players: data.playerPositions });
        }
        if (data.cameraPosition) {
          useCameraStore.setState({
            position: data.cameraPosition,
            target: data.cameraTarget,
            zoom: data.cameraZoom,
          });
        }
        if (data.annotations) {
          useAnnotationStore.setState({ annotations: data.annotations });
        }
      });
    }
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
      {/* Canvas container with resize observation */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{
          // Smooth transitions during resize
          transition: 'opacity 0.15s ease-out',
          opacity: containerReady ? 1 : 0,
        }}
      >
        <Canvas
          shadows
          camera={{ position: [0, 100, 150], fov: 50 }}
          gl={{
            antialias: true,
            alpha: false,
            // Performance optimizations
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
          }}
          // Limit device pixel ratio to prevent excessive GPU work on high-DPI screens
          dpr={[1, 2]}
          // Enable adaptive performance - allows R3F to reduce quality during high load
          performance={{ min: 0.5 }}
          style={{
            touchAction: 'none',
            width: '100%',
            height: '100%',
          }}
          // Use resize: 'debounce' for smoother resize handling
          resize={{ debounce: { scroll: 50, resize: 100 } }}
          onCreated={({ gl }) => {
            canvasRef.current = gl.domElement;
            setCanvasReady(true);
          }}
        >
          <SkyDome />
          <Field />
          <PlayerManager />
          {ball && <BallComponent ball={ball} />}
          <PathManager paths={paths} />
          <CameraController />
          <Scoreboard />
          <AnnotationLayer />

          {/* FIX: moved inside Canvas so R3F hooks work */}
          <AnnotationInteractionHandler />
        </Canvas>
      </div>

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