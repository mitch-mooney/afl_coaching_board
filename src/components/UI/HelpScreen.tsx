// src/components/UI/HelpScreen.tsx
import { useOverlayOpen } from '../../hooks/useOverlayOpen';
import {
  dialogBody,
  dialogLayer,
  dialogPanelScroll,
  dialogSubheading,
} from './dialogStyles';

interface Props { onClose: () => void; }

const SECTIONS = [
  {
    heading: 'Getting started',
    items: [
      { key: 'New Play', desc: 'Create a play from the home screen. Each play stores player positions and movement phases.' },
      { key: 'Team Rosters', desc: 'Import squads from PlayHQ before opening a play so players show their names on the board.' },
    ],
  },
  {
    heading: 'The board',
    items: [
      { key: 'Setup mode', desc: 'Drag players to position them freely. No trails are created.' },
      { key: 'Draw mode', desc: 'Drag players to record movement trails. Press Play to animate.' },
      { key: 'Formations', desc: 'Use Centre Bounce, Kick-in Press, or Kick-in Kick buttons to instantly position all players.' },
      { key: 'Re-apply ↺', desc: 'Reapplies the last selected formation preset.' },
    ],
  },
  {
    heading: 'Camera views',
    items: [
      { key: 'TV', desc: 'Default broadcast overhead view. Drag to orbit, pinch/scroll to zoom.' },
      { key: 'POV 1 / POV 2', desc: 'First-person view from a player. Click a player first to assign them to POV 1 or POV 2 slots.' },
    ],
  },
  {
    heading: 'Player labels',
    items: [
      { key: '# (Number)', desc: 'Shows jersey number on each player.' },
      { key: 'Name', desc: 'Shows surname — requires a roster imported for that team.' },
      { key: 'Pos', desc: 'Shows position code (FB, CHF, etc.) where assigned.' },
    ],
  },
  {
    heading: 'Video and the board',
    items: [
      { key: 'Video tab', desc: 'Import a match video to review, in picture-in-picture or full-field mode.' },
      { key: '← Board', desc: 'Switch from video to board to recreate the play you just reviewed.' },
    ],
  },
  {
    heading: 'Keyboard shortcuts',
    items: [
      { key: 'Space', desc: 'Play / pause animation' },
      { key: 'F', desc: 'Fullscreen (video tab)' },
      { key: '?', desc: 'Toggle this help screen' },
    ],
  },
];

export function HelpScreen({ onClose }: Props) {
  useOverlayOpen();
  return (
    <div
      className={`${dialogLayer} bg-concrete/75`}
      onClick={onClose}
    >
      <div
        className={`${dialogPanelScroll} max-w-lg p-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-xl">
          <h2 className="font-display text-heading text-chalk">Help</h2>
          <button
            onClick={onClose}
            aria-label="Close help"
            className="w-11 h-11 flex items-center justify-center rounded-control text-title text-chalk/70 hover:text-chalk hover:bg-steel/50"
          >
            ×
          </button>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.heading} className="mb-xl">
            <h3 className={`${dialogSubheading} mb-md`}>
              {section.heading}
            </h3>
            <dl className="space-y-sm">
              {section.items.map((item) => (
                <div key={item.key} className="flex gap-md">
                  <dt className="text-body font-semibold text-chalk min-w-[110px] shrink-0">
                    {item.key}
                  </dt>
                  <dd className={dialogBody}>{item.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        <div className="border-t border-steel pt-lg mt-sm">
          <button
            onClick={() => { localStorage.removeItem('afl-onboarding-v1-done'); onClose(); }}
            className="min-h-[44px] text-label text-chalk/60 hover:text-chalk"
          >
            Reset onboarding tour
          </button>
        </div>
      </div>
    </div>
  );
}
