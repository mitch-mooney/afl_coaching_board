import { Canvas } from '@react-three/fiber';
import { BackSide, CanvasTexture } from 'three';
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
import { CameraDock } from '../UI/CameraDock';
import { LabelToggle } from '../UI/LabelToggle';
import { FormationPresetBar } from '../UI/FormationPresetBar';
import { HelpScreen } from '../UI/HelpScreen';
import { OnboardingTour } from '../UI/OnboardingTour';
import { EventTimeline } from '../UI/EventTimeline';
import { VideoWorkspace } from '../VideoImport/VideoWorkspace';
import { VideoPiP } from '../VideoImport/VideoPiP';
import { usePlayerStore } from '../../store/playerStore';
import { useBallStore } from '../../store/ballStore';
import { usePathStore } from '../../store/pathStore';
import { useVideoStore } from '../../store/videoStore';
import { useAnimationStore } from '../../store/animationStore';
import { useCameraStore } from '../../store/cameraStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { useUIStore } from '../../store/uiStore';
import { useScenarioStore, scenarioTable } from '../../store/scenarioStore';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAnnotationInteraction } from '../../hooks/useAnnotationInteraction';
import { useCanvasResizeWithWindow } from '../../hooks/useCanvasResize';
import { getSharedPlaybook } from '../../services/sharingService';
import {
  useKeyboardShortcuts,
  useCameraPresetShortcuts,
  useToolSelectionShortcuts,
  useAnimationControlShortcuts,
  useHelpOverlayShortcuts,
  useEditOperationShortcuts,
  getGlobalShortcutRegistry,
} from '../../hooks/useKeyboardShortcuts';

function formatVideoTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Generates a pixelated AFL stadium crowd texture onto a canvas.
 * The texture wraps the interior of the sky-sphere: the equatorial band
 * (UV v ≈ 0.35–0.65) becomes the crowd stands; above is a floodlit night sky.
 */
function generateCrowdTexture(): HTMLCanvasElement {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Night sky (upper 40% of texture = v > 0.6 on the sphere) ──────────────
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.42);
  skyGrad.addColorStop(0, '#01020a');
  skyGrad.addColorStop(0.6, '#04060f');
  skyGrad.addColorStop(1, '#080e1c');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H * 0.42);

  // Floodlight glow blobs (4 lights evenly spaced around the dome)
  const lightPositions = [0.12, 0.38, 0.62, 0.88];
  for (const lx of lightPositions) {
    const x = lx * W, y = H * 0.06;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 90);
    grad.addColorStop(0, 'rgba(255,252,240,1.0)');
    grad.addColorStop(0.05, 'rgba(255,240,180,0.9)');
    grad.addColorStop(0.2, 'rgba(200,170,80,0.3)');
    grad.addColorStop(1, 'rgba(50,80,150,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, 40, 55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Lower dome — smooth dark gradient (stadium stands are 3D geometry now) ──
  const lowerGrad = ctx.createLinearGradient(0, H * 0.38, 0, H);
  lowerGrad.addColorStop(0, '#080e1c');
  lowerGrad.addColorStop(0.4, '#04060a');
  lowerGrad.addColorStop(1, '#010204');
  ctx.fillStyle = lowerGrad;
  ctx.fillRect(0, H * 0.38, W, H * 0.62);

  return canvas;
}

/**
 * Stadium sky dome — large inverted sphere with a pixelated crowd texture.
 * Wraps a procedurally-generated canvas texture around the scene.
 */
