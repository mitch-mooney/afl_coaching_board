import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, Vector3, Plane } from 'three';
import { Ball } from '../../models/BallModel';
import { useBallStore } from '../../store/ballStore';
import { useAnimationStore } from '../../store/animationStore';
import { usePathStore } from '../../store/pathStore';
import { snapToField } from '../../utils/fieldGeometry';

interface BallProps {
  ball: Ball;
}

export function BallComponent({ ball }: BallProps) {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { isBallSelected, selectBall, updateBallPosition } = useBallStore();
  const { isPlaying, getPositionForPath, tick } = useAnimationStore();
  const { getPathByEntity } = usePathStore();
  const { camera, raycaster } = useThree();

  // Get the ball's movement path (if any)
  const ballPath = getPathByEntity(ball.id, 'ball');

  useFrame((state, delta) => {
    // Handle animation playback - update ball position along path
    if (isPlaying && ballPath && !isDragging) {
      // Advance animation progress
      tick(delta);

      // Get interpolated position from path at current progress
      const animatedPosition = getPositionForPath(ballPath, true);

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

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    selectBall(true);
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
      position={ball.position}
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
      {/* Ball mesh - sphere shape */}
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[ball.size, 16, 16]} />
        <meshStandardMaterial
          color={isBallSelected ? '#ffff00' : hovered ? '#CD853F' : ball.color}
          emissive={isBallSelected ? '#ffff00' : ball.color}
          emissiveIntensity={isBallSelected ? 0.3 : 0.15}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Selection indicator ring */}
      {isBallSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -ball.size + 0.01, 0]}>
          <ringGeometry args={[ball.size + 0.1, ball.size + 0.2, 16]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}
