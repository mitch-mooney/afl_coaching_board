import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, Vector3, Plane } from 'three';
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
  const { isBallSelected, selectBall, updateBallPosition } = useBallStore();
  const { getPlayer, setDragging } = usePlayerStore();
  const { isPlaying, progress, speed, setProgress } = useAnimationStore();
  const { getPathByEntity, addPath, removePath } = usePathStore();
  const { pushSnapshot } = useHistoryStore();
  const { camera, raycaster, gl } = useThree();

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
    // Priority 1: Follow assigned player (overrides path animation)
    if (assignedPlayer && !isDragging) {
      // Position ball at player's position with slight Y offset to appear "held"
      if (groupRef.current) {
        groupRef.current.position.set(
          assignedPlayer.position[0],
          assignedPlayer.position[1] + AFL_BALL.length + 0.5, // Position above player
          assignedPlayer.position[2]
        );
      }
    }
    // Priority 2: Handle animation playback - update ball position along path
    else if (isPlaying && ballPath && !isDragging) {
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
