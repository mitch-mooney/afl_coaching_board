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
import type { HistoryEntry } from '../../../store/historyStore';
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

/**
 * **Pull inside boundary**'s label — the remedy, named as the domain names it,
 * and also the one string the Fit readout's pull memory matches against. A
 * single export rather than a literal repeated at both sites: a hex duplicated
 * across two files that must agree is exactly the drift `OUT_OF_BOUNDS_AMBER`
 * above exists to prevent, and a label is no different.
 */
export const PULL_INSIDE_BOUNDARY_LABEL = 'Pull inside boundary';

/**
 * The one field of a history entry the memory reads: the label the edit was
 * recorded under.
 *
 * A `Pick` of the real thing rather than a lookalike interface — same move as
 * `fieldGeometry.PlaceableContent`, and for the same reason: a structural copy
 * would be satisfied by `HistoryEntry` whatever that type later did, so
 * renaming the field over there would leave this predicate compiling and
 * silently answering *no* forever. The import is type-only, so this module still
 * pulls in nothing of the store at runtime.
 */
export type PullMarkedEntry = Pick<HistoryEntry, 'label'>;

/**
 * Has the open board been pulled inside a Boundary — a predicate over the undo
 * stack's entries, nothing else (ADR 0005).
 *
 * The memory is not new state. Every edit now carries a label, and Pull inside
 * boundary's is `PULL_INSIDE_BOUNDARY_LABEL` — the same string the edit is
 * recorded under and the remedy is named with, one export rather than a string
 * repeated at both sites — so this reads true while that entry is on `past`;
 * undo moves it to `future` and this goes false **on its own**, redo brings
 * both back. There is nothing to clear and nowhere for the claim to drift from
 * what undo will actually do.
 *
 * Emphatically not *this board has been edited*: a dragged player's entry is
 * labelled "Move player" and says nothing here. That reading would be an
 * app-wide dirty flag, which `useOutOfBounds.ts` and `fieldGeometry.ts` both
 * stake the out-of-bounds design on not having.
 *
 * The whole stack, not the newest entry: a pull followed by three drags is still
 * a pulled board, and the coach can still reach it with undo.
 */
export function hasBeenPulledInside(past: readonly PullMarkedEntry[]): boolean {
  return past.some((entry) => entry.label === PULL_INSIDE_BOUNDARY_LABEL);
}

/**
 * *"This board has been pulled inside a boundary. Undo restores it."*
 *
 * A boolean's worth of copy: the ground is deliberately unnamed, because the
 * coach's decision — undo, or keep — turns only on whether it happened, and
 * naming it would need a rule for pulls at two grounds.
 *
 * No clause about disk. An earlier draft ended *"the saved play is unchanged
 * either way"*; it was cut because it is false the moment the coach saves, and a
 * line whose job is to prevent false reassurance is the wrong place to add one.
 */
const PULLED_INSIDE_MEMORY = 'This board has been pulled inside a boundary. Undo restores it.';

/** Everything the **Fit readout**'s block shows, on a board with something to say. */
export interface FitReadoutState {
  /** Whether the block appears at all — the whole of *is there anything to say?* */
  shown: boolean;
  /** Whether anything is outside *now*: the sentence, the reassurance and the remedy. */
  outOfBounds: boolean;
  /** "4 players are outside Jubilee Park." — empty when nothing is outside. */
  sentence: string;
  /** Why the finding is not an error: out of bounds is a state, and disk is untouched. */
  reassurance: string;
  /** **Pull inside boundary**'s label — the remedy, named as the domain names it. */
  remedy: string;
  /** The memory of the pull — empty unless the open board has been pulled inside. */
  pullMemory: string;
}

/**
 * The block that hangs under the ground list: what is outside, that leaving it
 * is fine, and the one tap that fixes it — the finding and its remedy together,
 * which is what makes it one thing rather than a warning and a button.
 *
 * `outOfBounds` is the count and nothing else. It is **never** softened by how
 * the board came to be this way (ADR 0005): a coach who has just switched to a
 * ground they know is tight is exactly who is about to decide whether to pull
 * inside, and a readout that went quiet for being unsurprising would take the
 * decision off the screen at the moment it is being made. `pulled` only ever
 * *adds* a line — the finding and its remedy read the same either way.
 *
 * `shown` is the two together, because the state this whole memory exists for is
 * a board that fits: a count of 0 the coach **created** by pulling inside is not
 * the finding a count of 0 they **inherited** is, and with `shown` on the count
 * alone the column would say nothing at exactly that moment.
 *
 * The copy comes back whole rather than as parts to assemble, so the block's
 * markup holds no words of its own and the wording can be asserted here.
 */
export function fitReadoutState(
  report: OutOfBoundsReport,
  groundName?: string,
  pulled = false,
): FitReadoutState {
  const outOfBounds = report.count > 0;
  return {
    shown: outOfBounds || pulled,
    outOfBounds,
    sentence: outOfBoundsSentence(report, groundName),
    reassurance: 'Leaving it is fine — nothing is changed on disk until you save the play.',
    remedy: PULL_INSIDE_BOUNDARY_LABEL,
    pullMemory: pulled ? PULLED_INSIDE_MEMORY : '',
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
