import { describe, expect, it } from 'vitest';
import dialogStyles from '../../components/UI/dialogStyles.ts?raw';
import teamSelectModal from '../../components/Board/hud/TeamSelectModal.tsx?raw';
import rosterImportModal from '../../components/Board/hud/RosterImportModal.tsx?raw';
import povSelectModal from '../../components/Board/hud/PovSelectModal.tsx?raw';
import savePlayDialog from '../../components/UI/SavePlayDialog.tsx?raw';
import sharePlayModal from '../../components/UI/SharePlayModal.tsx?raw';
import venueModal from '../../components/UI/VenueModal.tsx?raw';
import matchSetupModal from '../../components/UI/MatchSetupModal.tsx?raw';
import playHQImportDialog from '../../components/UI/PlayHQImportDialog.tsx?raw';
import helpScreen from '../../components/UI/HelpScreen.tsx?raw';
import onboardingTour from '../../components/UI/OnboardingTour.tsx?raw';
import featureNotification from '../../components/UI/FeatureNotification.tsx?raw';
import sharedPlaybookViewer from '../../components/Shared/SharedPlaybookViewer.tsx?raw';
import videoUploader from '../../components/VideoImport/VideoUploader.tsx?raw';
import videoWorkspace from '../../components/VideoImport/VideoWorkspace.tsx?raw';
import playbackControls from '../../components/VideoImport/PlaybackControls.tsx?raw';
import videoTimeline from '../../components/VideoImport/VideoTimeline.tsx?raw';

/**
 * Every dialog belongs to the app (issue #96): it takes its colours, type and
 * radii from the design tokens, the same way the HUD chrome does
 * (`hudPalette.test.ts`).
 *
 * The shared viewer is held to the same rule for its own chrome: the loading,
 * error and header states. Its `<Canvas>` is the ground, which belongs to the
 * Night ground ticket (#94), so the scene inside it is left out here.
 *
 * The Video tab is held to the same rules (issue 108): it is where Link Video
 * Moment lands, and its import panel is the drawer's Import video dialog.
 */
const withoutScene = (source: string) => source.replace(/<Canvas[\s\S]*?<\/Canvas>/g, '');

const DIALOGS = {
  'dialogStyles.ts': dialogStyles,
  'TeamSelectModal.tsx': teamSelectModal,
  'RosterImportModal.tsx': rosterImportModal,
  'PovSelectModal.tsx': povSelectModal,
  'SavePlayDialog.tsx': savePlayDialog,
  'SharePlayModal.tsx': sharePlayModal,
  'VenueModal.tsx': venueModal,
  'MatchSetupModal.tsx': matchSetupModal,
  'PlayHQImportDialog.tsx': playHQImportDialog,
  'HelpScreen.tsx': helpScreen,
  'OnboardingTour.tsx': onboardingTour,
  'FeatureNotification.tsx': featureNotification,
  'SharedPlaybookViewer.tsx (chrome)': withoutScene(sharedPlaybookViewer),
  'VideoUploader.tsx': videoUploader,
  'VideoWorkspace.tsx': videoWorkspace,
  'PlaybackControls.tsx': playbackControls,
  'VideoTimeline.tsx': videoTimeline,
};

/** A hex, an rgb/hsl call, or one of Tailwind's stock colours by name. */
const COLOUR_LITERAL =
  /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\b(?:text|bg|border|from|via|to|ring|outline|divide|placeholder)-(?:white|black|gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)\b/gi;

/** A font named outside the tokens. */
const FONT_LITERAL = /sans-serif|\bfont-mono\b|fontFamily:\s*['"]/g;

/** Any of the stock theme's corner radii, which the token radii replace. */
const STOCK_RADIUS = /\brounded(?:-(?:sm|md|lg|xl|2xl|3xl|full))?(?=[\s'"`])/g;

/** Uppercased labels: the type scale is sentence case throughout. */
const ALL_CAPS = /\buppercase\b|textTransform/g;

/**
 * Motion that is not gated on the viewer allowing it. A transition or an
 * entrance has to sit behind `motion-safe:`, so that under reduced motion a
 * dialog simply appears.
 */
const UNGATED_MOTION = /(?<!motion-safe:)\b(?:transition(?:-[a-z]+)?|duration-\d+|animate-[a-z]+|ease-[a-z-]+)(?=[\s'"`])/g;

/** A fixed width wider than a phone's (375pt, less a 16pt gutter each side). */
const PHONE_WIDTH = 343;
const FIXED_WIDTH = /\b(?:min-)?w-\[(\d+)px\]/g;

describe('the dialogs', () => {
  it.each(Object.entries(DIALOGS))('%s defines no colour of its own', (_file, source) => {
    expect(source.match(COLOUR_LITERAL) ?? []).toEqual([]);
  });

  it.each(Object.entries(DIALOGS))('%s names no font of its own', (_file, source) => {
    expect(source.match(FONT_LITERAL) ?? []).toEqual([]);
  });

  it.each(Object.entries(DIALOGS))('%s rounds corners with the token radii', (_file, source) => {
    expect(source.match(STOCK_RADIUS) ?? []).toEqual([]);
  });

  it.each(Object.entries(DIALOGS))('%s sets no label in capitals', (_file, source) => {
    expect(source.match(ALL_CAPS) ?? []).toEqual([]);
  });

  it.each(Object.entries(DIALOGS))('%s holds still under reduced motion', (_file, source) => {
    expect(source.match(UNGATED_MOTION) ?? []).toEqual([]);
  });

  it.each(Object.entries(DIALOGS))('%s fits at phone width', (_file, source) => {
    const tooWide = [...source.matchAll(FIXED_WIDTH)].filter(([, px]) => Number(px) > PHONE_WIDTH);
    expect(tooWide.map(([match]) => match)).toEqual([]);
  });

  /**
   * Amber means "doesn't fit" and nothing else (ADR 0005), and no dialog shows
   * the Fit readout: the Grounds panel is barred from it, and the Play
   * library's per-row playFit mark is not a dialog. So no dialog uses amber
   * at all, whatever it is spelt as.
   */
  it.each(Object.entries(DIALOGS))('%s never uses amber', (_file, source) => {
    expect(source.match(/amber|OUT_OF_BOUNDS_AMBER|#e8a020|#f59e0b/gi) ?? []).toEqual([]);
  });
});
