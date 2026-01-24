import { Canvas } from '@react-three/fiber';
import { Field } from '../Scene/Field';
import { PlayerManager } from '../Scene/PlayerManager';
import { CameraController } from '../Scene/CameraController';
import { AnnotationLayer } from '../Scene/AnnotationLayer';
import { Toolbar } from '../UI/Toolbar';
import { PlaybookPanel } from '../UI/PlaybookPanel';
import { AnnotationToolbar } from '../UI/AnnotationToolbar';
import { HelpOverlay } from '../UI/HelpOverlay';
import { VideoCanvas } from '../VideoImport/VideoCanvas';
import { VideoTimeline } from '../VideoImport/VideoTimeline';
import { PlaybackControls } from '../VideoImport/PlaybackControls';
import { usePlayerStore } from '../../store/playerStore';
import { useVideoStore } from '../../store/videoStore';
import { useEffect, useRef } from 'react';
import { useAnnotationInteraction } from '../../hooks/useAnnotationInteraction';


export function MainLayout() {
  const initializePlayers = usePlayerStore((state) => state.initializePlayers);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Video mode state from video store
  const isVideoMode = useVideoStore((state) => state.isVideoMode);
  const isLoaded = useVideoStore((state) => state.isLoaded);

  // Determine if we should show video canvas
  const showVideoCanvas = isVideoMode && isLoaded;

  useEffect(() => {
    initializePlayers();
  }, [initializePlayers]);

  // Handle video canvas ready callback
  const handleVideoCanvasReady = (canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
  };

  return (
    <div className="w-full h-full relative">
      {/* Conditional rendering: VideoCanvas when video is loaded, normal Canvas otherwise */}
      {showVideoCanvas ? (
        <VideoCanvas
          showField={true}
          enableControls={true}
          onCanvasReady={handleVideoCanvasReady}
        />
      ) : (
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
      )}

      {/* All DOM-layer UI stays outside */}
      <Toolbar canvas={canvasRef.current} />
      <PlaybookPanel />
      <AnnotationToolbar />
      <HelpOverlay />

      {/* Video timeline and playback controls at bottom - only shown when video is loaded */}
      {showVideoCanvas && (
        <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-3">
          <div className="flex items-center justify-center gap-4">
            <PlaybackControls />
          </div>
          <VideoTimeline />
        </div>
      )}
    </div>
  );
}


// Component to handle annotation interactions
function AnnotationInteractionHandler() {
  useAnnotationInteraction();
  return null;
}
