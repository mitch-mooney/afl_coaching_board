import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, PlaneGeometry } from 'three';
import { FIELD_CONFIG } from '../../models/FieldModel';

export function Field() {
  const fieldRef = useRef<Mesh>(null);
  
  return (
    <group>
      {/* Main field surface - oval shape */}
      <mesh ref={fieldRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[FIELD_CONFIG.length, FIELD_CONFIG.width, 32, 32]} />
        <meshStandardMaterial color="#2d5016" /> {/* Green grass color */}
      </mesh>
      
      {/* Center square outline */}
      <CenterSquare />
      
      {/* Center circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[FIELD_CONFIG.centerCircleRadius - 0.05, FIELD_CONFIG.centerCircleRadius, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* 50m arcs */}
      <FiftyMeterArcs />
      
      {/* Goal posts - Team 1 end */}
      <GoalPosts position={[0, 0, -FIELD_CONFIG.width / 2]} />
      
      {/* Goal posts - Team 2 end */}
      <GoalPosts position={[0, 0, FIELD_CONFIG.width / 2]} rotation={[0, Math.PI, 0]} />
      
      {/* Field markings - boundary lines */}
      <FieldBoundary />
      
      {/* Lighting helper */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 100, 50]} intensity={0.8} castShadow />
    </group>
  );
}

function GoalPosts({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const postWidth = FIELD_CONFIG.goalPostWidth;
  const postHeight = FIELD_CONFIG.goalPostHeight;
  const postThickness = 0.15;
  
  return (
    <group position={position} rotation={rotation}>
      {/* Left post */}
      <mesh position={[-postWidth / 2, postHeight / 2, 0]} castShadow>
        <boxGeometry args={[postThickness, postHeight, postThickness]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Right post */}
      <mesh position={[postWidth / 2, postHeight / 2, 0]} castShadow>
        <boxGeometry args={[postThickness, postHeight, postThickness]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Crossbar */}
      <mesh position={[0, postHeight, 0]} castShadow>
        <boxGeometry args={[postWidth, postThickness, postThickness]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function CenterSquare() {
  const size = FIELD_CONFIG.centerSquareSize;
  const halfSize = size / 2;
  
  return (
    <group>
      {/* Top line */}
      <line position={[0, 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-halfSize, 0, -halfSize, halfSize, 0, -halfSize])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" linewidth={1} />
      </line>
      {/* Bottom line */}
      <line position={[0, 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-halfSize, 0, halfSize, halfSize, 0, halfSize])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" linewidth={1} />
      </line>
      {/* Left line */}
      <line position={[0, 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-halfSize, 0, -halfSize, -halfSize, 0, halfSize])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" linewidth={1} />
      </line>
      {/* Right line */}
      <line position={[0, 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([halfSize, 0, -halfSize, halfSize, 0, halfSize])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" linewidth={1} />
      </line>
    </group>
  );
}

function FiftyMeterArcs() {
  const { length, width } = FIELD_CONFIG;
  const radius = 50;
  const segments = 32;
  
  // Create arcs at each end of the field
  const createArc = (centerZ: number, startAngle: number, endAngle: number) => {
    const points: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / segments);
      const x = radius * Math.cos(angle);
      const z = centerZ + radius * Math.sin(angle);
      points.push(x, 0, z);
    }
    return points;
  };
  
  // Top arc (Team 1 end)
  const topArcPoints = createArc(-width / 2, Math.PI, 0);
  // Bottom arc (Team 2 end)
  const bottomArcPoints = createArc(width / 2, 0, Math.PI);
  
  return (
    <group>
      <line position={[0, 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={topArcPoints.length / 3}
            array={new Float32Array(topArcPoints)}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" linewidth={1} />
      </line>
      <line position={[0, 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={bottomArcPoints.length / 3}
            array={new Float32Array(bottomArcPoints)}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" linewidth={1} />
      </line>
    </group>
  );
}

function FieldBoundary() {
  const { length, width } = FIELD_CONFIG;
  const segments = 64;
  
  return (
    <group>
      {/* Create boundary line using multiple line segments */}
      {Array.from({ length: segments }).map((_, i) => {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;
        
        const x1 = (length / 2) * Math.cos(angle1);
        const z1 = (width / 2) * Math.sin(angle1);
        const x2 = (length / 2) * Math.cos(angle2);
        const z2 = (width / 2) * Math.sin(angle2);
        
        return (
          <line key={i} position={[0, 0.02, 0]}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([x1, 0, z1, x2, 0, z2])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ffffff" linewidth={2} />
          </line>
        );
      })}
    </group>
  );
}
