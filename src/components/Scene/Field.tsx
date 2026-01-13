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
      
      {/* Center circles - two concentric circles */}
      <CenterCircles />
      
      {/* 50m arcs */}
      <FiftyMeterArcs />
      
      {/* Goal posts and behind posts - Team 1 end (negative Z) */}
      <GoalPosts position={[0, 0, -FIELD_CONFIG.width / 2]} />
      
      {/* Goal posts and behind posts - Team 2 end (positive Z) */}
      <GoalPosts position={[0, 0, FIELD_CONFIG.width / 2]} rotation={[0, Math.PI, 0]} />
      
      {/* Goal lines - 19.2m long at each end */}
      <GoalLines />
      
      {/* Goal squares - 6.4m x 9m in front of each goal */}
      <GoalSquares />
      
      {/* Nine-metre line markers (radial markings outside boundary) */}
      <NineMetreLineMarkers />
      
      {/* Blue dots - 15m in front of center of kick-off line */}
      <BlueDots />
      
      {/* Field markings - boundary lines */}
      <FieldBoundary />
      
      {/* Lighting helper */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 100, 50]} intensity={0.8} castShadow />
    </group>
  );
}

function GoalPosts({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const goalPostSpacing = FIELD_CONFIG.goalPostSpacing;
  const goalPostHeight = FIELD_CONFIG.goalPostHeight;
  const behindPostSpacing = FIELD_CONFIG.behindPostSpacing;
  const behindPostHeight = FIELD_CONFIG.behindPostHeight;
  const postThickness = 0.15;
  
  return (
    <group position={position} rotation={rotation}>
      {/* Left goal post */}
      <mesh position={[-goalPostSpacing / 2, goalPostHeight / 2, 0]} castShadow>
        <boxGeometry args={[postThickness, goalPostHeight, postThickness]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Right goal post */}
      <mesh position={[goalPostSpacing / 2, goalPostHeight / 2, 0]} castShadow>
        <boxGeometry args={[postThickness, goalPostHeight, postThickness]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Crossbar */}
      <mesh position={[0, goalPostHeight, 0]} castShadow>
        <boxGeometry args={[goalPostSpacing, postThickness, postThickness]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Left behind post (6.4m to the left of left goal post) */}
      <mesh position={[-goalPostSpacing / 2 - behindPostSpacing, behindPostHeight / 2, 0]} castShadow>
        <boxGeometry args={[postThickness, behindPostHeight, postThickness]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Right behind post (6.4m to the right of right goal post) */}
      <mesh position={[goalPostSpacing / 2 + behindPostSpacing, behindPostHeight / 2, 0]} castShadow>
        <boxGeometry args={[postThickness, behindPostHeight, postThickness]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function GoalLines() {
  const goalLineLength = FIELD_CONFIG.goalLineLength;
  const halfLength = goalLineLength / 2;
  const goalZ = FIELD_CONFIG.width / 2;
  
  return (
    <group>
      {/* Goal line at Team 1 end (negative Z) */}
      <line position={[0, 0.02, -goalZ]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-halfLength, 0, 0, halfLength, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" linewidth={2} />
      </line>
      
      {/* Goal line at Team 2 end (positive Z) */}
      <line position={[0, 0.02, goalZ]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-halfLength, 0, 0, halfLength, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" linewidth={2} />
      </line>
    </group>
  );
}

function GoalSquares() {
  const squareWidth = FIELD_CONFIG.goalSquareWidth;
  const squareDepth = FIELD_CONFIG.goalSquareDepth;
  const halfWidth = squareWidth / 2;
  const goalZ = FIELD_CONFIG.width / 2;
  const squareZ = goalZ - squareDepth / 2; // Positioned in front of goal line
  
  return (
    <group>
      {/* Goal square at Team 1 end (negative Z) */}
      <group position={[0, 0.02, -squareZ]}>
        {/* Front line (kick-off line) - parallel to goal line */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-halfWidth, 0, -squareDepth / 2, halfWidth, 0, -squareDepth / 2])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" linewidth={1} />
        </line>
        {/* Left side line */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-halfWidth, 0, -squareDepth / 2, -halfWidth, 0, squareDepth / 2])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" linewidth={1} />
        </line>
        {/* Right side line */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([halfWidth, 0, -squareDepth / 2, halfWidth, 0, squareDepth / 2])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" linewidth={1} />
        </line>
      </group>
      
      {/* Goal square at Team 2 end (positive Z) */}
      <group position={[0, 0.02, squareZ]}>
        {/* Front line (kick-off line) - parallel to goal line */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-halfWidth, 0, squareDepth / 2, halfWidth, 0, squareDepth / 2])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" linewidth={1} />
        </line>
        {/* Left side line */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-halfWidth, 0, -squareDepth / 2, -halfWidth, 0, squareDepth / 2])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" linewidth={1} />
        </line>
        {/* Right side line */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([halfWidth, 0, -squareDepth / 2, halfWidth, 0, squareDepth / 2])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" linewidth={1} />
        </line>
      </group>
    </group>
  );
}

function NineMetreLineMarkers() {
  // Nine-metre line markers: radial markings outside boundary line
  // indicating where the nine-metre line crosses the boundary
  const nineMetreDistance = FIELD_CONFIG.nineMetreLineDistance;
  const goalZ = FIELD_CONFIG.width / 2;
  const markerLength = 2; // Length of radial marker
  const markerOffset = 0.5; // Distance outside boundary
  
  // Calculate where nine-metre line intersects boundary (oval)
  // The nine-metre line extends from the goal square (9m from goal line)
  // We need to find intersection points with the oval boundary
  
  const createMarker = (x: number, z: number, angle: number) => {
    const endX = x + markerLength * Math.cos(angle);
    const endZ = z + markerLength * Math.sin(angle);
    return { start: [x, 0, z], end: [endX, 0, endZ] };
  };
  
  // For each end, create two markers (one on each side of the field)
  // Approximate positions where nine-metre line would cross boundary
  const markers: Array<{ start: number[]; end: number[] }> = [];
  
  // Team 1 end markers (negative Z)
  const team1NineMetreZ = -goalZ + nineMetreDistance;
  // Approximate boundary intersection points
  const team1LeftX = -FIELD_CONFIG.length / 2 * 0.7; // Approximate
  const team1RightX = FIELD_CONFIG.length / 2 * 0.7;
  markers.push(createMarker(team1LeftX, team1NineMetreZ - markerOffset, Math.PI / 2));
  markers.push(createMarker(team1RightX, team1NineMetreZ - markerOffset, Math.PI / 2));
  
  // Team 2 end markers (positive Z)
  const team2NineMetreZ = goalZ - nineMetreDistance;
  const team2LeftX = -FIELD_CONFIG.length / 2 * 0.7;
  const team2RightX = FIELD_CONFIG.length / 2 * 0.7;
  markers.push(createMarker(team2LeftX, team2NineMetreZ + markerOffset, -Math.PI / 2));
  markers.push(createMarker(team2RightX, team2NineMetreZ + markerOffset, -Math.PI / 2));
  
  return (
    <group>
      {markers.map((marker, i) => (
        <line key={i} position={[0, 0.02, 0]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([...marker.start, ...marker.end])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" linewidth={1} />
        </line>
      ))}
    </group>
  );
}

function BlueDots() {
  // Blue dots: 15 m (16 yd) in front of the centre of each kick-off line
  const blueDotDistance = FIELD_CONFIG.blueDotDistance;
  const goalZ = FIELD_CONFIG.width / 2;
  const dotRadius = 0.3; // Visual size of dot
  const dotZ1 = -goalZ + blueDotDistance; // Team 1 end
  const dotZ2 = goalZ - blueDotDistance; // Team 2 end
  
  return (
    <group>
      {/* Blue dot at Team 1 end */}
      <mesh position={[0, 0.02, dotZ1]}>
        <circleGeometry args={[dotRadius, 16]} />
        <meshBasicMaterial color="#0066ff" />
      </mesh>
      
      {/* Blue dot at Team 2 end */}
      <mesh position={[0, 0.02, dotZ2]}>
        <circleGeometry args={[dotRadius, 16]} />
        <meshBasicMaterial color="#0066ff" />
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

function CenterCircles() {
  // Two concentric circles: 3m diameter (1.5m radius) and 10m diameter (5m radius)
  const innerRadius = FIELD_CONFIG.centerCircleInnerRadius;
  const outerRadius = FIELD_CONFIG.centerCircleOuterRadius;
  const lineWidth = 0.05;
  
  return (
    <group>
      {/* Inner circle (3m diameter) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[innerRadius - lineWidth, innerRadius, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Outer circle (10m diameter) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[outerRadius - lineWidth, outerRadius, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Bisecting line (wing-to-wing) */}
      <line position={[0, 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-outerRadius, 0, 0, outerRadius, 0, 0])}
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
  const radius = FIELD_CONFIG.fiftyMetreArcRadius;
  const segments = 128; // More segments for smoother arc
  const goalZ = width / 2;
  
  // Create arcs at each end, drawn between boundary lines
  // Arc center is at goal line center (x=0, z=±goalZ), radius is 50m from goal line
  const createArc = (centerZ: number) => {
    const points: number[] = [];
    
    // Generate arc points and filter to those within boundary
    // Arc spans from one boundary intersection to the other
    for (let i = 0; i <= segments; i++) {
      // Arc angle: from -90° to +90° relative to goal line (perpendicular to field)
      const angle = -Math.PI / 2 + (Math.PI * i) / segments;
      const x = radius * Math.cos(angle);
      const z = centerZ + radius * Math.sin(angle);
      
      // Check if point is within field boundary (ellipse)
      const normalizedX = (2 * x) / length;
      const normalizedZ = (2 * z) / width;
      const distSquared = normalizedX * normalizedX + normalizedZ * normalizedZ;
      
      // Include points that are on or just inside the boundary
      if (distSquared <= 1.001) {
        points.push(x, 0, z);
      }
    }
    
    return points;
  };
  
  // Team 1 end arc (negative Z) - arc curves toward center of field
  const team1ArcPoints = createArc(-goalZ);
  // Team 2 end arc (positive Z) - arc curves toward center of field
  const team2ArcPoints = createArc(goalZ);
  
  return (
    <group>
      {team1ArcPoints.length > 0 && (
        <line position={[0, 0.02, 0]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={team1ArcPoints.length / 3}
              array={new Float32Array(team1ArcPoints)}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" linewidth={1} />
        </line>
      )}
      {team2ArcPoints.length > 0 && (
        <line position={[0, 0.02, 0]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={team2ArcPoints.length / 3}
              array={new Float32Array(team2ArcPoints)}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" linewidth={1} />
        </line>
      )}
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
