import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BoardChrome } from '../BoardChrome';
import { useAnimationStore } from '../../../../store/animationStore';
import { usePlayerStore } from '../../../../store/playerStore';

// The one Board chrome (ADR 0007), asserted on the rendered DOM the coach
// taps. Where each surface sits is checked by geometry in a real browser; jsdom
// has no layout, so these tests cover what each surface holds and how the
// Setup sheet opens and closes.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const region = (name: string) => container.querySelector<HTMLElement>(`[aria-label="${name}"]`);
const buttonNames = (el: HTMLElement | null) =>
  Array.from(el?.querySelectorAll('button') ?? []).map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim());
const button = (within: HTMLElement | null, name: string) =>
  Array.from(within?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent?.trim()) === name,
  ) ?? null;

function render(accessory?: React.ReactNode) {
  act(() => root.render(<BoardChrome accessory={accessory} />));
}

beforeEach(() => {
  useAnimationStore.setState({ hasAnimation: false, isPlaying: false, progress: 0 });
  usePlayerStore.getState().initializePlayers?.();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('the View column', () => {
  it('holds every camera view and both POV slots with their assignment', () => {
    render();
    expect(buttonNames(region('View column'))).toEqual([
      'Broadcast',
      'Top',
      'Sideline',
      'End-to-end',
      'Reset camera',
      'POV 1: unset',
      'POV 2: unset',
      'Assign POV 1',
      'Assign POV 2',
    ]);
  });

  it('keeps an empty, labelled Lens group for Spec 2', () => {
    render();
    const lens = region('Lens');
    expect(lens).not.toBeNull();
    expect(region('View column')!.contains(lens)).toBe(true);
    expect(lens!.querySelectorAll('button')).toHaveLength(0);
    expect(lens!.textContent).toContain('Lens');
  });
});

describe('the Playback bar', () => {
  it('holds play, stop, the scrubber, speed and the Setup button', () => {
    useAnimationStore.setState({ hasAnimation: true });
    render();
    const bar = region('Playback bar');
    expect(buttonNames(bar)).toEqual(['Play', 'Stop', 'Playback speed', 'Setup']);
    expect(bar!.querySelector('input[type="range"][aria-label="Scrub animation"]')).not.toBeNull();
  });

  it('says plainly when the Play has no animation, and its transport is disabled', () => {
    render();
    const bar = region('Playback bar')!;
    expect(bar.textContent).toContain('No animation');
    expect(button(bar, 'Play')!.disabled).toBe(true);
    expect(button(bar, 'Stop')!.disabled).toBe(true);
    expect(bar.querySelector<HTMLInputElement>('input[type="range"]')!.disabled).toBe(true);
    // Setup is not transport: it works on a board with no animation.
    expect(button(bar, 'Setup')!.disabled).toBe(false);
  });

  it('carries the accessory above itself, in its own column', () => {
    render(<button>Link Video Moment</button>);
    const bar = region('Playback bar')!;
    const accessory = button(container, 'Link Video Moment')!;
    expect(bar.contains(accessory)).toBe(false);
    expect(bar.parentElement!.contains(accessory)).toBe(true);
  });
});

describe('the Setup sheet', () => {
  const openSheet = () => act(() => button(region('Playback bar'), 'Setup')!.click());

  it('is closed until Setup is pressed, then holds the Setup action list without Undo', () => {
    render();
    expect(region('Setup sheet')).toBeNull();
    openSheet();
    const names = buttonNames(region('Setup sheet'));
    expect(names).toEqual(
      expect.arrayContaining([
        'Centre Bounce',
        'Kick-in Press',
        'Kick-in Kick',
        'Reset players',
        'Clear paths',
        'Clear annotations',
        'Clear players',
        'Import roster…',
      ]),
    );
    expect(names.some((n) => /teams/i.test(n ?? ''))).toBe(true);
    expect(names.some((n) => /^labels/i.test(n ?? ''))).toBe(true);
    expect(names).not.toContain('Undo');
    expect(button(region('Playback bar'), 'Setup')!.getAttribute('aria-expanded')).toBe('true');
  });

  it('disables the formations while a team is short of 18', () => {
    usePlayerStore.setState({ players: [] });
    render();
    openSheet();
    const sheet = region('Setup sheet');
    for (const name of ['Centre Bounce', 'Kick-in Press', 'Kick-in Kick']) {
      expect(button(sheet, name)!.disabled).toBe(true);
    }
    // Reset players is how a short board gets back to full strength.
    expect(button(sheet, 'Reset players')!.disabled).toBe(false);
  });

  it('closes on a tap on the board', () => {
    render();
    openSheet();
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    act(() => {
      canvas.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    canvas.remove();
    expect(region('Setup sheet')).toBeNull();
  });

  it('stays open for a tap inside itself', () => {
    render();
    openSheet();
    act(() => {
      region('Setup sheet')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(region('Setup sheet')).not.toBeNull();
  });

  it('closes when Setup is pressed again', () => {
    render();
    openSheet();
    openSheet();
    expect(region('Setup sheet')).toBeNull();
  });
});
