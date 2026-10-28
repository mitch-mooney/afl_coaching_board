import { useEffect, useMemo } from 'react';
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  MeshBasicMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { Boundary } from '../../utils/fieldGeometry';
import { type StadiumShape, backdropOrder, crowdTile, stadiumRing, stadiumShape, standColours } from './nightGround';

/** Segments round each ring of the Stadium. */
const SEGMENTS = 128;
/** The apron is the floor out past the stand, so nothing green shows beyond it. */
const APRON_REACH = 250;
/** Metres behind the top row over which the apron darkens to the floor. */
const FLOOR_FADE = 30;
/** Just above the grass, so the apron covers the corners of the field's plane without fighting it. */
const APRON_Y = 0.05;

/** A point on the Stadium's profile: a setback outside the Boundary, a height, and its colour. */
interface ProfilePoint {
  setback: number;
  y: number;
  colour: Color;
}

/**
 * One surface of the Stadium: a band swept all the way round between two
 * profile points, the inner first. Its faces point towards the field, or up,
 * and nowhere else, so a camera behind or inside a stand culls them and sees
 * the field through it.
 *
 * UVs are in metres: `u` round the ring, `v` out along the ground from `inner`.
 * `u` is measured along the band's middle ring and shared by both edges, so the
 * texture runs straight out from the field rather than shearing round the ring.
 */
function sweepBand(boundary: Boundary, inner: ProfilePoint, outer: ProfilePoint) {
  const positions: number[] = [];
  const colours: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const ellipse = (setback: number, theta: number): [number, number] => {
    const { semiX, semiZ } = stadiumRing(boundary, setback);
    return [semiX * Math.cos(theta), semiZ * Math.sin(theta)];
  };
  const arcs = [0];
  const middle = (inner.setback + outer.setback) / 2;
  for (let i = 1; i <= SEGMENTS; i++) {
    const [x0, z0] = ellipse(middle, ((i - 1) / SEGMENTS) * Math.PI * 2);
    const [x1, z1] = ellipse(middle, (i / SEGMENTS) * Math.PI * 2);
    arcs.push(arcs[i - 1] + Math.hypot(x1 - x0, z1 - z0));
  }

  for (const point of [inner, outer]) {
    for (let i = 0; i <= SEGMENTS; i++) {
      const [x, z] = ellipse(point.setback, (i / SEGMENTS) * Math.PI * 2);
      positions.push(x, point.y, z);
      colours.push(point.colour.r, point.colour.g, point.colour.b);
      uvs.push(arcs[i], point.setback - inner.setback);
    }
  }

  const row = SEGMENTS + 1;
  for (let i = 0; i < SEGMENTS; i++) {
    const a = i;
    const b = i + 1;
    const c = row + i + 1;
    const d = row + i;
    // Walking the profile outwards and up, this winding faces the field.
    indices.push(a, b, d, b, c, d);
  }
  return { positions, colours, uvs, indices };
}

