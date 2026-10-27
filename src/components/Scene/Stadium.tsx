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
import { type StadiumShape, backdropOrder, stadiumRing, stadiumShape, standColours } from './nightGround';

/** Segments round each ring of the Stadium. */
const SEGMENTS = 128;
/** The apron is the floor out past the stand, so nothing green shows beyond it. */
const APRON_REACH = 250;
/** Just above the grass, so the apron covers the corners of the field's plane without fighting it. */
const APRON_Y = 0.05;
/** Metres of deck one tile of the seat texture spans round the ring. */
const SEAT_TILE_WIDTH = 8;

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
 */
function sweepBand(boundary: Boundary, inner: ProfilePoint, outer: ProfilePoint) {
  const positions: number[] = [];
  const colours: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const point of [inner, outer]) {
    const { semiX, semiZ } = stadiumRing(boundary, point.setback);
    let arc = 0;
    let previous: [number, number] | null = null;
    for (let i = 0; i <= SEGMENTS; i++) {
      const theta = (i / SEGMENTS) * Math.PI * 2;
      const x = semiX * Math.cos(theta);
      const z = semiZ * Math.sin(theta);
      if (previous) arc += Math.hypot(x - previous[0], z - previous[1]);
      previous = [x, z];
      positions.push(x, point.y, z);
      colours.push(point.colour.r, point.colour.g, point.colour.b);
      uvs.push(arc, point.setback - inner.setback);
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
function surroundGeometry({ boundary, fence, frontRow }: StadiumShape): BufferGeometry {
  const apron = new Color(standColours.apron);
  const fenceColour = new Color(standColours.fence);
  const wall = new Color(standColours.frontWall);
  return mergeBands([
    sweepBand(boundary, { setback: 0, y: APRON_Y, colour: apron }, { setback: APRON_REACH, y: APRON_Y, colour: apron }),
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

/**
 * One row of seats, tiled along the deck: the seats, over the shadow cast at
 * their foot by the row behind. Mipmapped, so far rows blend rather than shimmer.
 */
function seatTexture(rowDepth: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = standColours.seat;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // The canvas is flipped onto the deck, so its bottom is the foot of the row.
  ctx.fillStyle = standColours.rowShadow;
  ctx.fillRect(0, canvas.height * 0.65, canvas.width, canvas.height * 0.35);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1 / SEAT_TILE_WIDTH, 1 / rowDepth);
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
  // ceiling under the darkest mowing stripe holds where the coach sees it.
  // No depth written: board content drawn after it draws over it (#139).
  const materials = useMemo(() => {
    const map = seatTexture(shape.rowDepth);
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
