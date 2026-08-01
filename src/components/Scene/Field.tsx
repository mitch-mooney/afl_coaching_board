// @ts-nocheck - Disable TypeScript checks for this file due to Three.js JSX primitive type issues
import { useRef, useMemo, useEffect } from 'react';
import { Mesh, BufferGeometry, LineBasicMaterial, Float32BufferAttribute, Line as ThreeLine, CanvasTexture, RepeatWrapping, Shape, Path, ShapeGeometry } from 'three';
import { FIELD_MARKINGS } from '../../models/FieldModel';
import { type Boundary } from '../../utils/fieldGeometry';
import { useActiveBoundary } from '../../hooks/useActiveBoundary';

// Helper component to avoid TypeScript JSX issues with lowercase 'line'
interface FieldLineProps {
  points: number[];
  color?: string;
  linewidth?: number;
  position?: [number, number, number];
}

/**
 * A painted line on the ground, built as a real Three object rather than as a
 * declarative <line><bufferGeometry><bufferAttribute array={...}/>.
 *
 * That distinction is the whole point of this helper, and it is not stylistic.
 * R3F applies a changed `array` prop by assigning it to the existing
 * BufferAttribute and never sets `needsUpdate` — so the new coordinates sit in
 * JS while the GPU keeps rendering the old ones. Markings drawn that way froze
 * at whatever ground was active when they first mounted, and a line whose
 * vertex *count* also changed asked the driver for more vertices than its
 * buffer held, which some drivers tolerate and iOS does not: the marking simply
 * vanishes.
 *
 * Rebuilding the object whenever its points change sidesteps all of it — a new
 * BufferAttribute is uploaded once, correctly, at its true size. Callers must
 * therefore hand in a `points` array that is stable across unrelated re-renders
 * (memoise it on the Boundary), or this rebuilds every frame.
 */
function FieldLine({ points, color = '#ffffff', linewidth = 1, position = [0, 0, 0] }: FieldLineProps) {
  const lineObject = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(points, 3));
    const mat = new LineBasicMaterial({ color, linewidth });
    return new ThreeLine(geo, mat);
  }, [points, color, linewidth]);

  // A rebuild strands the previous object's GPU buffers, and switching Venue is
  // something a coach does repeatedly while comparing grounds.
  useEffect(() => () => {
    lineObject.geometry.dispose();
    (lineObject.material as LineBasicMaterial).dispose();
  }, [lineObject]);

  return <primitive object={lineObject} position={position} />;
}

/**
 * Elliptical grandstand bowl around the field boundary.
 * Each tier has a wide bright-blue seat surface + a narrow dark riser divider,
 * creating the alternating light/dark band pattern of real stadium seating.
 * Sized off the ground's Boundary, so the bowl hugs whichever Venue is active.
 */

/** Metres of clearance between the boundary and the first row of seats. */
const STAND_CLEARANCE_X = 7.5;
const STAND_CLEARANCE_Z = 6.5;
// Gradient colour stops for seat rows: inner (near riser shadow) → mid → outer (bright highlight)
const SEAT_GRADIENT: [number, number, number][] = [
  [12,  52, 128],  // darkest — in the shadow of the riser below
  [20,  78, 168],  // mid-dark
  [30,  98, 190],  // MCG blue
  [55, 130, 215],  // lighter blue
  [85, 165, 235],  // brightest — highlight at top of row
];

