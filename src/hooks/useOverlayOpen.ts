import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';

/**
 * While `open` is true, marks a blocking overlay as open so global keyboard
 * shortcuts are suppressed. Ref-counted (nesting-safe). Pass the modal's own
 * open flag; overlays that mount only when open can omit it (defaults true).
 */
export function useOverlayOpen(open: boolean = true): void {
  const pushOverlay = useUIStore((s) => s.pushOverlay);
  const popOverlay = useUIStore((s) => s.popOverlay);
  useEffect(() => {
    if (!open) return;
    pushOverlay();
    return () => popOverlay();
  }, [open, pushOverlay, popOverlay]);
}
