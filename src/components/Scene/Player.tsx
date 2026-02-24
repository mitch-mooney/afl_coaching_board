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
import { useUIStore } from '../../store/uiStore';
import { useAnnotationStore } from '../../store/annotationStore';
import { snapToField, positionToZone } from '../../utils/fieldGeometry';
import { createPathFromWaypoints, Waypoint } from '../../models/PathModel';
import { getTeamById } from '../../data/aflTeams';

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
  const { selectedPlayerId, selectPlayer, updatePlayerPosition, updatePlayerRotation, showPlayerNames, startEditingPlayerName, setDragging, setPlayerPosition, players } = usePlayerStore();
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
  const displayName = useMemo(() => {
    const name = formatDisplayName(player.playerName);
    const pos = player.positionName;
    if (name && pos) return `${name} (${pos})`;
    if (pos) return pos;
    return name;
  }, [player.playerName, player.positionName]);

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

    // F3: Apple Pencil — if an annotation tool is active and the input is a pen, skip drag
    // This lets the pencil draw annotations without inadvertently moving players
    if (e.pointerType === 'pen') {
      const { selectedTool } = useAnnotationStore.getState();
      if (selectedTool) return;
      // Also check the global isPenDrawing flag (set by useAnnotationInteraction)
      if (useUIStore.getState().isPenDrawing) return;
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

    // F6: Auto-suggest position from drop zone if player has none
    if (!player.positionName) {
      const [fx, fz] = [player.position[0], player.position[2]];
      const suggested = positionToZone(fx, fz);
      if (suggested) {
        setPlayerPosition(player.id, suggested);
      }
    }

    // Reset tracking
    movementPoints.current = [];
    lastRecordedPos.current = null;
    preDragSnapshot.current = null;
    prevDragPos.current = null;
  }, [player.id, player.position, player.positionName, addPath, pushSnapshot, players, setPlayerPosition]);

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

  // Skin tone and derived colors
  const skinColor =
    player.skinTone === 'dark' ? '#5c3317' :
    player.skinTone === 'medium' ? '#c68642' :
    '#f5c5a0';

  const teamPreset = useMemo(() => {
    return player.teamPresetId ? getTeamById(player.teamPresetId) : null;
  }, [player.teamPresetId]);

  const jerseyColor = isSelected ? '#ffff00' : hovered ? '#ffffff' : player.color;
  const jerseyEmissive = isSelected ? '#ffff00' : player.color;
  const jerseyEmissiveIntensity = isSelected ? 0.3 : 0.1;
  const shortsColor = isSelected ? '#cccc00' : (teamPreset?.shortsColor ?? '#2a2a2a');
  // Arms show secondary colour for Minecraft-style two-tone
  const armColor = isSelected ? '#ffff00' : hovered ? '#ffffff' : (teamPreset?.secondaryColor ?? player.color);
  const armEmissive = isSelected ? '#ffff00' : (teamPreset?.secondaryColor ?? player.color);

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
        setHovered(false);
      }}
    >
      {/* ── Minecraft-style box geometry player ── */}

      {/* Body (torso) */}
      <mesh castShadow position={[0, 1.08, 0]}>
        <boxGeometry args={[0.50, 0.70, 0.28]} />
        <meshStandardMaterial
          color={jerseyColor}
          emissive={jerseyEmissive}
          emissiveIntensity={jerseyEmissiveIntensity}
          roughness={0.6}
        />
      </mesh>

      {/* Head */}
      <mesh castShadow position={[0, 1.62, 0]}>
        <boxGeometry args={[0.38, 0.38, 0.38]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>

      {/* Hair (top half of head) */}
      <mesh position={[0, 1.72, 0]}>
        <boxGeometry args={[0.39, 0.19, 0.40]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
      </mesh>

      {/* Left arm — secondary colour for two-tone effect */}
      <mesh castShadow position={[-0.35, 1.08, 0]}>
        <boxGeometry args={[0.18, 0.60, 0.18]} />
        <meshStandardMaterial
          color={armColor}
          emissive={armEmissive}
          emissiveIntensity={isSelected ? 0.3 : 0.05}
          roughness={0.6}
        />
      </mesh>

      {/* Right arm — secondary colour for two-tone effect */}
      <mesh castShadow position={[0.35, 1.08, 0]}>
        <boxGeometry args={[0.18, 0.60, 0.18]} />
        <meshStandardMaterial
          color={armColor}
          emissive={armEmissive}
          emissiveIntensity={isSelected ? 0.3 : 0.05}
          roughness={0.6}
        />
      </mesh>

      {/* Left leg */}
      <mesh castShadow position={[-0.11, 0.41, 0]}>
        <boxGeometry args={[0.22, 0.65, 0.22]} />
        <meshStandardMaterial color={shortsColor} roughness={0.7} />
      </mesh>

      {/* Right leg */}
      <mesh castShadow position={[0.11, 0.41, 0]}>
        <boxGeometry args={[0.22, 0.65, 0.22]} />
        <meshStandardMaterial color={shortsColor} roughness={0.7} />
      </mesh>

      {/* Left shoe */}
      <mesh position={[-0.11, 0.04, 0.05]}>
        <boxGeometry args={[0.24, 0.08, 0.28]} />
        <meshStandardMaterial color="#333333" roughness={0.8} />
      </mesh>

      {/* Right shoe */}
      <mesh position={[0.11, 0.04, 0.05]}>
        <boxGeometry args={[0.24, 0.08, 0.28]} />
        <meshStandardMaterial color="#333333" roughness={0.8} />
      </mesh>

      {/* Left eye */}
      <mesh position={[-0.09, 1.65, 0.19]}>
        <boxGeometry args={[0.08, 0.06, 0.02]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* Right eye */}
      <mesh position={[0.09, 1.65, 0.19]}>
        <boxGeometry args={[0.08, 0.06, 0.02]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* Player number on front of body */}
      {player.number && (
        <Billboard position={[0, 1.08, 0.15]} follow={false}>
          <Text
            fontSize={0.22}
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
