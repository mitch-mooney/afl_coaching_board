import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { Player } from '../../models/PlayerModel';
import { usePlayerStore } from '../../store/playerStore';
import {
  useHistoryStore,
  createPlayerSnapshot,
  captureAnnotationSnapshots,
} from '../../store/historyStore';
import { useAnimationStore } from '../../store/animationStore';
import { usePenStore } from '../../store/penStore';
import { positionToZone } from '../../utils/fieldGeometry';
import { useActiveBoundary } from '../../hooks/useActiveBoundary';
import { snapPointerToField, dragRotation, facingRotation } from '../../utils/dragMath';
import { authoringIntent } from '../../utils/inputContract';
import { getTeamById } from '../../data/aflTeams';

// Maximum character length for player name labels before truncation
const MAX_NAME_LENGTH = 12;

// Leg animation constants (8-bit style)
const LEG_AMPITUDE = 0.4;        // Radians (~23°) leg swing amplitude
const SPEED_THRESHOLD = 0.2;      // Minimum speed to trigger animation
const DECAY_TIME = 300;           // ms to fade to static after stopping
const BASE_FREQUENCY = 8;         // Radians per second base frequency

// Leg geometry. The thigh mesh used to be centred on its pivot group at
// y = 0.41; the hip is half a thigh above that, and the pivot belongs there.
const THIGH_HEIGHT = 0.65;
const HIP_Y = 0.41 + THIGH_HEIGHT / 2;  // 0.735

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
  const leftThighRef = useRef<any>(null);
  const rightThighRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
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
  // Animation time for leg cycle
  const animTimeRef = useRef<number>(0);
  const { selectedPlayerId, selectPlayer, updatePlayerPosition, updatePlayerRotation, labelMode, startEditingPlayerName, setDragging, setPlayerPosition, players, getPlayerMoveState } = usePlayerStore();
  const { pushSnapshot } = useHistoryStore();
  const isPlaying = useAnimationStore((state) => state.isPlaying);
  const { camera, raycaster } = useThree();
  const isSelected = selectedPlayerId === player.id;
  const boundary = useActiveBoundary();

  // Disable dragging while an animation is playing (the playback loop owns
  // player positions during play).
  const isDragDisabled = isPlaying;


  useFrame((state, delta) => {
    // Apply rotation to the entire group so all body parts rotate together
    if (groupRef.current) {
      groupRef.current.rotation.y = player.rotation;
    }

    // Handle leg animations
    const moveState = getPlayerMoveState(player.id);
    const speed = moveState?.speed ?? 0;
    const now = Date.now();
    const isMoving = speed > SPEED_THRESHOLD;

    if (isMoving) {
      // Update animation time based on speed
      const timeMultiplier = 1 + (speed * 0.5);
      animTimeRef.current += delta * BASE_FREQUENCY * timeMultiplier;

      // Calculate leg angles
      const leftThighAngle = Math.sin(animTimeRef.current) * LEG_AMPITUDE;
      const rightThighAngle = Math.sin(animTimeRef.current + Math.PI) * LEG_AMPITUDE;

      // Apply rotations to leg pivots. X swings the leg forward/back in the
      // player's local frame; Y would spin it about its own long axis.
      if (leftThighRef.current) {
        leftThighRef.current.rotation.x = leftThighAngle;
      }
      if (rightThighRef.current) {
        rightThighRef.current.rotation.x = rightThighAngle;
      }
    } else {
      // Decay: reset legs to static position
      const timeSinceLastMove = now - (moveState?.lastMoveTime ?? now);
      if (timeSinceLastMove < DECAY_TIME) {
        const decayFactor = 1 - (timeSinceLastMove / DECAY_TIME);
        if (leftThighRef.current) {
          leftThighRef.current.rotation.x = leftThighRef.current.rotation.x * decayFactor;
        }
        if (rightThighRef.current) {
          rightThighRef.current.rotation.x = rightThighRef.current.rotation.x * decayFactor;
        }
      } else {
        // Fully reset to static
        if (leftThighRef.current) {
          leftThighRef.current.rotation.x = 0;
        }
        if (rightThighRef.current) {
          rightThighRef.current.rotation.x = 0;
        }
      }
    }

    // Handle rotation (right-click drag)
    if (isRotating && rotationStartRef.current) {
      const newRotation = dragRotation(
        rotationStartRef.current.startRotation,
        rotationStartRef.current.clientX,
        state.pointer.x,
        window.innerWidth,
      );
      updatePlayerRotation(player.id, newRotation);
    }

    // Handle dragging with global pointer events
    if (isDragging && !isRotating) {
      const field = snapPointerToField(state.pointer, camera, raycaster, boundary);

      if (field) {
        const [x, z] = field;
        const newPos: [number, number, number] = [x, 0, z];
        updatePlayerPosition(player.id, newPos);

        // Auto-rotate player to face movement direction. prevDragPos only
        // advances when a facing is actually applied — matching the old logic.
        if (prevDragPos.current) {
          const newRotation = facingRotation(prevDragPos.current, newPos);
          if (newRotation !== null) {
            updatePlayerRotation(player.id, newRotation);
            prevDragPos.current = newPos;
          }
        } else {
          prevDragPos.current = newPos;
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

    // The pen authors, the finger manipulates: an authoring pointer is drawing on
    // the board, so it must not also drag the player out from under the stroke.
    const authoring = authoringIntent({
      pointerType: e.pointerType,
      armedTip: usePenStore.getState().armedTip,
      button: e.button,
    });
    if (authoring === 'author') return;

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

  /**
   * Finishes a reposition. A drag only ever moves the player now — a
   * MovementPath comes from a Path-tip Stroke, never from dragging.
   */
  const finishReposition = useCallback(() => {
    const startPos = preDragSnapshot.current?.position;
    const finalPos = player.position;

    // Record the pre-drag state for undo, but only if the player actually moved.
    if (startPos && (startPos[0] !== finalPos[0] || startPos[2] !== finalPos[2])) {
      pushSnapshot({
        players: players.map(p =>
          p.id === player.id
            ? { id: p.id, position: startPos, rotation: p.rotation }
            : createPlayerSnapshot(p)
        ),
        annotations: captureAnnotationSnapshots(),
      });
    }

    // F6: Auto-suggest position from drop zone if player has none
    if (!player.positionName) {
      const suggested = positionToZone(finalPos[0], finalPos[2], boundary);
      if (suggested) {
        setPlayerPosition(player.id, suggested);
      }
    }

    preDragSnapshot.current = null;
    prevDragPos.current = null;
  }, [boundary, player.id, player.position, player.positionName, pushSnapshot, players, setPlayerPosition]);

  // End dragging helper - used by both pointerUp and window events
  const endDragging = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    setDragging(false);
    dragPointerIdRef.current = null;
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

      {/* Left leg - pivot group sits at the hip (top of the thigh) so the leg
          swings from the hip rather than about its own midpoint. Children are
          offset down by half the thigh height, leaving the rest pose unchanged. */}
      <group ref={leftThighRef} position={[-0.11, HIP_Y, 0]}>
        <mesh castShadow position={[0, -THIGH_HEIGHT / 2, 0]}>
          <boxGeometry args={[0.22, THIGH_HEIGHT, 0.22]} />
          <meshStandardMaterial color={shortsColor} roughness={0.7} />
        </mesh>
        {/* Left shoe */}
        <mesh position={[0, -0.65 - THIGH_HEIGHT / 2, 0.05]}>
          <boxGeometry args={[0.24, 0.08, 0.28]} />
          <meshStandardMaterial color="#333333" roughness={0.8} />
        </mesh>
      </group>

      {/* Right leg - see the left leg comment for the hip-pivot offset */}
      <group ref={rightThighRef} position={[0.11, HIP_Y, 0]}>
        <mesh castShadow position={[0, -THIGH_HEIGHT / 2, 0]}>
          <boxGeometry args={[0.22, THIGH_HEIGHT, 0.22]} />
          <meshStandardMaterial color={shortsColor} roughness={0.7} />
        </mesh>
        {/* Right shoe */}
        <mesh position={[0, -0.65 - THIGH_HEIGHT / 2, 0.05]}>
          <boxGeometry args={[0.24, 0.08, 0.28]} />
          <meshStandardMaterial color="#333333" roughness={0.8} />
        </mesh>
      </group>

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

      {/* Player number — Billboard faces camera so it's always readable */}
      {player.number && (
        <Billboard position={[0, 1.08, 0.15]} follow={true}>
          <Text
            font="/fonts/Inter-Bold.woff"
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
      {labelMode === 'name' && formatDisplayName(player.playerName) && (
        <Billboard position={[0, 2.1, 0]} follow={true} lockX={false} lockY={false} lockZ={false}>
          <Text
            font="/fonts/Inter-Bold.woff"
            fontSize={0.4}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
            maxWidth={3}
          >
            {formatDisplayName(player.playerName)}
          </Text>
        </Billboard>
      )}

      {/* Position code label - shown independently of name label */}
      {labelMode === 'position' && player.positionName && (
        <Billboard position={[0, 2.1, 0]} follow={true} lockX={false} lockY={false} lockZ={false}>
          <Text
            font="/fonts/Inter-Bold.woff"
            fontSize={0.38}
            color="#ffeb3b"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {player.positionName}
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
