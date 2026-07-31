import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh } from 'three';
import { Ball } from '../../models/BallModel';
import { useBallStore } from '../../store/ballStore';
import { usePlayerStore } from '../../store/playerStore';
import { usePathStore } from '../../store/pathStore';
import { useHistoryStore } from '../../store/historyStore';
import { captureAnnotationSnapshots } from '../../store/annotationStore';
import { usePenStore } from '../../store/penStore';
import { snapPointerToField } from '../../utils/dragMath';
import { useActiveBoundary } from '../../hooks/useActiveBoundary';
import { authoringIntent } from '../../utils/inputContract';
import { heldBallTarget } from '../../utils/ballFollow';

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
  // Store pre-drag position for undo
  const preDragPosition = useRef<[number, number, number] | null>(null);
  const { isBallSelected, selectBall, updateBallPosition } = useBallStore();
  const { getPlayer, setDragging } = usePlayerStore();
  const { pushSnapshot } = useHistoryStore();
  const { camera, raycaster, gl } = useThree();
  const boundary = useActiveBoundary();

  // Calculate ring sizes based on ball size
  const ringSize = useMemo(() => ({
    innerHover: AFL_BALL.length + 0.15,
    outerHover: AFL_BALL.length + 0.25,
    innerSelect: AFL_BALL.length + 0.1,
    outerSelect: AFL_BALL.length + 0.25,
  }), []);

  // Get the assigned player (if ball is assigned to a player)
  const assignedPlayer = ball.assignedPlayerId ? getPlayer(ball.assignedPlayerId) : undefined;

   useFrame((state) => {
     // Held-ball follow: an assigned ball rides its player — UNLESS it has a
     // drawn path, which the path engine (usePathPlayback) owns. Writes through
     // the store so the ball has a SINGLE position writer and can't fight its
     // own declarative `position={ball.position}` binding (the bug that froze
     // the ball then snapped it to the player's end position).
     if (assignedPlayer && !isDragging) {
       const ballPath = usePathStore.getState().getPathByEntity(ball.id, 'ball');
       const target = heldBallTarget(assignedPlayer.position, ballPath);
       if (target) {
         const cur = ball.position;
         const moved =
           Math.abs(cur[0] - target[0]) > 1e-3 ||
           Math.abs(cur[1] - target[1]) > 1e-3 ||
           Math.abs(cur[2] - target[2]) > 1e-3;
         if (moved) updateBallPosition(target);
       }
     }
     // When the ball has a path (or no assignment) it renders at ball.position
     // — the group's position prop — which usePathPlayback updates each frame.

     // Handle dragging with global pointer events
     if (isDragging) {
       const field = snapPointerToField(state.pointer, camera, raycaster, boundary);

       if (field) {
         const [x, z] = field;
         const newPos: [number, number, number] = [x, AFL_BALL.length, z];
         updateBallPosition(newPos);
       }
     }
   });

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectBall(true);
  };

  /**
   * Finishes a reposition. Dragging the ball only moves it now — under the
   * input contract a MovementPath comes from a Path-tip Stroke. This was the
   * one entity that recorded a path on *every* drag.
   */
  const finishReposition = useCallback(() => {
    const startPos = preDragPosition.current;
    const finalPos = ball.position;

    if (startPos && (startPos[0] !== finalPos[0] || startPos[2] !== finalPos[2])) {
      pushSnapshot({
        players: [], // Ball undo doesn't need player state
        annotations: captureAnnotationSnapshots(),
      });
    }

    preDragPosition.current = null;
  }, [ball.position, pushSnapshot]);

  // End dragging helper - used by both pointerUp and window events
  const endDragging = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    setDragging(false);
    finishReposition();
  }, [isDragging, setDragging, finishReposition]);

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

    // The pen authors, the finger manipulates — the ball is under the same
    // contract as a player, so an authoring stroke must not drag it.
    const authoring = authoringIntent({
      pointerType: e.pointerType,
      armedTip: usePenStore.getState().armedTip,
      button: e.button,
    });
    if (authoring === 'author') return;

    selectBall(true);
    setIsDragging(true);
    setDragging(true);  // Notify store to disable camera controls

    // Save pre-drag position for undo
    preDragPosition.current = [...ball.position] as [number, number, number];
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
