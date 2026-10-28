// @ts-nocheck - Disable TypeScript checks for this file due to Three.js JSX primitive type issues
import { useRef, useMemo, useEffect } from 'react';
import { Mesh, BufferGeometry, LineBasicMaterial, Float32BufferAttribute, Line as ThreeLine, CanvasTexture, RepeatWrapping, Object3D } from 'three';
import { FIELD_MARKINGS } from '../../models/FieldModel';
import { type Boundary, type FieldPoint, boundaryPoints, fiftyMetreArcPoints } from '../../utils/fieldGeometry';
import { useActiveBoundary } from '../../hooks/useActiveBoundary';
import { BLUE_DOT, backdropOrder, chalk, nightFill, skyColours, towerLights, turfStripes } from './nightGround';
import { Stadium } from './Stadium';

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
function FieldLine({ points, color = chalk, linewidth = 1, position = [0, 0, 0] }: FieldLineProps) {
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
 * The four light towers: the ground's main source of light. Each is a spotlight
 * aimed into its own quadrant, so light pools under it and the grass between
 * the pools falls dark; a lamp head marks where the light comes from.
 *
 * Built off the Boundary, so the towers stand back from whichever Venue is
 * active. Each spotlight's target is a scene object of its own, because three
 * aims a spotlight at its target's world position and a target left out of the
 * scene sits at the origin.
 */
function LightTowers({ boundary }: { boundary: Boundary }) {
  const towers = useMemo(
    () =>
      towerLights(boundary).map((tower) => {
        const target = new Object3D();
        target.position.set(...tower.target);
        return { ...tower, targetObject: target };
      }),
    [boundary.semiX, boundary.semiZ],
  );

  return (
    <group>
      {towers.map((tower, i) => (
        <group key={i}>
          <primitive object={tower.targetObject} />
          <spotLight
            position={tower.position}
            target={tower.targetObject}
            intensity={tower.intensity}
            angle={tower.angle}
            penumbra={tower.penumbra}
            decay={2}
            color={skyColours.lamp}
            castShadow={tower.castShadow}
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0005}
            shadow-camera-near={20}
            shadow-camera-far={400}
          />
          <mesh position={tower.position}>
            <boxGeometry args={[4, 1.5, 4]} />
            <meshBasicMaterial color={skyColours.lampHead} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

interface FieldProps {
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

/**
 * The ground, at a night game under lights: the turf, its markings, the Stadium
 * and the towers that light it. Night is the only look, so the board and the
 * shared-link viewer render this same ground. Colours and lights come from
 * `nightGround`.
 */
export function Field({ boundary: boundaryOverride }: FieldProps) {
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
      ctx.fillStyle = turfStripes[i % 2];
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
      {/* Main field surface - oval shape. Drawn before the Stadium's apron, which covers its corners */}
      <mesh ref={fieldRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={backdropOrder.turf}>
        <planeGeometry args={[boundary.semiX * 2, boundary.semiZ * 2, 32, 32]} />
        <meshStandardMaterial map={stripeTexture} roughness={0.95} />
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

      {/* The stand round the ground */}
      <Stadium boundary={boundary} />

      {/* A low fill, so the grass between the towers' pools falls dark */}
      <hemisphereLight args={[nightFill.sky, nightFill.ground, nightFill.intensity]} />

      <LightTowers boundary={boundary} />
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
        <meshStandardMaterial color={chalk} />
      </mesh>

      {/* Right goal post (taller) */}
      <mesh position={[goalPostSpacing / 2, goalPostHeight / 2, 0]} castShadow>
        <boxGeometry args={[postThickness, goalPostHeight, postThickness]} />
        <meshStandardMaterial color={chalk} />
      </mesh>

      {/* Left behind post (6.4m to the left of left goal post) */}
      <mesh position={[-goalPostSpacing / 2 - behindPostSpacing, behindPostHeight / 2, 0]} castShadow>
        <boxGeometry args={[postThickness, behindPostHeight, postThickness]} />
        <meshStandardMaterial color={chalk} />
      </mesh>

      {/* Right behind post (6.4m to the right of right goal post) */}
      <mesh position={[goalPostSpacing / 2 + behindPostSpacing, behindPostHeight / 2, 0]} castShadow>
        <boxGeometry args={[postThickness, behindPostHeight, postThickness]} />
        <meshStandardMaterial color={chalk} />
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
        <lineBasicMaterial color={chalk} linewidth={2} />
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
        <lineBasicMaterial color={chalk} linewidth={2} />
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
          <lineBasicMaterial color={chalk} linewidth={1} />
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
          <lineBasicMaterial color={chalk} linewidth={1} />
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
          <lineBasicMaterial color={chalk} linewidth={1} />
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
          <lineBasicMaterial color={chalk} linewidth={1} />
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
          <lineBasicMaterial color={chalk} linewidth={1} />
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
          <lineBasicMaterial color={chalk} linewidth={1} />
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
          <lineBasicMaterial color={chalk} linewidth={1} />
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
          <lineBasicMaterial color={chalk} linewidth={1} />
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
        <meshBasicMaterial color={BLUE_DOT} />
      </mesh>
     
      {/* Blue dot at Team 2 end */}
      <mesh position={[dotX2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[dotRadius, 16]} />
        <meshBasicMaterial color={BLUE_DOT} />
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
        <lineBasicMaterial color={chalk} linewidth={1} />
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
        <lineBasicMaterial color={chalk} linewidth={1} />
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
        <lineBasicMaterial color={chalk} linewidth={1} />
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
        <lineBasicMaterial color={chalk} linewidth={1} />
      </line>
    </group>
  );
}

function CenterCircles() {
  // Two concentric circles: 3m diameter (1.5m radius) and 10m diameter (5m radius)
  const innerRadius = FIELD_MARKINGS.centerCircleInnerRadius;
  const outerRadius = FIELD_MARKINGS.centerCircleOuterRadius;
  const lineWidth = 0.05;
 
  // Unlit, like every other painted line, so the circles stay Chalk between the
  // towers' pools instead of fading with the grass.
  return (
    <group>
      {/* Inner circle (3m diameter) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[innerRadius - lineWidth, innerRadius, 32]} />
        <meshBasicMaterial color={chalk} />
      </mesh>

      {/* Outer circle (10m diameter) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[outerRadius - lineWidth, outerRadius, 32]} />
        <meshBasicMaterial color={chalk} />
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
        <lineBasicMaterial color={chalk} linewidth={1} />
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
  //
  // The clipped curve itself comes from fieldGeometry — the module that owns
  // the Boundary — rather than being sampled again here, so this scene cannot
  // disagree with clamping or Out of bounds about where the ground ends.
  const [team1ArcPoints, team2ArcPoints] = useMemo(() => {
    const segments = 256; // More segments for smoother arc
    const toTriples = (points: FieldPoint[]): number[] =>
      points.flatMap(([x, z]) => [x, 0, z]);

    return [
      toTriples(fiftyMetreArcPoints(boundary, 'team1', segments)),
      toTriples(fiftyMetreArcPoints(boundary, 'team2', segments)),
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
  //
  // Sampled by fieldGeometry rather than a second time here, so the painted
  // line and the edge players clamp to are the same edge.
  const points = useMemo(
    () => boundaryPoints(boundary, segments).flatMap(([x, z]) => [x, 0, z]),
    [boundary.semiX, boundary.semiZ],
  );

  return <FieldLine points={points} linewidth={2} position={[0, 0.02, 0]} />;
}