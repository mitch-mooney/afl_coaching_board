import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCameraStore } from '../../store/cameraStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { usePlayerStore } from '../../store/playerStore';
import { usePathStore } from '../../store/pathStore';
import { useAnimationStore } from '../../store/animationStore';
import { getVelocityAtProgress } from '../../utils/pathAnimation';

export function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const { position, target, zoom, povMode, povPlayerId, povHeight, povDistance } = useCameraStore();
  const selectedTool = useAnnotationStore((state) => state.selectedTool);
  const isDraggingPlayer = usePlayerStore((state) => state.isDragging);
  const getPlayer = usePlayerStore((state) => state.getPlayer);
  const getPathByEntity = usePathStore((state) => state.getPathByEntity);
  const progress = useAnimationStore((state) => state.progress);

  // Disable orbit controls when annotation tool is active, player is being dragged, or POV mode is active
  const isAnnotating = selectedTool !== null;
  const shouldDisableControls = isAnnotating || isDraggingPlayer || povMode;

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
