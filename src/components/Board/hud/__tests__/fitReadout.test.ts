import { describe, it, expect } from 'vitest';
import {
  describeOutOfBounds,
  fitReadoutState,
  groundChipState,
  hasBeenPulledInside,
  outOfBoundsSentence,
} from '../fitReadout';
import { boundaryOf, outOfBounds } from '../../../../utils/fieldGeometry';
import type { OutOfBoundsReport } from '../../../../utils/fieldGeometry';

// What the Fit readout says out loud. The football claim: with Saturday's ground
// selected, the readout tells the coach how much of the play is off it — one
// winger a metre out reads differently from half the structure, which is why it
// names kinds and counts rather than raising a warning.

const report = (over: Partial<OutOfBoundsReport> = {}): OutOfBoundsReport => {
  const filled = { players: [], cones: [], paths: [], ball: false, ...over };
  return {
    ...filled,
    count: filled.players.length + filled.cones.length + filled.paths.length + (filled.ball ? 1 : 0),
  };
};

describe('describeOutOfBounds', () => {
  it('names a single player in the singular', () => {
    expect(describeOutOfBounds(report({ players: ['p1'] }))).toBe('1 player');
  });

  it('pluralises a group of the same kind', () => {
    expect(describeOutOfBounds(report({ players: ['p1', 'p2', 'p3', 'p4'] }))).toBe('4 players');
  });

  it('joins two kinds with "and"', () => {
    expect(describeOutOfBounds(report({ players: ['p1', 'p2', 'p3'], paths: ['lead'] }))).toBe(
      '3 players and 1 path',
    );
  });

  it('commas the earlier kinds and reserves "and" for the last', () => {
    expect(
      describeOutOfBounds(report({ players: ['p1'], paths: ['lead'], cones: ['c1', 'c2'] })),
    ).toBe('1 player, 1 path and 2 cones');
  });

  it('lists content in board order — players, paths, cones, then the ball', () => {
    expect(
      describeOutOfBounds(
        report({ players: ['p1'], paths: ['lead'], cones: ['c1'], ball: true }),
      ),
    ).toBe('1 player, 1 path, 1 cone and the ball');
  });

  it('names the ball as a thing rather than a count', () => {
    expect(describeOutOfBounds(report({ ball: true }))).toBe('the ball');
  });

  it('says nothing about a board that fits', () => {
    expect(describeOutOfBounds(report())).toBe('');
  });
});

describe('outOfBoundsSentence', () => {
  it('names the ground the content is outside of', () => {
    expect(outOfBoundsSentence(report({ players: ['p1', 'p2', 'p3', 'p4'] }), 'Jubilee Park')).toBe(
      '4 players are outside Jubilee Park.',
    );
  });

  it('agrees the verb with a single item', () => {
    expect(outOfBoundsSentence(report({ players: ['p1'] }), 'Jubilee Park')).toBe(
      '1 player is outside Jubilee Park.',
    );
  });

  it('agrees the verb with mixed kinds, which are always plural', () => {
    expect(
      outOfBoundsSentence(report({ players: ['p1'], paths: ['lead'] }), 'Jubilee Park'),
    ).toBe('1 player and 1 path are outside Jubilee Park.');
  });

  it('treats the ball on its own as singular', () => {
    expect(outOfBoundsSentence(report({ ball: true }), 'Jubilee Park')).toBe(
      'the ball is outside Jubilee Park.',
    );
  });

  it('falls back to "this ground" when no ground is named', () => {
    // ADR 0002 seeds Standard ground so there is always an Active Venue, but the
    // sentence still has to read as English if a caller hands it nothing.
    expect(outOfBoundsSentence(report({ players: ['p1', 'p2'] }), undefined)).toBe(
      '2 players are outside this ground.',
    );
  });

  it('says nothing about a board that fits, rather than a sentence with no subject', () => {
    expect(outOfBoundsSentence(report(), 'Jubilee Park')).toBe('');
  });

  it('speaks for a real board measured against a real ground', () => {
    // Anchored to the geometry rather than a hand-built report, so the sentence
    // can never disagree with what is actually off the ground — a path counts
    // once however many of its keyframes stray, and that is what it says.
    const tight = boundaryOf({ boundaryLength: 150, boundaryWidth: 110 });
    const found = outOfBounds(
      {
        players: [
          { id: 'winger', teamId: 'team1', position: [0, 0, 60], rotation: 0, color: '#0066cc' },
        ],
        paths: [
          {
            id: 'lead',
            entityId: 'winger',
            entityType: 'player',
            keyframes: [
              { timestamp: 0, position: [0, 0, 60] },
              { timestamp: 1, position: [0, 0, 70] },
            ],
            duration: 1,
            startTimeOffset: 0,
          },
        ],
        ball: null,
        cones: [],
      },
      tight,
    );

    expect(outOfBoundsSentence(found, 'Jubilee Park')).toBe(
      '1 player and 1 path are outside Jubilee Park.',
    );
  });
});

