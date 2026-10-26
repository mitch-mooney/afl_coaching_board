import type { Play } from '../../models/PlayModel';
import type { BoardSnapshot } from '../../utils/boardSnapshot';
import { fromPhase } from '../../utils/boardSnapshot';
import { boardAt } from '../../utils/boardPlayback';
import { projectSnapshot, THUMBNAIL_VIEWBOX } from '../../utils/thumbnailProjection';
import { useActiveBoundary } from '../../hooks/useActiveBoundary';
import { palette, withAlpha } from '../../theme/tokens';

const EMPTY: BoardSnapshot = { players: [], paths: [], annotations: [], camera: null, ball: null, cones: [], team2Guernsey: 'auto' };

/**
 * PlayThumbnail — a top-down schematic of a Play's end state on the Active Venue.
 * Computes boardAt(phase, 1) so tokens/ball sit at their path ends, projects to 2D,
 * and draws an oval field with path polylines, player dots (team colour), and a
 * ball dot.
 *
 * Rendered live from the stored phase against the Active Venue's Boundary, so
 * switching grounds redraws every row of the list with nothing cached to
 * invalidate — and a narrow ground reads narrow at a glance.
 */
export function PlayThumbnail({ play }: { play: Play }) {
  const phase = play.phases[0];
  const boundary = useActiveBoundary();
  const prims = projectSnapshot(phase ? boardAt(fromPhase(phase), 1) : EMPTY, THUMBNAIL_VIEWBOX, boundary);

  return (
    <svg
      viewBox={`0 0 ${THUMBNAIL_VIEWBOX.width} ${THUMBNAIL_VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      {/* Filled, faintly, so the ground is a shape rather than an outline: the
          card behind is Turf edge to edge, so without this the letterbox at a
          narrow ground reads as more grass and the row looks the same size as
          every other. Chalk, as the ground's own lines are. */}
      <ellipse
        cx={prims.field.cx}
        cy={prims.field.cy}
        rx={prims.field.rx}
        ry={prims.field.ry}
        fill={withAlpha(palette.chalk, 0.06)}
        stroke={withAlpha(palette.chalk, 0.3)}
        strokeWidth={1.5}
      />
      {prims.paths.map((p, i) => (
        <polyline
          key={i}
          points={p.points.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke={withAlpha(palette.chalk, 0.55)}
          strokeWidth={1.5}
        />
      ))}
      {prims.players.map((pl, i) => (
        <circle key={i} cx={pl.x} cy={pl.y} r={4} fill={pl.color} stroke={withAlpha(palette.concrete, 0.6)} strokeWidth={0.5} />
      ))}
      {prims.ball && (
        <circle cx={prims.ball.x} cy={prims.ball.y} r={2.5} fill={palette.chalk} stroke={withAlpha(palette.concrete, 0.7)} strokeWidth={0.75} />
      )}
    </svg>
  );
}
