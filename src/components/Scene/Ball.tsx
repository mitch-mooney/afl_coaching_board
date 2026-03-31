import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, Vector3, Plane, Euler } from 'three';
import { Ball } from '../../models/BallModel';
import { useBallStore } from '../../store/ballStore';
import { usePlayerStore } from '../../store/playerStore';
import { useAnimationStore } from '../../store/animationStore';
import { usePathStore } from '../../store/pathStore';
import { useEventStore } from '../../store/eventStore';
import { useUIStore } from '../../store/uiStore';
import { useHistoryStore } from '../../store/historyStore';
import { snapToField } from '../../utils/fieldGeometry';
import { getPositionAtProgressWithEasing, easeInOut } from '../../utils/pathAnimation';
import { createPathFromWaypoints, Waypoint } from '../../models/PathModel';
import { generateSmoothTrajectory, calculateTrajectoryTangent, getBounceSquashFactor, interpolateTrajectory } from '../../utils/trajectoryGeneration';

// Minimum distance (in meters) between recorded path points to avoid excessive waypoints
const MIN_PATH_POINT_DISTANCE = 1.5;

// Ball visual constants for distinct appearance
const BALL_COLORS = {
  default: '#8B4513',      // Saddle brown - AFL ball color
  hover: '#D2691E',        // Chocolate - lighter brown for hover
  selected: '#FFD700',     // Gold - distinct selection color
  ring: '#FFD700',         // Gold selection ring
  hoverRing: '#D2691E',    // Subtle hover ring
  seam: '#FFFFFF',         // White seams
};

// AFL ball dimensions (ellipsoid shape)
const AFL_BALL = {
  length: 0.28,    // Semi-axis along the length (pointy ends)
  width: 0.18,     // Semi-axis for width/height (rounder middle)
};

interface BallProps {
  ball: Ball;
}