describe('hasBeenPulledInside', () => {
  // The football claim: a coach who pulled the play inside at a tight ground and
  // tapped back to a wide one is told so, rather than meeting an empty fit slot
  // that reads as *your play fits this ground*. Pure over the undo stack's
  // entries — no store, no listener, nothing to keep in step (ADR 0005).

  it('says nothing about a board that has never been pulled', () => {
    expect(hasBeenPulledInside([])).toBe(false);
  });

  it('ignores the ordinary edits that make up most of the stack', () => {
    // A dragged player is not a pull. The marker is a fit claim at higher
    // resolution, never *this board has been edited* — that would be the dirty
    // flag this app deliberately does not have.
    expect(hasBeenPulledInside([{}, {}])).toBe(false);
  });

  it('speaks while a pull entry is still on the stack', () => {
    expect(hasBeenPulledInside([{ pulledInside: true }])).toBe(true);
  });

  it('reads the whole stack, not just the newest entry', () => {
    // A pull followed by three drags is still a pulled board: the coach can
    // reach it with four presses of undo, and until they do it is true.
    expect(hasBeenPulledInside([{ pulledInside: true }, {}, {}, {}])).toBe(true);
  });

  it('goes quiet once the last pull entry has left the stack', () => {
    // Undo moves the entry to `future`; the predicate is over `past` alone, so
    // the signal clears on its own with no clearing code anywhere.
    expect(hasBeenPulledInside([{}])).toBe(false);
  });
});

describe('fitReadoutState', () => {
  // The football claim: the coach switches to Saturday's ground and, without
  // leaving the board, reads how much of the play is off it and taps the one
  // control that fixes it — the finding and its remedy as one block.

  it('says nothing at all about a board that fits', () => {
    const quiet = fitReadoutState(report(), 'Jubilee Park');
    // Both, not just `shown`: a caller that rendered the block anyway must find
    // no sentence in it rather than one with no subject.
    expect(quiet.shown).toBe(false);
    expect(quiet.sentence).toBe('');
  });

  it('speaks as soon as anything is outside', () => {
    expect(fitReadoutState(report({ players: ['p1'] }), 'Jubilee Park').shown).toBe(true);
  });

  it('speaks for the ball alone, which is one thing and not a player', () => {
    expect(fitReadoutState(report({ ball: true }), 'Jubilee Park').shown).toBe(true);
  });

  it('carries the whole sentence, ground and all', () => {
    expect(fitReadoutState(report({ players: ['p1', 'p2', 'p3', 'p4'] }), 'Jubilee Park').sentence).toBe(
      '4 players are outside Jubilee Park.',
    );
  });

  it('names the remedy the coach taps, as the domain names it', () => {
    expect(fitReadoutState(report({ players: ['p1'] }), 'Jubilee Park').remedy).toBe(
      'Pull inside boundary',
    );
  });

  it('says leaving it is fine, because it is', () => {
    // Out of bounds is a legitimate state to sit in, and nothing reaches disk
    // until the coach saves. The finding is stated, never raised as an error.
    expect(fitReadoutState(report({ players: ['p1'] }), 'Jubilee Park').reassurance).toBe(
      'Leaving it is fine — nothing is changed on disk until you save the play.',
    );
  });

  it('falls back to "this ground" rather than implying there is no ground', () => {
    expect(fitReadoutState(report({ players: ['p1', 'p2'] }), undefined).sentence).toBe(
      '2 players are outside this ground.',
    );
  });

  it('is never suppressed for being unsurprising', () => {
    // ADR 0005: a coach who has just switched to a ground they know is tight
    // still gets the readout. Nothing here keys on how the board got this way.
    const justSwitched = fitReadoutState(report({ players: ['p1'] }), 'Standard ground');
    const alwaysWas = fitReadoutState(report({ players: ['p1'] }), 'Jubilee Park');
    expect(justSwitched.shown).toBe(alwaysWas.shown);
  });
});

