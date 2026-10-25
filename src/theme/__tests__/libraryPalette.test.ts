import { describe, expect, it } from 'vitest';
import playbookLibrary from '../../components/UI/PlaybookLibrary.tsx?raw';
import playLibrary from '../../components/UI/PlayLibrary.tsx?raw';
import rosterLibrary from '../../components/UI/RosterLibrary.tsx?raw';
import playThumbnail from '../../components/UI/PlayThumbnail.tsx?raw';
import globalDrawer from '../../components/UI/GlobalDrawer.tsx?raw';
import mobileMenu from '../../components/UI/MobileMenu.tsx?raw';
import libraryStyles from '../../components/UI/libraryStyles.ts?raw';
import { CARD_ACTION, CARD_ACTION_DESTRUCTIVE } from '../../components/UI/libraryStyles';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  'libraryStyles.ts': libraryStyles,
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

describe('destructive actions', () => {
  it('a card action that deletes is drawn with a dashed edge, not in a colour', () => {
    expect(CARD_ACTION_DESTRUCTIVE).toMatch(/\bborder-dashed\b/);
    expect(CARD_ACTION).not.toMatch(/\bborder-dashed\b/);
  });

  it.each([
    ['PlaybookLibrary.tsx', playbookLibrary],
    ['PlayLibrary.tsx', playLibrary],
    ['RosterLibrary.tsx', rosterLibrary],
  ])('every Delete in %s is a destructive action', (_file, source) => {
    const deletes = source.match(/className=\{CARD_ACTION\w*\}\s*>\s*Delete\b/g) ?? [];
    expect(deletes.length).toBeGreaterThan(0);
    for (const d of deletes) expect(d).toContain('CARD_ACTION_DESTRUCTIVE');
  });
});

describe('reduced motion', () => {
  // Read from disk: Vitest hands back an empty string for a CSS import, ?raw included.
  const indexCss = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

  it('index.css stills transitions and animations when the viewer asks', () => {
    const block = indexCss.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
    expect(block).not.toBeNull();
    expect(block![1]).toMatch(/transition-duration/);
    expect(block![1]).toMatch(/animation-duration/);
  });
});
