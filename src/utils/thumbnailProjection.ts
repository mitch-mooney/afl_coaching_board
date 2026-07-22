import type { BoardSnapshot } from './boardSnapshot';
import { FIELD_CONFIG } from '../models/FieldModel';

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

/** Flat draw primitives in viewBox coordinates. */
export interface ThumbnailPrimitives {
  field: { cx: number; cy: number; rx: number; ry: number };
  players: { x: number; y: number; color: string }[];
  ball: { x: number; y: number } | null;
  paths: { points: [number, number][] }[];
}

/** Project a snapshot's players, ball, and paths into the viewBox as draw primitives. */
export function projectSnapshot(snap: BoardSnapshot, viewBox: ThumbnailViewBox): ThumbnailPrimitives {
  const { length: L, width: W } = FIELD_CONFIG;
  const { width, height, padding } = viewBox;
  const drawW = width - 2 * padding;
  const drawH = height - 2 * padding;

  const project = (x: number, z: number): [number, number] => [
    padding + (x / L + 0.5) * drawW,
    padding + (z / W + 0.5) * drawH,
  ];

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
    field: { cx: width / 2, cy: height / 2, rx: drawW / 2, ry: drawH / 2 },
    players,
    ball,
    paths,
  };
}
