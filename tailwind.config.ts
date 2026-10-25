import type { Config } from 'tailwindcss';
import { fontFamilies, palette, radii, spacing, typeScale } from './src/theme/tokens';

const px = (value: number) => `${value}px`;

const mapValues = <T, U>(record: Record<string, T>, fn: (value: T) => U) =>
  Object.fromEntries(Object.entries(record).map(([key, value]) => [key, fn(value)]));

/**
 * Built from the design tokens (`src/theme/tokens.ts`), so `bg-floodlight` and
 * an inline `palette.floodlight` are the same value by construction.
 *
 * Everything is added under `extend` with names the stock theme does not use,
 * so the library pages' existing utilities keep working until they are
 * restyled. The one replacement is `sans`: the app has one body face.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        turf: palette.turf,
        'turf-lit': palette.turfLit,
        chalk: palette.chalk,
        concrete: palette.concrete,
        steel: palette.steel,
        floodlight: palette.floodlight,
      },
      fontFamily: {
        sans: fontFamilies.body,
        display: fontFamilies.display,
      },
      fontSize: mapValues(typeScale, ({ size, lineHeight, weight }) => [
        px(size),
        { lineHeight: px(lineHeight), fontWeight: String(weight) },
      ]),
      spacing: mapValues(spacing, px),
      borderRadius: mapValues(radii, px),
    },
  },
  plugins: [],
} satisfies Config;
