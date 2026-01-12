import { useEffect, useState } from 'react';
import { useFormationStore } from '../../store/formationStore';
import { usePlayerStore, PlayerUpdate } from '../../store/playerStore';
import { PRE_BUILT_FORMATIONS } from '../../data/formations';
import { Formation } from '../../types/Formation';

export function FormationSelector() {
  const { customFormations, isLoading, loadCustomFormations, setCurrentFormation } = useFormationStore();
  const { players, updateMultiplePlayers } = usePlayerStore();
  const [isOpen, setIsOpen] = useState(false);

  // Load custom formations on mount
  useEffect(() => {
    loadCustomFormations();
  }, [loadCustomFormations]);

  /**
   * Convert formation positions to player updates
   * Maps PlayerPosition (playerNumber + teamId) to actual player IDs
   */
  const convertFormationToUpdates = (formation: Formation): PlayerUpdate[] => {
    const updates: PlayerUpdate[] = [];

    for (const pos of formation.positions) {
      // Construct player ID from teamId and playerNumber
      // Player IDs are formatted as: `${teamId}-player-${number}`
      const playerId = `${pos.teamId}-player-${pos.playerNumber}`;

      updates.push({
        playerId,
        position: pos.position,
        rotation: pos.rotation,
      });
    }

    return updates;
  };

  /**
   * Apply a formation to the current players
   */
  const handleApplyFormation = (formation: Formation) => {
    // Check if we have all 36 players
    if (players.length < 36) {
      alert(`Warning: Only ${players.length} players found. Formation requires 36 players (18 per team).`);
    }

    const updates = convertFormationToUpdates(formation);
    updateMultiplePlayers(updates);
    setCurrentFormation(formation);
    setIsOpen(false);
  };

  // Combine pre-built and custom formations for display
  const allFormations: Formation[] = [
    ...PRE_BUILT_FORMATIONS,
    ...customFormations,
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition"
      >
        {isOpen ? '✕ Close' : '📋 Formations'}
      </button>

      {isOpen && (
        <div className="absolute top-16 left-4 z-20 w-80 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
          <h2 className="text-lg font-bold mb-3">Formation Templates</h2>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-4">
              {/* Pre-built Formations Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Pre-built Formations
                </h3>
                <div className="space-y-2">
                  {PRE_BUILT_FORMATIONS.map((formation) => (
                    <FormationItem
                      key={formation.id}
                      formation={formation}
                      onApply={handleApplyFormation}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Formations Section */}
              {customFormations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Custom Formations
                  </h3>
                  <div className="space-y-2">
                    {customFormations.map((formation) => (
                      <FormationItem
                        key={formation.id}
                        formation={formation}
                        onApply={handleApplyFormation}
                        showDelete
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state for custom formations */}
              {customFormations.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No custom formations saved yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

interface FormationItemProps {
  formation: Formation;
  onApply: (formation: Formation) => void;
  showDelete?: boolean;
}

function FormationItem({ formation, onApply, showDelete = false }: FormationItemProps) {
  const { deleteCustomFormation } = useFormationStore();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${formation.name}"?`)) {
      // Extract numeric ID from custom-{id} format
      const idMatch = formation.id.match(/^custom-(\d+)$/);
      if (idMatch) {
        const numericId = parseInt(idMatch[1], 10);
        try {
          await deleteCustomFormation(numericId);
        } catch (error) {
          console.error('Error deleting formation:', error);
          alert('Failed to delete formation. Please try again.');
        }
      }
    }
  };

  return (
    <div className="border rounded-lg p-3 hover:bg-gray-50 transition cursor-pointer group">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0" onClick={() => onApply(formation)}>
          <h4 className="font-semibold text-gray-900 truncate">{formation.name}</h4>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{formation.description}</p>
          {formation.createdAt && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(formation.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2 ml-2 flex-shrink-0">
          <button
            onClick={() => onApply(formation)}
            className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600 transition"
          >
            Apply
          </button>
          {showDelete && (
            <button
              onClick={handleDelete}
              className="px-2 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
              title="Delete formation"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
