// src/components/UI/OnboardingTour.tsx
import { useState, useEffect } from 'react';

const STEPS = [
  {
    title: 'Welcome to your Coaching Board',
    body: 'Create scenarios to position players and recreate match situations. Switch between board and video in the same session.',
  },
  {
    title: 'Setup vs Draw mode',
    body: 'In Setup mode, drag players freely to position them — no trails. Switch to Draw mode to record movement trails for animation playback.',
  },
  {
    title: 'Three camera views',
    body: "TV shows the broadcast overhead view. POV 1 & 2 show the game from a specific player's perspective. Click a player first to assign them to a POV slot.",
  },
  {
    title: 'Import your squad',
    body: 'Go to Team Rosters to import from PlayHQ — paste the squad table or enter the page URL. Player names then show on the board.',
  },
  {
    title: 'Video & board side by side',
    body: 'Import a match video in the Video tab, then recreate the scenario on the Board — review the clip in picture-in-picture while you set up the play.',
  },
];

const DONE_KEY = 'afl-onboarding-v1-done';

export function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(DONE_KEY)) setVisible(true);
  }, []);

  const finish = () => { localStorage.setItem(DONE_KEY, '1'); setVisible(false); };

  if (!visible) return null;

  const cur = STEPS[step];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4 pb-10">
      <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
            {step + 1} / {STEPS.length}
          </span>
          <button onClick={finish} className="text-gray-500 hover:text-gray-300 text-sm">
            Skip
          </button>
        </div>
        <h3 className="text-base font-bold mb-2">{cur.title}</h3>
        <p className="text-sm text-gray-400 mb-6">{cur.body}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-amber-500' : 'w-1.5 bg-gray-700'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => { if (step < STEPS.length - 1) setStep((s) => s + 1); else finish(); }}
            className="px-5 py-2 rounded-lg bg-amber-500 text-black font-semibold
                       hover:bg-amber-400 text-sm"
          >
            {step < STEPS.length - 1 ? 'Next →' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
