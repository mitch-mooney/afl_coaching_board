import type { BoardSnapshot } from './boardSnapshot';
import type { Boundary } from './fieldGeometry';

/**
 * thumbnailProjection — pure, store-free projection of a board's world positions
 * onto a 2D thumbnail viewBox for a top-down schematic. Ignores world y (up):
 * x (field length) → horizontal, z (field width) → vertical. All geometry lives
 * behind projectSnapshot; the SVG component just draws the returned primitives.
 */

/** The 2D box the schematic is drawn into, with an inset so edge dots aren't clipped. */
export interface ThumbnailViewBox {
  width: number;
  height: number;
  padding: number;
}

/**
 * The box every thumbnail is drawn into.
 *
 * Its padded interior is 176 × 144 — the Standard ground's 165 : 135 exactly —
 * so the generic ground fills it edge to edge with the padding it always had,
 * and a measured ground letterboxes against that. The height is the only reason
 * this is 168 rather than the 164 it was before Venues: at 164 the padded box
 * was 176 × 140, a shape no ground in the country is, and fitting a real ground
 * into it would have letterboxed even Standard ground against itself.
 */
export const THUMBNAIL_VIEWBOX: ThumbnailViewBox = { width: 200, height: 168, padding: 12 };

/** Flat draw primitives in viewBox coordinates. */
export interface ThumbnailPrimitives {
  field: { cx: number; cy: number; rx: number; ry: number };
  players: { x: number; y: number; color: string }[];
  ball: { x: number; y: number } | null;
  paths: { points: [number, number][] }[];
}

/** Project a snapshot's players, ball, and paths into the viewBox as draw primitives. */
export function projectSnapshot(
  snap: BoardSnapshot,
  viewBox: ThumbnailViewBox,
  boundary: Boundary,
): ThumbnailPrimitives {
  const { width, height, padding } = viewBox;
  const drawW = width - 2 * padding;
  const drawH = height - 2 * padding;

  // One scale for both axes, fitted from whichever runs out first, with the
  // remainder left as letterbox. Metres map to viewBox units at the same rate
  // sideways as lengthways, so a 118 m-wide ground draws visibly narrower than
  // a 141 m one instead of both filling the same rectangle.
  //
  // The rejected alternative is the one this replaces: x / length and z / width
  // normalise each coordinate by the ground's own dimensions, which is precisely
  // the rescaling ADR 0002 refuses — implemented here, in the one place nobody
  // looked, and harmless only while every ground was 165 × 135.
  const scale = Math.min(drawW / (boundary.semiX * 2), drawH / (boundary.semiZ * 2));

  // Centred rather than pinned to the padding, which is what puts the letterbox
  // evenly on both sides of the short axis.
  const cx = width / 2;
  const cy = height / 2;

  const project = (x: number, z: number): [number, number] => [cx + x * scale, cy + z * scale];

  const players = snap.players.map((p) => {
    const [x, y] = project(p.position[0], p.position[2]);
    return { x, y, color: p.color };
  });

  let ball: { x: number; y: number } | null = null;
  if (snap.ball) {
    const [x, y] = project(snap.ball.position[0], snap.ball.position[2]);
    ball = { x, y };
  }

  const paths = snap.paths
    .filter((path) => path.keyframes.length >= 2)
    .map((path) => ({
      points: path.keyframes.map((kf) => project(kf.position[0], kf.position[2])) as [number, number][],
    }));

  return {
    field: { cx, cy, rx: boundary.semiX * scale, ry: boundary.semiZ * scale },
    players,
    ball,
    paths,
  };
}
