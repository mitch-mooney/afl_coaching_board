import { useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Field } from '../Scene/Field';
import { PlayerManager } from '../Scene/PlayerManager';
import { AnnotationLayer } from '../Scene/AnnotationLayer';
import { VideoBackgroundPlane } from './VideoBackgroundPlane';
import { CalibrationGrid3D, GridSettings } from './CalibrationGrid';
import { useVideoStore } from '../../store/videoStore';
import { useAnnotationInteraction } from '../../hooks/useAnnotationInteraction';

/**
 * Performance constants for rendering optimization
 */
const PERFORMANCE_CONFIG = {
  /** Threshold for considering interpolation "close enough" to skip */
  CONVERGENCE_THRESHOLD: 0.001,
  /** Threshold for FOV changes to trigger projection matrix update */
  FOV_THRESHOLD: 0.01,
  /** Interpolation speed for smooth transitions */
  LERP_FACTOR: 0.15,
} as const;

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
  /** Optional grid settings for calibration overlay */
  gridSettings?: GridSettings;
}

/**
 * Helper function to check if a value has converged to its target
 */
function hasConverged(current: number, target: number, threshold = PERFORMANCE_CONFIG.CONVERGENCE_THRESHOLD): boolean {
  return Math.abs(current - target) < threshold;
}

/**
 * Helper function to check if a Vector3 has converged to its target
 */
function hasVector3Converged(current: THREE.Vector3, target: THREE.Vector3, threshold = PERFORMANCE_CONFIG.CONVERGENCE_THRESHOLD): boolean {
  return (
    hasConverged(current.x, target.x, threshold) &&
    hasConverged(current.y, target.y, threshold) &&
    hasConverged(current.z, target.z, threshold)
  );
}

/**
 * Internal camera controller that responds to perspective settings from the video store.
 * Manages camera position, rotation, and field of view for video overlay mode.
 * Uses useFrame for smooth real-time updates during calibration.
 *
 * Performance optimizations:
 * - Convergence checks to skip interpolation when values are at target
 * - Only updates projection matrix when FOV changes significantly
 * - Uses getState() for values only needed in useFrame
 */
