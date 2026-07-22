export type SkinOverride = 'auto' | 'B' | 'C';
export type HudSkin = 'B' | 'C';

/**
 * Choose the board-HUD skin. Pointer is the discriminator (a coarse-pointer
 * tablet always gets the thumb pods even at desktop width); width is a backstop
 * so a narrow laptop window doesn't render a cramped rail.
 */
export function resolveSkin(override: SkinOverride, isDesktop: boolean, coarsePointer: boolean): HudSkin {
  if (override === 'B') return 'B';
  if (override === 'C') return 'C';
  return !coarsePointer && isDesktop ? 'B' : 'C';
}
