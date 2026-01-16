import { Canvas } from '@react-three/fiber';
import { Field } from '../Scene/Field';
import { PlayerManager } from '../Scene/PlayerManager';
import { CameraController } from '../Scene/CameraController';
import { AnnotationLayer } from '../Scene/AnnotationLayer';
import { PathManager } from '../Scene/Path';
import { Toolbar } from '../UI/Toolbar';
import { PlaybookPanel } from '../UI/PlaybookPanel';
import { AnnotationToolbar } from '../UI/AnnotationToolbar';
import { HelpOverlay } from '../UI/HelpOverlay';
import { usePlayerStore } from '../../store/playerStore';
import { usePathStore } from '../../store/pathStore';
import { useEffect, useRef } from 'react';
import { useAnnotationInteraction } from '../../hooks/useAnnotationInteraction';

export function MainLayout() {
  const initializePlayers = usePlayerStore((state) => state.initializePlayers);
  const paths = usePathStore((state) => state.paths);
  const selectedPathId = usePathStore((state) => state.selectedPathId);
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
        <PathManager paths={paths} selectedPathId={selectedPathId} />
      </Canvas>
      
      <Toolbar canvas={canvasRef.current} />
      <PlaybookPanel />
      <AnnotationToolbar />
      <HelpOverlay />
      
      <AnnotationInteractionHandler />
    </div>
  );
}

// Component to handle annotation interactions
function AnnotationInteractionHandler() {
  useAnnotationInteraction();
  return null;
}
