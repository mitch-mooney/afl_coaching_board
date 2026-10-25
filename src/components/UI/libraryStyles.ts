import type { KeyboardEvent } from 'react';

/**
 * The class lists the Playbook, Play and Roster libraries share, built from the
 * design tokens through the Tailwind theme. The three pages were each picking
 * their own blue-black and teal inline. Stating the chrome once here keeps them
 * looking like one product, and like the board they open onto.
 *
 * No brand accent: a primary action is Chalk on Concrete, the brightest neutral
 * there is. Floodlight is kept for state, such as the active filter.
 */

/** The page itself: Concrete, Chalk text, the body face. */
export const PAGE = 'min-h-screen bg-concrete text-chalk font-sans';

/** The bar across the top. It wraps at phone width rather than overflowing. */
export const TOP_BAR =
  'flex flex-wrap items-center gap-md px-lg py-md border-b border-steel bg-concrete';

/** The app's mark: a small lit ground, in place of the old teal-to-blue tile. */
export const MARK = 'w-7 h-7 flex-shrink-0 rounded-chip border border-chalk/40 bg-gradient-to-b from-turf-lit to-turf';

/** The page or Playbook name in the top bar. */
export const TOP_BAR_TITLE = 'font-display text-title truncate';

/** The actions at the right of the top bar. */
export const TOP_BAR_ACTIONS = 'ml-auto flex flex-wrap items-center gap-sm';

const BUTTON =
  'inline-flex items-center justify-center min-h-[44px] px-lg rounded-control text-label ' +
  'transition-colors touch-manipulation cursor-pointer';

/** A secondary action: a Steel button. */
export const BUTTON_SECONDARY = `${BUTTON} border border-steel bg-steel/60 text-chalk hover:border-chalk/40 hover:bg-steel`;

/** The page's one primary action. */
export const BUTTON_PRIMARY = `${BUTTON} bg-chalk text-concrete hover:bg-chalk/85`;

/** A text-only action, such as Back. */
export const BUTTON_QUIET =
  'inline-flex items-center min-h-[44px] px-xs text-label text-chalk/70 hover:text-chalk transition-colors cursor-pointer';

/**
 * A small action on a card: Rename, Delete. Delete is not red, because the
 * palette has no danger colour, and it asks before it deletes anything.
 */
export const CARD_ACTION =
  'flex-shrink-0 rounded-chip px-sm py-xs text-caption text-chalk/50 hover:text-chalk hover:bg-chalk/10 transition-colors cursor-pointer';

/** The body of the page under the top bar. */
export const CONTENT = 'max-w-[900px] mx-auto px-lg pt-xl pb-[120px]';

/** A section heading and its count. */
export const SECTION_HEADER = 'flex flex-wrap items-center gap-sm mb-lg';
export const SECTION_TITLE = 'font-display text-heading';
export const COUNT_PILL = 'rounded-pill border border-steel bg-steel/60 px-sm font-display text-number text-chalk/80';

/** The card grid. One column at phone width, as many 260px columns as fit above it. */
export const CARD_GRID = 'grid gap-md grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))]';

/**
 * A card that opens something. It is a focusable button for the keyboard, so it
 * takes the app's focus ring from `index.css`.
 */
export const CARD =
  'overflow-hidden rounded-panel border border-steel bg-steel/40 text-left cursor-pointer ' +
  'transition-colors hover:border-chalk/40';

/** A card's picture: a patch of lit Turf, the ground a Play is drawn on. */
export const CARD_TURF = 'relative h-[100px] flex items-center justify-center bg-gradient-to-b from-turf-lit to-turf';

/** A card's name and its detail line. */
export const CARD_BODY = 'flex items-start justify-between gap-sm px-md py-sm';
export const CARD_NAME = 'text-label text-chalk truncate';
export const CARD_DETAIL = 'text-caption text-chalk/60';

/** A small badge laid over a card's picture. */
export const BADGE =
  'absolute top-[7px] flex items-center gap-xs rounded-chip px-sm py-xxs text-caption backdrop-blur-sm';

/** The Roster link pinned to the foot of the library pages, above the safe area. */
export const FOOT_PILL =
  'fixed left-1/2 -translate-x-1/2 z-20 flex items-center gap-sm min-h-[44px] px-lg ' +
  'rounded-control border border-steel bg-concrete/95 text-label text-chalk/80 hover:text-chalk ' +
  'transition-colors cursor-pointer';
export const FOOT_PILL_BOTTOM = 'calc(1rem + env(safe-area-inset-bottom, 0px))';

/** Open a card from the keyboard, as a click opens it. */
export function openOnKey(onOpen: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    // Keys pressed in the card's own buttons or the rename field are theirs.
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };
}
