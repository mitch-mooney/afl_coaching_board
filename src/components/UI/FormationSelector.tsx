import { useCallback, useEffect, useState } from 'react';
import { useFormationStore } from '../../store/formationStore';
import { usePlayerStore, PlayerUpdate } from '../../store/playerStore';
import { PRE_BUILT_FORMATIONS, validateFormation } from '../../data/formations';
import { Formation, PlayerPosition } from '../../types/Formation';

/** Helper to check if an error is an IndexedDB quota error */
function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('quota') ||
      message.includes('storage') ||
      message.includes('exceeded') ||
      error.name === 'QuotaExceededError'
    );
  }
  return false;
}

/** Generate a unique name by appending a number suffix */
function generateUniqueName(baseName: string, suffix: number = 1): string {
  return `${baseName} (${suffix})`;
}

export function FormationSelector() {
  const { customFormations, isLoading, loadCustomFormations, setCurrentFormation, saveCustomFormation, checkNameExists } = useFormationStore();
  const { players, updateMultiplePlayers, canApplyFormation } = usePlayerStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load custom formations on mount
  useEffect(() => {
    loadCustomFormations();
  }, [loadCustomFormations]);

  /**
   * Convert formation positions to player updates
   * Maps PlayerPosition (playerNumber + teamId) to actual player IDs
   * Optimized for performance with direct array construction
   */
  const convertFormationToUpdates = useCallback((formation: Formation): PlayerUpdate[] => {
    // Pre-allocate array for better performance
    const updates: PlayerUpdate[] = new Array(formation.positions.length);

    for (let i = 0; i < formation.positions.length; i++) {
      const pos = formation.positions[i];
      // Construct player ID from teamId and playerNumber
      // Player IDs are formatted as: `${teamId}-player-${number}`
      updates[i] = {
        playerId: `${pos.teamId}-player-${pos.playerNumber}`,
        position: pos.position,
        rotation: pos.rotation,
      };
    }

    return updates;
  }, []);

  /**
   * Convert current player positions to PlayerPosition format for saving
   * Extracts player number from ID format: `${teamId}-player-${number}`
   */
  const convertPlayersToPositions = useCallback((): PlayerPosition[] => {
    return players.map((player) => {
      // Extract player number from ID (e.g., "team1-player-5" -> 5)
      const numberMatch = player.id.match(/-player-(\d+)$/);
      const playerNumber = numberMatch ? parseInt(numberMatch[1], 10) : 1;

      return {
        playerNumber,
        teamId: player.teamId,
        position: player.position,
        rotation: player.rotation,
      };
    });
  }, [players]);

  /**
   * Find a unique name by appending suffix numbers
   */
  const findUniqueName = useCallback(async (baseName: string): Promise<string> => {
    let suffix = 1;
    let candidateName = baseName;

    while (await checkNameExists(candidateName)) {
      candidateName = generateUniqueName(baseName, suffix);
      suffix++;
      // Safety limit to prevent infinite loops
      if (suffix > 100) {
        throw new Error('Unable to generate unique name');
      }
    }

    return candidateName;
  }, [checkNameExists]);

  /**
   * Handle saving current formation as a custom template
   * Handles duplicate names with auto-rename option and IndexedDB quota errors
   */
  const handleSaveTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      alert('Please enter a name for the formation template');
      return;
    }

    try {
      setIsSaving(true);

      // Ensure we have all 44 players (22 per team: 18 on-field + 4 interchange)
      if (players.length !== 44) {
        alert(`Cannot save formation: expected 44 players (22 per team), found ${players.length}`);
        return;
      }

      let finalName = templateName.trim();

      // Check if name already exists
      const nameExists = await checkNameExists(finalName);
      if (nameExists) {
        // Offer to auto-rename or cancel
        const autoRename = confirm(
          `A formation named "${finalName}" already exists.\n\n` +
          `Click OK to save as "${generateUniqueName(finalName, 1)}" or Cancel to choose a different name.`
        );

        if (!autoRename) {
          return;
        }

        // Find a unique name
        finalName = await findUniqueName(finalName);
      }

      // Convert current player positions to formation format
      const positions = convertPlayersToPositions();

      // Save the custom formation
      await saveCustomFormation(
        finalName,
        templateDescription.trim(),
        positions
      );

      // Reset dialog state
      setShowSaveDialog(false);
      setTemplateName('');
      setTemplateDescription('');
      alert(`Formation template "${finalName}" saved successfully!`);
    } catch (error) {
      // Handle IndexedDB quota exceeded error with user-friendly message
      if (isQuotaExceededError(error)) {
        alert(
          'Storage quota exceeded!\n\n' +
          'Your browser storage is full. Please delete some existing custom formations to make room for new ones.'
        );
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Failed to save formation template: ${errorMessage}`);
      }
    } finally {
      setIsSaving(false);
    }
  }, [templateName, templateDescription, players.length, checkNameExists, findUniqueName, convertPlayersToPositions, saveCustomFormation]);

  /**
   * Apply a formation to the current players
   * Updates all 36 player positions in a single batched operation
   * Prevents application during active drag operations
   */
  const handleApplyFormation = useCallback((formation: Formation) => {
    try {
      // Check for concurrent updates (dragging or another formation application in progress)
      if (!canApplyFormation()) {
        alert('Cannot apply formation while a player is being dragged. Please release the player first.');
        return;
      }

      setIsApplying(true);

      // Validate formation has required 44 positions (22 per team)
      if (!validateFormation(formation)) {
        throw new Error(`Invalid formation: expected 44 positions (22 per team: 18 on-field + 4 interchange), got ${formation.positions.length}`);
      }

      // Check if we have all 44 players initialized
      if (players.length < 44) {
        throw new Error(`Not enough players: found ${players.length}, formation requires 44 players (22 per team)`);
      }

      // Convert formation positions to player updates
      const updates = convertFormationToUpdates(formation);

      // Apply all updates in a single batched operation for performance
      updateMultiplePlayers(updates);

      // Update the current formation in the store
      setCurrentFormation(formation);

      // Close the panel after successful application
      setIsOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to apply formation: ${errorMessage}`);
    } finally {
      setIsApplying(false);
    }
  }, [players.length, canApplyFormation, convertFormationToUpdates, updateMultiplePlayers, setCurrentFormation]);


  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 min-h-[44px] bg-indigo-500 text-white rounded hover:bg-indigo-600 transition touch-manipulation"
      >
        {isOpen ? '✕ Close' : '📋 Formations'}
      </button>

      {isOpen && (
        <div className="absolute top-16 left-4 z-20 w-80 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">Formation Templates</h2>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-3 py-2 min-h-[44px] bg-green-500 text-white text-sm rounded hover:bg-green-600 transition touch-manipulation"
              title="Save current formation as template"
            >
              + Save Current
            </button>
          </div>

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
                      isApplying={isApplying}
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
                        isApplying={isApplying}
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

      {/* Save Template Dialog */}
      {showSaveDialog && (
        <div className="absolute top-16 left-4 z-30 w-80 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4">
          <h3 className="text-lg font-bold mb-3">Save Formation Template</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 min-h-[44px] border rounded focus:outline-none focus:ring-2 focus:ring-green-500 touch-manipulation"
                placeholder="Enter formation name"
                autoFocus
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 touch-manipulation"
                placeholder="Enter description (optional)"
                rows={3}
                disabled={isSaving}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setTemplateName('');
                  setTemplateDescription('');
                }}
                disabled={isSaving}
                className="px-4 py-2 min-h-[44px] bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition disabled:opacity-50 touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={isSaving || !templateName.trim()}
                className={`px-4 py-2 min-h-[44px] text-white rounded transition touch-manipulation ${
                  isSaving || !templateName.trim()
                    ? 'bg-green-300 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface FormationItemProps {
  formation: Formation;
  onApply: (formation: Formation) => void;
  showDelete?: boolean;
  isApplying?: boolean;
}

function FormationItem({ formation, onApply, showDelete = false, isApplying = false }: FormationItemProps) {
  const { deleteCustomFormation } = useFormationStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${formation.name}"?`)) {
      // Extract numeric ID from custom-{id} format
      const idMatch = formation.id.match(/^custom-(\d+)$/);
      if (idMatch) {
        const numericId = parseInt(idMatch[1], 10);
        try {
          setIsDeleting(true);
          await deleteCustomFormation(numericId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert(`Failed to delete formation: ${errorMessage}`);
        } finally {
          setIsDeleting(false);
        }
      }
    }
  };

  const handleApply = useCallback(() => {
    if (!isApplying) {
      onApply(formation);
    }
  }, [isApplying, onApply, formation]);

  return (
    <div className="border rounded-lg p-3 hover:bg-gray-50 transition cursor-pointer group">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0" onClick={handleApply}>
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
            onClick={handleApply}
            disabled={isApplying}
            className={`px-3 py-2 min-h-[44px] text-white text-sm rounded transition touch-manipulation ${
              isApplying
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-500 hover:bg-indigo-600'
            }`}
          >
            {isApplying ? 'Applying...' : 'Apply'}
          </button>
          {showDelete && (
            <button
              onClick={handleDelete}
              disabled={isApplying || isDeleting}
              className={`min-w-[44px] min-h-[44px] px-2 py-2 text-white text-sm rounded transition touch-manipulation ${
                isDeleting
                  ? 'bg-red-300 cursor-not-allowed opacity-100'
                  : 'bg-red-500 hover:bg-red-600 opacity-0 group-hover:opacity-100'
              } disabled:opacity-50`}
              title="Delete formation"
            >
              {isDeleting ? '...' : '✕'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
