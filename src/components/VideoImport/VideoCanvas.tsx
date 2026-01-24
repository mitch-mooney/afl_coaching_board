import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Field } from '../Scene/Field';
import { PlayerManager } from '../Scene/PlayerManager';
import { AnnotationLayer } from '../Scene/AnnotationLayer';
import { VideoBackgroundPlane } from './VideoBackgroundPlane';
import { useVideoStore } from '../../store/videoStore';
import { useAnnotationInteraction } from '../../hooks/useAnnotationInteraction';

/**
 * Props for the VideoCanvas component
 */
interface VideoCanvasProps {
  /** Whether to show the field overlay on top of video */
  showField?: boolean;
  /** Whether to enable orbit controls for camera navigation */
  enableControls?: boolean;
  /** Optional callback when canvas is ready */
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

/**
 * Internal camera controller that responds to perspective settings from the video store.
 * Manages camera position, rotation, and field of view for video overlay mode.
 */
function VideoCameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Get perspective settings from video store
  const perspectiveSettings = useVideoStore((state) => state.perspectiveSettings);

  // Apply perspective settings to camera
  useEffect(() => {
    if (!camera) return;

    // Update camera position
    camera.position.set(...perspectiveSettings.cameraPosition);

    // Update camera rotation (convert from degrees to radians if needed)
    const [rotX, rotY, rotZ] = perspectiveSettings.cameraRotation;
    camera.rotation.set(rotX, rotY, rotZ);

    // Update field of view if it's a PerspectiveCamera
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = perspectiveSettings.fieldOfView;
      camera.updateProjectionMatrix();
    }

    // Update orbit controls target to look at center of field
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [camera, perspectiveSettings]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={500}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2}
      enablePan
      panSpeed={0.5}
    />
  );
}

/**
 * Field overlay component with opacity and scale controlled by perspective settings.
 * Renders the 3D field geometry on top of the video background.
 */
function FieldOverlay() {
  const groupRef = useRef<THREE.Group>(null);
  const perspectiveSettings = useVideoStore((state) => state.perspectiveSettings);

  // Apply field scale from perspective settings
  useEffect(() => {
    if (groupRef.current) {
      const scale = perspectiveSettings.fieldScale;
      groupRef.current.scale.set(scale, scale, scale);
    }
  }, [perspectiveSettings.fieldScale]);

  // Apply opacity to field materials
  useEffect(() => {
    if (!groupRef.current) return;

    const opacity = perspectiveSettings.fieldOpacity;

    // Traverse all meshes and update their material opacity
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.Material;
        if (material) {
          material.transparent = opacity < 1;
          (material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial).opacity = opacity;
          material.needsUpdate = true;
        }
      }
    });
  }, [perspectiveSettings.fieldOpacity]);

  return (
    <group ref={groupRef}>
      <Field />
    </group>
  );
}

/**
 * Component to handle annotation interactions within the Three.js context.
 * Must be rendered inside the Canvas component to access R3F hooks.
 */
function AnnotationInteractionHandler() {
  useAnnotationInteraction();
  return null;
}

/**
 * Scene contents that are rendered inside the Canvas.
 * Includes video background, field overlay, players, and annotations.
 */
function VideoSceneContents({
  showField = true,
}: {
  showField?: boolean;
}) {
  const isVideoMode = useVideoStore((state) => state.isVideoMode);
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const perspectiveSettings = useVideoStore((state) => state.perspectiveSettings);

  return (
    <>
      {/* Camera setup with perspective settings */}
      <PerspectiveCamera
        makeDefault
        position={perspectiveSettings.cameraPosition}
        fov={perspectiveSettings.fieldOfView}
      />

      {/* Camera controller for navigation */}
      <VideoCameraController />

      {/* Video background plane - only render when video is loaded and in video mode */}
      {isVideoMode && isLoaded && (
        <VideoBackgroundPlane
          positionY={-1}
          scale={1}
          enableFrameUpdate={true}
        />
      )}

      {/* Field overlay - can be shown on top of video for alignment */}
      {showField && <FieldOverlay />}

      {/* 3D Player models - always rendered on top of video */}
      <PlayerManager />

      {/* Annotation layer - rendered on top of players and video */}
      <AnnotationLayer />

      {/* Handle annotation interaction within R3F context */}
      <AnnotationInteractionHandler />

      {/* Lighting for 3D elements */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 100, 50]} intensity={0.8} castShadow />
    </>
  );
}

/**
 * VideoCanvas - The main canvas component for video overlay mode.
 *
 * This component combines the video background with existing 3D elements
 * (field, players, annotations) in a Three.js scene. It provides:
 *
 * - Video background rendered as a texture on a plane
 * - Field geometry overlay with adjustable opacity and scale
 * - 3D player models positioned on top of the video
 * - Annotation layer for drawing on the scene
 * - Camera controls with perspective calibration support
 * - Proper render order to ensure 3D objects appear in front of video
 *
 * @example
 * ```tsx
 * <VideoCanvas
 *   showField={true}
 *   enableControls={true}
 *   onCanvasReady={(canvas) => {
 *     // Canvas ready for export or other operations
 *   }}
 * />
 * ```
 */
export function VideoCanvas({
  showField = true,
  enableControls = true,
  onCanvasReady,
}: VideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const perspectiveSettings = useVideoStore((state) => state.perspectiveSettings);

  // Notify parent when canvas is ready
  useEffect(() => {
    if (onCanvasReady && canvasRef.current) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  return (
    <Canvas
      shadows
      camera={{
        position: perspectiveSettings.cameraPosition,
        fov: perspectiveSettings.fieldOfView,
      }}
      gl={{
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true, // Enable for video export
      }}
      onCreated={({ gl }) => {
        canvasRef.current = gl.domElement;
        if (onCanvasReady) {
          onCanvasReady(gl.domElement);
        }
      }}
    >
      <VideoSceneContents showField={showField} />
    </Canvas>
  );
}

/**
 * Props for the VideoCanvasWithField component
 */
interface VideoCanvasWithFieldProps extends VideoCanvasProps {
  /** Field opacity (0-1) - overrides store setting */
  fieldOpacity?: number;
  /** Field scale - overrides store setting */
  fieldScale?: number;
}

/**
 * VideoCanvasWithField - A convenience wrapper that combines VideoCanvas
 * with direct control over field visibility settings.
 *
 * This component is useful when you want to control the field overlay
 * appearance without modifying the store directly.
 */
export function VideoCanvasWithField({
  fieldOpacity,
  fieldScale,
  showField = true,
  ...props
}: VideoCanvasWithFieldProps) {
  // If explicit values are provided, update the store
  const setFieldOpacity = useVideoStore((state) => state.setFieldOpacity);
  const setFieldScale = useVideoStore((state) => state.setFieldScale);

  useEffect(() => {
    if (fieldOpacity !== undefined) {
      setFieldOpacity(fieldOpacity);
    }
  }, [fieldOpacity, setFieldOpacity]);

  useEffect(() => {
    if (fieldScale !== undefined) {
      setFieldScale(fieldScale);
    }
  }, [fieldScale, setFieldScale]);

  return <VideoCanvas showField={showField} {...props} />;
}

/**
 * Hook to get a reference to the video canvas for export operations.
 * Use this in parent components that need access to the canvas element.
 */
export function useVideoCanvasRef() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const setCanvasRef = (canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
  };

  return {
    canvasRef,
    setCanvasRef,
  };
}

export default VideoCanvas;
