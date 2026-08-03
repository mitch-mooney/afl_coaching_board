import { Canvas } from '@react-three/fiber';
import { EditorTopBar } from './EditorTopBar';
import { LinkedVideoBar } from './LinkedVideoBar';
import { Field } from '../Scene/Field';
import { PlayerManager } from '../Scene/PlayerManager';
import { CameraController } from '../Scene/CameraController';
import { AnnotationLayer } from '../Scene/AnnotationLayer';
import { BallComponent } from '../Scene/Ball';
import { PathManager } from '../Scene/Path';
import { Scoreboard } from '../Scene/Scoreboard';
import { SkyDome } from '../Scene/SkyDome';
import { GlobalDrawer } from '../UI/GlobalDrawer';
import { BoardHud } from '../Board/hud/BoardHud';
// PROTOTYPE — THROWAWAY. Render nothing without `?variant=`. Delete with the branch.
import { GroundChipBoardSlot } from '../Board/hud/prototype/GroundChipPrototype';
import { GroundChipSwitcher } from '../Board/hud/prototype/GroundChipSwitcher';
import { FeatureNotification } from '../UI/FeatureNotification';
import { HelpScreen } from '../UI/HelpScreen';
import { OnboardingTour } from '../UI/OnboardingTour';
import { VideoWorkspace } from '../VideoImport/VideoWorkspace';
import { VideoPiP } from '../VideoImport/VideoPiP';
import { TrainingMode } from '../TrainingMode/TrainingMode';
import { ConeManager } from '../Scene/ConeManager';
import { useVideoStore } from '../../store/videoStore';
import { useModeStore } from '../../store/modeStore';
import { useConeStore } from '../../store/coneStore';
import { usePlayerStore } from '../../store/playerStore';
import { useBallStore } from '../../store/ballStore';
import { usePathStore } from '../../store/pathStore';
import { useUIStore } from '../../store/uiStore';
import { usePlayStore } from '../../store/playStore';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStrokeAuthoring } from '../../hooks/useStrokeAuthoring';
import { useCanvasResizeWithWindow } from '../../hooks/useCanvasResize';
import { useBoardUndo } from '../../hooks/useBoardUndo';
import { getSharedPlaybook } from '../../services/sharingService';
import { fromShareData } from '../../utils/boardSnapshot';
import { restore } from '../../utils/boardSnapshotIO';
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

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editorTab = useUIStore((s) => s.editorTab);
  const setEditorTab = useUIStore((s) => s.setEditorTab);
  const isMenuOpen = useUIStore((s) => s.isMenuOpen);
  const toggleMenu = useUIStore((s) => s.toggleMenu);
  const { setActivePlay, activePlayId, updatePlay } = usePlayStore();
  const { mode, switchMode } = useModeStore();
  const { isConePlacementActive, setConePlacementActive } = useConeStore();

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
  const savedVideos = useVideoStore((s) => s.savedVideos);
  const loadSavedVideos = useVideoStore((s) => s.loadSavedVideos);

  // Play data for linked video moment
  const plays = usePlayStore((s) => s.plays);
  const activePlay = plays.find((s) => s.id === activePlayId) ?? null;
  const linkedVideoMoment = activePlay?.linkedVideoMoment;
  const linkedVideoAvailable = linkedVideoMoment
    ? savedVideos.some((v) => v.id === linkedVideoMoment.videoId)
    : null;

  // Determine if we should show PiP (picture-in-picture video review)
  // PiP overlays the board tab; the Video tab shows the full workspace instead.
  const showVideoPiP = isVideoMode && isLoaded && editorTab === 'board';

  // Initialize keyboard shortcuts
  const registry = getGlobalShortcutRegistry();
  useKeyboardShortcuts(registry);
  useCameraPresetShortcuts(registry);
  useToolSelectionShortcuts(registry);
  useAnimationControlShortcuts(registry);
  useHelpOverlayShortcuts(helpOpen, setHelpOpen, registry);
  const { handleUndo: handleKeyboardUndo } = useBoardUndo();
  useEditOperationShortcuts({ onUndo: handleKeyboardUndo }, registry);

  // Autosave the active Play on unmount. saveActiveBoard captures the live board
  // through the playStore gateway, so no ref of stale selector values is needed.
  useEffect(() => {
    return () => {
      const { activePlayId, saveActiveBoard } = usePlayStore.getState();
      if (!activePlayId) return;
      saveActiveBoard(activePlayId);
    };
  }, []); // empty array = runs cleanup on unmount only

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    setActivePlay(numId);
    usePlayStore.getState().loadPlayBoard(numId);
    return () => setActivePlay(null);
  }, [id, setActivePlay]);

  useEffect(() => {
    initializePlayers();
    initializeBall();
    loadSavedVideos();
    // Venues are seeded and the Active Venue resolved in App, above the router —
    // the play list draws grounds too, and one bootstrap is one place to forget.

    // Check for ?loadShared=<token> query param from shared playbook links
    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get('loadShared');
    if (shareToken) {
      // Remove the param from the URL immediately so it won't reload on refresh
      window.history.replaceState({}, '', window.location.pathname);
      getSharedPlaybook(shareToken).then((shared) => {
        if (!shared) return;
        // Board content only. The link's own ground is deliberately not read
        // here: *viewing* a shared play renders on the sender's ground, but
        // *restoring* one into your board keeps your Active Venue, because a
        // link must never reconfigure app-wide state. If it then doesn't fit,
        // the Venue panel says so — the same thing the coach learns about their
        // own plays. See ADR 0002, "Sharing".
        restore(fromShareData(shared.playbook_data));
      });
    }
  }, [initializePlayers, initializeBall, loadSavedVideos]);

  // Touch event prevention handler for canvas - prevents browser gestures like pinch-to-zoom
  const preventTouchDefault = useCallback((e: TouchEvent) => {
    // Prevent browser pinch-to-zoom and scroll on canvas
    if (e.touches.length >= 1) {
      e.preventDefault();
    }
  }, []);

  // Handle unlinking video from play
  const handleUnlink = useCallback(() => {
    if (!window.confirm('Remove video link?')) return;
    updatePlay(activePlayId!, { linkedVideoMoment: undefined });
  }, [activePlayId, updatePlay]);

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


  // Normal field view (with optional PiP overlay)
  return (
    <div className="w-full h-full min-h-screen max-w-full overflow-hidden relative">
      {/* Top bar */}
      <EditorTopBar
        editorTab={editorTab}
        mode={mode}
        isConePlacementActive={isConePlacementActive}
        isMenuOpen={isMenuOpen}
        onToggleMenu={toggleMenu}
        onBack={() => navigate('/')}
        onSelectTab={(tab) => {
          setEditorTab(tab);
          if (tab === 'training') switchMode('training');
          else if (mode === 'training') switchMode('match');
        }}
        onExitConePlacement={() => { setConePlacementActive(false); setEditorTab('training'); }}
      />

      {/* Linked video chip bar — shown on Board tab when a video moment is linked */}
      {editorTab === 'board' && linkedVideoMoment && (
        <LinkedVideoBar
          moment={linkedVideoMoment}
          available={!!linkedVideoAvailable}
          onPreview={() => setEditorTab('video')}
          onUnlink={handleUnlink}
        />
      )}

      {/* Canvas container with resize observation */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{
          display: editorTab === 'board' ? undefined : 'none',
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
            <fog attach="fog" args={['#06090f', 350, 950]} />
            <SkyDome />
            <Field />
            <PlayerManager />
            {ball && <BallComponent ball={ball} />}
            <PathManager paths={paths} />
            <CameraController />
            <Scoreboard />
            <AnnotationLayer />
            <ConeManager />

            {/* FIX: moved inside Canvas so R3F hooks work */}
            <AnnotationInteractionHandler />
          </Canvas>

          {/* Link Video Moment button — visible when play is active and no video is linked */}
          {activePlayId !== null && !linkedVideoMoment && (
            <button
              onClick={() => setEditorTab('video')}
              style={{
                position: 'absolute',
                bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                padding: '8px 20px',
                borderRadius: 10,
                border: '1.5px dashed #00d4aa',
                background: '#13132a',
                color: '#00d4aa',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                letterSpacing: '0.03em',
              }}
            >
              🎬 Link Video Moment
            </button>
          )}
        </div>

      {editorTab === 'video' && (
        <div className="absolute inset-0 z-10">
          <VideoWorkspace />
          <button
            onClick={() => setEditorTab('board')}
            className="absolute top-4 right-4 z-50 px-4 py-2 rounded-lg
                       bg-amber-500 text-black font-semibold hover:bg-amber-400 text-sm"
          >
            Take to Board →
          </button>
        </div>
      )}

      {editorTab === 'training' && (
        <div className="absolute inset-0 z-10">
          <TrainingMode />
        </div>
      )}

      {/* All DOM-layer UI stays outside */}
      <GlobalDrawer />
      {editorTab === 'board' && <BoardHud />}
      {/* PROTOTYPE — THROWAWAY. Ground-chip variants B and C, plus the variant
          switcher. Render nothing without `?variant=`. Delete with the branch. */}
      {editorTab === 'board' && <GroundChipBoardSlot />}
      {editorTab === 'board' && <GroundChipSwitcher />}
      <OnboardingTour />
      {helpOpen && <HelpScreen onClose={() => setHelpOpen(false)} />}

      {/* Video PiP overlay when in pip mode */}
      {showVideoPiP && <VideoPiP />}

      {/* Feature notification popup */}
      <FeatureNotification />
    </div>
  );
}


// Component to handle annotation interactions
function AnnotationInteractionHandler() {
  useStrokeAuthoring();
  return null;
}