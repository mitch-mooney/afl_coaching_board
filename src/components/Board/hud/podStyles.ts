import type { CSSProperties } from 'react';

export const TEAL = '#00d4aa';
export const glass: CSSProperties = { background: 'rgba(13,13,26,0.86)', border: '1px solid #ffffff22', backdropFilter: 'blur(6px)' };
export const fanPill: CSSProperties = { ...glass, padding: '9px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'left' };

export function podButton(open: boolean): CSSProperties {
  return {
    width: 66, height: 66, borderRadius: 20, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    background: open ? '#f59e0b' : 'rgba(13,13,26,0.9)', color: open ? '#000' : '#fff',
    border: open ? 'none' : '1px solid #ffffff33', boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
  };
}
