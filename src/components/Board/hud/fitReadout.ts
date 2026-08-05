/**
 * What the board's ground chrome says out loud: the **Fit readout**'s prose —
 * the answer to *does the open board fit the Active Venue?* — and the **Ground
 * chip**'s name-and-dot beside it.
 *
 * Pure text — and the one colour that text is said in — deliberately free of
 * React, so the copy and its rules can be asserted without a component harness:
 * same shape as `toolRailTips.ts` and `toolRailColours.ts`, which pairs its tip
 * names with its tip colours for the same reason.
 *
 * The readout itself is the count, this sentence, **Pull inside boundary** and
 * whether the board has been pulled inside, together; it lives on the board and
 * nowhere else (docs/adr/0005-the-fit-readout-lives-on-the-board.md) — since
 * issue #52 that is literally true, the popover column carrying the block and
 * the Grounds panel carrying no fit claim at all. This module is where its words
 * live, so the block's markup holds none of its own.
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

/**
 * The colour of *this board does not fit*: the chip's dot and the readout
 * block's border, which are the same finding at two resolutions (ADR 0005).
 *
 * Deliberately here rather than in `podStyles`, which holds the same hex for a
 * different meaning — on the Tool rail amber means *this tip is armed*. One
 * constant for two meanings would make either impossible to change without
 * changing the other. Shared between the chip and the block because there it is
 * one meaning, and a hex duplicated across two files that must agree is exactly
 * the drift this module exists to prevent.
 */
export const OUT_OF_BOUNDS_AMBER = '#f59e0b';

/** Everything the **Fit readout**'s block shows, on a board that has something outside. */
export interface FitReadoutState {
  /** Whether the block appears at all — the whole of *is there anything to say?* */
  shown: boolean;
  /** "4 players are outside Jubilee Park." — empty when nothing is outside. */
  sentence: string;
  /** Why the finding is not an error: out of bounds is a state, and disk is untouched. */
  reassurance: string;
  /** **Pull inside boundary**'s label — the remedy, named as the domain names it. */
  remedy: string;
}

/**
 * The block that hangs under the ground list: what is outside, that leaving it
 * is fine, and the one tap that fixes it — the finding and its remedy together,
 * which is what makes it one thing rather than a warning and a button.
 *
 * `shown` is the count and nothing else. It is **never** softened by how the
 * board came to be this way (ADR 0005): a coach who has just switched to a
 * ground they know is tight is exactly who is about to decide whether to pull
 * inside, and a readout that went quiet for being unsurprising would take the
 * decision off the screen at the moment it is being made.
 *
 * The copy comes back whole rather than as parts to assemble, so the block's
 * markup holds no words of its own and the wording can be asserted here.
 */
export function fitReadoutState(report: OutOfBoundsReport, groundName?: string): FitReadoutState {
  return {
    shown: report.count > 0,
    sentence: outOfBoundsSentence(report, groundName),
    reassurance: 'Leaving it is fine — nothing is changed on disk until you save the play.',
    remedy: 'Pull inside boundary',
  };
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
