import { selectActiveVenue, useVenueStore } from '../../../store/venueStore';
import type { Venue } from '../../../models/VenueModel';
import { useActiveBoundary } from '../../../hooks/useActiveBoundary';
import { pullBoardInsideBoundary, useOutOfBounds } from '../../../hooks/useOutOfBounds';
import { fitReadoutState, OUT_OF_BOUNDS_AMBER, type FitReadoutState } from './fitReadout';
import { glass, TEAL } from './podStyles';

/**
 * The ground popover: a column of every Venue, dropping out of the **Ground
 * chip** that opened it.
 *
 * This is the compare loop. A coach standing at Saturday's ground taps between
 * two Venues against the same structure, watching the Boundary move under a
 * viewpoint that holds still — so what this surface is judged on is not the
 * first switch but the tenth.
 *
 * Everything below follows from that (issue #27, resolved on the device):
 *
 * - **It stays open across picks.** A popover that dismissed on every pick would
 *   make a repeated compare cost three taps a switch instead of one. Dismissal
 *   is the chip's job and happens on a pointer landing outside — see `GroundChip`.
 * - **Creation order**, exactly as `loadVenues` hands it over. Most-recently-active
 *   first was tried and is dead: the row just tapped teleports to the top and a
 *   different ground lands under the finger for the tap back.
 * - **Tapping the active row is a no-op.** Not an inert row — an inert row
 *   destroys the target under the finger on every switch of a two-ground compare.
 * - **A column, not a strip.** 264px over one wing leaves the corridor — the part
 *   of the structure actually being compared — visible throughout.
 *
 * Where its top edge sits is settled in
 * `docs/adr/0003-tool-rail-on-the-left-mode-rail-on-the-right.md`: it hangs off
 * the bottom of the top-bar row and **overlays** `LinkedVideoBar`, because it is
 * anchored chrome and has to read as attached to its chip. The licence has a
 * limit — it may cover that bar's readout, never its controls.
 *
 * Below the list hangs the **Fit readout**'s block — what is outside and the one
 * tap that pulls it in. Below rather than above, and this is the load-bearing
 * part: with the block above, every row moves ~92px the moment a finding appears
 * and back when it clears, under the finger, on every switch of the compare this
 * surface exists for. Below costs nothing — the column grows downward and the
 * list never moves. Nothing throws if this is got wrong; the rows just move.
 * The **Add a ground** footer lands beneath the block in the next ticket.
 */
export function GroundPopover() {
  const venues = useVenueStore((s) => s.venues);
  const activeVenueId = useVenueStore((s) => s.activeVenueId);
  const activeVenue = useVenueStore(selectActiveVenue);
  // Derived, never stored: switching the ground above makes the block appear and
  // pulling inside makes it vanish, with nothing in between to keep in sync.
  const boundary = useActiveBoundary();
  const outOfBounds = useOutOfBounds();
  const fit = fitReadoutState(outOfBounds, activeVenue?.name);
  // The one mutation this surface makes. `setActiveVenue` writes the selection
  // and nothing else: positions stay in absolute metres, the camera holds still
  // and nothing reaches Dexie, which is what makes looking at a play on another
  // ground cost the coach nothing (ADR 0002).
  const setActiveVenue = useVenueStore((s) => s.setActiveVenue);

  return (
    <div
      role="dialog"
      // Singular, and pairing with the chip's own "Ground: <name>": a screen
      // reader hears the same noun for the control and the surface it opens.
      // **Grounds** is not a synonym going spare — issue #26 reserved it for the
      // panel that manages the collection, and this one only ever selects.
      aria-label="Ground"
      style={{
        ...glass,
        position: 'absolute',
        // The anchor is stretched to the top-bar row's full height, so 100% is
        // the bottom of that row — the same line `LinkedVideoBar` is placed
        // against. No constant here, and no `env()` of its own: the column
        // inherits whatever the top bar does about the safe-area inset, so the
        // two agree by construction. See ADR 0003's 2026-08-05 amendment.
        top: '100%',
        left: 8, // lines up with the chip's own marginLeft
        width: 264,
        borderRadius: 12,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
        // Inherited today — the chip's anchor sits inside the top bar's
        // pointer-events-auto control group, while the bar's outer container is
        // pointer-events: none so it cannot swallow camera drags across the top
        // of the field. Stated anyway, so the column keeps taking its own taps
        // wherever in that tree it is later hung. Same arrangement `ToolRail`
        // uses on the left edge, where it is doing real work.
        pointerEvents: 'auto',
        zIndex: 40,
      }}
    >
      {venues.map((venue) => {
        const active = venue.id === activeVenueId;
        return (
          <GroundRow
            key={venue.id}
            venue={venue}
            active={active}
            onTap={() => {
              if (active || venue.id == null) return;
              setActiveVenue(venue.id);
            }}
          />
        );
      })}

      {fit.shown && <FitBlock state={fit} onPullInside={() => pullBoardInsideBoundary(boundary)} />}
    </div>
  );
}

/**
 * The amber lightened until it reads as body text on the column's dark glass.
 * The one value here not derived from `OUT_OF_BOUNDS_AMBER`: every fill and
 * border below is that hex at an alpha, so the *doesn't fit* colour can be
 * changed in one place, and nothing in this block spells it a second way.
 */
const AMBER_INK = '#fcd9a0';

/**
 * The Fit readout's block: the finding, that leaving it is fine, and the remedy
 * — one block, arriving and leaving together, because a count with no way to act
 * on it is a warning and a button with no finding above it is a trap.
 *
 * Amber on the border and the sentence, matching the chip's dot: the same
 * finding one rung further down the ladder the design already has — dot, count,
 * sentence, remedy. Its words all come from `fitReadout`; there is no copy here.
 */
function FitBlock({ state, onPullInside }: { state: FitReadoutState; onPullInside: () => void }) {
  return (
    <div
      style={{
        marginTop: 4,
        padding: 8,
        borderRadius: 8,
        border: `1px solid ${OUT_OF_BOUNDS_AMBER}66`,
        background: `${OUT_OF_BOUNDS_AMBER}1a`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.35, color: AMBER_INK }}>
        {state.sentence}
      </p>
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.35, color: 'rgba(255,255,255,0.5)' }}>
        {state.reassurance}
      </p>
      <button
        type="button"
        onClick={onPullInside}
        style={{
          // 44 like the ground rows: this is a tap made mid-compare, with the
          // coach's other hand on the field.
          minHeight: 44,
          borderRadius: 8,
          border: `1px solid ${OUT_OF_BOUNDS_AMBER}`,
          background: `${OUT_OF_BOUNDS_AMBER}29`,
          color: AMBER_INK,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        {state.remedy}
      </button>
    </div>
  );
}

/**
 * One ground: its name, and its measurements beside it so a tight ground can be
 * told from a wide one before the tap rather than after it.
 */
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
        // controls it sits in; a list of taps in the middle of a compare does not.
        minHeight: 44,
        padding: '0 10px',
        borderRadius: 8,
        // Teal is the HUD's "this is the one you are on", the same as the chip's
        // open border and the Mode rail's.
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
      {/* Metres spelled out, as the Grounds panel spells them
          (`VenueModal.tsx:172`): the coach reads the same pair on both surfaces
          and should not have to work out that they are the same number. */}
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
        {venue.boundaryLength} × {venue.boundaryWidth} m
      </span>
    </button>
  );
}
