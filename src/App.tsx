import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Crown,
  Users,
  Copy,
  LogOut,
  Sparkles,
  Zap,
  CheckCircle,
  AlertCircle,
  Play,
  Volume2,
  Clock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

import { RoomState, Player, WinDetails, ServerToClientEvents, ClientToServerEvents } from './types';
import ThemeToggle from './components/ThemeToggle';
import Toast, { ToastMessage } from './components/Toast';
import Lobby from './components/Lobby';
import SetupBoard from './components/SetupBoard';
import LiveChat from './components/LiveChat';
import PlayerGrid from './components/PlayerGrid';
import BingoBoard from './components/BingoBoard';
import CalledHistory from './components/CalledHistory';

// Initialize the socket client
// By omitting the URL, Socket.IO client automatically connects to the host serving the page.
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  transports: ['polling', 'websocket'],
});

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Sync dark mode preference
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true; // Default dark
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasSavedSetup, setHasSavedSetup] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [availableRooms, setAvailableRooms] = useState<{ code: string; playerCount: number; gameStarted: boolean }[]>([]);

  // Keep tracks of reconnect state to trigger full-state requests
  const isInitialConnect = useRef(true);

  const addToast = (type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Setup socket listeners
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setCurrentPlayerId(socket.id || null);
      if (!isInitialConnect.current && roomState) {
        // Re-joined or reconnected, fetch latest room status
        socket.emit('request_state');
        addToast('success', 'Connection restored! Syncing state...');
      }
      isInitialConnect.current = false;
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      addToast('warning', 'Connection lost! Attempting to reconnect...');
    };

    const handleRoomState = (state: RoomState) => {
      setRoomState(state);
      const myId = socket.id || currentPlayerId;
      const myProf = myId && state.players ? state.players[myId] : null;
      if (myProf?.boardSaved) {
        setHasSavedSetup(true);
      } else {
        setHasSavedSetup(false);
      }
    };

    const handleGameStarted = (countdownSeconds: number) => {
      setCountdown(countdownSeconds);
      addToast('info', 'Game starting soon! Get ready...');
    };

    const handleItemCalled = (item: string) => {
      addToast('info', `Called: "${item}"`);
      // Subtle system ping or haptic can go here
    };

    const handleBingoClaimed = (data: { playerId: string; playerName: string; patterns: WinDetails[] }) => {
      const isMe = data.playerId === socket.id;
      
      // Award winner with confetti bursts!
      triggerConfettiRain();
      
      if (isMe) {
        addToast('success', '🏆 BINGO CONFIRMED! YOU WON THE GAME!');
      } else {
        addToast('success', `🏆 BINGO CLAIMED by ${data.playerName}!`);
      }
    };

    const handleBingoRejected = (data: { playerId: string; reason: string }) => {
      const isMe = data.playerId === socket.id;
      if (isMe) {
        addToast('error', `Bingo claim rejected: ${data.reason}`);
      }
    };

    const handlePlayerKicked = () => {
      addToast('error', 'You have been kicked from the room.');
      setRoomState(null);
    };

    const handleErrorMessage = (message: string) => {
      addToast('error', message);
    };

    const handleNotification = (data: { type: 'info' | 'success' | 'warning' | 'error'; message: string }) => {
      addToast(data.type, data.message);
    };

    const handleAvailableRooms = (roomsList: typeof availableRooms) => {
      setAvailableRooms(roomsList);
    };

    const handleChatMessage = (msg: any) => {
      const myId = socket.id || currentPlayerId;
      if (msg.senderId !== myId) {
        addToast('info', `💬 ${msg.senderName}: ${msg.text}`);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room_state', handleRoomState);
    socket.on('game_started', handleGameStarted);
    socket.on('item_called', handleItemCalled);
    socket.on('bingo_claimed', handleBingoClaimed);
    socket.on('bingo_rejected', handleBingoRejected);
    socket.on('player_kicked', handlePlayerKicked);
    socket.on('error_message', handleErrorMessage);
    socket.on('notification', handleNotification);
    socket.on('available_rooms', handleAvailableRooms);
    socket.on('chat_message', handleChatMessage);

    // Initial ID injection if socket is already connected at load
    if (socket.connected) {
      setIsConnected(true);
      setCurrentPlayerId(socket.id || null);
    }

    // Explicitly request available rooms upon mounting
    socket.emit('get_available_rooms');

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room_state', handleRoomState);
      socket.off('game_started', handleGameStarted);
      socket.off('item_called', handleItemCalled);
      socket.off('bingo_claimed', handleBingoClaimed);
      socket.off('bingo_rejected', handleBingoRejected);
      socket.off('player_kicked', handlePlayerKicked);
      socket.off('error_message', handleErrorMessage);
      socket.off('notification', handleNotification);
      socket.off('available_rooms', handleAvailableRooms);
      socket.off('chat_message', handleChatMessage);
    };
  }, [roomState]);

  // Handle countdown animation tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
      }, 1000); // Display "GO!" for 1 second
      return () => clearTimeout(timer);
    }

    const interval = setInterval(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  // Trigger professional confetti burst
  const triggerConfettiRain = () => {
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // double burst sides
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  // User Actions
  const handleCreateRoom = (name: string) => {
    socket.emit('create_room', { name });
  };

  const handleJoinRoom = (name: string, code: string, isSpectator: boolean) => {
    socket.emit('join_room', { name, code, isSpectator });
  };

  const handleSavePlayerSetup = (items: string[], freeSpaceEnabled: boolean) => {
    socket.emit('save_player_board', { items });
    if (isMeHost) {
      socket.emit('setup_game', { items, freeSpaceEnabled });
    }
  };

  const handleSendChatMessage = (text: string) => {
    socket.emit('send_chat_message', { text });
  };

  const handleStartGame = () => {
    socket.emit('start_game');
  };

  const handleCallItem = () => {
    socket.emit('call_item');
  };

  const handleMarkCell = (index: number, isMarked: boolean) => {
    socket.emit('mark_cell', { index, isMarked });
  };

  const handleClaimBingo = () => {
    socket.emit('claim_bingo');
  };

  const handleKickPlayer = (playerId: string) => {
    socket.emit('kick_player', { playerId });
  };

  const handleLeaveRoom = () => {
    socket.emit('leave_room');
    setRoomState(null);
    setHasSavedSetup(false);
    addToast('info', 'Left the room');
  };

  const copyRoomCode = () => {
    if (!roomState) return;
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    addToast('success', `Copied room code ${roomState.code}!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper variables derived from state
  const isMeHost = roomState?.hostId === currentPlayerId;
  const myProfile = currentPlayerId && roomState ? roomState.players[currentPlayerId] : null;
  const isSpectator = myProfile ? myProfile.isSpectator : false;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-300 relative flex flex-col">
      {/* Toast HUD */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center text-white"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              className="text-center"
            >
              <span className="block text-sm font-bold tracking-widest text-indigo-400 uppercase mb-4">
                BINGO MATCH STARTING
              </span>
              <span className="text-8xl sm:text-9xl font-extrabold font-mono tracking-tight text-white drop-shadow-lg">
                {countdown > 0 ? countdown : 'GO!'}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Navigation / App Bar */}
      <header className="border-b border-zinc-200/80 dark:border-zinc-900/60 bg-white/70 dark:bg-zinc-950/60 backdrop-blur-md sticky top-0 z-30 px-4 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent flex items-center gap-1">
              <Zap className="w-5 h-5 text-indigo-500 shrink-0 fill-indigo-500" />
              BingoLive
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono ${
              isConnected
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 animate-pulse'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              {isConnected ? 'ONLINE' : 'CONNECTING...'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark/light toggler */}
            <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />

            {roomState && (
              <button
                id="header-leave-btn"
                onClick={handleLeaveRoom}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/10 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 text-xs font-semibold cursor-pointer transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Leave Room
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Core View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center">
        {!roomState ? (
          /* LOBBY / INITIAL JOIN STAGE */
          <Lobby 
            onCreateRoom={handleCreateRoom} 
            onJoinRoom={handleJoinRoom} 
            availableRooms={availableRooms} 
            isConnected={isConnected} 
          />
        ) : (
          /* ACTIVE ROOM STAGE */
          <div className="w-full space-y-6">
            
            {/* Room HUD Header Banner */}
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                      Bingo Room
                    </h2>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                      {isMeHost ? 'HOST' : isSpectator ? 'SPECTATOR' : 'PARTICIPANT'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Logged in as: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{myProfile?.name}</span>
                  </p>
                </div>
              </div>

              {/* Room Code HUD Control */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-zinc-100 dark:bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    ROOM CODE:
                  </span>
                  <span className="text-lg font-extrabold font-mono tracking-widest text-zinc-800 dark:text-zinc-100">
                    {roomState.code}
                  </span>
                  <button
                    id="copy-room-code-btn"
                    onClick={copyRoomCode}
                    className="p-1 rounded bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Copy Room Code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Game Workspace layout */}
            {!roomState.gameStarted && !roomState.gameOver ? (
              /* PRE-GAME WORKSPACE (SETUP BOARD & WAITING) */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Board Configuration Section */}
                <div className="lg:col-span-2">
                  {!isSpectator ? (
                    <SetupBoard
                      onSaveSetup={handleSavePlayerSetup}
                      onStartGame={handleStartGame}
                      gameStarted={roomState.gameStarted}
                      hasSavedSetup={hasSavedSetup}
                      initialItems={myProfile?.board && myProfile.board.length === 25 ? myProfile.board : roomState.items}
                      initialFreeSpaceEnabled={roomState.freeSpaceEnabled}
                      isHost={isMeHost}
                    />
                  ) : (
                    /* Participant/Spectator waiting visual */
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col items-center justify-center text-center min-h-[400px] space-y-4">
                      <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center animate-bounce">
                        <Clock className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                          Waiting for Game Setup
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mt-1.5 mx-auto">
                          The players are currently configuring their custom Bingo boards. Once saved, the Host can start the game!
                        </p>
                      </div>

                      {hasSavedSetup && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-3.5 py-1.5 rounded-lg border border-emerald-500/10">
                          <CheckCircle className="w-4 h-4" />
                          Board setup is completed! Ready to launch.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Player Roster Section */}
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg h-fit space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    Lobby Connection Panel
                  </h3>
                  <PlayerGrid
                    players={roomState.players}
                    hostId={roomState.hostId}
                    currentPlayerId={currentPlayerId || ''}
                    onKickPlayer={handleKickPlayer}
                    winnerId={roomState.winnerId}
                  />
                </div>
              </div>
            ) : (
              /* ACTIVE LIVE BINGO STAGE (BOARD & DRAWS) */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Column 1: Interactive Board or Spectator view */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {isSpectator ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl text-center flex flex-col items-center justify-center min-h-[350px]">
                      <Sparkles className="w-10 h-10 text-indigo-500 mb-3 animate-pulse" />
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        Spectator Screen
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mt-1 mx-auto">
                        You are spectating this match in real-time. Follow the drawn items on the right and check who claims Bingo!
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                        <div>
                          <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                            Your Live Card
                          </h3>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">
                            Tap called cells to daub
                          </p>
                        </div>
                        
                        {roomState.gameStarted && !roomState.gameOver && (
                          <motion.button
                            id="claim-bingo-btn"
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={handleClaimBingo}
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-600/20 text-xs tracking-wider uppercase cursor-pointer"
                          >
                            Claim Bingo!
                          </motion.button>
                        )}
                      </div>

                      <BingoBoard
                        board={myProfile?.board || []}
                        markedIndices={myProfile?.markedIndices || []}
                        calledItems={roomState.calledItems}
                        freeSpaceEnabled={roomState.freeSpaceEnabled}
                        onMarkCell={handleMarkCell}
                        isSpectator={isSpectator}
                        gameStarted={roomState.gameStarted}
                        gameOver={roomState.gameOver}
                      />
                    </div>
                  )}

                  {/* Host Controller Panel */}
                  {isMeHost && (
                    <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
                          Host Command Dashboard
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Draw custom items one by one. Or restart the match to play again.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {roomState.gameStarted && !roomState.gameOver && (
                          <button
                            id="draw-next-btn"
                            onClick={handleCallItem}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                          >
                            <Volume2 className="w-4 h-4" />
                            Draw Next Item
                          </button>
                        )}

                        <button
                          id="host-restart-btn"
                          onClick={handleStartGame}
                          className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Restart Game
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column 2: Draw HUD ball & players log */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Ball caller HUD */}
                  <CalledHistory
                    calledItemsHistory={roomState.calledItemsHistory}
                    gameStarted={roomState.gameStarted}
                    gameOver={roomState.gameOver}
                    winnerName={roomState.winnerName}
                  />

                  {/* Player Connection Status sidebar */}
                  <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      In-Game Roster
                    </h3>
                    <PlayerGrid
                      players={roomState.players}
                      hostId={roomState.hostId}
                      currentPlayerId={currentPlayerId || ''}
                      onKickPlayer={handleKickPlayer}
                      winnerId={roomState.winnerId}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer footer */}
      <footer className="py-6 border-t border-zinc-200/80 dark:border-zinc-900/60 text-center text-xs text-zinc-400 dark:text-zinc-500 select-none">
        <p className="font-semibold">
          © 2026 Live Bingo Platform. Fully synchronized via Socket.IO.
        </p>
      </footer>

      {roomState && currentPlayerId && (
        <LiveChat
          chatHistory={roomState.chatHistory || []}
          onSendMessage={handleSendChatMessage}
          currentPlayerId={currentPlayerId}
          players={roomState.players}
        />
      )}
    </div>
  );
}
