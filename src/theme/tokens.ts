/**
 * The design tokens: the one source for the app's colour, type, spacing and
 * radius (facelift Spec 1, issue #90).
 *
 * `tailwind.config.ts` builds its theme from this module and the inline-style
 * HUD code imports it directly, so a utility class and an inline style can
 * never disagree about what Floodlight is. Nothing else defines a palette for
 * the HUD.
 *
 * Plain data with no imports, because Tailwind loads it from Node at build time.
 *
 * The hexes are a starting point, to be tuned on the iPad against the TV case.
 * Tune the values, keep the names: every surface refers to the names.
 */

/**
 * A night game under lights. There is no brand accent: team colours are the
 * accents, and they are the only bright tones on screen.
 *
 * Floodlight is the **state** colour: an armed tip, an active view, an open
 * panel, the focus ring. Armed and selected never borrow a team's colour.
 * Amber is not here on purpose: it means "doesn't fit" and nothing else
 * (ADR 0005), so it lives with the Fit readout as `OUT_OF_BOUNDS_AMBER`.
 */
export const palette = {
  /** Ground base under lights. */
  turf: '#1F3A26',
  /** Ground inside a light pool. */
  turfLit: '#2E5534',
  /** Lines, and primary text on chrome. */
  chalk: '#F1EFE6',
  /** Chrome surfaces. */
  concrete: '#262422',
  /** Raised chrome and dividers. */
  steel: '#3B3E41',
  /** Active or armed state, and the focus ring. */
  floodlight: '#FFF1C9',
} as const;

export type PaletteColour = (typeof palette)[keyof typeof palette];

/**
 * A palette colour at an opacity, for chrome laid over the board: a translucent
 * Concrete panel, a Chalk hairline. The way to get a lighter or fainter version
 * of a token without inventing a new colour.
 */
export function withAlpha(hex: PaletteColour, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/**
 * Elevation. Shadow is the absence of light rather than a colour, so it is black
 * at an opacity and not one of the palette's tones.
 */
export const shadows = {
  /** A floating control: a pod button, the play button. */
  raised: '0 6px 20px rgba(0, 0, 0, 0.5)',
  /** A popover hanging off the top bar. */
  popover: '0 8px 28px rgba(0, 0, 0, 0.55)',
} as const;

/**
 * Font stacks, as lists so Tailwind can take them as they are. Both faces are
 * self-hosted with the build (`@fontsource-variable/*`, imported in `main.tsx`),
 * so the iPad renders them offline; the names are the ones those packages
 * declare.
 *
 * Each stack ends in a system face of the same shape, so text that renders
 * before the font loads, or on a device where it fails, keeps its proportions:
 * body text falls back to a system sans, display text to a condensed one.
 */
export const fontFamilies = {
  /** Public Sans: everything that is not a number or a heading. */
  body: [
    '"Public Sans Variable"',
    'system-ui',
    '-apple-system',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ],
  /**
   * Big Shoulders Display: numbers and headings, a condensed block face that
   * echoes a guernsey number.
   */
  display: [
    '"Big Shoulders Display Variable"',
    '"Arial Narrow"',
    '"Roboto Condensed"',
    '"Helvetica Neue Condensed"',
    '"Avenir Next Condensed"',
    'sans-serif-condensed',
    'sans-serif',
  ],
};

/** The same stacks joined into `font-family` values, for inline styles. */
export const fonts = {
  body: fontFamilies.body.join(', '),
  display: fontFamilies.display.join(', '),
} as const;

export type TypeFamily = keyof typeof fontFamilies;

export interface TypeStep {
  /** px */
  size: number;
  /** px */
  lineHeight: number;
  weight: number;
  family: TypeFamily;
}

/**
 * The type scale. Sentence case throughout: no step is uppercased, and no label
 * should be either.
 */
export const typeScale = {
  /** Secondary detail: a hint, a count's unit. */
  caption: { size: 11, lineHeight: 14, weight: 500, family: 'body' },
  /** Control labels: buttons, pills, menu items. */
  label: { size: 12, lineHeight: 16, weight: 600, family: 'body' },
  /** Running text in panels and dialogs. */
  body: { size: 13, lineHeight: 18, weight: 400, family: 'body' },
  /** A Play's name, a panel's title. */
  title: { size: 18, lineHeight: 22, weight: 700, family: 'display' },
  /** Page headings. */
  heading: { size: 24, lineHeight: 28, weight: 700, family: 'display' },
  /** Numbers on chrome: a speed readout, a count, a guernsey number. */
  number: { size: 16, lineHeight: 18, weight: 800, family: 'display' },
} as const satisfies Record<string, TypeStep>;

export type TypeStepName = keyof typeof typeScale;

/** One step of the scale as inline-style properties. */
export function typeStyle(step: TypeStepName) {
  const { size, lineHeight, weight, family } = typeScale[step];
  return { fontFamily: fonts[family], fontSize: size, lineHeight: `${lineHeight}px`, fontWeight: weight };
}

/** Spacing, in px. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Corner radii, in px, named for what wears them. */
export const radii = {
  /** Small chips and inline pills. */
  chip: 8,
  /** Buttons and tips. */
  control: 12,
  /** Floating panels and the Tool rail's pill. */
  panel: 16,
  /** Fully rounded. */
  pill: 999,
} as const;
