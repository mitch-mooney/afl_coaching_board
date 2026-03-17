// src/components/UI/HelpScreen.tsx
interface Props { onClose: () => void; }

const SECTIONS = [
  {
    heading: 'Getting Started',
    items: [
      { key: 'New Scenario', desc: 'Create a scenario from the home screen. Each scenario stores player positions and movement phases.' },
      { key: 'Team Rosters', desc: 'Import squads from PlayHQ before opening a scenario so players show their names on the board.' },
    ],
  },
  {
    heading: 'The Board',
    items: [
      { key: 'Setup mode', desc: 'Drag players to position them freely. No trails are created.' },
      { key: 'Draw mode', desc: 'Drag players to record movement trails. Press Play to animate.' },
      { key: 'Formations', desc: 'Use Centre Bounce, Kick-in Press, or Kick-in Kick buttons to instantly position all players.' },
      { key: 'Re-apply ↺', desc: 'Reapplies the last selected formation preset.' },
    ],
  },
  {
    heading: 'Camera Views',
    items: [
      { key: 'TV', desc: 'Default broadcast overhead view. Drag to orbit, pinch/scroll to zoom.' },
      { key: 'POV 1 / POV 2', desc: 'First-person view from a player. Click a player first to assign them to POV 1 or POV 2 slots.' },
    ],
  },
  {
    heading: 'Player Labels',
    items: [
      { key: '# (Number)', desc: 'Shows jersey number on each player.' },
      { key: 'Name', desc: 'Shows surname — requires a roster imported for that team.' },
      { key: 'Pos', desc: 'Shows position code (FB, CHF, etc.) where assigned.' },
    ],
  },
  {
    heading: 'Video & The Board',
    items: [
      { key: 'Video tab', desc: 'Import a match video to review. Use Concert Mode to sync animation playback with the video.' },
      { key: 'Take to Board →', desc: 'Switch from video to board to recreate the scenario you just reviewed.' },
    ],
  },
  {
    heading: 'Keyboard Shortcuts',
    items: [
      { key: 'Space', desc: 'Play / pause animation' },
      { key: 'F', desc: 'Fullscreen (video tab)' },
      { key: '?', desc: 'Toggle this help screen' },
    ],
  },
];

export function HelpScreen({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6
                   border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Help</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.heading} className="mb-6">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
              {section.heading}
            </h3>
            <dl className="space-y-2">
              {section.items.map((item) => (
                <div key={item.key} className="flex gap-3">
                  <dt className="text-sm font-medium text-white min-w-[110px] shrink-0">
                    {item.key}
                  </dt>
                  <dd className="text-sm text-gray-400">{item.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        <div className="border-t border-gray-800 pt-4 mt-2">
          <button
            onClick={() => { localStorage.removeItem('afl-onboarding-v1-done'); onClose(); }}
            className="text-sm text-gray-500 hover:text-gray-300"
          >
            Reset onboarding tour
          </button>
        </div>
      </div>
    </div>
  );
}