/** Several bands as one geometry, so each Stadium surface is one draw call. */
function mergeBands(bands: ReturnType<typeof sweepBand>[]): BufferGeometry {
  const positions: number[] = [];
  const colours: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const band of bands) {
    const offset = positions.length / 3;
    positions.push(...band.positions);
    colours.push(...band.colours);
    uvs.push(...band.uvs);
    indices.push(...band.indices.map((index) => index + offset));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/** The apron, the fence and the wall below the front row: everything but the seats. */
function surroundGeometry({ boundary, fence, frontRow, topRow }: StadiumShape): BufferGeometry {
  const apron = new Color(standColours.apron);
  const floor = new Color(standColours.floor);
  const fenceColour = new Color(standColours.fence);
  const wall = new Color(standColours.frontWall);
  return mergeBands([
    sweepBand(boundary, { setback: 0, y: APRON_Y, colour: apron }, { setback: topRow.setback, y: APRON_Y, colour: apron }),
    sweepBand(
      boundary,
      { setback: topRow.setback, y: APRON_Y, colour: apron },
      { setback: topRow.setback + FLOOR_FADE, y: APRON_Y, colour: floor },
    ),
    sweepBand(
      boundary,
      { setback: topRow.setback + FLOOR_FADE, y: APRON_Y, colour: floor },
      { setback: APRON_REACH, y: APRON_Y, colour: floor },
    ),
    sweepBand(
      boundary,
      { setback: fence.setback, y: APRON_Y, colour: fenceColour },
      { setback: fence.setback, y: fence.height, colour: fenceColour },
    ),
    sweepBand(
      boundary,
      { setback: frontRow.setback, y: APRON_Y, colour: wall },
      { setback: frontRow.setback, y: frontRow.height, colour: wall },
    ),
  ]);
}

/**
 * The raked deck from the front row to the top row. Its vertex colours shade
 * the seat texture, full at the front row and darkening to the back.
 */
function deckGeometry({ boundary, frontRow, topRow }: StadiumShape): BufferGeometry {
  const front = new Color(1, 1, 1);
  const back = new Color().setRGB(standColours.backShade, standColours.backShade, standColours.backShade, SRGBColorSpace);
  return mergeBands([
    sweepBand(
      boundary,
      { setback: frontRow.setback, y: frontRow.height, colour: front },
      { setback: topRow.setback, y: topRow.height, colour: back },
    ),
  ]);
}

/** Canvas pixels per seat, across the row and up it. */
const SEAT_PX = 16;
const ROW_PX = 32;

/**
 * The crowd, tiled along the deck in metres: `crowdTile`'s rows of people, each
 * row's seats over the shadow at its foot. Mipmapped, so far rows blend rather
 * than shimmer.
 */
function crowdTexture(rowDepth: number): CanvasTexture {
  const tile = crowdTile();
  const canvas = document.createElement('canvas');
  canvas.width = tile.seatsPerRow * SEAT_PX;
  canvas.height = tile.rows * ROW_PX;
  const ctx = canvas.getContext('2d')!;
  // The dark between and behind the people, so they stand out against it.
  ctx.fillStyle = standColours.rowShadow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  tile.seats.forEach((row, r) => {
    // The canvas is flipped onto the deck: its bottom is the front row, and
    // the bottom of each row's band is the foot of that row.
    const foot = canvas.height - r * ROW_PX;
    // The lip of the row: the seat backs of the row in front.
    ctx.fillStyle = standColours.frontWall;
    ctx.fillRect(0, foot - ROW_PX * 0.12, canvas.width, ROW_PX * 0.12);
    row.forEach((spectator, s) => {
      if (!spectator) {
        // An empty seat shows as a seat.
        ctx.fillStyle = standColours.seat;
        ctx.fillRect(s * SEAT_PX + SEAT_PX * 0.15, foot - ROW_PX * 0.45, SEAT_PX * 0.7, ROW_PX * 0.33);
        return;
      }
      const middle = (s + 0.5) * SEAT_PX + spectator.sway * SEAT_PX * 0.15;
      const shoulders = foot - ROW_PX * (0.62 + spectator.stature * 0.12);
      const width = SEAT_PX * 0.8;
      ctx.fillStyle = spectator.shirt;
      ctx.fillRect(middle - width / 2, shoulders, width, foot - ROW_PX * 0.12 - shoulders);
      ctx.fillStyle = spectator.head;
      ctx.beginPath();
      ctx.ellipse(middle, shoulders - SEAT_PX * 0.2, SEAT_PX * 0.24, SEAT_PX * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1 / (tile.seatsPerRow * tile.seatWidth), 1 / (tile.rows * rowDepth));
  texture.anisotropy = 4;
  return texture;
}

/**
 * The Stadium: a single raked deck the same all the way round the ground, with
 * a concrete apron and a low fence between it and the Boundary (#136). Its shape
 * is `stadiumShape`, from the Boundary alone.
 *
 * A backdrop, and cheap: two unlit meshes that take the fog, cast and receive no
 * shadows, and have their shading baked in. The geometry is rebuilt, not
 * mutated, when the Boundary changes: R3F never re-uploads a declarative buffer
 * attribute's new array to the GPU (see `FieldLine`).
 */
export function Stadium({ boundary }: { boundary: Boundary }) {
  const shape = useMemo(() => stadiumShape(boundary), [boundary.semiX, boundary.semiZ]);
  const surround = useMemo(() => surroundGeometry(shape), [shape]);
  const deck = useMemo(() => deckGeometry(shape), [shape]);

  // A Venue switch strands the previous ground's buffers otherwise.
  useEffect(() => () => surround.dispose(), [surround]);
  useEffect(() => () => deck.dispose(), [deck]);

  // Not tone mapped: the Stadium's greys are its colours on screen, so the
  // ceiling at the lit turf holds where the coach sees it.
  // No depth written: board content drawn after it draws over it (#139).
  const materials = useMemo(() => {
    const map = crowdTexture(shape.rowDepth);
    return {
      surround: new MeshBasicMaterial({ vertexColors: true, toneMapped: false, depthWrite: false }),
      deck: new MeshBasicMaterial({ vertexColors: true, map, toneMapped: false, depthWrite: false }),
    };
  }, [shape.rowDepth]);
  useEffect(
    () => () => {
      materials.surround.dispose();
      materials.deck.map?.dispose();
      materials.deck.dispose();
    },
    [materials],
  );

  return (
    <group name="Stadium">
      {/* Never picked: a tap over the stand is a tap outside the field. */}
      <mesh geometry={surround} material={materials.surround} renderOrder={backdropOrder.apron} raycast={() => null} />
      <mesh geometry={deck} material={materials.deck} renderOrder={backdropOrder.deck} raycast={() => null} />
    </group>
  );
}
