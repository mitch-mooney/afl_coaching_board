/**
 * What the board's ground chrome says out loud: the **Fit readout**'s prose —
 * the answer to *does the open board fit the Active Venue?* — and the **Ground
 * chip**'s name-and-dot beside it.
 *
 * Pure text, deliberately free of React, so the copy and its rules can be
 * asserted without a component harness — same shape as `toolRailTips.ts` and
 * `toolRailColours.ts`.
 *
 * The readout itself is the count, this sentence, **Pull inside boundary** and
 * whether the board has been pulled inside, together; it lives on the board and
 * nowhere else (docs/adr/0005-the-fit-readout-lives-on-the-board.md). This
 * module is where its words live, so that when the readout moves from the
 * Grounds panel to the ground chip's popover the copy is already at its
 * destination and only the markup changes.
 *
 * The sentence is stated as a finding, not an error. A play that does not fit is
 * a true thing to look at, and leaving it is a legitimate choice — which is why
 * this names kinds and counts rather than raising a warning.
 *
 * The chip's state is here rather than in a module of its own for two reasons:
 * splitting it out would be a second seam for one decision, and the dot and the
 * sentence are the same finding at two resolutions, so keeping them side by side
 * is what stops *the pull memory reaches the column and never the chip* (ADR
 * 0005) drifting apart into two files that no longer read as one ladder.
 */

import { STANDARD_GROUND_NAME } from '../../../models/VenueModel';
import type { OutOfBoundsReport } from '../../../utils/fieldGeometry';

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

/**
 * "3 players and 1 path" — enough for the coach to tell one winger a metre out
 * from half the structure not fitting, which is the whole point of showing a
 * count rather than a warning triangle.
 *
 * Empty for a board that fits: the caller decides whether there is anything to
 * say, because the same `count` also drives whether the readout appears at all.
 */
export function describeOutOfBounds(report: OutOfBoundsReport): string {
  const parts: string[] = [];
  if (report.players.length) parts.push(plural(report.players.length, 'player'));
  if (report.paths.length) parts.push(plural(report.paths.length, 'path'));
  if (report.cones.length) parts.push(plural(report.cones.length, 'cone'));
  if (report.ball) parts.push('the ball');
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The whole sentence, ground and all: "4 players are outside Jubilee Park."
 *
 * `count` carries the agreement rather than the phrase, so two kinds of one
 * thing each — "1 player and 1 path" — correctly read as *are*.
 *
 * Empty for a board that fits, like the phrase it is built from. Every caller so
 * far asks the count first and renders nothing at 0, but a sentence with no
 * subject — "are outside Jubilee Park." — is not a thing this module should be
 * able to hand anyone.
 *
 * The ground falls back to "this ground" only so the sentence stays English if a
 * caller has nothing to hand: ADR 0002 seeds Standard ground precisely so there
 * is always an Active Venue, and no surface may imply there is no ground.
 */
export function outOfBoundsSentence(report: OutOfBoundsReport, groundName?: string): string {
  const subject = describeOutOfBounds(report);
  if (!subject) return '';
  const verb = report.count === 1 ? 'is' : 'are';
  return `${subject} ${verb} outside ${groundName ?? 'this ground'}.`;
}

/** Everything the **Ground chip** shows: which ground, and whether to speak up. */
export interface GroundChipState {
  /** The Active Venue's name — the chip's whole content at rest. */
  name: string;
  /** Whether the amber dot is lit: one bit, meaning *something is outside*. */
  dotLit: boolean;
  /** The accessible name, since a dot is nothing to a screen reader. */
  label: string;
}

/**
 * The chip's state, from the board's out-of-bounds report and whatever the
 * Active Venue is called.
 *
 * **The name never empties and is never a prompt.** ADR 0002 seeds Standard
 * ground so there is always an Active Venue, and ADR 0005 draws the UI half of
 * that: no surface may imply there is no ground. `Set a ground` would be a
 * falsehood, and the only moment nothing resolves — before the Venue records
 * load — is one the chip is already on screen for.
 *
 * **The dot is one bit and carries no number.** A count on the chip is a second
 * thing to read, and it changes width as it changes value, so the control beside
 * it moves while the coach is reaching for it. The count and the sentence live
 * one rung down, in the popover's Fit readout, which has room to explain.
 *
 * The label is the one place the count belongs: it is read aloud rather than
 * laid out, so it costs no width and a lit dot alone would tell a screen-reader
 * user nothing at all.
 */
export function groundChipState(report: OutOfBoundsReport, groundName?: string): GroundChipState {
  const name = groundName ?? STANDARD_GROUND_NAME;
  const dotLit = report.count > 0;
  return {
    name,
    dotLit,
    label: dotLit ? `Ground: ${name}, ${report.count} outside the boundary` : `Ground: ${name}`,
  };
}
