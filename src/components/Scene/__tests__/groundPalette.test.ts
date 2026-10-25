import { describe, expect, it } from 'vitest';
import field from '../Field.tsx?raw';
import skyDome from '../SkyDome.tsx?raw';
import sharedViewer from '../../Shared/SharedPlaybookViewer.tsx?raw';

/**
 * The ground takes its colours from the night ground (`nightGround.ts`), which
 * mixes them from the design tokens. A colour literal in a scene file is a
 * second ground, which is how the shared viewer came to have its own.
 * `hudPalette.test.ts` holds the chrome to the same rule.
 */
const GROUND = { 'Field.tsx': field, 'SkyDome.tsx': skyDome };

const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/gi;

describe('the ground palette', () => {
  it.each(Object.entries(GROUND))('%s defines no colour of its own', (_file, source) => {
    expect(source.match(COLOUR_LITERAL) ?? []).toEqual([]);
  });

  it('has one look: the ground takes no dark mode, and the shared viewer asks for none', () => {
    expect(field).not.toMatch(/darkMode/);
    expect(sharedViewer).not.toMatch(/darkMode/);
  });
});