const VideoCameraController = memo(function VideoCameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Track if we're currently animating
  const isAnimatingRef = useRef(false);
  const lastFovRef = useRef<number>(0);

  // Get perspective settings from video store
  const perspectiveSettings = useVideoStore((state) => state.perspectiveSettings);

  // Store target values for smooth interpolation - reuse objects to avoid GC
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const targetRotation = useMemo(() => new THREE.Euler(), []);

  // Update target values when perspective settings change
  useEffect(() => {
    targetPosition.set(...perspectiveSettings.cameraPosition);
    targetRotation.set(...perspectiveSettings.cameraRotation);
    // Mark that we need to animate
    isAnimatingRef.current = true;
  }, [perspectiveSettings.cameraPosition, perspectiveSettings.cameraRotation, targetPosition, targetRotation]);

  // Apply camera updates using useFrame for smooth real-time response
  useFrame(() => {
    if (!camera) return;

    // Skip expensive calculations if we've converged
    const positionConverged = hasVector3Converged(camera.position, targetPosition);
    const rotationConverged = (
      hasConverged(camera.rotation.x, targetRotation.x) &&
      hasConverged(camera.rotation.y, targetRotation.y) &&
      hasConverged(camera.rotation.z, targetRotation.z)
    );

    // Get current FOV target from store without subscribing
    const { perspectiveSettings: currentSettings } = useVideoStore.getState();
    const targetFov = currentSettings.fieldOfView;
    const fovConverged = camera instanceof THREE.PerspectiveCamera &&
      hasConverged(camera.fov, targetFov, PERFORMANCE_CONFIG.FOV_THRESHOLD);

    // If everything has converged, skip frame updates
    if (positionConverged && rotationConverged && fovConverged) {
      isAnimatingRef.current = false;
      return;
    }

    isAnimatingRef.current = true;

    // Only interpolate position if not converged
    if (!positionConverged) {
      camera.position.lerp(targetPosition, PERFORMANCE_CONFIG.LERP_FACTOR);
    }

    // Only interpolate rotation if not converged
    if (!rotationConverged) {
      camera.rotation.x += (targetRotation.x - camera.rotation.x) * PERFORMANCE_CONFIG.LERP_FACTOR;
      camera.rotation.y += (targetRotation.y - camera.rotation.y) * PERFORMANCE_CONFIG.LERP_FACTOR;
      camera.rotation.z += (targetRotation.z - camera.rotation.z) * PERFORMANCE_CONFIG.LERP_FACTOR;
    }

    // Update field of view if it's a PerspectiveCamera and FOV changed significantly
    if (camera instanceof THREE.PerspectiveCamera && !fovConverged) {
      const newFov = camera.fov + (targetFov - camera.fov) * PERFORMANCE_CONFIG.LERP_FACTOR;

      // Only update projection matrix if FOV changed significantly
      if (Math.abs(newFov - lastFovRef.current) > PERFORMANCE_CONFIG.FOV_THRESHOLD) {
        camera.fov = newFov;
        camera.updateProjectionMatrix();
        lastFovRef.current = newFov;
      }
    }

    // Keep orbit controls target centered (only if controls are active)
    if (controlsRef.current && !currentSettings.lockOrbitControls) {
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
});

/**
 * Field overlay component with opacity, scale, and position controlled by perspective settings.
 * Renders the 3D field geometry on top of the video background.
 * Uses useFrame for smooth real-time updates during calibration.
 *
 * Performance optimizations:
 * - Convergence checks to skip interpolation when values are at target
 * - Only traverses field meshes when opacity changes
 * - Memoized to prevent unnecessary re-renders
 */
const FieldOverlay = memo(function FieldOverlay() {
  const groupRef = useRef<THREE.Group>(null);
  const perspectiveSettings = useVideoStore((state) => state.perspectiveSettings);

  // Track animation state
  const isAnimatingRef = useRef(false);

  // Store target values for smooth interpolation - reuse objects to avoid GC
  const targetScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const targetPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Update targets when settings change
  useEffect(() => {
    const scale = perspectiveSettings.fieldScale;
    targetScale.set(scale, scale, scale);
    targetPosition.set(...perspectiveSettings.fieldOffset);
    // Mark that we need to animate
    isAnimatingRef.current = true;
  }, [perspectiveSettings.fieldScale, perspectiveSettings.fieldOffset, targetScale, targetPosition]);

  // Apply field transformations using useFrame for smooth real-time updates
  useFrame(() => {
    if (!groupRef.current) return;

    // Check convergence for scale and position
    const scaleConverged = hasVector3Converged(groupRef.current.scale, targetScale);
    const positionConverged = hasVector3Converged(groupRef.current.position, targetPosition);

    // If both converged, skip updates
    if (scaleConverged && positionConverged) {
      isAnimatingRef.current = false;
      return;
    }

    isAnimatingRef.current = true;

    // Only interpolate scale if not converged
    if (!scaleConverged) {
      groupRef.current.scale.lerp(targetScale, PERFORMANCE_CONFIG.LERP_FACTOR);
    }

    // Only interpolate position if not converged
    if (!positionConverged) {
      groupRef.current.position.lerp(targetPosition, PERFORMANCE_CONFIG.LERP_FACTOR);
    }
  });

  // Apply opacity to field materials (this can be done via useEffect since it's a material property)
  // Cache the last opacity to avoid unnecessary traversals
  const lastOpacityRef = useRef<number>(-1);

  useEffect(() => {
    if (!groupRef.current) return;

    const opacity = perspectiveSettings.fieldOpacity;

    // Skip if opacity hasn't changed
    if (opacity === lastOpacityRef.current) return;
    lastOpacityRef.current = opacity;

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
});

/**
 * Component to handle annotation interactions within the Three.js context.
 * Must be rendered inside the Canvas component to access R3F hooks.
 * Memoized to prevent unnecessary re-initialization.
 */
const AnnotationInteractionHandler = memo(function AnnotationInteractionHandler() {
  useAnnotationInteraction();
  return null;
});

/**
 * Scene contents that are rendered inside the Canvas.
 * Includes video background, field overlay, calibration grid, players, and annotations.
 *
 * Memoized to prevent unnecessary re-renders when parent state changes.
 */
const VideoSceneContents = memo(function VideoSceneContents({
  showField = true,
  gridSettings,
}: {
  showField?: boolean;
  gridSettings?: GridSettings;
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

      {/* Calibration grid overlay - helps with perspective alignment */}
      {gridSettings && (
        <CalibrationGrid3D
          visible={gridSettings.visible}
          color={gridSettings.color}
          opacity={gridSettings.opacity}
          horizontalDivisions={gridSettings.horizontalDivisions}
          verticalDivisions={gridSettings.verticalDivisions}
          showMajorLines={gridSettings.showMajorLines}
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
});

/**
 * VideoCanvas - The main canvas component for video overlay mode.
 *
 * This component combines the video background with existing 3D elements
 * (field, players, annotations) in a Three.js scene. It provides:
 *
 * - Video background rendered as a texture on a plane
 * - Field geometry overlay with adjustable opacity and scale
 * - Optional calibration grid for perspective alignment
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
 *   gridSettings={{ visible: true, color: '#00ff00', opacity: 0.6 }}
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
  gridSettings,
}: VideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const perspectiveSettings = useVideoStore((state) => state.perspectiveSettings);

  // Memoize canvas creation callback to prevent unnecessary re-renders
  const handleCanvasCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    canvasRef.current = gl.domElement;
    if (onCanvasReady) {
      onCanvasReady(gl.domElement);
    }
  }, [onCanvasReady]);

  // Notify parent when canvas is ready (backup for when ref changes)
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
        // Performance optimizations
        powerPreference: 'high-performance', // Request high-performance GPU
        stencil: false, // Disable stencil buffer if not needed
        depth: true,
      }}
      // Performance: Use "always" frameloop for video playback
      // This ensures consistent frame updates for video texture
      frameloop="always"
      // Performance settings
      dpr={[1, 2]} // Limit device pixel ratio to avoid excessive GPU work
      performance={{ min: 0.5 }} // Allow adaptive performance degradation
      onCreated={handleCanvasCreated}
    >
      <VideoSceneContents showField={showField} gridSettings={gridSettings} />
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
  gridSettings,
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

  return <VideoCanvas showField={showField} gridSettings={gridSettings} {...props} />;
}

// Re-export GridSettings type for convenience
export type { GridSettings };

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
