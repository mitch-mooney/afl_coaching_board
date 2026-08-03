/**
 * PROTOTYPE — THROWAWAY. Not production code. Delete with the branch.
 *
 * The floating switcher for the ground-chip variants. Deliberately ugly and
 * high-contrast so it is obviously not part of the design being judged.
 *
 * Parked well above the bottom edge: the Pods skin already has a pod bottom-left,
 * the play FAB bottom-centre and the camera pod bottom-right, and covering any of
 * them would hide exactly the density the chip has to survive.
 *
 * Every control here is 44px, because the first pass shipped 28×32 count buttons
 * and they could not be hit on the iPad — which read as "the count does nothing"
 * and cost a whole device pass. Prototype chrome that cannot be operated on the
 * device the prototype is for answers nothing.
 */
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALERTS, VARIANTS, useAlert, useVariant, type VariantKey } from './GroundChipPrototype';

const FAKE_COUNTS = ['real', '0', '1', '3', '9'];

export function GroundChipSwitcher() {
  const [params, setParams] = useSearchParams();
  const variant = useVariant();
  const alert = useAlert();
  const active = variant ?? 'A';

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const go = (key: VariantKey) => set('variant', key);

  const cycle = (step: number) => {
    const index = VARIANTS.findIndex((v) => v.key === active);
    go(VARIANTS[(index + step + VARIANTS.length) % VARIANTS.length].key);
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

  if (!variant || !import.meta.env.DEV) return null;

  const current = VARIANTS.find((v) => v.key === active)!;
  const fake = params.get('fake') ?? 'real';

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
        <span style={{ flex: 1, minWidth: 200, textAlign: 'center', fontWeight: 700 }}>
          {current.key} — {current.name}
        </span>
        <button type="button" onClick={() => cycle(1)} style={CHIP}>→</button>
      </div>

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

      {/* Only A distinguishes these, and A is the one still being judged. */}
      {active === 'A' && (
        <Row label="how it reacts">
          {ALERTS.map(({ key, name }) => (
            <Toggle key={key} on={alert === key} onTap={() => set('alert', key)}>
              {name}
            </Toggle>
          ))}
        </Row>
      )}
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
      style={{
        ...CHIP,
        background: on ? '#fff' : 'rgba(0,0,0,0.35)',
        color: on ? '#ff00aa' : '#fff',
      }}
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
