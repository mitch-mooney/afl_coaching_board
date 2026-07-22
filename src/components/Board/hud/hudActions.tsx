import type { CSSProperties, ReactNode } from 'react';

export interface HudAction {
  key: string;
  label: ReactNode; // may be dynamic ("Labels: #", "🏉 Give ball to #7")
  onClick: () => void;
  active?: boolean; // amber highlight (e.g. Draw path on)
  disabled?: boolean;
  hidden?: boolean; // e.g. ball buttons when no ball
  extraStyle?: CSSProperties; // override base/active/disabled styles
}

export interface HudControls {
  actions: HudAction[];
  modals: ReactNode;
}

export function renderAction(a: HudAction, base: CSSProperties) {
  return (
    <button
      key={a.key}
      onClick={a.onClick}
      disabled={a.disabled}
      style={{
        ...base,
        ...(a.active ? { background: '#f59e0b', color: '#000' } : {}),
        ...(a.disabled ? { opacity: 0.4 } : {}),
        ...a.extraStyle,
      }}
    >
      {a.label}
    </button>
  );
}
