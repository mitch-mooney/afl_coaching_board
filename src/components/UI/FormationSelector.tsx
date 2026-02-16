import { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormationStore } from '../../store/formationStore';
import { usePlayerStore, PlayerUpdate } from '../../store/playerStore';
import { PRE_BUILT_FORMATIONS, validateFormation } from '../../data/formations';
import { Formation, PlayerPosition } from '../../types/Formation';
import { useResponsive } from '../../hooks/useResponsive';

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

// Animation variants for the panel
const panelVariants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

// Backdrop animation for mobile
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export function FormationSelector() {
  const { customFormations, isLoading, loadCustomFormations, setCurrentFormation, saveCustomFormation, checkNameExists } = useFormationStore();
  const { players, updateMultiplePlayers, canApplyFormation } = usePlayerStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const { isMobile } = useResponsive();
  const panelRef = useRef<HTMLDivElement>(null);

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Handle close function
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setShowSaveDialog(false);
  }, []);

  // Load custom formations on mount
  useEffect(() => {
    loadCustomFormations();
  }, [loadCustomFormations]);

  // Handle click outside to close (mobile only)
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Don't close if clicking on the trigger button
        const target = event.target as HTMLElement;
        if (target.closest('[data-formation-trigger]')) return;
        handleClose();
      }
    };

    // Add delay to prevent immediate close from the same click that opened
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile, isOpen, handleClose]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

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
        data-formation-trigger
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close formations panel' : 'Open formations panel'}
        className="px-4 py-2 min-h-[44px] bg-indigo-500 text-white rounded hover:bg-indigo-600 transition touch-manipulation"
      >
        {isOpen ? '✕ Close' : '📋 Formations'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile - click to close */}
            {isMobile && (
              <motion.div
                className="fixed inset-0 bg-black/30 z-10"
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                aria-hidden="true"
              />
            )}

            <motion.div
              ref={panelRef}
              role="dialog"
              aria-label="Formation Templates"
              className={`
                absolute z-20 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl
                overflow-hidden
                ${isMobile
                  ? 'top-14 left-2 right-2 max-w-none'
                  : 'top-16 left-4 w-80 sm:w-96'
                }
              `}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Fixed header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm p-3 sm:p-4 border-b border-gray-100 z-10">
                <div className="flex justify-between items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold truncate">Formation Templates</h2>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      className="px-2 sm:px-3 py-2 min-h-[44px] bg-green-500 text-white text-xs sm:text-sm rounded hover:bg-green-600 transition touch-manipulation whitespace-nowrap"
                      title="Save current formation as template"
                    >
                      + Save
                    </button>
                    {/* Close button on mobile */}
                    {isMobile && (
                      <button
                        onClick={handleClose}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition touch-manipulation"
                        aria-label="Close panel"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable content */}
              <div className={`
                overflow-y-auto overflow-x-hidden p-3 sm:p-4
                ${isMobile
                  ? 'max-h-[calc(100vh-180px)]'
                  : 'max-h-[calc(100vh-160px)]'
                }
              `}>
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mb-2" />
                    <p>Loading...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Pre-built Formations Section */}
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Pre-built Formations
                      </h3>
                      <div className="space-y-2">
                        {PRE_BUILT_FORMATIONS.map((formation) => (
                          <FormationItem
                            key={formation.id}
                            formation={formation}
                            onApply={handleApplyFormation}
                            isApplying={isApplying}
                            isMobile={isMobile}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Custom Formations Section */}
                    {customFormations.length > 0 && (
                      <div>
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
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
                              isMobile={isMobile}
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Save Template Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/40 z-30"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => {
                setShowSaveDialog(false);
                setTemplateName('');
                setTemplateDescription('');
              }}
              aria-hidden="true"
            />

            <motion.div
              role="dialog"
              aria-label="Save Formation Template"
              className={`
                fixed z-40 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4
                ${isMobile
                  ? 'left-2 right-2 top-1/4 max-w-none'
                  : 'left-1/2 top-1/3 -translate-x-1/2 w-80 sm:w-96'
                }
              `}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base sm:text-lg font-bold">Save Formation Template</h3>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setTemplateName('');
                    setTemplateDescription('');
                  }}
                  className="min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 transition touch-manipulation"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>
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
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => {
                      setShowSaveDialog(false);
                      setTemplateName('');
                      setTemplateDescription('');
                    }}
                    disabled={isSaving}
                    className="px-4 py-2 min-h-[44px] bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition disabled:opacity-50 touch-manipulation"
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

interface FormationItemProps {
  formation: Formation;
  onApply: (formation: Formation) => void;
  showDelete?: boolean;
  isApplying?: boolean;
  isMobile?: boolean;
}

function FormationItem({ formation, onApply, showDelete = false, isApplying = false, isMobile = false }: FormationItemProps) {
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
    <div className="border rounded-lg p-2 sm:p-3 hover:bg-gray-50 transition cursor-pointer group">
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-row justify-between items-start'}`}>
        <div className="flex-1 min-w-0" onClick={handleApply}>
          <h4 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{formation.name}</h4>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{formation.description}</p>
          {formation.createdAt && (
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
              {new Date(formation.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className={`flex gap-2 flex-shrink-0 ${isMobile ? 'w-full' : 'ml-2'}`}>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className={`
              ${isMobile ? 'flex-1' : ''}
              px-3 py-2 min-h-[44px] text-white text-xs sm:text-sm rounded transition touch-manipulation
              ${isApplying
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700'
              }
            `}
          >
            {isApplying ? 'Applying...' : 'Apply'}
          </button>
          {showDelete && (
            <button
              onClick={handleDelete}
              disabled={isApplying || isDeleting}
              className={`
                min-w-[44px] min-h-[44px] px-2 py-2 text-white text-sm rounded transition touch-manipulation
                ${isDeleting
                  ? 'bg-red-300 cursor-not-allowed'
                  : `bg-red-500 hover:bg-red-600 active:bg-red-700 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`
                }
                disabled:opacity-50
              `}
              title="Delete formation"
              aria-label={`Delete ${formation.name}`}
            >
              {isDeleting ? '...' : '✕'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
