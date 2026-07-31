// src/components/Board/hud/BoardHud.tsx
import { useResponsive } from '../../../hooks/useResponsive';
import { usePointerCoarse } from '../../../hooks/usePointerCoarse';
import { useHudPreferenceStore } from '../../../store/hudPreferenceStore';
import { resolveSkin } from '../../../utils/hudSkin';
import { ThumbPodHud } from './ThumbPodHud';
import { RailHud } from './rail/RailHud';
import { TextAnnotationInput } from './TextAnnotationInput';
import { ToolRail } from './ToolRail';

export function BoardHud() {
  const { isDesktop } = useResponsive();
  const coarse = usePointerCoarse();
  const override = useHudPreferenceStore((s) => s.skinOverride);
  return (
    <>
      {resolveSkin(override, isDesktop, coarse) === 'B' ? <RailHud /> : <ThumbPodHud />}
      {/* The Tool rail is not something a skin varies — it renders outside the
          choice above so it lands in the same place in both. */}
      <ToolRail />
      {/* Likewise common to both skins, and renders nothing until the Text tip
          places an Annotation. It used to live inside `AnnotatePalette`, so it
          only existed while that palette was open. */}
      <TextAnnotationInput />
    </>
  );
}
