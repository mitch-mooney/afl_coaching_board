import type { CSSProperties } from 'react';

export const TEAL = '#00d4aa';
export const glass: CSSProperties = { background: 'rgba(13,13,26,0.86)', border: '1px solid #ffffff22', backdropFilter: 'blur(6px)' };
export const fanPill: CSSProperties = { ...glass, padding: '9px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'left' };

export const panelPill: CSSProperties = {
  padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'left', width: '100%',
  border: '1px solid #ffffff22', background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.85)',
};

/**
 * How far in from the left edge other HUD surfaces must start to clear the
 * **Tool rail**.
 *
 * The rail sits 8px from the edge and its pill measures 62px wide (48px tip
 * buttons + 6px padding and a 1px border each side), so its right edge is at
 * 70px; the remainder is breathing room.
 *
 * Shared rather than hardcoded per surface because the two have already drifted
 * apart once: the Pods skin's Setup pod sat at `left: 20`, and because its fan
 * expands *upward* through the rail's full height, the rail painted over the
 * left half of nine of the twelve fan items — exactly where each label's text
 * begins. The items stayed clickable, so nothing failed loudly; it just looked
 * broken.
 */
export const TOOL_RAIL_CLEARANCE = 86;

export function podButton(open: boolean): CSSProperties {
  return {
    width: 66, height: 66, borderRadius: 20, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    background: open ? '#f59e0b' : 'rgba(13,13,26,0.9)', color: open ? '#000' : '#fff',
    border: open ? 'none' : '1px solid #ffffff33', boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
  };
}
