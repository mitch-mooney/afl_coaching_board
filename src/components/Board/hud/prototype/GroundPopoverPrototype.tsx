/**
 * PROTOTYPE — THROWAWAY. Not production code. Delete with the branch.
 *
 * Three variants of the ground popover, switchable via `?pop=`, anchored to the
 * settled chip on the existing `/play/:id` board route.
 *
 * Question being answered (wayfinder ticket "Does the popover survive a repeated
 * compare?", issue #27): a compare is *repeated* switching — two grounds looked
 * at back and forth against the same structure — so every variant here has to be
 * driven through a real A/B, not a single switch.
 *
 * Open with:
 *   /play/<id>?pop=A     — column under the chip, stays open across picks
 *   /play/<id>?pop=B     — strip across the top, stays open across picks
 *   /play/<id>?pop=C     — column under the chip, closes on every pick
 *
 * Orthogonal toggles, all in the URL so they are reload-stable and shareable:
 *   &fit=above|below     — where the fit finding + Pull inside sit, relative to
 *                          the list (A and C only; B is one row and has no
 *                          "above")
 *   &order=created|recent — creation order, as `loadVenues` gives it, versus
 *                          previously-active-first
 *   &fake=N              — force the Out of bounds count. Omit for the real one.
 *
 * The switching is REAL: every variant calls the real `setActiveVenue`, so the
 * boundary actually moves under the popover and the fit finding actually
 * recomputes. A popover judged against a static board would answer nothing —
 * the whole question is what happens to it while the board changes.
 *
 * Deliberately NOT answered here, and left out rather than invented: the route
 * from the popover to "Add a ground". That is issue #28, which is blocked by
 * this ticket — the empty foot of each variant is where it will land.
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { selectActiveVenue, useVenueStore } from '../../../../store/venueStore';
import type { Venue } from '../../../../models/VenueModel';
import { useActiveBoundary } from '../../../../hooks/useActiveBoundary';
import { pullBoardInsideBoundary, useOutOfBounds } from '../../../../hooks/useOutOfBounds';
import type { OutOfBoundsReport } from '../../../../utils/fieldGeometry';
import { glass, TEAL } from '../podStyles';

const AMBER = '#f59e0b';

export type PopKey = 'A' | 'B' | 'C';

export const POPOVERS: { key: PopKey; name: string; note: string }[] = [
  { key: 'A', name: 'Column, stays open', note: 'drops under the chip; picks leave it open' },
  { key: 'B', name: 'Strip across the top', note: 'shallow band; picks leave it open' },
  { key: 'C', name: 'Column, closes on pick', note: 'drops under the chip; every pick dismisses' },
];

export function usePop(): PopKey | null {
  const [params] = useSearchParams();
  const raw = params.get('pop');
  return raw === 'A' || raw === 'B' || raw === 'C' ? raw : null;
}

export type FitKey = 'above' | 'below';
export function useFit(): FitKey {
  const [params] = useSearchParams();
  return params.get('fit') === 'below' ? 'below' : 'above';
}

export type OrderKey = 'created' | 'recent';
export function useOrder(): OrderKey {
  const [params] = useSearchParams();
  return params.get('order') === 'recent' ? 'recent' : 'created';
}

/**
 * The activation stack behind `?order=recent`, module-level because it is a
 * property of the session rather than of any one render, and because nothing
 * about a throwaway ordering experiment belongs in a store.
 *
 * Most-recently-activated first. The interesting moment is not the order itself
 * — it is that in A and B this list re-sorts *while the popover is open*, so the
 * row the coach is about to tap again slides out from under their finger.
 */
const activationStack: number[] = [];
function recordActivation(id: number) {
  const at = activationStack.indexOf(id);
  if (at !== -1) activationStack.splice(at, 1);
  activationStack.unshift(id);
}
function byRecency(venues: Venue[]): Venue[] {
  const rank = (v: Venue) => {
    const at = v.id == null ? -1 : activationStack.indexOf(v.id);
    return at === -1 ? Number.MAX_SAFE_INTEGER : at;
  };
  return [...venues].sort((a, b) => rank(a) - rank(b));
}

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

/**
 * Copied from `VenueModal` rather than imported — it is not exported there, and
 * this prototype exists partly to decide whether this phrasing survives the move
 * to the board at all. Duplicating it keeps the panel untouched while the
 * wording is judged.
 */
