// src/components/UI/OnboardingTour.tsx
import { useState, useEffect } from 'react';
import {
  dialogBody,
  dialogPanel,
  dialogPrimaryButton,
  dialogTitle,
} from './dialogStyles';

const STEPS = [
  {
    title: 'Welcome to your Coaching Board',
    body: 'Create plays to position players and recreate match situations. Switch between board and video in the same session.',
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
    body: 'Import a match video in the Video tab, then recreate the play on the Board — review the clip in picture-in-picture while you set it up.',
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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-lg pb-10 bg-concrete/60">
      <div className={`${dialogPanel} max-w-sm p-xl`}>
        <div className="flex justify-between items-center mb-lg">
          <span className="font-display text-number text-chalk/70">
            {step + 1} / {STEPS.length}
          </span>
          <button onClick={finish} className="min-h-[44px] px-sm text-label text-chalk/60 hover:text-chalk">
            Skip
          </button>
        </div>
        <h3 className={`${dialogTitle} mb-sm`}>{cur.title}</h3>
        <p className={`${dialogBody} mb-xl`}>{cur.body}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-xs">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-pill motion-safe:transition-all ${
                  i === step ? 'w-6 bg-floodlight' : 'w-1.5 bg-steel'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => { if (step < STEPS.length - 1) setStep((s) => s + 1); else finish(); }}
            className={dialogPrimaryButton}
          >
            {step < STEPS.length - 1 ? 'Next →' : 'Get started'}
          </button>
        </div>
      </div>
    </div>
  );
}
