/**
 * PROTOTYPE — THROWAWAY. Not production code. Delete with the branch.
 *
 * Three variants of the board-level ground chip, switchable via `?variant=`, on
 * the existing `/play/:id` board route.
 *
 * Question being answered (wayfinder ticket "Where the ground chip sits, and how
 * quiet it is at rest", issue #25): where the chip lives, how quiet it is at
 * count 0, and how it changes when the Out of bounds count is non-empty.
 *
 * Deliberately NOT answered here: what the popover does. Tapping a chip does
 * nothing but flash a pressed state — the popover is its own ticket.
 *
 * Open with:
 *   /play/<id>?variant=A       — top-bar sibling
 *   /play/<id>?variant=B       — painted on the ground
 *   /play/<id>?variant=C       — corner readout
 *
 * `&fake=3` forces the Out of bounds count so the non-empty state can be judged
 * without dragging players over the line. Omit it and the real count is used.
 * Both live in the URL so the two slots share them with no store.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { selectActiveVenue, useVenueStore } from '../../../../store/venueStore';
import { useOutOfBounds } from '../../../../hooks/useOutOfBounds';
import { glass } from '../podStyles';

export type VariantKey = 'A' | 'B' | 'C';

export const VARIANTS: { key: VariantKey; name: string; slot: 'topbar' | 'board' }[] = [
  { key: 'A', name: 'Top-bar sibling', slot: 'topbar' },
  { key: 'B', name: 'Painted on the ground', slot: 'board' },
  { key: 'C', name: 'Corner readout', slot: 'board' },
];

export function useVariant(): VariantKey | null {
  const [params] = useSearchParams();
  const raw = params.get('variant');
  return raw === 'A' || raw === 'B' || raw === 'C' ? raw : null;
}

/**
 * A won the placement question on the device, so the live question is now what
 * A *does* at count > 0 — and specifically whether the change lands in
 * peripheral vision while the coach is watching the boundary move.
 *
 * Three treatments, loud to quiet, all in the same place:
 *   segment — amber segment appears inside the pill's existing border (as built)
 *   swap    — the whole pill goes amber; the name stays, the count joins it
 *   dot     — one amber dot, nothing else moves
 */
export type AlertKey = 'segment' | 'swap' | 'dot';

export const ALERTS: { key: AlertKey; name: string }[] = [
  { key: 'segment', name: 'amber segment' },
  { key: 'swap', name: 'whole pill ambers' },
  { key: 'dot', name: 'one dot' },
];

export function useAlert(): AlertKey {
  const [params] = useSearchParams();
  const raw = params.get('alert');
  return raw === 'swap' || raw === 'dot' ? raw : 'segment';
}

/** Everything a variant is allowed to read. Real values, faked count optional. */
function useChipData() {
  const [params] = useSearchParams();
  const venue = useVenueStore(selectActiveVenue);
  const report = useOutOfBounds();
  const fake = Number(params.get('fake'));
  const count = Number.isInteger(fake) && fake >= 0 && params.has('fake') ? fake : report.count;
  return {
    name: venue?.name ?? 'Standard ground',
    length: venue?.boundaryLength ?? 165,
    width: venue?.boundaryWidth ?? 135,
    count,
  };
}

/** Pressed-state only. The popover is a different ticket. */
function usePress() {
  const [pressed, setPressed] = useState(false);
  return {
    pressed,
    handlers: {
      onPointerDown: () => setPressed(true),
      onPointerUp: () => setPressed(false),
      onPointerLeave: () => setPressed(false),
      onPointerCancel: () => setPressed(false),
    },
  };
}

const AMBER = '#f59e0b';

/**
 * The one slot that renders inside `EditorTopBar`, beside the tab switcher.
 * Skin-invariant by construction: the top bar is above both HUD skins.
 */
export function GroundChipTopBarSlot() {
  const variant = useVariant();
  if (variant !== 'A') return null;
  return <VariantA />;
}

/** The slot that renders over the board itself, under the top bar. */
export function GroundChipBoardSlot() {
  const variant = useVariant();
  if (variant === 'B') return <VariantB />;
  if (variant === 'C') return <VariantC />;
  return null;
}

/* ------------------------------------------------------------------ *
 * A — Top-bar sibling
 *
 * A bordered pill in the same visual language as the tab switcher beside it,
 * so it reads as another piece of match context rather than a board control.
 * Quiet at rest: the ground name and a hairline oval, nothing else. Non-empty
 * grows a second segment inside the same border, so the pill's outline never
 * moves — only its right end lights amber.
 * ------------------------------------------------------------------ */
