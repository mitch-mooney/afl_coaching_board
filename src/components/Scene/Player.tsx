import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { Vector3, Plane } from 'three';
import { Player } from '../../models/PlayerModel';
import { usePlayerStore } from '../../store/playerStore';
import { usePathStore } from '../../store/pathStore';
import { useHistoryStore, createPlayerSnapshot } from '../../store/historyStore';
import { useAnimationStore } from '../../store/animationStore';
import { useEventStore } from '../../store/eventStore';
import { snapToField } from '../../utils/fieldGeometry';
import { createPathFromWaypoints, Waypoint } from '../../models/PathModel';

// Minimum distance (in meters) between recorded path points to avoid excessive waypoints
const MIN_PATH_POINT_DISTANCE = 1.5;

// Maximum character length for player name labels before truncation
const MAX_NAME_LENGTH = 12;

/**
 * Formats a player name for display:
 * - Trims whitespace
 * - Truncates long names with ellipsis
 * - Returns null for empty/whitespace-only names
 */
function formatDisplayName(name: string | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_NAME_LENGTH) {
    return trimmed.slice(0, MAX_NAME_LENGTH - 1) + '…';
  }
  return trimmed;
}

interface PlayerProps {
  player: Player;
}

export function PlayerComponent({ player }: PlayerProps) {
  const groupRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  // Track all movement points during drag for curved path recording
  const movementPoints = useRef<[number, number, number][]>([]);
  const lastRecordedPos = useRef<[number, number, number] | null>(null);
  const dragStartTime = useRef<number>(0);
  // Store pre-drag position for undo
  const preDragSnapshot = useRef<{ position: [number, number, number] } | null>(null);
  // Track touch count to distinguish single-finger drag from multi-touch camera gestures
  const touchCountRef = useRef<number>(0);
  // Store the pointer ID that initiated the drag to track it specifically
  const dragPointerIdRef = useRef<number | null>(null);
  // Track previous position for auto-rotation during drag
  const prevDragPos = useRef<[number, number, number] | null>(null);
  // Track rotation start state for right-click rotation
  const rotationStartRef = useRef<{ clientX: number; startRotation: number } | null>(null);
  const { selectedPlayerId, selectPlayer, updatePlayerPosition, updatePlayerRotation, showPlayerNames, startEditingPlayerName, setDragging, players } = usePlayerStore();
  const { addPath, getPathByEntity, removePath } = usePathStore();
  const { pushSnapshot } = useHistoryStore();
  const isPlaying = useAnimationStore((state) => state.isPlaying);
  const isEventMode = useEventStore((state) => state.isEventMode);
  const { camera, raycaster } = useThree();
  const isSelected = selectedPlayerId === player.id;

  // Check if dragging should be disabled (during event mode animation playback)
  const isDragDisabled = isEventMode && isPlaying;

  // Get existing path for this player (if any)
  const existingPath = getPathByEntity(player.id, 'player');

  // Memoize the formatted display name for performance with many players
  const displayName = useMemo(
    () => formatDisplayName(player.playerName),
    [player.playerName]
  );
  
  useFrame((state) => {
    // Apply rotation to the entire group so all body parts rotate together
    if (groupRef.current) {
      groupRef.current.rotation.y = player.rotation;
    }

    // Handle rotation (right-click drag)
    if (isRotating && rotationStartRef.current) {
      const clientX = state.pointer.x * window.innerWidth / 2;
      const deltaX = clientX - (rotationStartRef.current.clientX - window.innerWidth / 2);
      const rotationDelta = deltaX * 0.01; // Sensitivity factor
      const newRotation = rotationStartRef.current.startRotation + rotationDelta;
      updatePlayerRotation(player.id, newRotation);
    }

    // Handle dragging with global pointer events
    if (isDragging && !isRotating) {
      raycaster.setFromCamera(state.pointer, camera);
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const intersection = raycaster.ray.intersectPlane(
        new Plane(planeNormal, -planeNormal.dot(planePoint)),
        new Vector3()
      );

      if (intersection) {
        const [x, z] = snapToField(intersection.x, intersection.z);
        const newPos: [number, number, number] = [x, 0, z];
        updatePlayerPosition(player.id, newPos);

        // Auto-rotate player to face movement direction
        if (prevDragPos.current) {
          const deltaX = newPos[0] - prevDragPos.current[0];
          const deltaZ = newPos[2] - prevDragPos.current[2];
          const moveDist = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);

          // Only update rotation if moved enough to determine direction
          if (moveDist > 0.3) {
            const newRotation = Math.atan2(deltaX, deltaZ);
            updatePlayerRotation(player.id, newRotation);
            prevDragPos.current = newPos;
          }
        } else {
          prevDragPos.current = newPos;
        }

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
    if (isSelected) {
      // Click on already-selected player opens name edit, but not during animation
      if (!isDragDisabled) {
        startEditingPlayerName(player.id);
      }
    } else {
      selectPlayer(player.id);
    }
  };
  
  const handlePointerDown = (e: any) => {
    e.stopPropagation();

    // Always allow selection (for POV camera targeting), but skip drag setup during animation
    selectPlayer(player.id);

    // During event mode animation playback, disable dragging to prevent conflicts
    // Players should still be selectable for POV camera targeting
    if (isDragDisabled) {
      return;
    }

    // For touch events, check if this is a multi-touch gesture (2+ fingers)
    // If so, don't start player drag - let camera gestures handle it instead
    if (e.pointerType === 'touch' && touchCountRef.current > 1) {
      return;
    }

    // Capture pointer for smooth dragging - prevents camera from stealing events
    if (e.target && e.target.setPointerCapture) {
      e.target.setPointerCapture(e.pointerId);
    }

    // Store the pointer ID that initiated the drag
    dragPointerIdRef.current = e.pointerId;

    setIsDragging(true);
    setDragging(true);  // Notify store to disable camera controls

    // Save pre-drag position for undo
    const startPos = [...player.position] as [number, number, number];
    preDragSnapshot.current = { position: startPos };

    // Initialize movement tracking for path recording
    movementPoints.current = [startPos];
    lastRecordedPos.current = startPos;
    dragStartTime.current = Date.now();

    // Remove any existing path for this player to start fresh
    if (existingPath) {
      removePath(existingPath.id);
    }
  };
  
  const handlePointerMove = (e: any) => {
    // Movement is handled in useFrame for smoother dragging
    if (isDragging || isRotating) {
      e.stopPropagation();
    }
  };

  const handleContextMenu = (e: any) => {
    e.nativeEvent.preventDefault();
    e.stopPropagation();

    if (isDragDisabled) return;

    selectPlayer(player.id);
    setIsRotating(true);
    setDragging(true);
    rotationStartRef.current = {
      clientX: e.nativeEvent.clientX,
      startRotation: player.rotation,
    };
  };
  
  // Helper to create path from recorded movement points
  const createPathFromMovement = useCallback(() => {
    // Add final position if different from last recorded
    const finalPos = [...player.position] as [number, number, number];
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

        const path = createPathFromWaypoints(player.id, 'player', waypoints);
        addPath(path);

        // Save snapshot for undo (pre-drag state)
        if (preDragSnapshot.current) {
          pushSnapshot({
            players: players.map(p =>
              p.id === player.id
                ? { id: p.id, position: preDragSnapshot.current!.position, rotation: p.rotation }
                : createPlayerSnapshot(p)
            ),
            annotations: [],
          });
        }
      }
    }

    // Reset tracking
    movementPoints.current = [];
    lastRecordedPos.current = null;
    preDragSnapshot.current = null;
    prevDragPos.current = null;
  }, [player.id, player.position, addPath, pushSnapshot, players]);

  // End dragging helper - used by both pointerUp and window events
  const endDragging = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    setDragging(false);
    dragPointerIdRef.current = null;
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

  // Track global touch count to cancel drag when multi-touch is detected
  // This prevents player drag from conflicting with two-finger camera gestures
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchCountRef.current = e.touches.length;
      // If we're dragging and a second finger is added, cancel the drag
      // This allows two-finger gestures (pan/zoom) to take over
      if (isDragging && e.touches.length > 1) {
        // Cancel the drag without creating a path
        setIsDragging(false);
        setDragging(false);
        dragPointerIdRef.current = null;
        // Reset movement tracking without creating path
        movementPoints.current = [];
        lastRecordedPos.current = null;
        preDragSnapshot.current = null;
        prevDragPos.current = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchCountRef.current = e.touches.length;
    };

    const handleTouchCancel = (e: TouchEvent) => {
      touchCountRef.current = e.touches.length;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isDragging, setDragging]);

  // Handle rotation end (right-click drag release)
  useEffect(() => {
    if (!isRotating) return;

    const handleEnd = () => {
      setIsRotating(false);
      setDragging(false);
      rotationStartRef.current = null;
    };

    const preventContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('contextmenu', preventContextMenu);

    return () => {
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [isRotating, setDragging]);

  const handlePointerUp = (e: any) => {
    e.stopPropagation();

    // Release pointer capture
    if (e.target && e.target.releasePointerCapture) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer was not captured
      }
    }

    // Delegate to endDragging which handles everything
    endDragging();
  };
  
  return (
    <group
      ref={groupRef}
      position={player.position}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => {
        // Only update hover state, don't end drag here
        // Drag is ended by window-level pointerup event for reliability
        setHovered(false);
      }}
    >
      {/* Player body - torso with jersey */}
      <mesh castShadow position={[0, 0.75, 0]}>
        <capsuleGeometry args={[0.35, 0.8, 8, 16]} />
        <meshStandardMaterial
          color={isSelected ? '#ffff00' : hovered ? '#ffffff' : player.color}
          emissive={isSelected ? '#ffff00' : player.color}
          emissiveIntensity={isSelected ? 0.3 : 0.1}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Player head */}
      <mesh castShadow position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial
          color="#e8c4a0"
          roughness={0.7}
          metalness={0}
        />
      </mesh>

      {/* Left eye - on front of head (positive Z is forward when rotation=0) */}
      <mesh position={[-0.07, 1.58, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#222222" />
      </mesh>

      {/* Right eye */}
      <mesh position={[0.07, 1.58, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#222222" />
      </mesh>

      {/* Hair/helmet */}
      <mesh position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.18, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#4a3728"
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Left arm */}
      <mesh castShadow position={[-0.45, 0.75, 0]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#ffff00' : hovered ? '#ffffff' : player.color}
          emissive={isSelected ? '#ffff00' : player.color}
          emissiveIntensity={isSelected ? 0.3 : 0.05}
          roughness={0.6}
        />
      </mesh>

      {/* Right arm */}
      <mesh castShadow position={[0.45, 0.75, 0]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#ffff00' : hovered ? '#ffffff' : player.color}
          emissive={isSelected ? '#ffff00' : player.color}
          emissiveIntensity={isSelected ? 0.3 : 0.05}
          roughness={0.6}
        />
      </mesh>

      {/* Left leg */}
      <mesh castShadow position={[-0.15, 0.15, 0]}>
        <capsuleGeometry args={[0.12, 0.5, 4, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#cccc00' : '#2a2a2a'}
          roughness={0.7}
        />
      </mesh>

      {/* Right leg */}
      <mesh castShadow position={[0.15, 0.15, 0]}>
        <capsuleGeometry args={[0.12, 0.5, 4, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#cccc00' : '#2a2a2a'}
          roughness={0.7}
        />
      </mesh>

      {/* Shoulders */}
      <mesh castShadow position={[0, 1.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.12, 0.55, 4, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#ffff00' : hovered ? '#ffffff' : player.color}
          emissive={isSelected ? '#ffff00' : player.color}
          emissiveIntensity={isSelected ? 0.3 : 0.05}
          roughness={0.6}
        />
      </mesh>

      {/* Player number on jersey (front) */}
      {player.number && (
        <Billboard position={[0, 0.9, 0.36]} follow={false}>
          <Text
            fontSize={0.25}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {player.number}
          </Text>
        </Billboard>
      )}

      {/* Player name label - uses Billboard to always face camera */}
      {showPlayerNames && displayName && (
        <Billboard position={[0, 2.1, 0]} follow={true} lockX={false} lockY={false} lockZ={false}>
          <Text
            fontSize={0.4}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
            maxWidth={3}
          >
            {displayName}
          </Text>
        </Billboard>
      )}

      {/* Selection indicator ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.5, 0.6, 16]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}
