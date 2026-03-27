// src/components/UI/LabelToggle.tsx
import { usePlayerStore } from '../../store/playerStore';

const LABELS = { number: '#', name: 'Name', position: 'Pos' } as const;

export function LabelToggle() {
  const { labelMode, cycleLabelMode } = usePlayerStore();
  return (
    <button
      onClick={cycleLabelMode}
      title={`Player labels: ${labelMode}`}
      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-black/60
                 text-white/80 hover:bg-black/80 transition-colors min-w-[52px]"
    >
      {LABELS[labelMode]}
    </button>
  );
}
