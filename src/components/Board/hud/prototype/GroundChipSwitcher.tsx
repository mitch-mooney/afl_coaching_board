/**
 * PROTOTYPE — THROWAWAY. Not production code. Delete with the branch.
 *
 * The floating switcher for the ground-chip variants. Deliberately ugly and
 * high-contrast so it is obviously not part of the design being judged.
 *
 * Parked well above the bottom edge: the Pods skin already has a pod bottom-left,
 * the play FAB bottom-centre and the camera pod bottom-right, and covering any of
 * them would hide exactly the density the chip has to survive.
 */
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { VARIANTS, useVariant, type VariantKey } from './GroundChipPrototype';

const FAKE_COUNTS = ['real', '0', '1', '3', '9'];

export function GroundChipSwitcher() {
  const [params, setParams] = useSearchParams();
  const variant = useVariant();
  const active = variant ?? 'A';

  const go = (key: VariantKey) => {
    const next = new URLSearchParams(params);
    next.set('variant', key);
    setParams(next, { replace: true });
  };

  const setFake = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'real') next.delete('fake');
    else next.set('fake', value);
    setParams(next, { replace: true });
  };

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
        alignItems: 'center',
        gap: 6,
        padding: '8px 10px',
        borderRadius: 14,
        background: '#ff00aa',
        color: '#fff',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        fontFamily: 'monospace',
        fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" onClick={() => cycle(-1)} style={ARROW}>←</button>
        <span style={{ minWidth: 190, textAlign: 'center', fontWeight: 700 }}>
          {current.key} — {current.name}
        </span>
        <button type="button" onClick={() => cycle(1)} style={ARROW}>→</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ opacity: 0.8, marginRight: 4 }}>out of bounds:</span>
        {FAKE_COUNTS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFake(value)}
            style={{
              ...ARROW,
              minWidth: 28,
              background: fake === value ? '#fff' : 'rgba(0,0,0,0.35)',
              color: fake === value ? '#ff00aa' : '#fff',
            }}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

const ARROW: React.CSSProperties = {
  border: 'none',
  borderRadius: 8,
  background: 'rgba(0,0,0,0.35)',
  color: '#fff',
  padding: '6px 10px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'monospace',
  touchAction: 'manipulation',
};
