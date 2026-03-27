// src/components/UI/FormationPresetBar.tsx
import { usePlayerStore } from '../../store/playerStore';
import { useUIStore } from '../../store/uiStore';
import { getFormationById } from '../../data/formations';

const PRESETS = [
  { id: 'centre-bounce',    label: 'Centre Bounce' },
  { id: 'kick-in-pressing', label: 'Kick-in Press' },
  { id: 'kick-in-kicking',  label: 'Kick-in Kick' },
];

export function FormationPresetBar() {
  const applyFormation = usePlayerStore((s) => s.applyFormation);
  const { activeFormationId, setActiveFormationId } = useUIStore();

  const handlePreset = (formationId: string) => {
    const formation = getFormationById(formationId);
    if (!formation) return;
    applyFormation(formation);
    setActiveFormationId(formationId);
  };

  return (
    <div className="flex gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => handlePreset(p.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-black/60
                     text-white/70 hover:bg-black/80 transition-colors"
        >
          {p.label}
        </button>
      ))}
      {activeFormationId && (
        <button
          onClick={() => handlePreset(activeFormationId)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-900/60
                     text-amber-300 hover:bg-amber-900/80 transition-colors"
        >
          Re-apply ↺
        </button>
      )}
    </div>
  );
}
