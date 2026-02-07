import { useEffect, useRef, useCallback, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCameraStore } from '../../store/cameraStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { usePlayerStore } from '../../store/playerStore';
import { usePathStore } from '../../store/pathStore';
import { useAnimationStore } from '../../store/animationStore';
import { getVelocityAtProgress } from '../../utils/pathAnimation';
import { useGestures } from '../../hooks/useGestures';

export function CameraController() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const { position, target, zoom, povMode, povPlayerId, povHeight, povDistance, applyPinchZoom } = useCameraStore();
  const selectedTool = useAnnotationStore((state) => state.selectedTool);
  const isDraggingPlayer = usePlayerStore((state) => state.isDragging);
  const getPlayer = usePlayerStore((state) => state.getPlayer);
  const getPathByEntity = usePathStore((state) => state.getPathByEntity);
  const progress = useAnimationStore((state) => state.progress);

  // Gesture detection for pinch-to-zoom
  const { handlers: gestureHandlers, getGestureState } = useGestures();

  // Ref to track the initial zoom when a pinch gesture starts
  const initialZoomRef = useRef<number | null>(null);
  // State to track if we're in an active pinch gesture (use state to trigger re-render for controls)
  const [isPinching, setIsPinching] = useState(false);

  // Disable orbit controls when annotation tool is active, player is being dragged, POV mode is active, or pinching
  const isAnnotating = selectedTool !== null;
  const shouldDisableControls = isAnnotating || isDraggingPlayer || povMode || isPinching;

  // Update camera position when store changes (non-POV mode)
  useEffect(() => {
    // Skip camera store updates when in POV mode - useFrame handles it
    if (povMode) return;

    camera.position.set(...position);
    camera.lookAt(...target);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(...target);
      controlsRef.current.update();
    }
  }, [camera, position, target, zoom, povMode]);

  // Handle touch start - capture initial zoom for pinch gestures
  const handleTouchStart = useCallback((event: TouchEvent) => {
    gestureHandlers.onTouchStart(event);

    // If two fingers touch, prepare for potential pinch gesture
    if (event.touches.length === 2) {
      initialZoomRef.current = zoom;
    }
  }, [gestureHandlers, zoom]);

  // Handle touch move - process pinch-to-zoom gestures
  const handleTouchMove = useCallback((event: TouchEvent) => {
    gestureHandlers.onTouchMove(event);

    const gestureState = getGestureState();

    if (gestureState.type === 'pinch-to-zoom' && gestureState.isActive) {
      // Mark that we're pinching (to disable OrbitControls)
      // Only set state if not already pinching to avoid excessive re-renders
      setIsPinching((prev) => prev || true);

      // Apply the zoom factor
      if (initialZoomRef.current !== null) {
        applyPinchZoom(gestureState.zoomFactor, initialZoomRef.current);
      }
    }
  }, [gestureHandlers, getGestureState, applyPinchZoom]);

  // Handle touch end - reset pinch state
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    gestureHandlers.onTouchEnd(event);

    // If all fingers released, reset pinch state
    if (event.touches.length === 0) {
      setIsPinching(false);
      initialZoomRef.current = null;
    } else if (event.touches.length === 1) {
      // Went from multi-touch to single-touch
      setIsPinching(false);
      initialZoomRef.current = null;
    }
  }, [gestureHandlers]);

  // Handle touch cancel - reset all state
  const handleTouchCancel = useCallback((event: TouchEvent) => {
    gestureHandlers.onTouchCancel(event);
    setIsPinching(false);
    initialZoomRef.current = null;
  }, [gestureHandlers]);

  // Set up touch event listeners on the canvas
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    // Add touch event listeners with passive: false to allow preventDefault
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [gl.domElement, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  // POV camera update - runs every frame when POV mode is active
  useFrame(() => {
    if (!povMode || !povPlayerId) return;

    // Get the player we're following
    const player = getPlayer(povPlayerId);
    if (!player) return;

    const [px, py, pz] = player.position;

    // Get the player's path to determine look direction from velocity
    const playerPath = getPathByEntity(povPlayerId, 'player');

    // Default direction vector (looking forward in negative X direction, typical for AFL field)
    let directionX = -1;
    let directionZ = 0;

    if (playerPath && playerPath.keyframes.length >= 2) {
      // Calculate velocity/direction from path at current progress
      const velocity = getVelocityAtProgress(playerPath, progress);
      const velMagnitude = Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);

      // Only use velocity direction if player is actually moving
      if (velMagnitude > 0.01) {
        directionX = velocity[0] / velMagnitude;
        directionZ = velocity[2] / velMagnitude;
      }
    }

    // Position camera behind and above the player
    // Camera is positioned opposite to the direction of movement
    const cameraX = px - directionX * povDistance;
    const cameraY = py + povHeight;
    const cameraZ = pz - directionZ * povDistance;

    // Look ahead of the player in their direction of movement
    const lookAtX = px + directionX * 5;
    const lookAtY = py + 1; // Look slightly above player height
    const lookAtZ = pz + directionZ * 5;

    // Smoothly interpolate camera position for smoother following
    camera.position.lerp(new THREE.Vector3(cameraX, cameraY, cameraZ), 0.1);

    // Create a target point and smoothly look at it
    const targetPoint = new THREE.Vector3(lookAtX, lookAtY, lookAtZ);

    // Create a quaternion for smooth rotation
    const targetQuaternion = new THREE.Quaternion();
    const lookMatrix = new THREE.Matrix4();
    lookMatrix.lookAt(camera.position, targetPoint, new THREE.Vector3(0, 1, 0));
    targetQuaternion.setFromRotationMatrix(lookMatrix);

    // Smoothly interpolate rotation
    camera.quaternion.slerp(targetQuaternion, 0.1);

    camera.updateProjectionMatrix();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!shouldDisableControls}
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