function VariantA() {
  const { name, count } = useChipData();
  const alert = useAlert();
  const { pressed, handlers } = usePress();
  const loud = count > 0;
  // Only `swap` repaints the pill itself; the other two leave it alone and put
  // the change inside.
  const ambered = loud && alert === 'swap';
  return (
    <button
      type="button"
      aria-label={`Ground: ${name}${loud ? `, ${count} outside the boundary` : ''}`}
      {...handlers}
      style={{
        marginLeft: 8,
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 8,
        overflow: 'hidden',
        border: ambered ? `1px solid ${AMBER}` : '1px solid rgba(255,255,255,0.2)',
        background: ambered ? 'rgba(245,158,11,0.22)' : 'rgba(0,0,0,0.4)',
        cursor: 'pointer',
        minHeight: 34,
        opacity: pressed ? 0.7 : 1,
        touchAction: 'manipulation',
      }}
    >
      <span
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 12px',
          fontSize: 13, fontWeight: 500,
          color: ambered ? AMBER : 'rgba(255,255,255,0.7)',
          whiteSpace: 'nowrap',
        }}
      >
        {/* `dot` replaces the hairline oval rather than adding to it, so nothing
            in the pill shifts sideways when the count arrives. */}
        {loud && alert === 'dot' ? (
          // Boxed to the oval's 13px so the name does not shift when the dot
          // arrives — a chip that jogs sideways is not the quiet option.
          <span aria-hidden style={{ width: 13, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: AMBER }} />
          </span>
        ) : (
          <svg width="13" height="10" viewBox="0 0 13 10" aria-hidden style={{ flexShrink: 0 }}>
            <ellipse cx="6.5" cy="5" rx="6" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
        {name}
        {ambered && <span style={{ fontWeight: 700 }}>· {count} out</span>}
      </span>
      {loud && alert === 'segment' && (
        <span
          style={{
            display: 'flex', alignItems: 'center',
            padding: '0 10px',
            borderLeft: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(245,158,11,0.18)',
            color: AMBER,
            fontSize: 13, fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {count} out
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * B — Painted on the ground
 *
 * The opposite bet to A: no chrome at all at rest. Letterspaced small caps
 * centred under the top bar, faint enough to read as a marking on the field
 * rather than a control sitting on top of it. Non-empty is the only time it
 * behaves like UI — an amber dot, an amber rule under the name, and the text
 * lifting out of the grass.
 * ------------------------------------------------------------------ */
function VariantB() {
  const { name, count } = useChipData();
  const { pressed, handlers } = usePress();
  const alert = count > 0;
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0px) + 62px)',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 30,
        // Or an invisible full-width strip swallows camera drags across the top
        // of the field — ToolRail.tsx:104-119.
        pointerEvents: 'none',
      }}
    >
      <button
        type="button"
        aria-label={`Ground: ${name}${alert ? `, ${count} outside the boundary` : ''}`}
        {...handlers}
        style={{
          pointerEvents: 'auto',
          background: 'none',
          border: 'none',
          borderBottom: alert ? `2px solid ${AMBER}` : '2px solid transparent',
          padding: '10px 8px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: alert ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.42)',
          textShadow: '0 1px 3px rgba(0,0,0,0.7)',
          opacity: pressed ? 0.6 : 1,
          touchAction: 'manipulation',
          whiteSpace: 'nowrap',
        }}
      >
        {alert && (
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: AMBER, flexShrink: 0 }} />
        )}
        {name}
        {alert && <span style={{ color: AMBER, letterSpacing: '0.08em' }}>· {count} out</span>}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * C — Corner readout
 *
 * More information at rest than either of the others, on the bet that a
 * permanent chip earns its place by telling you the numbers, not just the name
 * — "is this the wide one or the tight one" answered without a tap. A glass
 * card in the top-right of the board, held clear of the Rail skin's 68px right
 * rail. Non-empty adds a third line rather than changing the first two.
 * ------------------------------------------------------------------ */
function VariantC() {
  const { name, length, width, count } = useChipData();
  const { pressed, handlers } = usePress();
  const alert = count > 0;
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0px) + 62px)',
        // 88 rather than 20: the Rail skin parks a 68px rail on this edge, and a
        // card tucked under it would be invisible in one skin and fine in the other.
        right: 88,
        zIndex: 30,
        pointerEvents: 'none',
      }}
    >
      <button
        type="button"
        aria-label={`Ground: ${name}, ${length} by ${width} metres${alert ? `, ${count} outside the boundary` : ''}`}
        {...handlers}
        style={{
          ...glass,
          pointerEvents: 'auto',
          borderRadius: 12,
          border: alert ? `1px solid ${AMBER}` : '1px solid #ffffff22',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 1,
          minHeight: 44,
          cursor: 'pointer',
          textAlign: 'right',
          opacity: pressed ? 0.7 : 1,
          touchAction: 'manipulation',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
          {length} × {width} m
        </span>
        {alert && (
          <span style={{ fontSize: 10, fontWeight: 700, color: AMBER, whiteSpace: 'nowrap', marginTop: 2 }}>
            {count} outside
          </span>
        )}
      </button>
    </div>
  );
}
