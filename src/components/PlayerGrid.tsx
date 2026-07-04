import { Crown, ShieldAlert, Wifi, WifiOff, LogOut, Award } from 'lucide-react';
import { Player } from '../types';

interface PlayerGridProps {
  players: Record<string, Player>;
  hostId: string;
  currentPlayerId: string;
  onKickPlayer: (playerId: string) => void;
  winnerId: string | null;
}

export default function PlayerGrid({ players, hostId, currentPlayerId, onKickPlayer, winnerId }: PlayerGridProps) {
  const isHost = currentPlayerId === hostId;
  const playerList = Object.values(players);
  
  const participants = playerList.filter(p => !p.isSpectator);
  const spectators = playerList.filter(p => p.isSpectator);

  const renderPlayerCard = (player: Player) => {
    const isPlayerHost = player.id === hostId;
    const isMe = player.id === currentPlayerId;
    const isWinner = player.id === winnerId;

    return (
      <div
        key={player.id}
        id={`player-card-${player.id}`}
        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
          isWinner
            ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-100'
            : isMe
            ? 'bg-indigo-500/5 border-indigo-500/20 text-zinc-900 dark:text-white'
            : 'bg-zinc-50/50 border-zinc-200/60 dark:bg-zinc-900/40 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            {player.isConnected ? (
              <Wifi className="w-4 h-4 text-emerald-500" title="Online" />
            ) : (
              <WifiOff className="w-4 h-4 text-zinc-400 dark:text-zinc-600" title="Disconnected" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold truncate ${isMe ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
                {player.name} {isMe && <span className="text-[10px] font-normal text-zinc-400">(You)</span>}
              </span>
              {isPlayerHost && (
                <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Room Host" />
              )}
              {isWinner && (
                <Award className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-bounce" title="Winner!" />
              )}
            </div>

            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
              {player.isSpectator ? 'Spectator' : 'Participant'} • {player.isConnected ? 'Connected' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Kick player option (Only host can kick others) */}
        {isHost && !isPlayerHost && (
          <button
            id={`kick-btn-${player.id}`}
            onClick={() => onKickPlayer(player.id)}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
            title={`Kick ${player.name}`}
            aria-label={`Kick ${player.name}`}
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div id="player-grid" className="space-y-4">
      {/* Participants list */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center justify-between">
          <span>Active Players</span>
          <span className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-md">
            {participants.length}
          </span>
        </h3>
        {participants.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-4 italic">No active players</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-[190px] overflow-y-auto pr-1">
            {participants.map(renderPlayerCard)}
          </div>
        )}
      </div>

      {/* Spectators list */}
      {spectators.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center justify-between">
            <span>Spectators</span>
            <span className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-md">
              {spectators.length}
            </span>
          </h3>
          <div className="grid grid-cols-1 gap-2 max-h-[100px] overflow-y-auto pr-1">
            {spectators.map(renderPlayerCard)}
          </div>
        </div>
      )}
    </div>
  );
}
