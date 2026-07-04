import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, Users, Eye, ArrowRight } from 'lucide-react';

interface LobbyProps {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (name: string, code: string, isSpectator: boolean) => void;
  availableRooms?: { code: string; playerCount: number; gameStarted: boolean }[];
  isConnected?: boolean;
}

type TabType = 'join' | 'create';

export default function Lobby({ onCreateRoom, onJoinRoom, availableRooms = [], isConnected = false }: LobbyProps) {
  const [tab, setTab] = useState<TabType>('join');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Your name is required');
      return;
    }
    onCreateRoom(trimmedName);
  };

  const handleJoin = (e: FormEvent, asSpectator: boolean) => {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    const trimmedCode = roomCode.trim().toUpperCase();

    if (!trimmedName) {
      setError('Your name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Room code is required');
      return;
    }
    if (trimmedCode.length < 3) {
      setError('Invalid Room Code');
      return;
    }
    onJoinRoom(trimmedName, trimmedCode, asSpectator);
  };

  return (
    <div id="lobby-container" className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-2">
          Multiplayer <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">BINGO</span>
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Play real-time custom Bingo with friends! Create custom items or use presets instantly.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 shadow-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Tabs switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            id="tab-join-btn"
            onClick={() => { setTab('join'); setError(''); }}
            className={`flex-1 py-4 text-center font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              tab === 'join'
                ? 'text-indigo-600 dark:text-indigo-400 bg-zinc-50/50 dark:bg-zinc-800/40 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Join Room
          </button>
          <button
            id="tab-create-btn"
            onClick={() => { setTab('create'); setError(''); }}
            className={`flex-1 py-4 text-center font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              tab === 'create'
                ? 'text-indigo-600 dark:text-indigo-400 bg-zinc-50/50 dark:bg-zinc-800/40 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Create Room
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={tab === 'create' ? handleCreate : (e) => handleJoin(e, false)} className="space-y-4">
            <div>
              <label htmlFor="user-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Your Name
              </label>
              <input
                id="user-name"
                type="text"
                placeholder="Enter nickname"
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                required
              />
            </div>

            {tab === 'join' && (
              <div>
                <label htmlFor="room-code" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Room Code
                </label>
                <input
                  id="room-code"
                  type="text"
                  placeholder="e.g. AB12"
                  maxLength={10}
                  autoComplete="off"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-mono tracking-widest text-center text-lg font-bold"
                  required={tab === 'join'}
                />
              </div>
            )}

            {error && (
              <p className="text-xs font-medium text-rose-500 dark:text-rose-400 text-center bg-rose-50 dark:bg-rose-950/20 py-2 px-3 rounded-lg">
                {error}
              </p>
            )}

            <div className="pt-2">
              {tab === 'create' ? (
                <button
                  id="create-submit-btn"
                  type="submit"
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  Create and Configure Room
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    id="join-submit-btn"
                    type="submit"
                    className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    Play Bingo
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    id="spectate-submit-btn"
                    type="button"
                    onClick={(e) => handleJoin(e, true)}
                    className="py-3 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    Spectate
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Available Rooms Dashboard Section */}
      {availableRooms.length > 0 ? (
        <div className="mt-6 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Active Rooms ({availableRooms.length})
            </h3>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Click a room to auto-fill</span>
          </div>
          
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {availableRooms.map((r) => (
              <div
                key={r.code}
                onClick={() => {
                  setRoomCode(r.code);
                  setTab('join');
                  setError('');
                }}
                className="group flex items-center justify-between p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 hover:bg-zinc-100/80 dark:bg-zinc-950/30 dark:hover:bg-zinc-950/70 cursor-pointer transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold tracking-wider bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 px-2 py-0.5 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                    {r.code}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {r.playerCount} player{r.playerCount !== 1 ? 's' : ''} connected
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                      {r.gameStarted ? (
                        <>
                          <span className="w-1 h-1 rounded-full bg-amber-500" />
                          Game In Progress
                        </>
                      ) : (
                        <>
                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                          Waiting in Lobby
                        </>
                      )}
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
                >
                  Join
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-4 text-center">
          <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
            No active rooms found on the server.
          </p>
          <p className="text-[10px] text-zinc-400/80 dark:text-zinc-500/80 mt-1">
            Create a room to host the first Bingo match!
          </p>
        </div>
      )}
    </div>
  );
}
