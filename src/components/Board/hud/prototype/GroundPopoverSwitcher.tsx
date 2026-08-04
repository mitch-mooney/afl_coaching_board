/**
 * PROTOTYPE — THROWAWAY. Not production code. Delete with the branch.
 *
 * The floating switcher for the ground-popover variants. Deliberately ugly and
 * high-contrast so it is obviously not part of the design being judged.
 *
 * Every control is 44px both ways. The chip prototype shipped 28×32 toggles that
 * could not be hit on the iPad, which read as "the toggle does nothing" and cost
 * a whole device pass — prototype chrome that cannot be operated on the device
 * the prototype is for answers nothing.
 *
 * **Demo grounds.** A compare needs at least two grounds and a fresh install has
 * exactly one, so this seeds a narrow one and a wide one as real Venue records —
 * the switching under test is the real `setActiveVenue`, so the grounds have to
 * be real too. They are the one piece of persistence in here, they are named so
 * they cannot be mistaken for a coach's own, and `remove` deletes them.
 *
 * Note one consequence of inheriting the real dismissal rule: a pointerdown on
 * this bar is a pointerdown outside the popover, so touching any toggle here
 * closes it. Set the toggles, then open the popover.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVenueStore } from '../../../../store/venueStore';
import { POPOVERS, useFit, useOrder, usePop, type PopKey } from './GroundPopoverPrototype';

const FAKE_COUNTS = ['real', '0', '1', '3', '9'];

const DEMO_PREFIX = 'Demo — ';

/**
 * One clearly narrower than Standard ground (165 × 135) and one clearly wider,
 * so a switch between them visibly moves the boundary and puts real content out
 * on the way in. Both inside the plausible range, so neither trips a validation
 * warning that would be noise here.
 */
const DEMO_GROUNDS = [
  { name: `${DEMO_PREFIX}Tight Park`, boundaryLength: 140, boundaryWidth: 112 },
  { name: `${DEMO_PREFIX}Wide Oval`, boundaryLength: 178, boundaryWidth: 148 },
];

export function GroundPopoverSwitcher() {
  const [params, setParams] = useSearchParams();
  const pop = usePop();
  const fit = useFit();
  const order = useOrder();
  const venues = useVenueStore((s) => s.venues);
  const createVenue = useVenueStore((s) => s.createVenue);
  const deleteVenue = useVenueStore((s) => s.deleteVenue);
  const [busy, setBusy] = useState(false);
  const active = pop ?? 'A';

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const cycle = (step: number) => {
    const index = POPOVERS.findIndex((v) => v.key === active);
    const next = POPOVERS[(index + step + POPOVERS.length) % POPOVERS.length].key as PopKey;
    set('pop', next);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (el instanceof HTMLElement && el.isContentEditable) return;
      if (event.key === 'ArrowLeft') cycle(-1);
      if (event.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!pop || !import.meta.env.DEV) return null;

  const current = POPOVERS.find((v) => v.key === active)!;
  const fake = params.get('fake') ?? 'real';
  const demoCount = venues.filter((v) => v.name.startsWith(DEMO_PREFIX)).length;

  const addDemo = async () => {
    setBusy(true);
    try {
      for (const ground of DEMO_GROUNDS) {
        if (venues.some((v) => v.name === ground.name)) continue;
        await createVenue(ground);
      }
    } finally {
      setBusy(false);
    }
  };

  const removeDemo = async () => {
    setBusy(true);
    try {
      for (const venue of venues.filter((v) => v.name.startsWith(DEMO_PREFIX))) {
        if (venue.id != null) await deleteVenue(venue.id);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(9.5rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
        padding: 10,
        borderRadius: 16,
        background: '#ff00aa',
        color: '#fff',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        fontFamily: 'monospace',
        fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" onClick={() => cycle(-1)} style={CHIP}>←</button>
        <span style={{ flex: 1, minWidth: 240, textAlign: 'center', fontWeight: 700 }}>
          {current.key} — {current.name}
        </span>
        <button type="button" onClick={() => cycle(1)} style={CHIP}>→</button>
      </div>
      <span style={{ opacity: 0.85, fontSize: 11, textAlign: 'center' }}>{current.note}</span>

      <Row label={`grounds to compare — ${venues.length} in the list, ${demoCount} of them demo`}>
        <Toggle on={false} onTap={addDemo}>{busy ? '…' : 'add demo'}</Toggle>
        <Toggle on={false} onTap={removeDemo}>{busy ? '…' : 'remove demo'}</Toggle>
      </Row>

      <Row label={`list order — ${order === 'created' ? 'as created' : 'most recently active first'}`}>
        <Toggle on={order === 'created'} onTap={() => set('order', 'created')}>created</Toggle>
        <Toggle on={order === 'recent'} onTap={() => set('order', 'recent')}>recent</Toggle>
      </Row>

      {/* B is a single row: its finding sits inline at the right end and there is
          no "above" for it to sit in. */}
      {active !== 'B' && (
        <Row label={`fit finding + Pull inside — ${fit} the list`}>
          <Toggle on={fit === 'above'} onTap={() => set('fit', 'above')}>above</Toggle>
          <Toggle on={fit === 'below'} onTap={() => set('fit', 'below')}>below</Toggle>
        </Row>
      )}

      <Row label={`out of bounds — showing ${fake === 'real' ? 'the real count' : fake}`}>
        {FAKE_COUNTS.map((value) => (
          <Toggle
            key={value}
            on={fake === value}
            onTap={() => set('fake', value === 'real' ? null : value)}
          >
            {value}
          </Toggle>
        ))}
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ opacity: 0.85, fontSize: 11 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

function Toggle({ on, onTap, children }: { on: boolean; onTap: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onTap}
      style={{ ...CHIP, background: on ? '#fff' : 'rgba(0,0,0,0.35)', color: on ? '#ff00aa' : '#fff' }}
    >
      {children}
    </button>
  );
}

const CHIP: React.CSSProperties = {
  border: 'none',
  borderRadius: 10,
  background: 'rgba(0,0,0,0.35)',
  color: '#fff',
  // 44 both ways. See the note at the top of this file.
  minWidth: 44,
  minHeight: 44,
  padding: '0 12px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'monospace',
  touchAction: 'manipulation',
};
