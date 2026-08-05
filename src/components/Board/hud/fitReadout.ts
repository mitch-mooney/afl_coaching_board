/**
 * What the **Fit readout** says out loud: the prose half of the answer to *does
 * the open board fit the Active Venue?*
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
 */

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
