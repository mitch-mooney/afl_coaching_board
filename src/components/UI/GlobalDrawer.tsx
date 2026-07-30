import { useVideoStore } from '../../store/videoStore';
import { useUIStore } from '../../store/uiStore';
import { useState, useMemo } from 'react';
import { VideoUploader } from '../VideoImport/VideoUploader';
import { HamburgerIcon } from './HamburgerIcon';
import { MobileMenu, createMenuSection, createMenuItem, type MenuSection } from './MobileMenu';
import { useAuthStore } from '../../store/authStore';
import { useMatchStore } from '../../store/matchStore';
import { useHudPreferenceStore } from '../../store/hudPreferenceStore';
import { usePlayStore } from '../../store/playStore';
import { isSupabaseConfigured } from '../../lib/supabase';
import { SavePlayDialog } from './SavePlayDialog';
import { MatchSetupModal } from './MatchSetupModal';
import { SharePlayModal } from './SharePlayModal';

export function GlobalDrawer() {
  const isVideoMode = useVideoStore((state) => state.isVideoMode);
  const isLoaded = useVideoStore((state) => state.isLoaded);
  const isLoading = useVideoStore((state) => state.isLoading);
  const clearVideo = useVideoStore((state) => state.clearVideo);

  // UI store state for responsive menu
  const isMenuOpen = useUIStore((state) => state.isMenuOpen);
  const toggleMenu = useUIStore((state) => state.toggleMenu);

  const authUser = useAuthStore((state) => state.user);
  const authIsConfigured = useAuthStore((state) => state.isConfigured);
  const authSignOut = useAuthStore((state) => state.signOut);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showVideoUploader, setShowVideoUploader] = useState(false);
  const [showMatchSetup, setShowMatchSetup] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const activePlayId = usePlayStore((s) => s.activePlayId);

  // Match store state (only what the menu sections need directly)
  const matchShowScoreboard = useMatchStore((s) => s.showScoreboard);
  const toggleScoreboard = useMatchStore((s) => s.toggleScoreboard);

  // HUD skin override (Auto/Rail/Pods)
  const skinOverride = useHudPreferenceStore((s) => s.skinOverride);
  const cycleSkinOverride = useHudPreferenceStore((s) => s.cycleSkinOverride);
  const skinLabel = skinOverride === 'auto' ? 'Auto' : skinOverride === 'B' ? 'Rail' : 'Pods';

  // Build mobile menu sections from toolbar functionality (global actions only —
  // per-mode controls live in the board HUD pods)
  const mobileMenuSections: MenuSection[] = useMemo(() => {
    const sections: MenuSection[] = [];

    // Video section
    const videoItems = [];
    if (isVideoMode && isLoaded) {
      videoItems.push(
        createMenuItem('clear-video', 'Clear Video', clearVideo, { variant: 'danger', description: 'Remove the imported background video' })
      );
    } else {
      videoItems.push(
        createMenuItem('import-video', isLoading ? 'Loading...' : 'Import Video', () => setShowVideoUploader(true), {
          variant: 'teal',
          disabled: isLoading,
          description: 'Import a video to overlay on the field',
        })
      );
    }
    sections.push(createMenuSection('video', 'Video', videoItems));

    // Match section
    sections.push(
      createMenuSection('match', 'Match', [
        createMenuItem('match-setup', 'Match Setup', () => setShowMatchSetup(true), { variant: 'teal', description: 'Configure team names, scores and quarter' }),
        createMenuItem('toggle-scoreboard', matchShowScoreboard ? 'Hide Scoreboard' : 'Show Scoreboard', toggleScoreboard, {
          variant: 'primary',
          active: matchShowScoreboard,
          description: 'Show or hide the 3D scoreboard on the field',
        }),
      ])
    );

    // Playbook section
    const playbookItems = [
      createMenuItem('save-playbook', 'Save Playbook', () => setShowSaveDialog(true), { variant: 'warning', description: 'Save this formation to your playbook library' }),
    ];
    if (isSupabaseConfigured()) {
      playbookItems.push(
        createMenuItem('share-play', 'Share Play', () => setShowShare(true), {
          variant: 'purple',
          disabled: activePlayId == null,
          description: activePlayId == null ? 'Open a saved play from your library to share it' : 'Create a shareable link for this play',
        })
      );
    }
    sections.push(createMenuSection('playbook', 'Playbook', playbookItems));

    // Display section
    sections.push(createMenuSection('display', 'Display', [
      createMenuItem('board-layout', `Board layout: ${skinLabel}`, cycleSkinOverride, {
        variant: 'indigo',
        description: 'Force the desktop rail or tablet pods layout, or let it auto-select by device',
      }),
    ]));

    // User section (if authenticated)
    if (authIsConfigured && authUser) {
      sections.push(
        createMenuSection('user', `Account: ${authUser.email ?? ''}`, [
          createMenuItem('sign-out', 'Sign Out', authSignOut, { variant: 'danger', description: 'Sign out of your account' }),
        ])
      );
    }

    return sections;
  }, [
    isVideoMode, isLoaded, isLoading, clearVideo,
    authUser, authIsConfigured, authSignOut,
    matchShowScoreboard, toggleScoreboard,
    skinLabel, cycleSkinOverride,
    activePlayId,
  ]);

  return (
    // pointer-events-none on the bar so the full-width strip does not swallow
    // drags on the field beneath it; each interactive child opts back in.
    <div className="absolute top-14 left-4 right-4 z-10 flex gap-2 flex-wrap pointer-events-none">
      {/* Hamburger menu - visible at all screen sizes */}
      <div className="pointer-events-auto">
        <HamburgerIcon isOpen={isMenuOpen} onClick={toggleMenu} />
      </div>

      {/* Overlays render their own fixed-position roots, but pointer-events is
          inherited, so they must opt back in. `contents` generates no box, so
          this wrapper adds no flex item while still passing the value down. */}
      <div className="contents pointer-events-auto">
        {/* Menu dropdown */}
        <MobileMenu sections={mobileMenuSections} />

        <SavePlayDialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)} />

        {/* Video Uploader Modal */}
        {showVideoUploader && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowVideoUploader(false)}
            />
            {/* Modal content */}
            <div className="relative z-10">
              <VideoUploader onClose={() => setShowVideoUploader(false)} />
            </div>
          </div>
        )}

        <MatchSetupModal open={showMatchSetup} onClose={() => setShowMatchSetup(false)} />

        <SharePlayModal open={showShare} onClose={() => setShowShare(false)} />
      </div>
    </div>
  );
}
