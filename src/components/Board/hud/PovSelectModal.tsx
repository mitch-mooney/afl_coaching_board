import { useCallback } from 'react';
import { usePlayerStore } from '../../../store/playerStore';
import { useCameraStore } from '../../../store/cameraStore';
import { useOverlayOpen } from '../../../hooks/useOverlayOpen';

export function PovSelectModal({
  open,
  onClose,
  povSlot,
}: {
  open: boolean;
  onClose: () => void;
  povSlot: 1 | 2;
}) {
  useOverlayOpen(open);
  const players = usePlayerStore((state) => state.players);
  const selectedPlayerId = usePlayerStore((state) => state.selectedPlayerId);
  const setPovPlayer = useCameraStore((state) => state.setPovPlayer);

  const selectedPlayer = selectedPlayerId
    ? players.find(p => p.id === selectedPlayerId)
    : null;

  // Handle POV player selection
  const handleSelectPOVPlayer = useCallback((playerId: string) => {
    setPovPlayer(povSlot, playerId);
    onClose();
  }, [setPovPlayer, povSlot, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[250px] max-h-[400px] overflow-y-auto">
        <div className="p-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">
            Assign Follow-Cam {povSlot} — select a player to follow
          </span>
        </div>
        <div className="py-1">
          {selectedPlayer && (
            <button
              onClick={() => handleSelectPOVPlayer(selectedPlayer.id)}
              className="w-full min-h-[44px] px-3 py-2 text-left text-sm hover:bg-indigo-50 flex items-center gap-2 border-b border-gray-100 touch-manipulation"
            >
              <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                {selectedPlayer.number}
              </span>
              <span className="font-medium">Selected: #{selectedPlayer.number}</span>
              {selectedPlayer.playerName && (
                <span className="text-gray-500 text-xs">{selectedPlayer.playerName}</span>
              )}
            </button>
          )}
          <div className="px-2 py-1 bg-blue-50 text-xs font-medium text-blue-700">Team 1</div>
          {players
            .filter(p => p.teamId === 'team1')
            .map(player => (
              <button
                key={player.id}
                onClick={() => handleSelectPOVPlayer(player.id)}
                className="w-full min-h-[44px] px-3 py-1.5 text-left text-sm hover:bg-blue-50 flex items-center gap-2 touch-manipulation"
              >
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                  {player.number}
                </span>
                <span>#{player.number}</span>
                {player.playerName && (
                  <span className="text-gray-500 text-xs">{player.playerName}</span>
                )}
              </button>
            ))}
          <div className="px-2 py-1 bg-red-50 text-xs font-medium text-red-700">Team 2</div>
          {players
            .filter(p => p.teamId === 'team2')
            .map(player => (
              <button
                key={player.id}
                onClick={() => handleSelectPOVPlayer(player.id)}
                className="w-full min-h-[44px] px-3 py-1.5 text-left text-sm hover:bg-red-50 flex items-center gap-2 touch-manipulation"
              >
                <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                  {player.number}
                </span>
                <span>#{player.number}</span>
                {player.playerName && (
                  <span className="text-gray-500 text-xs">{player.playerName}</span>
                )}
              </button>
            ))}
        </div>
        <button
          onClick={onClose}
          className="w-full min-h-[44px] px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 border-t border-gray-100 touch-manipulation"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
