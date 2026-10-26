import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, Vector3, type Group, type Object3D, type Raycaster } from 'three';
import { Ball } from '../../models/BallModel';
import { useBallStore } from '../../store/ballStore';
import { usePlayerStore } from '../../store/playerStore';
import { usePathStore } from '../../store/pathStore';
import { beginBallDrag, type BallDragHandle } from '../../utils/ballDrag';
import { usePenStore } from '../../store/penStore';
import { snapPointerToField } from '../../utils/dragMath';
import { useActiveBoundary } from '../../hooks/useActiveBoundary';
import { authoringIntent } from '../../utils/inputContract';
import { heldBallTarget } from '../../utils/ballFollow';
import { TOKEN_WORLD_DIAMETER } from '../../utils/cameraMath';
import { tokenNotch } from './PlayerToken';

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

/**
 * How much larger than to scale the Carrier's ball draws on a Player token. At
 * true scale it would be a speck on a token held at its 32-point floor.
 */
const BALL_ON_TOKEN_SCALE = 1.3;

/** The ball's long axis upright, as it stands on a player's figure. */
const UPRIGHT: [number, number, number] = [0, 0, Math.PI / 2];
/** The ball's long axis along the player's facing, as it lies in a token's notch. */
const ALONG_FACING: [number, number, number] = [0, Math.PI / 2, 0];

/**
 * Every player's group on the scene, found by the `playerId` each `Player`
 * stamps on its group's userData.
 */
function playerGroups(scene: Object3D): Object3D[] {
  const groups: Object3D[] = [];
  scene.traverse((object) => {
    if (typeof object.userData.playerId === 'string') groups.push(object);
  });
  return groups;
}

/**
 * The id of the player whose mesh is nearest along the ray, or null when the
 * ray hits no player. This is the whole of "on a player": no catch radius, only
 * what the pointer is visibly over.
 */
function playerUnderRay(raycaster: Raycaster, groups: Object3D[]): string | null {
  const [nearest] = raycaster.intersectObjects(groups, true);
  for (let object: Object3D | null = nearest?.object ?? null; object; object = object.parent) {
    if (typeof object.userData.playerId === 'string') return object.userData.playerId;
  }
  return null;
}

interface BallProps {
  ball: Ball;
}

export function BallComponent({ ball }: BallProps) {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);
  const shapeRef = useRef<Group>(null);
  const notchScale = useMemo(() => new Vector3(), []);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // The open Board edit for the drag in progress, begun on pointer-down and
  // closed by the drop when the drag ends.
  const dragRef = useRef<BallDragHandle | null>(null);
  // The player groups a drag can drop on, gathered once when it begins: no one
  // joins or leaves the board mid-drag.
  const dropGroupsRef = useRef<Object3D[]>([]);
  const { isBallSelected, selectBall, updateBallPosition, setDropTarget } = useBallStore();
  const { getPlayer, setDragging } = usePlayerStore();
  const { camera, raycaster, gl, scene } = useThree();
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
     let followsCarrier = false;
     if (assignedPlayer && !isDragging) {
       const ballPath = usePathStore.getState().getPathByEntity(ball.id, 'ball');
       const target = heldBallTarget(assignedPlayer.position, ballPath);
       followsCarrier = target !== null;
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

     // A ball riding a Carrier who shows a token draws on the token's notch,
     // turning with them, a little larger than to scale. Only the drawing
     // moves: the ball's position stays the held target above the player.
     const group = groupRef.current;
     const shape = shapeRef.current;
     const notch = followsCarrier && assignedPlayer ? tokenNotch(assignedPlayer.id) : undefined;
     if (group && shape) {
       if (notch) {
         notch.getWorldPosition(group.position);
         notch.getWorldQuaternion(group.quaternion);
         notch.getWorldScale(notchScale);
         group.scale.setScalar((notchScale.x / TOKEN_WORLD_DIAMETER) * BALL_ON_TOKEN_SCALE);
         shape.rotation.set(...ALONG_FACING);
       } else {
         group.position.fromArray(useBallStore.getState().ball?.position ?? ball.position);
         group.quaternion.identity();
         group.scale.setScalar(1);
         shape.rotation.set(...UPRIGHT);
       }
     }

     // Handle dragging with global pointer events
     if (isDragging) {
       const field = snapPointerToField(state.pointer, camera, raycaster, boundary);

       if (field) {
         const [x, z] = field;
         const newPos: [number, number, number] = [x, AFL_BALL.length, z];
         updateBallPosition(newPos);
       }
       // snapPointerToField has just set the raycaster from the pointer, so
       // this asks of the same ray which player the ball would land on.
       setDropTarget(playerUnderRay(raycaster, dropGroupsRef.current));
     }
   });

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectBall(true);
  };

  /**
   * Finishes a drag by dropping the ball. Over a player it becomes theirs;
   * anywhere else it is loose where it was let go. The drop closes the drag's
   * own edit, so the move and the give are one undo step. A drag never records
   * a MovementPath: under the input contract those come from a Path-tip Stroke.
   */
  const finishDrag = useCallback(() => {
    const { ball: current, dropTargetPlayerId } = useBallStore.getState();
    if (current) dragRef.current?.drop(current.position, dropTargetPlayerId);
    dragRef.current = null;
    dropGroupsRef.current = [];
    setDropTarget(null);
  }, [setDropTarget]);

  // End dragging helper - used by both pointerUp and window events
  const endDragging = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    setDragging(false);
    finishDrag();
  }, [isDragging, setDragging, finishDrag]);

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

    // Begin the Board edit the drag is about to make, so it can be undone.
    // Closes a stray drag left open by a pointerdown that never reached its
    // matching pointerup, rather than losing the handle to it — boardEdit has
    // one open-edit slot, and losing that handle would strand it open.
    finishDrag();
    dragRef.current = beginBallDrag();
    dropGroupsRef.current = playerGroups(scene);
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
      <group ref={shapeRef} rotation={UPRIGHT}>
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
