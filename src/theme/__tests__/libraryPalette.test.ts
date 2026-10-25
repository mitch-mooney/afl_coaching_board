import { describe, expect, it } from 'vitest';
import playbookLibrary from '../../components/UI/PlaybookLibrary.tsx?raw';
import playLibrary from '../../components/UI/PlayLibrary.tsx?raw';
import rosterLibrary from '../../components/UI/RosterLibrary.tsx?raw';
import playThumbnail from '../../components/UI/PlayThumbnail.tsx?raw';
import globalDrawer from '../../components/UI/GlobalDrawer.tsx?raw';
import mobileMenu from '../../components/UI/MobileMenu.tsx?raw';

/**
 * The library pages, the drawer and the menu take every colour and face from the
 * design tokens, the same rule `hudPalette.test.ts` holds the board chrome to.
 * Leaving the board should not feel like leaving the app, and it did while each
 * page picked its own blue-black and teal inline.
 *
 * Team colours arrive as data, and the doesn't-fit marker takes its amber from
 * `OUT_OF_BOUNDS_AMBER` (ADR 0005), so neither appears here as a literal.
 */
const SURFACES = {
  'PlaybookLibrary.tsx': playbookLibrary,
  'PlayLibrary.tsx': playLibrary,
  'RosterLibrary.tsx': rosterLibrary,
  'PlayThumbnail.tsx': playThumbnail,
  'GlobalDrawer.tsx': globalDrawer,
  'MobileMenu.tsx': mobileMenu,
};

/** A hex, an rgb()/hsl() call, or a utility class from Tailwind's stock palette. */
const COLOUR_LITERAL =
  /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\b(?:text|bg|border|from|to|ring|divide)-(?:white|black|gray|slate|zinc|neutral|red|amber|yellow|green|teal|cyan|blue|indigo|purple)\b/gi;

/** A font named inline rather than through the tokens. */
const FONT_LITERAL = /sans-serif|fontFamily:\s*['"]/g;

/**
 * Text forced into capitals, by class or by being written that way in JSX. An
 * acronym is a word, not a shouted label, so the ones the app uses are allowed.
 */
const ALL_CAPS = /\buppercase\b|>\s*[^<>{}]*\b(?!(?:AFL|URL|POV)\b)[A-Z]{3,}\b[^<>{}]*</g;

describe('the library and menu palette', () => {
  it.each(Object.entries(SURFACES))('%s defines no colour of its own', (_file, source) => {
    expect(source.match(COLOUR_LITERAL) ?? []).toEqual([]);
  });

  it.each(Object.entries(SURFACES))('%s names no font of its own', (_file, source) => {
    expect(source.match(FONT_LITERAL) ?? []).toEqual([]);
  });

  it.each(Object.entries(SURFACES))('%s sets no label in capitals', (_file, source) => {
    expect(source.match(ALL_CAPS) ?? []).toEqual([]);
  });
});
