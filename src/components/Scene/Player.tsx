import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { Mesh, Vector3, Plane } from 'three';
import { Player } from '../../models/PlayerModel';
import { usePlayerStore } from '../../store/playerStore';
import { snapToField } from '../../utils/fieldGeometry';

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
  const { selectedPlayerId, selectPlayer, updatePlayerPosition, showPlayerNames, startEditingPlayerName, setDragging } = usePlayerStore();
  const { camera, raycaster } = useThree();
  const isSelected = selectedPlayerId === player.id;

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
        updatePlayerPosition(player.id, [x, 0, z]);
      }
    }
  });
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    if (isSelected) {
      // Click on already-selected player opens name edit
      startEditingPlayerName(player.id);
    } else {
      selectPlayer(player.id);
    }
  };
  
  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    selectPlayer(player.id);
    setIsDragging(true);
    setDragging(true);  // Notify store to disable camera controls
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
        setHovered(false);
        if (isDragging) {
          setIsDragging(false);
          setDragging(false);  // Re-enable camera controls
        }
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
