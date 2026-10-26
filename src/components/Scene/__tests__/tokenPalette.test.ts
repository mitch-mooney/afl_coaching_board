import { describe, expect, it } from 'vitest';
import playerToken from '../PlayerToken.tsx?raw';

/**
 * The Player token wears what the guernsey module decides and nothing else: its
 * band, centre and label colours all come from the team's `Guernsey`. A colour
 * literal in the token would be a second opinion on what a team wears, which is
 * how the box figures and the token could come to disagree.
 * `groundPalette.test.ts` holds the ground to the same rule.
 */
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/gi;

describe('the Player token palette', () => {
  it('defines no colour of its own', () => {
    expect(playerToken.match(COLOUR_LITERAL) ?? []).toEqual([]);
  });

  it('wears the guernsey: body, pattern colours and label', () => {
    expect(playerToken).toMatch(/guernsey\.body/);
    expect(playerToken).toMatch(/guernsey\.patternColours/);
    expect(playerToken).toMatch(/guernsey\.label/);
  });
});
