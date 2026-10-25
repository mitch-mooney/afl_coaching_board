import { useCallback } from 'react';
import { usePlayerStore } from '../../../store/playerStore';
import { useCameraStore } from '../../../store/cameraStore';
import { useOverlayOpen } from '../../../hooks/useOverlayOpen';
import type { Player } from '../../../models/PlayerModel';
import {
  dialogFooterButton,
  dialogHeader,
  dialogHint,
  dialogLayer,
  dialogPanelScroll,
  dialogRow,
  dialogScrim,
  dialogSubheading,
  dialogTitle,
} from '../../UI/dialogStyles';

/**
 * A player's number on their own team colour. The colour is the player's, read
 * from the board, so the dialog never hardcodes a blue and a red for the two
 * teams.
 */
function NumberBadge({ player }: { player: Player }) {
  return (
    <span
      className="w-6 h-6 rounded-pill text-chalk border border-chalk/30 flex items-center justify-center font-display text-label"
      style={{ background: player.color }}
    >
      {player.number}
    </span>
  );
}

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

  const playerRow = (player: Player) => (
    <button
      key={player.id}
      onClick={() => handleSelectPOVPlayer(player.id)}
      className={`${dialogRow} w-full min-h-[44px] px-md py-xs text-left text-body flex items-center gap-sm`}
    >
      <NumberBadge player={player} />
      <span>#{player.number}</span>
      {player.playerName && <span className={dialogHint}>{player.playerName}</span>}
    </button>
  );

  return (
    <div className={dialogLayer}>
      <div className={dialogScrim} onClick={onClose} />
      <div className={`${dialogPanelScroll} max-w-xs max-h-[400px]`}>
        <div className={dialogHeader}>
          <span className={dialogTitle}>
            Assign Follow-Cam {povSlot}
          </span>
          <p className={dialogHint}>Select a player to follow</p>
        </div>
        <div className="py-xs">
          {selectedPlayer && (
            <button
              onClick={() => handleSelectPOVPlayer(selectedPlayer.id)}
              className={`${dialogRow} w-full min-h-[44px] px-md py-sm text-left text-body flex items-center gap-sm border-b border-steel`}
            >
              <NumberBadge player={selectedPlayer} />
              <span className="font-semibold">Selected: #{selectedPlayer.number}</span>
              {selectedPlayer.playerName && (
                <span className={dialogHint}>{selectedPlayer.playerName}</span>
              )}
            </button>
          )}
          <div className={`${dialogSubheading} px-md py-xs bg-steel/40`}>Team 1</div>
          {players.filter(p => p.teamId === 'team1').map(playerRow)}
          <div className={`${dialogSubheading} px-md py-xs bg-steel/40`}>Team 2</div>
          {players.filter(p => p.teamId === 'team2').map(playerRow)}
        </div>
        <button onClick={onClose} className={dialogFooterButton}>
          Cancel
        </button>
      </div>
    </div>
  );
}
