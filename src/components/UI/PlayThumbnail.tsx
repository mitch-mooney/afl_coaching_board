import type { Play } from '../../models/PlayModel';
import type { BoardSnapshot } from '../../utils/boardSnapshot';
import { fromPhase } from '../../utils/boardSnapshot';
import { boardAt } from '../../utils/boardPlayback';
import { projectSnapshot, type ThumbnailViewBox } from '../../utils/thumbnailProjection';

const VIEWBOX: ThumbnailViewBox = { width: 200, height: 164, padding: 12 };
const EMPTY: BoardSnapshot = { players: [], paths: [], annotations: [], camera: null, ball: null, cones: [] };

/**
 * PlayThumbnail — a store-free top-down schematic of a Play's end state. Computes
 * boardAt(phase, 1) so tokens/ball sit at their path ends, projects to 2D, and draws
 * an oval field with path polylines, player dots (team colour), and a ball dot.
 */
export function PlayThumbnail({ play }: { play: Play }) {
  const phase = play.phases[0];
  const prims = projectSnapshot(phase ? boardAt(fromPhase(phase), 1) : EMPTY, VIEWBOX);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <ellipse
        cx={prims.field.cx}
        cy={prims.field.cy}
        rx={prims.field.rx}
        ry={prims.field.ry}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1.5}
      />
      {prims.paths.map((p, i) => (
        <polyline
          key={i}
          points={p.points.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke="rgba(0,212,170,0.5)"
          strokeWidth={1.5}
        />
      ))}
      {prims.players.map((pl, i) => (
        <circle key={i} cx={pl.x} cy={pl.y} r={4} fill={pl.color} stroke="rgba(0,0,0,0.4)" strokeWidth={0.5} />
      ))}
      {prims.ball && (
        <circle cx={prims.ball.x} cy={prims.ball.y} r={2.5} fill="#ffffff" stroke="rgba(0,0,0,0.5)" strokeWidth={0.75} />
      )}
    </svg>
  );
}