function StadiumStands({ boundary }: { boundary: Boundary }) {
  const items = useMemo(() => {
    const result: { geo: ShapeGeometry; y: number; color: string }[] = [];

    // Large dark floor covering everything outside the field boundary — eliminates green bleed.
    // The inner hole is the boundary ellipse *exactly*: this apron and snapToField are the same
    // edge, so an entity clamped to the boundary lands on the line rather than half a metre
    // past the paint. The hole used to be hardcoded 0.5 m tighter, which is what hid
    // FieldBoundary's white line underneath it.
    const apronShape = new Shape();
    apronShape.absellipse(0, 0, 350, 300, 0, Math.PI * 2, false, 0);
    const apronHole = new Path();
    apronHole.absellipse(0, 0, boundary.semiX, boundary.semiZ, 0, Math.PI * 2, true, 0);
    apronShape.holes.push(apronHole);
    result.push({ geo: new ShapeGeometry(apronShape, 64), y: 0.05, color: '#08111e' });

    const TIERS = 8;
    const GRAD = SEAT_GRADIENT.length;
    const SEAT_DEPTH = 9;
    const RISER_DEPTH = 2;
    const STEP = SEAT_DEPTH + RISER_DEPTH;
    const stripDepthA = SEAT_DEPTH / GRAD;
    const stripDepthB = (SEAT_DEPTH * 0.82) / GRAD;

    for (let i = 0; i < TIERS; i++) {
      const tY = 0.3 + i * 3.6;
      const tierFade = 1 - i * 0.055; // upper tiers slightly dimmer
      const seatBaseA = boundary.semiX + STAND_CLEARANCE_X + i * STEP;
      const seatBaseB = boundary.semiZ + STAND_CLEARANCE_Z + i * (STEP * 0.82);

      // Seat area: GRAD sub-rings, each a step in the colour gradient
      for (let g = 0; g < GRAD; g++) {
        const innerA = seatBaseA + g * stripDepthA;
        const innerB = seatBaseB + g * stripDepthB;
        const outerA = innerA + stripDepthA;
        const outerB = innerB + stripDepthB;

        const [r, gr, b] = SEAT_GRADIENT[g];
        const color = `rgb(${Math.round(r * tierFade)},${Math.round(gr * tierFade)},${Math.round(b * tierFade)})`;

        const shape = new Shape();
        shape.absellipse(0, 0, outerA, outerB, 0, Math.PI * 2, false, 0);
        const hole = new Path();
        hole.absellipse(0, 0, innerA, innerB, 0, Math.PI * 2, true, 0);
        shape.holes.push(hole);
        // Slight height ramp so rows look angled when viewed from the side
        result.push({ geo: new ShapeGeometry(shape, 64), y: tY + g * 0.18, color });
      }

      // Dark riser — thin strip between tiers
      const riserInnerA = seatBaseA + SEAT_DEPTH;
      const riserInnerB = seatBaseB + SEAT_DEPTH * 0.82;
      const riserShape = new Shape();
      riserShape.absellipse(0, 0, riserInnerA + RISER_DEPTH, riserInnerB + RISER_DEPTH * 0.82, 0, Math.PI * 2, false, 0);
      const riserHole = new Path();
      riserHole.absellipse(0, 0, riserInnerA, riserInnerB, 0, Math.PI * 2, true, 0);
      riserShape.holes.push(riserHole);
      result.push({ geo: new ShapeGeometry(riserShape, 64), y: tY + SEAT_DEPTH * 0.18 + 0.4, color: '#05090f' });
    }

    return result;
  }, [boundary]);

  return (
    <group>
      {items.map((item, i) => (
        <mesh key={i} geometry={item.geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, item.y, 0]}>
          <meshStandardMaterial color={item.color} />
        </mesh>
      ))}
    </group>
  );
}

interface FieldProps {
  darkMode?: boolean;
  /**
   * Render a ground other than the Active Venue. The one caller is the
   * shared-link viewer, which renders on the sender's ground — see
   * `DesignedGround` in `utils/boardSnapshot`.
   *
   * An override rather than a required prop: everywhere else follows the Active
   * Venue, and a board that had to be told its own ground is a board that can be
   * told the wrong one.
   */
  boundary?: Boundary;
}

