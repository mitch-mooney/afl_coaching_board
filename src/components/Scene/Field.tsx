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
      
      {/* Goal posts and behind posts - Team 1 end (negative X) */}
      <GoalPosts position={[-FIELD_CONFIG.length / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      
      {/* Goal posts and behind posts - Team 2 end (positive X) */}
      <GoalPosts position={[FIELD_CONFIG.length / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      
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
  const goalX = FIELD_CONFIG.length / 2;
  
  return (
    <group>
      {/* Goal line at Team 1 end (negative X) */}
      <line position={[-goalX, 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, -halfLength, 0, 0, halfLength])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" linewidth={2} />
      </line>
      
      {/* Goal line at Team 2 end (positive X) */}
      <line position={[goalX, 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, -halfLength, 0, 0, halfLength])}
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
  const goalX = FIELD_CONFIG.length / 2;
  const squareX = goalX - squareDepth / 2; // Positioned in front of goal line
  
  return (
    <group>
      {/* Goal square at Team 1 end (negative X) */}
      <group position={[-squareX, 0.02, 0]}>
        {/* Front line (kick-off line) - parallel to goal line */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-squareDepth / 2, 0, -halfWidth, -squareDepth / 2, 0, halfWidth])}
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
              array={new Float32Array([-squareDepth / 2, 0, -halfWidth, squareDepth / 2, 0, -halfWidth])}
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
              array={new Float32Array([-squareDepth / 2, 0, halfWidth, squareDepth / 2, 0, halfWidth])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" linewidth={1} />
        </line>
      </group>
      
      {/* Goal square at Team 2 end (positive X) */}
      <group position={[squareX, 0.02, 0]}>
        {/* Front line (kick-off line) - parallel to goal line */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([squareDepth / 2, 0, -halfWidth, squareDepth / 2, 0, halfWidth])}
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
              array={new Float32Array([-squareDepth / 2, 0, -halfWidth, squareDepth / 2, 0, -halfWidth])}
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
              array={new Float32Array([-squareDepth / 2, 0, halfWidth, squareDepth / 2, 0, halfWidth])}
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
  const goalX = FIELD_CONFIG.length / 2;
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
  
  // Team 1 end markers (negative X)
  const team1NineMetreX = -goalX + nineMetreDistance;
  // Approximate boundary intersection points
  const team1TopZ = -FIELD_CONFIG.width / 2 * 0.7; // Approximate
  const team1BottomZ = FIELD_CONFIG.width / 2 * 0.7;
  markers.push(createMarker(team1NineMetreX - markerOffset, team1TopZ, 0));
  markers.push(createMarker(team1NineMetreX - markerOffset, team1BottomZ, 0));
  
  // Team 2 end markers (positive X)
  const team2NineMetreX = goalX - nineMetreDistance;
  const team2TopZ = -FIELD_CONFIG.width / 2 * 0.7;
  const team2BottomZ = FIELD_CONFIG.width / 2 * 0.7;
  markers.push(createMarker(team2NineMetreX + markerOffset, team2TopZ, Math.PI));
  markers.push(createMarker(team2NineMetreX + markerOffset, team2BottomZ, Math.PI));
  
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
  const goalX = FIELD_CONFIG.length / 2;
  const dotRadius = 0.3; // Visual size of dot
  const dotX1 = -goalX + blueDotDistance; // Team 1 end
  const dotX2 = goalX - blueDotDistance; // Team 2 end
  
  return (
    <group>
      {/* Blue dot at Team 1 end */}
      <mesh position={[dotX1, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[dotRadius, 16]} />
        <meshBasicMaterial color="#0066ff" />
      </mesh>
      
      {/* Blue dot at Team 2 end */}
      <mesh position={[dotX2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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
            array={new Float32Array([0, 0, -outerRadius, 0, 0, outerRadius])}
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
  const radius = FIELD_CONFIG.fiftyMetreArcRadius; // 50m radius
  const segments = 256; // More segments for smoother arc
  const goalX = length / 2;
  
  // Create arcs at each end, drawn between boundary lines
  // Arc center is at goal line center (x=±goalX, z=0), radius is 50m
  // The arc apex is 50m from the goal line center, curving toward center of field
  // The arc stops where it intersects with the boundary ellipse
  const createArc = (centerX: number, directionTowardCenter: number) => {
    const points: number[] = [];
    
    // Check if a point on the arc is within or on the boundary ellipse
    const isWithinBoundary = (x: number, z: number): boolean => {
      const normalizedX = (2 * x) / length;
      const normalizedZ = (2 * z) / width;
      const distSquared = normalizedX * normalizedX + normalizedZ * normalizedZ;
      return distSquared <= 1.0001;
    };
    
    // Generate points on the half-circle and only include those within boundary
    // The arc is parameterized from angle π (top) to 0 (bottom) in the rotated coordinate system
    // At angle π/2, we have the apex which is 50m from goal line center
    
    for (let i = 0; i <= segments; i++) {
      // Angle from π (top) to 0 (bottom) - this creates a half-circle
      const angle = Math.PI - (Math.PI * i) / segments;
      
      // Calculate point on arc (rotated 90 degrees - Z becomes X, X becomes -Z)
      const z = radius * Math.cos(angle);  // Vertical component in rotated space
      const x = centerX + directionTowardCenter * radius * Math.sin(angle);  // Horizontal component curving toward center
      
      // Only include points that are within or on the boundary
      // This naturally clips the arc at the boundary intersections
      if (isWithinBoundary(x, z)) {
        points.push(x, 0, z);
      } else if (points.length > 0) {
        // If we encounter a point outside boundary after having points inside,
        // we've crossed the boundary - stop adding points for this segment
        // (We'll continue in case there are disconnected segments, but typically
        // there shouldn't be for a 50m arc)
      }
    }
    
    // Filter to ensure we only keep the continuous segment within boundary
    // Find first and last valid points
    if (points.length === 0) return [];
    
    // Return all points as they should form a continuous arc within boundary
    return points;
  };
  
  // Team 1 end arc (centerX = -goalX) - arc curves toward center (positive X direction)
  // Apex is at (x=-goalX + 50m, z=0)
  const team1ArcPoints = createArc(-goalX, 1);
  // Team 2 end arc (centerX = goalX) - arc curves toward center (negative X direction)
  // Apex is at (x=goalX - 50m, z=0)
  const team2ArcPoints = createArc(goalX, -1);
  
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
