import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { Mesh, Vector3, Plane } from 'three';
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
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Track all movement points during drag for curved path recording
  const movementPoints = useRef<[number, number, number][]>([]);
  const lastRecordedPos = useRef<[number, number, number] | null>(null);
  const dragStartTime = useRef<number>(0);
  // Store pre-drag position for undo
  const preDragSnapshot = useRef<{ position: [number, number, number] } | null>(null);
  const { selectedPlayerId, selectPlayer, updatePlayerPosition, showPlayerNames, startEditingPlayerName, setDragging, players } = usePlayerStore();
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
    if (meshRef.current) {
      meshRef.current.rotation.y = player.rotation;
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
        const newPos: [number, number, number] = [x, 0, z];
        updatePlayerPosition(player.id, newPos);

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

    // Capture pointer for smooth dragging - prevents camera from stealing events
    if (e.target && e.target.setPointerCapture) {
      e.target.setPointerCapture(e.pointerId);
    }

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
    if (isDragging) {
      e.stopPropagation();
    }
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
  }, [player.id, player.position, addPath, pushSnapshot, players]);

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
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => {
        // Only update hover state, don't end drag here
        // Drag is ended by window-level pointerup event for reliability
        setHovered(false);
      }}
    >
      {/* Player body - torso with jersey */}
      <mesh ref={meshRef} castShadow position={[0, 0.75, 0]}>
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
