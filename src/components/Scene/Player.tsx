import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, Vector3, Plane } from 'three';
import { Player } from '../../models/PlayerModel';
import { usePlayerStore } from '../../store/playerStore';
import { snapToField } from '../../utils/fieldGeometry';

interface PlayerProps {
  player: Player;
}

export function PlayerComponent({ player }: PlayerProps) {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { selectedPlayerId, selectPlayer, updatePlayerPosition } = usePlayerStore();
  const { camera, raycaster } = useThree();
  const isSelected = selectedPlayerId === player.id;
  
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
    selectPlayer(player.id);
  };
  
  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    selectPlayer(player.id);
    setIsDragging(true);
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
        setIsDragging(false);
      }}
    >
      {/* Player body - capsule shape */}
      <mesh ref={meshRef} castShadow position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.3, 1.2, 4, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#ffff00' : hovered ? '#ffffff' : player.color}
          emissive={isSelected ? '#ffff00' : player.color}
          emissiveIntensity={isSelected ? 0.3 : 0.1}
        />
      </mesh>
      
      {/* Player number label */}
      {player.number && (
        <mesh position={[0, 1.5, 0.35]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.4, 0.4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
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
