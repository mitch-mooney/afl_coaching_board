import { describe, expect, it } from 'vitest';
import podStyles from '../../components/Board/hud/podStyles.ts?raw';
import toolRail from '../../components/Board/hud/ToolRail.tsx?raw';
import hudActions from '../../components/Board/hud/hudActions.tsx?raw';
import boardChrome from '../../components/Board/hud/BoardChrome.tsx?raw';
import viewColumn from '../../components/Board/hud/ViewColumn.tsx?raw';
import playbackBar from '../../components/Board/hud/PlaybackBar.tsx?raw';
import setupSheet from '../../components/Board/hud/SetupSheet.tsx?raw';
import groundChip from '../../components/Board/hud/GroundChip.tsx?raw';
import editorTopBar from '../../components/Layout/EditorTopBar.tsx?raw';
import linkedVideoBar from '../../components/Layout/LinkedVideoBar.tsx?raw';
import hamburgerIcon from '../../components/UI/HamburgerIcon.tsx?raw';
import colourPopover from '../../components/Board/hud/ColourPopover.tsx?raw';
import textAnnotationInput from '../../components/Board/hud/TextAnnotationInput.tsx?raw';

/**
 * The HUD chrome takes every colour from the design tokens. A colour literal in
 * one of these files is a parallel palette, which is how the HUD ended up with
 * its own teal and blue-black glass in the first place.
 *
 * Team colours and annotation colours are content, not chrome, and arrive as
 * data, so they never appear here as literals.
 *
 * `GroundPopover` is left out on purpose: its Fit readout block is drawn in
 * amber, which belongs to *doesn't fit* (ADR 0005) rather than to the palette.
 * Its chrome colours come from the tokens all the same.
 */
const CHROME = {
  'podStyles.ts': podStyles,
  'ToolRail.tsx': toolRail,
  'hudActions.tsx': hudActions,
  'BoardChrome.tsx': boardChrome,
  'ViewColumn.tsx': viewColumn,
  'PlaybackBar.tsx': playbackBar,
  'SetupSheet.tsx': setupSheet,
  'GroundChip.tsx': groundChip,
  'EditorTopBar.tsx': editorTopBar,
  'LinkedVideoBar.tsx': linkedVideoBar,
  'HamburgerIcon.tsx': hamburgerIcon,
  'ColourPopover.tsx': colourPopover,
  'TextAnnotationInput.tsx': textAnnotationInput,
};

const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\b(?:text|bg|border|from|to)-(?:white|black|gray|slate|teal|blue|cyan)\b/gi;

describe('the HUD palette', () => {
  it.each(Object.entries(CHROME))('%s defines no colour of its own', (_file, source) => {
    expect(source.match(COLOUR_LITERAL) ?? []).toEqual([]);
  });
});
