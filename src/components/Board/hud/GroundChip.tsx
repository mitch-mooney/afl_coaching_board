import { useEffect, useRef, useState } from 'react';
import { useOutOfBounds } from '../../../hooks/useOutOfBounds';
import { selectActiveVenue, useVenueStore } from '../../../store/venueStore';
import { groundChipState } from './fitReadout';
import { GroundPopover } from './GroundPopover';
import { TEAL } from './podStyles';

/**
 * The **Ground chip**: the board's answer to *which ground am I drawing?*, and
 * the door to switching it.
 *
 * The board is the only surface where a coach's motivating question — *what does
 * this play look like at Saturday's ground?* — can be answered, and until this
 * chip it said nothing about the ground it was drawing. `Field.tsx` has always
 * sized the Boundary off the Active Venue and never named it.
 *
 * **Quiet at rest.** The ground's name and a hairline oval, nothing else. When
 * anything is out of bounds the oval becomes a single amber dot — no number, and
 * boxed to the oval's width so nothing beside it shifts as the finding appears
 * and clears. Everything it says comes from `fitReadout`, so the copy and the
 * rules are asserted there rather than through a component harness.
 *
 * **Rendered from the editor top bar**, right of the tab switcher, rather than
 * from either HUD skin — the same reason `ToolRail` renders outside that choice:
 * a surface rendered per skin lands in two places, and muscle memory then costs
 * the coach their choice of skin. Board tab only, because only the board tab
 * renders a board; both Match and Training mode, because a drill set up on a
 * tight ground reports the same way a play does.
 *
 * Teal while its popover is open, matching the HUD's existing *this panel is
 * open* — the Mode rail's, and the Tool rail's colour button. A popover that
 * stays open across picks especially needs the chip to say it owns it.
 */

/**
 * Deliberately local rather than shared with `podStyles`, which holds the same
 * hex twice over: on the Tool rail amber means *this tip is armed*, and here it
 * means *this board does not fit* (ADR 0005). One constant for two meanings
 * would make either one impossible to change without changing the other.
 */
const AMBER = '#f59e0b';

export function GroundChip() {
  const activeVenue = useVenueStore(selectActiveVenue);
  // Derived, never stored — the dot appears the instant the Active Venue changes
  // and clears the instant the coach resolves it, with no flag to keep in step.
  const report = useOutOfBounds();
  const { name, dotLit, label } = groundChipState(report, activeVenue?.name);

  const [open, setOpen] = useState(false);
  // Wraps the chip and its column, so a pointer landing on either counts as
  // inside and the column survives its own taps — which is what a repeated
  // compare is made of.
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && anchorRef.current?.contains(target)) return;
      setOpen(false);
    };
    // Inherited from `ToolRail`: pointerdown rather than click, because a Stroke
    // on the board never produces a click and a click-dismissed popover would sit
    // over the board through the whole of the coach's next annotation. Capture,
    // so a handler that stops propagation cannot strand it open.
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [open]);

  return (
    <div
      ref={anchorRef}
      style={{
        position: 'relative',
        display: 'flex',
        // Spans the top-bar row's full height so the column's `top: 100%` lands
        // on the row's bottom edge — the line `LinkedVideoBar` is placed against
        // — rather than on the chip's, which sits 3px above it and leaves a lip
        // of bar showing over the column's rounded corner.
        //
        // What it stretches to is the control group's height, which is the
        // hamburger's 44px tap target (`HamburgerIcon.tsx`) — the same 44 the
        // bar's own 56 was derived from. So the two agree by both reading the
        // row rather than by sharing a number, which is the point.
        alignSelf: 'stretch',
        // Not optional, and silent when missing: without it the 34px chip
        // stretches to the row's 44 and nothing throws. See ADR 0003's
        // 2026-08-05 amendment, which decides both of these together.
        alignItems: 'center',
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
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
        {dotLit ? (
          // Boxed to the oval's 13px so the chip's width is identical either
          // way: the name beside it must not move when a finding arrives.
          <span
            aria-hidden
            style={{ width: 13, display: 'flex', justifyContent: 'center', flexShrink: 0 }}
          >
            <span style={{ width: 9, height: 9, borderRadius: 999, background: AMBER }} />
          </span>
        ) : (
          <svg width="13" height="10" viewBox="0 0 13 10" aria-hidden style={{ flexShrink: 0 }}>
            <ellipse cx="6.5" cy="5" rx="6" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
        {name}
      </button>

      {open && <GroundPopover />}
    </div>
  );
}
