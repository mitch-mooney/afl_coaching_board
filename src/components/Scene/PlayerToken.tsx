import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Guernsey } from '../../utils/guernsey';
import type { JerseyPattern } from '../../data/aflTeams';
import { TOKEN_MIN_POINTS, tokenDiameter } from '../../utils/cameraMath';

/** The plain centre's share of the token's diameter. */
const CENTRE_RATIO = 0.6;
/** Half the angle of the facing notch cut into the band. */
const NOTCH_HALF_ANGLE = (22 * Math.PI) / 180;
/** The number's type size on the smallest token, in CSS points. */
const LABEL_POINTS = 18;
/**
 * The label's type size as a share of the diameter: 18-point type when the
 * token sits on its 32-point floor, growing with the token above it. Two digits
 * run a little past the plain centre, so the outline in the main colour keeps
 * them clear of the band's pattern.
 */
const LABEL_SIZE = LABEL_POINTS / TOKEN_MIN_POINTS;
/** The outline round the label's digits, as a share of the diameter. */
const LABEL_OUTLINE = 0.035;
/** The label's height above the disc, as a share of the diameter. */
const LABEL_LIFT = 0.15;
/** Above the ground markings (0.02 m), below the drill preview's dots. */
const TOKEN_HEIGHT = 0.06;
/** Pixels across the band texture. */
const TEXTURE_SIZE = 256;

const TAU = Math.PI * 2;

/** One of the pattern's colours, cycling when the pattern has more stripes than colours. */
function colourAt(colours: string[], i: number): string {
  return colours[i % colours.length];
}

/**
 * The guernsey's pattern as seen from above, painted across the whole texture.
 * The caller clips it to the band. Vertical stripes run down the body, so from
 * overhead they become spokes; hoops and horizontal stripes run round it, so
 * they become rings.
 */
function paintPattern(ctx: CanvasRenderingContext2D, pattern: JerseyPattern, colours: string[]) {
  const c = TEXTURE_SIZE / 2;
  const inner = c * CENTRE_RATIO;
  const band = c - inner;

  const ring = (from: number, to: number, colour: string) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(c, c, inner + band * to, 0, TAU);
    ctx.arc(c, c, inner + band * from, 0, TAU, true);
    ctx.fill();
  };
  const sector = (from: number, to: number, colour: string) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, c, from, to);
    ctx.closePath();
    ctx.fill();
  };
  const strip = (x1: number, y1: number, x2: number, y2: number, width: number, colour: string) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  switch (pattern) {
    case 'solid':
      return;
    case 'vertical-stripes': {
      const spokes = 12;
      for (let i = 0; i < spokes; i += 2) {
        sector((i * TAU) / spokes, ((i + 1) * TAU) / spokes, colourAt(colours, i / 2));
      }
      return;
    }
    case 'horizontal-stripes':
      ring(0.15, 0.3, colourAt(colours, 0));
      ring(0.45, 0.6, colourAt(colours, 1));
      ring(0.75, 0.9, colourAt(colours, 2));
      return;
    case 'hoops':
      ring(0, 0.33, colourAt(colours, 0));
      ring(0.67, 1, colourAt(colours, 1));
      return;
    case 'sash':
      strip(0, 0, TEXTURE_SIZE, TEXTURE_SIZE, band * 0.9, colourAt(colours, 0));
      return;
    case 'vee': {
      // The vee's point is at the front, where the notch is, so it reads as the
      // collar from overhead.
      const width = band * 0.55;
      strip(0, c * 0.3, c, TEXTURE_SIZE, width, colourAt(colours, 0));
      strip(TEXTURE_SIZE, c * 0.3, c, TEXTURE_SIZE, width, colourAt(colours, 0));
      return;
    }
    case 'yoke':
      // Across the shoulders: the two sides of the band, square to the facing.
      sector(-Math.PI / 4, Math.PI / 4, colourAt(colours, 0));
      sector((3 * Math.PI) / 4, (5 * Math.PI) / 4, colourAt(colours, 0));
      return;
  }
}

/**
 * The token's face: the band in the guernsey's pattern, the plain centre in the
 * main colour, and the facing notch cut out of the band. The notch is at the
 * bottom of the image, which the disc's lay-flat turn puts at +z, the way a
 * player at rotation 0 faces.
 */
