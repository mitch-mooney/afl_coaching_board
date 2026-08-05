import { useVenueStore } from '../../../store/venueStore';
import type { Venue } from '../../../models/VenueModel';
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
 * The Fit readout and the **Add a ground** footer land below the list, in that
 * order, in the two tickets after this one. Below the list rather than above it:
 * a finding appearing mid-compare must not move the rows being tapped.
 */
export function GroundPopover() {
  const venues = useVenueStore((s) => s.venues);
  const activeVenueId = useVenueStore((s) => s.activeVenueId);
  // The one mutation this surface makes. `setActiveVenue` writes the selection
  // and nothing else: positions stay in absolute metres, the camera holds still
  // and nothing reaches Dexie, which is what makes looking at a play on another
  // ground cost the coach nothing (ADR 0002).
  const setActiveVenue = useVenueStore((s) => s.setActiveVenue);

  return (
    <div
      role="dialog"
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
        // The top bar's container is pointer-events: none so it cannot swallow
        // camera drags across the top of the field. Opt back in — the same
        // arrangement `ToolRail` uses on the left edge.
        pointerEvents: 'auto',
        zIndex: 40,
      }}
    >
      {venues.map((venue) => (
        <GroundRow
          key={venue.id}
          venue={venue}
          active={venue.id === activeVenueId}
          onTap={() => {
            if (venue.id == null || venue.id === activeVenueId) return;
            setActiveVenue(venue.id);
          }}
        />
      ))}
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
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
        {venue.boundaryLength} × {venue.boundaryWidth}
      </span>
    </button>
  );
}