export function BallComponent({ ball }: BallProps) {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Track all movement points during drag for curved path recording
  const movementPoints = useRef<[number, number, number][]>([]);
  const lastRecordedPos = useRef<[number, number, number] | null>(null);
  const dragStartTime = useRef<number>(0);
  // Store pre-drag position for undo
  const preDragPosition = useRef<[number, number, number] | null>(null);
  const { isBallSelected, selectBall, updateBallPosition, mode, currentKickType } = useBallStore();
  const { getPlayer, setDragging } = usePlayerStore();
  const { isPlaying, progress, speed, setProgress } = useAnimationStore();
  const { getPathByEntity, addPath, removePath } = usePathStore();
  const { pushSnapshot } = useHistoryStore();
  const { camera, raycaster, gl } = useThree();
  const isEventMode = useEventStore((state) => state.isEventMode);
  const getActiveEvent = useEventStore((state) => state.getActiveEvent);
  
  // Check if there's a ball path from the active event
  const activeEvent = getActiveEvent();
  const ballPathFromEvent = activeEvent?.ballPaths && activeEvent.ballPaths.length > 0;

  // Calculate ring sizes based on ball size
  const ringSize = useMemo(() => ({
    innerHover: AFL_BALL.length + 0.15,
    outerHover: AFL_BALL.length + 0.25,
    innerSelect: AFL_BALL.length + 0.1,
    outerSelect: AFL_BALL.length + 0.25,
  }), []);

  // Get the assigned player (if ball is assigned to a player)
  const assignedPlayer = ball.assignedPlayerId ? getPlayer(ball.assignedPlayerId) : undefined;

  // Get the ball's movement path (if any)
  const ballPath = getPathByEntity(ball.id, 'ball');

   useFrame((state, delta) => {
     // In event playback mode, ball positions are driven by useAnimationPlayback hook
     // via useBallStore. Only handle position updates in these cases:
     
      // Priority 1: Follow assigned player (overrides path animation)
      if (assignedPlayer && !isDragging) {
        if (groupRef.current) {
          groupRef.current.position.set(
            assignedPlayer.position[0],
            assignedPlayer.position[1] + AFL_BALL.length + 0.5,
            assignedPlayer.position[2]
          );
        }
        if (meshRef.current) {
          meshRef.current.rotation.set(0, 0, 0);
          meshRef.current.scale.set(AFL_BALL.length, AFL_BALL.width, AFL_BALL.width);
        }
      }
      // Priority 2: Handle in-flight ball with trajectory
      else if (mode === 'in-flight' && !isDragging && currentKickType) {
        const startPoint = assignedPlayer ? new Vector3(assignedPlayer.position[0], assignedPlayer.position[1] + AFL_BALL.length + 0.5, assignedPlayer.position[2]) : new Vector3(ball.position[0], ball.position[1], ball.position[2]);
        const endPoint = new Vector3(ball.position[0], ball.position[1], ball.position[2]);
        const config = { startPoint, endPoint, kickType: currentKickType, duration: 2000 };
        const keyframes = generateSmoothTrajectory(config);
        const progressAtFrame = progress;
        const currentPos = interpolateTrajectory(keyframes, progressAtFrame);
        if (groupRef.current) {
          groupRef.current.position.set(currentPos.x, currentPos.y, currentPos.z);
        }
        const tangent = calculateTrajectoryTangent(keyframes, progressAtFrame);
        const targetRotation = new Euler();
        targetRotation.setFromVector3(tangent);
        targetRotation.z = 0;
        if (meshRef.current) {
          meshRef.current.rotation.x += (targetRotation.x - meshRef.current.rotation.x) * 0.2;
          meshRef.current.rotation.y += (targetRotation.y - meshRef.current.rotation.y) * 0.2;
          meshRef.current.rotation.z += (targetRotation.z - meshRef.current.rotation.z) * 0.2;
          const { scaleY, scaleX } = getBounceSquashFactor(progressAtFrame);
          const targetScale = new Vector3(scaleX * AFL_BALL.length, scaleY * AFL_BALL.width, scaleX * AFL_BALL.width);
          meshRef.current.scale.lerp(targetScale, 0.3);
        }
      }
      // Priority 3: Handle manual playback scrubbing (not event mode) - update ball position along path
      else if (isPlaying && !ballPathFromEvent && ballPath && !isDragging) {
       // Advance animation progress
       const pathDuration = ballPath.duration;
       const progressIncrement = (delta * speed) / pathDuration;
       const newProgress = Math.min(1, progress + progressIncrement);
       setProgress(newProgress);

       // Get interpolated position from path at current progress
       const animatedPosition = getPositionAtProgressWithEasing(ballPath, progress, easeInOut);

       // Update group position directly for smooth 60fps rendering
       if (groupRef.current) {
         groupRef.current.position.set(
           animatedPosition[0],
           animatedPosition[1],
           animatedPosition[2]
         );
       }
     }
     // Priority 3: When ball is in-flight during event playback, sync to ball store position
     else if (isEventMode && !isDragging && groupRef.current) {
        // Ball position is managed by useAnimationPlayback via useBallStore
        // Update local position to match store position
        groupRef.current.position.set(
          ball.position[0],
          ball.position[1],
          ball.position[2]
        );
      }

     // Handle dragging with global pointer events
     if (isDragging) {
       raycaster.setFromCamera(state.pointer, camera);
       const planeNormal = new Vector3(0, 1, 0);
       const planePoint = new Vector3(0, 0, 0);
       const intersection = raycaster.ray.intersectPlane(
         new Plane(planeNormal, -planeNormal.dot(planePoint)),
         new Vector3()
       );

       if (intersection) {
         const [x, z] = snapToField(intersection.x, intersection.z);
         const newPos: [number, number, number] = [x, AFL_BALL.length, z];
         updateBallPosition(newPos);

         // Record movement point if moved far enough from last recorded position
         if (lastRecordedPos.current) {
           const lastPos = lastRecordedPos.current;
           const distance = Math.sqrt(
             Math.pow(newPos[0] - lastPos[0], 2) +
             Math.pow(newPos[2] - lastPos[2], 2)
           );

           if (distance >= MIN_PATH_POINT_DISTANCE) {
             movementPoints.current.push(newPos);
             lastRecordedPos.current = newPos;
           }
         }
       }
     }
   });

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectBall(true);
  };

  // Helper to create path from recorded movement points
  const createPathFromMovement = useCallback(() => {
    // Add final position if different from last recorded
    const finalPos = [...ball.position] as [number, number, number];
    const points = [...movementPoints.current];

    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const distToFinal = Math.sqrt(
        Math.pow(finalPos[0] - lastPoint[0], 2) +
        Math.pow(finalPos[2] - lastPoint[2], 2)
      );
      if (distToFinal > 0.1) {
        points.push(finalPos);
      }
    }

    // Only create path if we have at least 2 points and meaningful movement
    if (points.length >= 2) {
      const startPos = points[0];
      const endPos = points[points.length - 1];
      const totalDistance = Math.sqrt(
        Math.pow(endPos[0] - startPos[0], 2) +
        Math.pow(endPos[2] - startPos[2], 2)
      );

      if (totalDistance > 1) {
        // Calculate duration based on drag time (minimum 2 seconds)
        const dragDuration = Math.max(2, (Date.now() - dragStartTime.current) / 1000);

        // Create waypoints with evenly distributed timestamps
        const waypoints: Waypoint[] = points.map((pos, index) => ({
          timestamp: (index / (points.length - 1)) * dragDuration,
          position: pos,
        }));

        const path = createPathFromWaypoints(ball.id, 'ball', waypoints);
        addPath(path);

        // Save snapshot for undo (pre-drag state)
        if (preDragPosition.current) {
          pushSnapshot({
            players: [], // Ball undo doesn't need player state
            annotations: [],
          });
        }
      }
    }

    // Reset tracking
    movementPoints.current = [];
    lastRecordedPos.current = null;
    preDragPosition.current = null;
  }, [ball.id, ball.position, addPath, pushSnapshot]);

  // End dragging helper - used by both pointerUp and window events
  const endDragging = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    setDragging(false);
    createPathFromMovement();
  }, [isDragging, setDragging, createPathFromMovement]);

  // Use window-level event listener to reliably end drag even when pointer leaves canvas
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowPointerUp = () => {
      endDragging();
    };

    // Listen on window to catch pointer release anywhere
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [isDragging, endDragging]);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    selectBall(true);
    setIsDragging(true);
    setDragging(true);  // Notify store to disable camera controls

    // Save pre-drag position for undo
    const startPos = [...ball.position] as [number, number, number];
    preDragPosition.current = startPos;

    // Initialize movement tracking for path recording
    movementPoints.current = [startPos];
    lastRecordedPos.current = startPos;
    dragStartTime.current = Date.now();

    // Remove existing paths for the ball to start fresh, but protect:
    // 1. Paths referenced by a saved event (Phase 1 ball arrow while recording Phase 2)
    // 2. Paths captured in the open EventEditor but not yet saved to an event
    const allBallPaths = usePathStore.getState().getPathsByEntity(ball.id);
    for (const path of allBallPaths) {
      const isUsedByEvent = useEventStore.getState().events.some(
        (event) => event.playerPaths.some((pp) => pp.pathId === path.id)
      );
      const isCaptured = useUIStore.getState().capturedPathIds.has(path.id);
      if (!isUsedByEvent && !isCaptured) {
        removePath(path.id);
      }
    }
  };

  const handlePointerMove = (e: any) => {
    // Movement is handled in useFrame for smoother dragging
    if (isDragging) {
      e.stopPropagation();
    }
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    // Delegate to endDragging which handles everything
    endDragging();
  };

  const handlePointerOver = () => {
    setHovered(true);
    gl.domElement.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    // Only update hover state, don't end drag here
    // Drag is ended by window-level pointerup event for reliability
    setHovered(false);
    gl.domElement.style.cursor = 'auto';
  };

  // Determine current ball color based on state
  const ballColor = isBallSelected
    ? BALL_COLORS.selected
    : hovered
      ? BALL_COLORS.hover
      : ball.color;

  // Determine emissive color and intensity
  const emissiveColor = isBallSelected ? BALL_COLORS.selected : ball.color;
  const emissiveIntensity = isBallSelected ? 0.4 : hovered ? 0.25 : 0.15;

  return (
    <group
      ref={groupRef}
      position={ball.position}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* AFL Ball - elongated ellipsoid shape rotated to lay flat */}
      <group rotation={[0, 0, Math.PI / 2]}>
        {/* Main ball body - scaled sphere to create ellipsoid */}
        <mesh ref={meshRef} castShadow scale={[AFL_BALL.length, AFL_BALL.width, AFL_BALL.width]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            color={ballColor}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            roughness={0.6}
            metalness={0.1}
          />
        </mesh>

        {/* Seam lines - characteristic AFL ball stitching */}
        {/* Vertical seam (along length) */}
        <mesh scale={[AFL_BALL.length * 1.01, AFL_BALL.width * 0.02, AFL_BALL.width * 1.01]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color={BALL_COLORS.seam}
            emissive={BALL_COLORS.seam}
            emissiveIntensity={0.1}
          />
        </mesh>

        {/* Horizontal seam (around middle) */}
        <mesh scale={[AFL_BALL.length * 0.02, AFL_BALL.width * 1.01, AFL_BALL.width * 1.01]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color={BALL_COLORS.seam}
            emissive={BALL_COLORS.seam}
            emissiveIntensity={0.1}
          />
        </mesh>
      </group>

      {/* Hover indicator ring - subtle feedback before selection */}
      {hovered && !isBallSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[ringSize.innerHover, ringSize.outerHover, 24]} />
          <meshStandardMaterial
            color={BALL_COLORS.hoverRing}
            emissive={BALL_COLORS.hoverRing}
            emissiveIntensity={0.3}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Selection indicator ring - prominent when selected */}
      {isBallSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[ringSize.innerSelect, ringSize.outerSelect, 24]} />
          <meshStandardMaterial
            color={BALL_COLORS.ring}
            emissive={BALL_COLORS.ring}
            emissiveIntensity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}