export function Field({ darkMode = false, boundary: boundaryOverride }: FieldProps) {
  const fieldRef = useRef<Mesh>(null);
  // The ground everything below is sized against.
  const activeBoundary = useActiveBoundary();
  const boundary = boundaryOverride ?? activeBoundary;

  const stripeTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const stripeCount = 16;
    const stripeH = canvas.height / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#3a7c18' : '#448c1e';
      ctx.fillRect(0, i * stripeH, canvas.width, stripeH);
    }
    const tex = new CanvasTexture(canvas);
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group>
      {/* Main field surface - oval shape */}
      <mesh ref={fieldRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[boundary.semiX * 2, boundary.semiZ * 2, 32, 32]} />
        <meshStandardMaterial
          map={darkMode ? undefined : stripeTexture}
          color={darkMode ? '#020a02' : '#ffffff'}
        /> {/* Green grass color */}
      </mesh>
     
      {/* Center square outline */}
      <CenterSquare />

      {/* Center circles - two concentric circles */}
      <CenterCircles />

      {/* 50m arcs */}
      <FiftyMeterArcs boundary={boundary} />

      {/* Goal posts and behind posts - Team 1 end (negative X) */}
      <GoalPosts position={[-boundary.semiX, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

      {/* Goal posts and behind posts - Team 2 end (positive X) */}
      <GoalPosts position={[boundary.semiX, 0, 0]} rotation={[0, Math.PI / 2, 0]} />

      {/* Goal lines - 19.2m long at each end */}
      <GoalLines boundary={boundary} />

      {/* Goal squares - 6.4m x 9m in front of each goal */}
      <GoalSquares boundary={boundary} />

      {/* Nine-metre line markers (radial markings outside boundary) */}
      <NineMetreLineMarkers boundary={boundary} />

      {/* Blue dots - 15m in front of center of kick-off line */}
      <BlueDots boundary={boundary} />

      {/* Field markings - boundary lines */}
      <FieldBoundary boundary={boundary} />

      {/* Stadium seating bowl — not rendered in cinematic dark mode */}
      {!darkMode && <StadiumStands boundary={boundary} />}

      {/* Sky blue above, green below — strong ambient base */}
      <hemisphereLight args={['#8ab4d8', '#2d6b14', 1.1]} />

      {/* Main directional — soft shadows from goal posts */}
      <directionalLight position={[80, 120, 60]} intensity={1.4} castShadow />

      {/* 4 corner floodlights — bright stadium arc lights */}
      <pointLight position={[-100, 130, -85]} intensity={7} color="#fff8e8" distance={450} decay={2} />
      <pointLight position={[100, 130, -85]} intensity={7} color="#fff8e8" distance={450} decay={2} />
      <pointLight position={[-100, 130, 85]} intensity={7} color="#fff8e8" distance={450} decay={2} />
      <pointLight position={[100, 130, 85]} intensity={7} color="#fff8e8" distance={450} decay={2} />
    </group>
  );
}