describe('fitReadoutState — the readout remembers the pull', () => {
  // The football claim: pull inside at Saturday's tight ground, tap back to the
  // wide one, and the column says the board was pulled — the count is honestly 0,
  // and 0 the coach *created* is not the finding 0 they *inherited* (ADR 0005).

  it('says nothing about a board that has not been pulled', () => {
    expect(fitReadoutState(report(), 'Jubilee Park', false).pullMemory).toBe('');
  });

  it('remembers the pull in the copy the coach reads, word for word', () => {
    // No clause about disk: "the saved play is unchanged either way" was drafted
    // and cut, because it is false the moment the coach saves.
    expect(fitReadoutState(report(), 'Jubilee Park', true).pullMemory).toBe(
      'This board has been pulled inside a boundary. Undo restores it.',
    );
  });

  it('does not name the ground it was pulled to fit — the memory is one bit', () => {
    expect(fitReadoutState(report(), 'Jubilee Park', true).pullMemory).toBe(
      fitReadoutState(report(), 'Windy Hill', true).pullMemory,
    );
  });

  it('shows the block for a fitting board that has been pulled', () => {
    // The one state that would otherwise be silent, and the whole reason for the
    // ticket: nothing is outside, so without this the column says nothing at all.
    const pulled = fitReadoutState(report(), 'Jubilee Park', true);
    expect(pulled.shown).toBe(true);
    expect(pulled.outOfBounds).toBe(false);
    expect(pulled.sentence).toBe('');
  });

  it('says both when the board neither fits nor is unpulled', () => {
    // Pulled at one ground, then switched to a narrower one. Neither finding
    // hides the other — standing at a tight ground with Pull inside under your
    // thumb, having already pulled once is the decision-relevant thing on screen.
    const both = fitReadoutState(report({ players: ['p1'] }), 'Jubilee Park', true);
    expect(both.shown).toBe(true);
    expect(both.outOfBounds).toBe(true);
    expect(both.sentence).toBe('1 player is outside Jubilee Park.');
    expect(both.pullMemory).not.toBe('');
  });

  it('leaves the finding and its remedy to the count alone', () => {
    // The pull never softens what is outside now: same sentence, same remedy,
    // pulled or not. Only the extra line differs.
    const outside = report({ players: ['p1', 'p2'] });
    const pulled = fitReadoutState(outside, 'Jubilee Park', true);
    const unpulled = fitReadoutState(outside, 'Jubilee Park', false);
    expect(pulled.sentence).toBe(unpulled.sentence);
    expect(pulled.remedy).toBe(unpulled.remedy);
    expect(pulled.reassurance).toBe(unpulled.reassurance);
  });

  it('reads an unpulled board the same as one that was never asked', () => {
    // The argument is optional, so every existing caller keeps its meaning.
    expect(fitReadoutState(report({ players: ['p1'] }), 'Jubilee Park')).toEqual(
      fitReadoutState(report({ players: ['p1'] }), 'Jubilee Park', false),
    );
  });
});

describe('groundChipState', () => {
  // The football claim: standing at the ground, the coach reads the board's own
  // chrome and learns which ground it is drawing and whether the play fits it —
  // one glance, no panel.

  it('names the Active Venue', () => {
    expect(groundChipState(report(), 'Jubilee Park').name).toBe('Jubilee Park');
  });

  it('falls back to Standard ground rather than implying there is no ground', () => {
    // ADR 0005: no surface may imply there is no ground. The only moment nothing
    // resolves is before the Venue records load, and the chip is on screen then.
    expect(groundChipState(report(), undefined).name).toBe('Standard ground');
  });

  it('keeps quiet at rest, so a board that fits wears no warning', () => {
    expect(groundChipState(report(), 'Jubilee Park').dotLit).toBe(false);
  });

  it('lights the dot as soon as anything is outside', () => {
    expect(groundChipState(report({ players: ['p1'] }), 'Jubilee Park').dotLit).toBe(true);
  });

  it('lights the dot for the ball alone, which is one thing and not a player', () => {
    expect(groundChipState(report({ ball: true }), 'Jubilee Park').dotLit).toBe(true);
  });

  it('lights the same one dot however much is outside — the dot is one bit', () => {
    const few = groundChipState(report({ players: ['p1'] }), 'Jubilee Park');
    const many = groundChipState(
      report({ players: ['p1', 'p2', 'p3'], cones: ['c1'], ball: true }),
      'Jubilee Park',
    );
    expect(many.dotLit).toBe(few.dotLit);
  });

  it('stays quiet for a board that was pulled inside, because it now fits', () => {
    // ADR 0005: the dot is the one-bit answer to *does this board fit?*, and
    // after a pull the honest value of that bit is *fits*. The chip takes no
    // pull argument at all — a lit dot would mean *doesn't fit **or** was
    // pulled*, two claims on one pixel, and a fitting board would wear a
    // permanent warning. The memory stops one rung down, in the column — and
    // the enforcement is the signature: there is no argument here to pass it.
    expect(groundChipState(report(), 'Jubilee Park').dotLit).toBe(false);
  });

  it('names the ground to a screen reader, which cannot see the dot', () => {
    expect(groundChipState(report(), 'Jubilee Park').label).toBe('Ground: Jubilee Park');
  });

  it('tells a screen reader how much is outside, since the dot says only that some is', () => {
    // The visible chip deliberately carries no number — it would be a second
    // thing to read and it would move. A label is read aloud rather than laid
    // out, so the count costs nothing there and is the whole of the finding.
    expect(groundChipState(report({ players: ['p1', 'p2', 'p3', 'p4'] }), 'Jubilee Park').label).toBe(
      'Ground: Jubilee Park, 4 outside the boundary',
    );
  });
});