function describeOutOfBounds(report: OutOfBoundsReport): string {
  const parts: string[] = [];
  if (report.players.length) parts.push(plural(report.players.length, 'player'));
  if (report.paths.length) parts.push(plural(report.paths.length, 'path'));
  if (report.cones.length) parts.push(plural(report.cones.length, 'cone'));
  if (report.ball) parts.push('the ball');
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Everything the chip and the popover are allowed to read. */
function useGroundData() {
  const [params] = useSearchParams();
  const venues = useVenueStore((s) => s.venues);
  const activeVenueId = useVenueStore((s) => s.activeVenueId);
  const active = useVenueStore(selectActiveVenue);
  const report = useOutOfBounds();
  const order = useOrder();

  const fake = Number(params.get('fake'));
  const faked = params.has('fake') && Number.isInteger(fake) && fake >= 0;
  const count = faked ? fake : report.count;
  // A faked count has no report behind it, so it gets a sentence of its own
  // shape rather than a lie about which players are where.
  const described = faked ? plural(count, 'thing') : describeOutOfBounds(report);

  return {
    venues: order === 'recent' ? byRecency(venues) : venues,
    activeVenueId,
    name: active?.name ?? 'Standard ground',
    count,
    described,
  };
}

/* ================================================================== *
 * The chip — settled by issue #25, here only as the popover's anchor.
 *
 * Top bar, right of the tab switcher. The ground's name and nothing else at
 * rest; one amber dot when the count is non-empty, boxed to the hairline oval's
 * width so nothing shifts. Not under judgment on this ticket — do not re-litigate
 * it here.
 *
 * The one thing added: it goes teal-bordered while its popover is open, because
 * teal is already the HUD's "this panel is open" (the Mode rail, and the Tool
 * rail's colour button). A popover that stays open across picks especially needs
 * the chip to say so.
 * ================================================================== */
export function GroundChipSlot() {
  const pop = usePop();
  const { name, count } = useGroundData();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Inherited from `ToolRail.tsx:96-99`: pointerdown, not click — a Stroke on
  // the board never produces a click, so a click-dismissed popover would sit
  // over the board through the whole of the coach's next annotation. Capture, so
  // a handler that stops propagation cannot strand it open.
  //
  // Note what this does and does not mean for "stays open": A and B survive
  // taps *inside* themselves, which is what a repeated compare is made of. A
  // pointer landing on the board still dismisses all three.
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && anchorRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [open]);

  // The `?pop=` gate alone is not enough: it lives in a URL, and a URL travels.
  // A stray merge of this branch would otherwise put the prototype in front of a
  // coach who happened to be sent a link with the param still on it.
  if (!pop || !import.meta.env.DEV) return null;

  const loud = count > 0;

  return (
    <div ref={anchorRef} style={{ position: 'relative', display: 'flex' }}>
      <button
        type="button"
        aria-label={`Ground: ${name}${loud ? `, ${count} outside the boundary` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        style={{
          marginLeft: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 12px',
          borderRadius: 8,
          border: open ? `1px solid ${TEAL}` : '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(0,0,0,0.4)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 13,
          fontWeight: 500,
          minHeight: 34,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        {loud ? (
          <span aria-hidden style={{ width: 13, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: AMBER }} />
          </span>
        ) : (
          <svg width="13" height="10" viewBox="0 0 13 10" aria-hidden style={{ flexShrink: 0 }}>
            <ellipse cx="6.5" cy="5" rx="6" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
        {name}
      </button>

      {open && pop === 'A' && <ColumnPopover onPicked={() => {}} />}
      {open && pop === 'B' && <StripPopover onPicked={() => {}} />}
      {open && pop === 'C' && <ColumnPopover onPicked={() => setOpen(false)} />}
    </div>
  );
}

/** The one real mutation any variant makes. Everything else here is read-only. */
function useActivate(onPicked: () => void) {
  const setActiveVenue = useVenueStore((s) => s.setActiveVenue);
  return (id: number | undefined) => {
    if (id == null) return;
    recordActivation(id);
    setActiveVenue(id);
    onPicked();
  };
}

/* ------------------------------------------------------------------ *
 * A and C — a column dropping out of the chip.
 *
 * Anchored at the chip's left edge and opening downward, which is the only
 * direction available: the chip sits in the top bar with the whole board below
 * it. Left-aligned rather than centred so the column's edge lines up with the
 * chip that opened it.
 *
 * The bet: a narrow column costs one wing of the board and leaves the corridor
 * — the part of the structure a coach is actually comparing — uncovered.
 *
 * A and C are the same component because their disagreement is exactly one
 * thing: whether a pick dismisses. Sharing the layout is what makes that
 * comparison clean.
 * ------------------------------------------------------------------ */
function ColumnPopover({ onPicked }: { onPicked: () => void }) {
  const { venues, activeVenueId, count, described, name } = useGroundData();
  const fit = useFit();
  const activate = useActivate(onPicked);

  const fitBlock = count > 0 && (
    <FitFinding count={count} described={described} groundName={name} />
  );

  return (
    <div
      role="dialog"
      aria-label="Ground"
      style={{
        ...glass,
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 8, // lines up with the chip's own marginLeft
        width: 264,
        borderRadius: 12,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
        // The top bar's container is pointer-events: none so it cannot swallow
        // camera drags across the top of the field. Opt back in.
        pointerEvents: 'auto',
        zIndex: 40,
      }}
    >
      {fit === 'above' && fitBlock}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {venues.map((venue) => (
          <GroundRow
            key={venue.id}
            venue={venue}
            active={venue.id === activeVenueId}
            onTap={() => activate(venue.id)}
          />
        ))}
      </div>

      {fit === 'below' && fitBlock}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * B — a strip across the top.
 *
 * The opposite bet about occlusion: rather than a column over one wing, a
 * shallow band over the full width. Nothing in it ever moves vertically — the
 * grounds are a row, and the fit finding lives inline at the right end of the
 * same row, so a fit that appears or clears cannot shift the row the coach is
 * tapping. That is the structural claim; the cost is that it covers the far end
 * of the ground edge to edge.
 *
 * Held clear of the right edge by 88px for the reason the chip prototype found:
 * the Rail skin parks a 68px full-height rail there at the same z-index, and a
 * strip that ran under it would be judged on a paint order rather than a design.
 * ------------------------------------------------------------------ */
function StripPopover({ onPicked }: { onPicked: () => void }) {
  const { venues, activeVenueId, count, described, name } = useGroundData();
  const boundary = useActiveBoundary();
  const activate = useActivate(onPicked);

  return (
    <div
      role="dialog"
      aria-label="Ground"
      style={{
        ...glass,
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
        left: 12,
        right: 88,
        borderRadius: 12,
        padding: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
        pointerEvents: 'auto',
        zIndex: 40,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', flex: 1 }}>
        {venues.map((venue) => {
          const active = venue.id === activeVenueId;
          return (
            <button
              key={venue.id}
              type="button"
              aria-pressed={active}
              onClick={() => activate(venue.id)}
              style={{
                minHeight: 44,
                flexShrink: 0,
                padding: '0 14px',
                borderRadius: 8,
                border: active ? `1px solid ${TEAL}` : '1px solid #ffffff22',
                background: active ? 'rgba(0,212,170,0.14)' : 'rgba(0,0,0,0.35)',
                color: active ? TEAL : 'rgba(255,255,255,0.85)',
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {venue.name}
            </button>
          );
        })}
      </div>

      {count > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* The same sentence the column variants carry, in a slot that cannot
              wrap. Whether it survives the squeeze is part of what B is for. */}
          <span
            style={{
              fontSize: 12,
              color: AMBER,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 220,
            }}
            title={`${described} outside ${name}`}
          >
            {described} outside {name}
          </span>
          <button
            type="button"
            onClick={() => pullBoardInsideBoundary(boundary)}
            style={PULL_INSIDE}
          >
            Pull inside
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Shared pieces. A shared row and a shared finding are fine — the variants
 * disagree about structure, and holding the atoms constant is what lets the
 * structural difference be the thing judged.
 * ------------------------------------------------------------------ */

function GroundRow({ venue, active, onTap }: { venue: Venue; active: boolean; onTap: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onTap}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        // 44 both ways, unlike the 34px chip: the chip matches the row of
        // controls it sits in, a list of taps in the middle of a compare does not.
        minHeight: 44,
        padding: '0 10px',
        borderRadius: 8,
        border: active ? `1px solid ${TEAL}` : '1px solid transparent',
        background: active ? 'rgba(0,212,170,0.12)' : 'rgba(255,255,255,0.04)',
        cursor: 'pointer',
        textAlign: 'left',
        touchAction: 'manipulation',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: active ? TEAL : '#fff' }}>
        {venue.name}
      </span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
        {venue.boundaryLength} × {venue.boundaryWidth}
      </span>
    </button>
  );
}

/**
 * The fit finding and Pull inside, as one block — they arrive together and they
 * leave together, so splitting them across the list was never on the table. The
 * open question `?fit=` asks is whether the *pair* sits above the list or below
 * it.
 */
function FitFinding({ count, described, groundName }: { count: number; described: string; groundName: string }) {
  const boundary = useActiveBoundary();
  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${AMBER}55`,
        background: 'rgba(245,158,11,0.12)',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span style={{ fontSize: 12, color: '#fde68a', lineHeight: 1.35 }}>
        {described} {count === 1 ? 'is' : 'are'} outside {groundName}.
      </span>
      <button type="button" onClick={() => pullBoardInsideBoundary(boundary)} style={PULL_INSIDE}>
        Pull inside boundary
      </button>
    </div>
  );
}

const PULL_INSIDE: React.CSSProperties = {
  minHeight: 44,
  flexShrink: 0,
  padding: '0 12px',
  borderRadius: 8,
  border: `1px solid ${AMBER}`,
  background: 'rgba(245,158,11,0.18)',
  color: AMBER,
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  touchAction: 'manipulation',
};