function paintToken(guernsey: Guernsey): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  const c = TEXTURE_SIZE / 2;
  const inner = c * CENTRE_RATIO;

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, c, 0, TAU);
  ctx.arc(c, c, inner, 0, TAU, true);
  ctx.clip();
  ctx.fillStyle = guernsey.body;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  paintPattern(ctx, guernsey.pattern, guernsey.patternColours);
  ctx.restore();

  ctx.fillStyle = guernsey.body;
  ctx.beginPath();
  ctx.arc(c, c, inner, 0, TAU);
  ctx.fill();

  // A hairline in the label colour marks the centre's edge, so a solid
  // guernsey still shows a band and a centre.
  ctx.strokeStyle = guernsey.label;
  ctx.lineWidth = TEXTURE_SIZE * 0.012;
  ctx.beginPath();
  ctx.arc(c, c, inner, 0, TAU);
  ctx.stroke();

  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(c, c, c + 1, Math.PI / 2 - NOTCH_HALF_ANGLE, Math.PI / 2 + NOTCH_HALF_ANGLE);
  ctx.arc(c, c, inner + ctx.lineWidth, Math.PI / 2 + NOTCH_HALF_ANGLE, Math.PI / 2 - NOTCH_HALF_ANGLE, true);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

/** One texture per guernsey: every player in a team shares it. */
const textures = new Map<string, THREE.CanvasTexture>();

function tokenTexture(guernsey: Guernsey): THREE.CanvasTexture {
  const key = JSON.stringify(guernsey);
  let texture = textures.get(key);
  if (!texture) {
    texture = new THREE.CanvasTexture(paintToken(guernsey));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    textures.set(key, texture);
  }
  return texture;
}

/** The disc's cut-out edge (the notch, the rim) at full opacity. */
const ALPHA_CUTOFF = 0.5;

interface PlayerTokenProps {
  guernsey: Guernsey;
  number?: number;
  /** How far the board is from bodies (0) to tokens (1): the token's opacity. */
  fade: MutableRefObject<number>;
}

/**
 * The disc and its label at a given opacity. The cut-off scales with it, so the
 * notch keeps its edge as the disc fades rather than the whole disc vanishing
 * at half opacity. It never reaches 0, which would recompile the shader.
 */
function applyOpacity(
  material: THREE.MeshBasicMaterial | null,
  label: { fillOpacity: number; outlineOpacity: number } | null,
  opacity: number,
) {
  if (material) {
    material.opacity = opacity;
    material.alphaTest = Math.max(0.01, ALPHA_CUTOFF * opacity);
  }
  if (label) {
    label.fillOpacity = opacity;
    label.outlineOpacity = opacity;
  }
}

/**
 * A Player token: how a player looks from overhead. It sits inside the player's
 * group, so it turns with the player's facing and takes the same pointer events
 * the box figure does. Drawn at 2 m across, or larger when 2 m would read under
 * 32 points on screen.
 */
export function PlayerToken({ guernsey, number, fade }: PlayerTokenProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const labelRef = useRef<{ fillOpacity: number; outlineOpacity: number }>(null);
  const texture = useMemo(() => tokenTexture(guernsey), [guernsey]);
  const worldPosition = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size }) => {
    const group = groupRef.current;
    if (!group) return;
    group.getWorldPosition(worldPosition);
    const perspective = camera as THREE.PerspectiveCamera;
    const diameter = tokenDiameter({
      distance: camera.position.distanceTo(worldPosition),
      fov: perspective.fov,
      zoom: perspective.zoom,
      viewportHeight: size.height,
    });
    group.scale.setScalar(diameter);
    applyOpacity(materialRef.current, labelRef.current, fade.current);
  });

  return (
    <group ref={groupRef} position={[0, TOKEN_HEIGHT, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 48]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          opacity={fade.current}
          alphaTest={Math.max(0.01, ALPHA_CUTOFF * fade.current)}
          toneMapped={false}
        />
      </mesh>
      {number !== undefined && (
        // Lifted so the upright label doesn't sink into the grass when the
        // camera is only just steep enough for tokens.
        <Billboard position={[0, LABEL_LIFT, 0]} follow={true}>
          <Text
            ref={labelRef}
            fillOpacity={fade.current}
            outlineOpacity={fade.current}
            font="/fonts/Inter-Bold.woff"
            fontSize={LABEL_SIZE}
            color={guernsey.label}
            outlineWidth={LABEL_OUTLINE}
            outlineColor={guernsey.body}
            anchorX="center"
            anchorY="middle"
          >
            {number}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
