import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, Vector3, Plane } from 'three';
import { Ball } from '../../models/BallModel';
import { useBallStore } from '../../store/ballStore';
import { usePlayerStore } from '../../store/playerStore';
import { useAnimationStore } from '../../store/animationStore';
import { usePathStore } from '../../store/pathStore';
import { snapToField } from '../../utils/fieldGeometry';
import { getPositionAtProgressWithEasing, easeInOut } from '../../utils/pathAnimation';

// Ball visual constants for distinct appearance
const BALL_COLORS = {
  default: '#8B4513',      // Saddle brown - AFL ball color
  hover: '#D2691E',        // Chocolate - lighter brown for hover
  selected: '#FFD700',     // Gold - distinct selection color
  ring: '#FFD700',         // Gold selection ring
  hoverRing: '#D2691E',    // Subtle hover ring
};

interface BallProps {
  ball: Ball;
}

export function BallComponent({ ball }: BallProps) {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<[number, number, number] | null>(null);
  const { isBallSelected, selectBall, updateBallPosition } = useBallStore();
  const { getPlayer, setDragging } = usePlayerStore();
  const { isPlaying, progress, speed, setProgress } = useAnimationStore();
  const { getPathByEntity, createPath, removePath } = usePathStore();
  const { camera, raycaster, gl } = useThree();

  // Calculate ring sizes based on ball size
  const ringSize = useMemo(() => ({
    innerHover: ball.size + 0.15,
    outerHover: ball.size + 0.25,
    innerSelect: ball.size + 0.1,
    outerSelect: ball.size + 0.25,
  }), [ball.size]);

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
          assignedPlayer.position[1] + ball.size + 0.5, // Position above player
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
        updateBallPosition([x, ball.size, z]);
      }
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectBall(true);
  };

  // Get existing path for the ball
  const existingBallPath = getPathByEntity(ball.id, 'ball');

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    selectBall(true);
    setIsDragging(true);
    setDragging(true);  // Notify store to disable camera controls

    // Store starting position for path recording
    dragStartPos.current = [...ball.position] as [number, number, number];

    // Remove any existing path for the ball to start fresh
    if (existingBallPath) {
      removePath(existingBallPath.id);
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
    setIsDragging(false);
    setDragging(false);  // Re-enable camera controls

    // Create path from start to end position if ball moved
    if (dragStartPos.current) {
      const startPos = dragStartPos.current;
      const endPos = ball.position;

      // Only create path if ball actually moved (more than 1 unit)
      const distance = Math.sqrt(
        Math.pow(endPos[0] - startPos[0], 2) +
        Math.pow(endPos[2] - startPos[2], 2)
      );

      if (distance > 1) {
        createPath(ball.id, 'ball', startPos, endPos, 2);
      }

      dragStartPos.current = null;
    }
  };

  const handlePointerOver = () => {
    setHovered(true);
    gl.domElement.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    if (isDragging) {
      setIsDragging(false);
      setDragging(false);  // Re-enable camera controls

      // Create path from start to end position if ball moved
      if (dragStartPos.current) {
        const startPos = dragStartPos.current;
        const endPos = ball.position;
        const distance = Math.sqrt(
          Math.pow(endPos[0] - startPos[0], 2) +
          Math.pow(endPos[2] - startPos[2], 2)
        );
        if (distance > 1) {
          createPath(ball.id, 'ball', startPos, endPos, 2);
        }
        dragStartPos.current = null;
      }
    }
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
      {/* Ball mesh - sphere shape with higher resolution for smoothness */}
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[ball.size, 32, 32]} />
        <meshStandardMaterial
          color={ballColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.5}
          metalness={0.15}
        />
      </mesh>

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
