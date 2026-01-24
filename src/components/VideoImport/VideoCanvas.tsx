import { useEffect, useRef, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
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
 * Uses useFrame for smooth real-time updates during calibration.
 */
function VideoCameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Get perspective settings from video store
  const perspectiveSettings = useVideoStore((state) => state.perspectiveSettings);

  // Store target values for smooth interpolation
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const targetRotation = useMemo(() => new THREE.Euler(), []);

  // Update target values when perspective settings change
  useEffect(() => {
    targetPosition.set(...perspectiveSettings.cameraPosition);
    targetRotation.set(...perspectiveSettings.cameraRotation);
  }, [perspectiveSettings.cameraPosition, perspectiveSettings.cameraRotation, targetPosition, targetRotation]);

  // Apply camera updates using useFrame for smooth real-time response
  useFrame(() => {
    if (!camera) return;

    // Smoothly interpolate camera position
    camera.position.lerp(targetPosition, 0.15);

    // Smoothly interpolate camera rotation
    camera.rotation.x += (targetRotation.x - camera.rotation.x) * 0.15;
    camera.rotation.y += (targetRotation.y - camera.rotation.y) * 0.15;
    camera.rotation.z += (targetRotation.z - camera.rotation.z) * 0.15;

    // Update field of view if it's a PerspectiveCamera
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = perspectiveSettings.fieldOfView;
      camera.fov += (targetFov - camera.fov) * 0.15;
      camera.updateProjectionMatrix();
    }

    // Keep orbit controls target centered
    if (controlsRef.current && !perspectiveSettings.lockOrbitControls) {
      controlsRef.current.target.set(0, 0, 0);
    }
  });

  // Update orbit controls enabled state based on lock setting
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !perspectiveSettings.lockOrbitControls;
    }
  }, [perspectiveSettings.lockOrbitControls]);

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!perspectiveSettings.lockOrbitControls}
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
 * Field overlay component with opacity, scale, and position controlled by perspective settings.
 * Renders the 3D field geometry on top of the video background.
 * Uses useFrame for smooth real-time updates during calibration.
 */
function FieldOverlay() {
  const groupRef = useRef<THREE.Group>(null);
  const perspectiveSettings = useVideoStore((state) => state.perspectiveSettings);

  // Store target values for smooth interpolation
  const targetScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const targetPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Update targets when settings change
  useEffect(() => {
    const scale = perspectiveSettings.fieldScale;
    targetScale.set(scale, scale, scale);
    targetPosition.set(...perspectiveSettings.fieldOffset);
  }, [perspectiveSettings.fieldScale, perspectiveSettings.fieldOffset, targetScale, targetPosition]);

  // Apply field transformations using useFrame for smooth real-time updates
  useFrame(() => {
    if (!groupRef.current) return;

    // Smoothly interpolate scale
    groupRef.current.scale.lerp(targetScale, 0.15);

    // Smoothly interpolate position
    groupRef.current.position.lerp(targetPosition, 0.15);
  });

  // Apply opacity to field materials (this can be done via useEffect since it's a material property)
  useEffect(() => {
    if (!groupRef.current) return;

    const opacity = perspectiveSettings.fieldOpacity;

    // Traverse all meshes and update their material opacity
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material) {
            material.transparent = opacity < 1;
            (material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial).opacity = opacity;
            material.needsUpdate = true;
          }
        });
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