function GoalPosts({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const goalPostSpacing = FIELD_MARKINGS.goalPostSpacing;
  const behindPostSpacing = FIELD_MARKINGS.behindPostSpacing;
  const behindPostHeight = FIELD_MARKINGS.behindPostHeight;
  // Goal posts (middle two) are 1.25x taller than behind posts (outer two)
  const goalPostHeight = behindPostHeight * 1.3;
  const postThickness = 0.15;

  return (
    <group position={position} rotation={rotation}>
      {/* Left goal post (taller) */}
      <mesh position={[-goalPostSpacing / 2, goalPostHeight / 2, 0]} castShadow>
        <boxGeometry args={[postThickness, goalPostHeight, postThickness]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Right goal post (taller) */}
      <mesh position={[goalPostSpacing / 2, goalPostHeight / 2, 0]} castShadow>
        <boxGeometry args={[postThickness, goalPostHeight, postThickness]} />
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

function GoalLines({ boundary }: { boundary: Boundary }) {
  const goalLineLength = FIELD_MARKINGS.goalLineLength;
  const halfLength = goalLineLength / 2;
  const goalX = boundary.semiX;
 
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

function GoalSquares({ boundary }: { boundary: Boundary }) {
  const squareWidth = FIELD_MARKINGS.goalSquareWidth;
  const squareDepth = FIELD_MARKINGS.goalSquareDepth;
  const halfWidth = squareWidth / 2;
  const goalX = boundary.semiX;
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
        {/* Closing line (goal-line side) */}
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
        {/* Closing line (goal-line side) */}
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
      </group>
    </group>
  );
}

function NineMetreLineMarkers({ boundary }: { boundary: Boundary }) {
  // Nine-metre line markers: radial markings outside boundary line
  // indicating where the nine-metre line crosses the boundary.
  //
  // Every coordinate here is absolute, so the markers have to be rebuilt with
  // the ground rather than mutated in place — see FieldLine. Built entirely
  // inside the memo so the ground's two measurements are the only inputs.
  const markerPoints = useMemo(() => {
    const nineMetreDistance = FIELD_MARKINGS.nineMetreLineDistance;
    const goalX = boundary.semiX;
    const markerLength = 2; // Length of radial marker
    const markerOffset = 0.5; // Distance outside boundary

    // Calculate where nine-metre line intersects boundary (oval)
    // The nine-metre line extends from the goal square (9m from goal line)
    // We need to find intersection points with the oval boundary
    const createMarker = (x: number, z: number, angle: number) => [
      x, 0, z,
      x + markerLength * Math.cos(angle), 0, z + markerLength * Math.sin(angle),
    ];

    // For each end, create two markers (one on each side of the field)
    // Approximate positions where nine-metre line would cross boundary
    const team1NineMetreX = -goalX + nineMetreDistance;
    const team2NineMetreX = goalX - nineMetreDistance;
    const topZ = -boundary.semiZ * 0.7; // Approximate
    const bottomZ = boundary.semiZ * 0.7;

    return [
      createMarker(team1NineMetreX - markerOffset, topZ, 0),
      createMarker(team1NineMetreX - markerOffset, bottomZ, 0),
      createMarker(team2NineMetreX + markerOffset, topZ, Math.PI),
      createMarker(team2NineMetreX + markerOffset, bottomZ, Math.PI),
    ];
  }, [boundary.semiX, boundary.semiZ]);

  return (
    <group>
      {markerPoints.map((points, i) => (
        <FieldLine key={i} points={points} position={[0, 0.02, 0]} />
      ))}
    </group>
  );
}

function BlueDots({ boundary }: { boundary: Boundary }) {
  // Blue dots: 15 m (16 yd) in front of the centre of each kick-off line
  const blueDotDistance = FIELD_MARKINGS.blueDotDistance;
  const goalX = boundary.semiX;
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
  const size = FIELD_MARKINGS.centerSquareSize;
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
  const innerRadius = FIELD_MARKINGS.centerCircleInnerRadius;
  const outerRadius = FIELD_MARKINGS.centerCircleOuterRadius;
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

function FiftyMeterArcs({ boundary }: { boundary: Boundary }) {
  // The arcs are the markings the boundary clips, so their vertex *count*
  // changes with the ground — not just their coordinates. Mutating the array of
  // an already-uploaded attribute then asks the driver for more vertices than
  // the buffer holds, and iOS answers by drawing nothing at all: the arcs
  // disappear on switching Venue and come back on reload. Rebuilding the line
  // objects is what makes the new size real. See FieldLine.
  const [team1ArcPoints, team2ArcPoints] = useMemo(() => {
  const radius = FIELD_MARKINGS.fiftyMetreArcRadius; // 50m radius — the same at every ground
  const segments = 256; // More segments for smoother arc
  const goalX = boundary.semiX;

  // Create arcs at each end, drawn between boundary lines
  // Arc center is at goal line center (x=±goalX, z=0), radius is 50m
  // The arc apex is 50m from the goal line center, curving toward center of field
  // The arc stops where it intersects with the boundary ellipse
  const createArc = (centerX: number, directionTowardCenter: number) => {
    const points: number[] = [];
   
    // Check if a point on the arc is within or on the boundary ellipse
    const isWithinBoundary = (x: number, z: number): boolean => {
      const normalizedX = x / boundary.semiX;
      const normalizedZ = z / boundary.semiZ;
      const distSquared = normalizedX * normalizedX + normalizedZ * normalizedZ;
      // Tolerance keeps the arc's endpoint on the boundary rather than a segment short.
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
 
    return [
      // Team 1 end arc: apex at (x = -goalX + 50 m, z = 0), curving toward centre.
      createArc(-goalX, 1),
      // Team 2 end arc: apex at (x = goalX - 50 m, z = 0), curving toward centre.
      createArc(goalX, -1),
    ];
  }, [boundary.semiX, boundary.semiZ]);

  return (
    <group>
      {team1ArcPoints.length > 0 && (
        <FieldLine points={team1ArcPoints} position={[0, 0.02, 0]} />
      )}
      {team2ArcPoints.length > 0 && (
        <FieldLine points={team2ArcPoints} position={[0, 0.02, 0]} />
      )}
    </group>
  );
}

function FieldBoundary({ boundary }: { boundary: Boundary }) {
  const segments = 64;

  // One closed polyline rather than 64 separate two-point lines. Each of those
  // carried the ground's coordinates in its own array, so each froze at the
  // ground it first mounted on — the white line stayed where the old boundary
  // was while the grass and bowl resized around it, which reads as the grass
  // being the wrong size rather than as the line being stale.
  const points = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(boundary.semiX * Math.cos(angle), 0, boundary.semiZ * Math.sin(angle));
    }
    return pts;
  }, [boundary.semiX, boundary.semiZ]);

  return <FieldLine points={points} linewidth={2} position={[0, 0.02, 0]} />;
}