function SkyDome() {
  const texture = useMemo(() => {
    const canvas = generateCrowdTexture();
    return new CanvasTexture(canvas);
  }, []);

  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[800, 48, 24]} />
      <meshBasicMaterial map={texture} side={BackSide} depthWrite={false} />
    </mesh>
  );
}


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
  const boardSubMode = useUIStore((s) => s.boardSubMode);
  const toggleBoardSubMode = useUIStore((s) => s.toggleBoardSubMode);
  const isPlaybookOpen = useUIStore((s) => s.isPlaybookOpen);
  const togglePlaybook = useUIStore((s) => s.togglePlaybook);
  const { setActiveScenario, activeScenarioId, updateScenario } = useScenarioStore();
  const players = usePlayerStore((s) => s.players);
  const annotations = useAnnotationStore((s) => s.annotations);
  const camera = useCameraStore((s) => ({
    position: s.position as [number, number, number],
    target: s.target as [number, number, number],
    zoom: s.zoom,
  }));

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
  const videoIsPlaying = useVideoStore((state) => state.isPlaying);
  const isSyncedWithAnimation = useVideoStore((state) => state.isSyncedWithAnimation);
  const savedVideos = useVideoStore((s) => s.savedVideos);
  const loadSavedVideos = useVideoStore((s) => s.loadSavedVideos);

  // Scenario data for linked video moment
  const scenarios = useScenarioStore((s) => s.scenarios);
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) ?? null;
  const linkedVideoMoment = activeScenario?.linkedVideoMoment;
  const linkedVideoAvailable = linkedVideoMoment
    ? savedVideos.some((v) => v.id === linkedVideoMoment.videoId)
    : null;

  // Animation store for concert mode
  const animationPlay = useAnimationStore((state) => state.play);
  const animationPause = useAnimationStore((state) => state.pause);
  const animationIsPlaying = useAnimationStore((state) => state.isPlaying);

  // Concert mode: sync video play/pause → animation
  const concertSyncRef = useRef(false);
  useEffect(() => {
    if (!isSyncedWithAnimation) return;
    // Avoid re-entrant syncing
    if (concertSyncRef.current) return;
    concertSyncRef.current = true;
    if (videoIsPlaying && !animationIsPlaying) {
      animationPlay();
    } else if (!videoIsPlaying && animationIsPlaying) {
      animationPause();
    }
    concertSyncRef.current = false;
  }, [videoIsPlaying, isSyncedWithAnimation, animationIsPlaying, animationPlay, animationPause]);

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

  const savePayloadRef = useRef({ activeScenarioId, players, paths, annotations, camera, updateScenario });

  useEffect(() => {
    savePayloadRef.current = { activeScenarioId, players, paths, annotations, camera, updateScenario };
  });

  useEffect(() => {
    return () => {
      const { activeScenarioId, players, paths, annotations, camera, updateScenario } = savePayloadRef.current;
      if (!activeScenarioId) return;
      updateScenario(activeScenarioId, {
        phases: [{
          id: 'phase-1',
          label: 'Phase 1',
          playerPositions: players,
          paths,
          annotations: annotations as unknown[],
          cameraState: camera,
        }],
      });
    };
  }, []); // empty array = runs cleanup on unmount only

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    setActiveScenario(numId);
    scenarioTable.get(numId).then((scenario) => {
      if (!scenario) return;
      const phase = scenario.phases[0];
      if (!phase) return;
      if (phase.playerPositions?.length) {
        usePlayerStore.setState({ players: phase.playerPositions });
      }
      if (phase.paths?.length) {
        usePathStore.setState({ paths: phase.paths });
      }
      if (phase.annotations?.length) {
        useAnnotationStore.setState({ annotations: phase.annotations as any });
      }
      if (phase.cameraState) {
        useCameraStore.setState({
          position: phase.cameraState.position,
          target: phase.cameraState.target,
          zoom: phase.cameraState.zoom,
        });
      }
    });
    return () => setActiveScenario(null);
  }, [id, setActiveScenario]);

  useEffect(() => {
    initializePlayers();
    initializeBall();
    loadSavedVideos();

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
  }, [initializePlayers, initializeBall, loadSavedVideos]);

  // Touch event prevention handler for canvas - prevents browser gestures like pinch-to-zoom
  const preventTouchDefault = useCallback((e: TouchEvent) => {
    // Prevent browser pinch-to-zoom and scroll on canvas
    if (e.touches.length >= 1) {
      e.preventDefault();
    }
  }, []);

  // Handle unlinking video from scenario
  const handleUnlink = useCallback(() => {
    if (!window.confirm('Remove video link?')) return;
    updateScenario(activeScenarioId!, { linkedVideoMoment: undefined });
  }, [activeScenarioId, updateScenario]);

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
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-2 px-4 pt-safe-top pt-3 pb-6 pointer-events-none"
           style={{ background: 'linear-gradient(180deg, rgba(13,13,26,0.85) 0%, transparent 100%)' }}>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button onClick={() => navigate('/')} className="text-white/60 hover:text-white text-sm">
            ← Scenarios
          </button>
          {/* Tab switcher */}
          <div className="flex rounded-lg overflow-hidden border border-white/20 ml-2">
            <button
              onClick={() => setEditorTab('board')}
              className="px-4 py-1.5 text-sm font-medium transition-colors"
              style={editorTab === 'board'
                ? { background: 'linear-gradient(135deg, #00d4aa, #0099ff)', color: '#000' }
                : { background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.7)' }}
            >
              Board
            </button>
            <button
              onClick={() => setEditorTab('video')}
              className="px-4 py-1.5 text-sm font-medium transition-colors"
              style={editorTab === 'video'
                ? { background: 'linear-gradient(135deg, #00d4aa, #0099ff)', color: '#000' }
                : { background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.7)' }}
            >
              Video
            </button>
          </div>
        </div>

        {/* Board controls (right side) */}
        {editorTab === 'board' && (
          <div className="ml-auto flex items-center gap-2 pointer-events-auto">
            <FormationPresetBar />
            <button
              onClick={toggleBoardSubMode}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${boardSubMode === 'draw'
                  ? 'bg-green-600 text-white'
                  : 'bg-black/60 text-white/70 hover:bg-black/80'}`}
            >
              {boardSubMode === 'setup' ? 'Setup' : '● Draw'}
            </button>
            <LabelToggle />
            <button
              data-playbook-toggle
              onClick={togglePlaybook}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-manipulation
                ${isPlaybookOpen
                  ? 'bg-amber-500 text-black'
                  : 'bg-black/60 text-white/70 hover:bg-black/80'}`}
            >
              {isPlaybookOpen ? '✕ Playbooks' : '📚 Playbooks'}
            </button>
          </div>
        )}
      </div>

      {/* Linked video chip bar — shown on Board tab when a video moment is linked */}
      {editorTab === 'board' && linkedVideoMoment && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
            left: 0,
            right: 0,
            zIndex: 25,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            background: 'rgba(13,13,26,0.88)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {linkedVideoAvailable ? (
            <>
              <span style={{ color: '#00d4aa', fontSize: 10, marginRight: 2 }}>●</span>
              <span style={{ color: '#00d4aa', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>
                VIDEO LINKED
              </span>
              {linkedVideoMoment.quarter && (
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginLeft: 4 }}>
                  {linkedVideoMoment.quarter} · {formatVideoTime(linkedVideoMoment.startTime)} — {formatVideoTime(linkedVideoMoment.endTime)}
                </span>
              )}
              {!linkedVideoMoment.quarter && (
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginLeft: 4 }}>
                  {formatVideoTime(linkedVideoMoment.startTime)} — {formatVideoTime(linkedVideoMoment.endTime)}
                </span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setEditorTab('video')}
                  style={{
                    padding: '2px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(0,212,170,0.5)',
                    background: 'rgba(0,212,170,0.12)',
                    color: '#00d4aa',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  ▶ Preview
                </button>
                <button
                  onClick={handleUnlink}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </>
          ) : (
            <>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginRight: 2 }}>⚪</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>
                VIDEO NOT LOADED
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setEditorTab('video')}
                  style={{
                    padding: '2px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(0,153,255,0.5)',
                    background: 'rgba(0,153,255,0.12)',
                    color: '#0099ff',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Load video →
                </button>
                <button
                  onClick={handleUnlink}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Unlink
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Canvas container with resize observation */}
      {editorTab === 'board' && (
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
            <fog attach="fog" args={['#06090f', 350, 950]} />
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

          {/* Link Video Moment button — visible when scenario is active and no video is linked */}
          {activeScenarioId !== null && !linkedVideoMoment && (
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
      )}

      {editorTab === 'video' && (
        <div className="absolute inset-0 z-10">
          <VideoWorkspace showFieldOverlay={true} />
          <button
            onClick={() => setEditorTab('board')}
            className="absolute top-4 right-4 z-50 px-4 py-2 rounded-lg
                       bg-amber-500 text-black font-semibold hover:bg-amber-400 text-sm"
          >
            Take to Board →
          </button>
        </div>
      )}

      {/* All DOM-layer UI stays outside */}
      <Toolbar canvas={canvasRef.current} />
      <PlaybookPanel />
      <AnnotationToolbar />
      {editorTab === 'board' && <CameraDock />}
      <OnboardingTour />
      {helpOpen && <HelpScreen onClose={() => setHelpOpen(false)} />}

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