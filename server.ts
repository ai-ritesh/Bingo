import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { RoomState, Player, WinDetails, WinPatternType } from './src/types.js';

// Load environment variables
dotenv.config();

let _filename = '';
let _dirname = '';
try {
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    _filename = fileURLToPath(import.meta.url);
    _dirname = path.dirname(_filename);
  } else {
    _filename = __filename;
    _dirname = __dirname;
  }
} catch (e) {
  _filename = '';
  _dirname = process.cwd();
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = 3000;

// In-memory room storage
const rooms: Record<string, RoomState> = {};

// Helper to generate a unique Room Code (4 characters, uppercase letters)
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like I, O, 0, 1
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms[code]); // Ensure uniqueness
  return code;
}

// Fisher-Yates Shuffle
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Winning Pattern Definitions (Indices 0-24)
const WINNING_PATTERNS: Record<WinPatternType, number[][]> = {
  'Row': [
    [0, 1, 2, 3, 4],     // Row 0
    [5, 6, 7, 8, 9],     // Row 1
    [10, 11, 12, 13, 14], // Row 2
    [15, 16, 17, 18, 19], // Row 3
    [20, 21, 22, 23, 24]  // Row 4
  ],
  'Column': [
    [0, 5, 10, 15, 20],   // Col 0
    [1, 6, 11, 16, 21],   // Col 1
    [2, 7, 12, 17, 22],   // Col 2
    [3, 8, 13, 18, 23],   // Col 3
    [4, 9, 14, 19, 24]    // Col 4
  ],
  'Diagonal': [
    [0, 6, 12, 18, 24],   // Main Diagonal
    [4, 8, 12, 16, 20]    // Anti Diagonal
  ],
  'Four Corners': [
    [0, 4, 20, 24]        // 4 Corners
  ],
  'X Pattern': [
    [0, 4, 6, 8, 12, 16, 18, 20, 24] // Both diagonals combined (9 cells)
  ],
  'Full House': [
    Array.from({ length: 25 }, (_, i) => i) // All 25 cells
  ]
};

// Validate if board contains exactly numbers '1' through '25' exactly once
function isValidBoard(board: string[]): boolean {
  if (!board || board.length !== 25) return false;
  const set = new Set(board.map((item) => item.trim()));
  if (set.size !== 25) return false;
  for (let i = 1; i <= 25; i++) {
    if (!set.has(String(i))) return false;
  }
  return true;
}

const ALPHABETICAL_ITEMS_49 = [
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)), // A-Z
  ...Array.from({ length: 23 }, (_, i) => String(i + 1)) // 1-23
];

function isValidBoard49(board: string[]): boolean {
  if (!board || board.length !== 49) return false;
  const set = new Set(board.map((item) => item.trim()));
  if (set.size !== 49) return false;
  const poolSet = new Set(ALPHABETICAL_ITEMS_49);
  for (const item of set) {
    if (!poolSet.has(item)) return false;
  }
  return true;
}

// Count completed horizontal, vertical, and diagonal lines dynamically
function countCompletedLines(player: Player): { count: number; completedLines: number[][] } {
  const marked = player.markedIndices || [];
  let count = 0;
  const completedLines: number[][] = [];

  const boardSize = player.board.length === 49 ? 7 : 5;
  const linesToCheck: number[][] = [];

  // Rows
  for (let r = 0; r < boardSize; r++) {
    const row = [];
    for (let c = 0; c < boardSize; c++) {
      row.push(r * boardSize + c);
    }
    linesToCheck.push(row);
  }

  // Columns
  for (let c = 0; c < boardSize; c++) {
    const col = [];
    for (let r = 0; r < boardSize; r++) {
      col.push(r * boardSize + c);
    }
    linesToCheck.push(col);
  }

  // Main diagonal
  const diag1 = [];
  for (let i = 0; i < boardSize; i++) {
    diag1.push(i * boardSize + i);
  }
  linesToCheck.push(diag1);

  // Anti diagonal
  const diag2 = [];
  for (let i = 0; i < boardSize; i++) {
    diag2.push(i * boardSize + (boardSize - 1 - i));
  }
  linesToCheck.push(diag2);

  linesToCheck.forEach((line) => {
    if (line.every((idx) => marked.includes(idx))) {
      count++;
      completedLines.push(line);
    }
  });

  return { count, completedLines };
}

// Default pre-configured 25 items for newly created rooms (classic 1 to 25)
const DEFAULT_ITEMS = Array.from({ length: 25 }, (_, i) => String(i + 1));

// Touch room's active timestamp
function touchRoom(roomCode: string) {
  if (rooms[roomCode]) {
    rooms[roomCode].lastActiveAt = Date.now();
  }
}

// Helper to get all active and available rooms
function getRoomsList() {
  return Object.values(rooms).map((r) => ({
    code: r.code,
    playerCount: Object.values(r.players).filter((p) => p.isConnected).length,
    gameStarted: r.gameStarted,
  }));
}

// Helper to broadcast room list to all connected clients
function broadcastAvailableRooms() {
  io.emit('available_rooms', getRoomsList());
}

// Socket.IO Connection Handler
io.on('connection', (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Immediately send the list of available rooms to the newly connected client
  socket.emit('available_rooms', getRoomsList());

  // Track player's room and info for clean disconnects
  let currentRoomCode: string | null = null;
  let currentPlayerId: string | null = null;

  // Allow explicit room list requests
  socket.on('get_available_rooms', () => {
    socket.emit('available_rooms', getRoomsList());
  });

  // Send list of rooms for debugging/dashboard if requested (optional)
  socket.on('create_room', ({ name }: { name: string }) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      socket.emit('error_message', 'Name is required');
      return;
    }

    const code = generateRoomCode();
    rooms[code] = {
      code,
      hostId: socket.id,
      players: {
        [socket.id]: {
          id: socket.id,
          name: trimmedName,
          isHost: true,
          isSpectator: false,
          isConnected: true,
          board: [],
          markedIndices: []
        }
      },
      items: [...DEFAULT_ITEMS],
      freeSpaceEnabled: true,
      calledItems: [],
      calledItemsHistory: [],
      gameStarted: false,
      gameOver: false,
      winnerId: null,
      winnerName: null,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      locked: false
    };

    currentRoomCode = code;
    currentPlayerId = socket.id;

    socket.join(code);
    socket.emit('room_state', rooms[code]);
    broadcastAvailableRooms();
    console.log(`Room created: ${code} by ${trimmedName}`);
  });

  socket.on('join_room', ({ name, code, isSpectator }: { name: string; code: string; isSpectator?: boolean }) => {
    const roomCode = code.toUpperCase().trim();
    const trimmedName = name.trim();

    if (!trimmedName) {
      socket.emit('error_message', 'Name is required');
      return;
    }

    const room = rooms[roomCode];
    if (!room) {
      socket.emit('error_message', 'Room not found');
      return;
    }

    // Check if there is an existing player matching this name in the room to reconnect/take over
    const existingPlayer = Object.values(room.players).find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingPlayer) {
      // Handle Reconnect / Takeover of existing player state
      const oldId = existingPlayer.id;
      
      existingPlayer.id = socket.id;
      existingPlayer.isConnected = true;
      
      room.players[socket.id] = existingPlayer;
      if (oldId !== socket.id) {
        delete room.players[oldId];
      }

      if (room.hostId === oldId) {
        room.hostId = socket.id;
      }

      currentRoomCode = roomCode;
      currentPlayerId = socket.id;
      socket.join(roomCode);

      touchRoom(roomCode);
      io.to(roomCode).emit('room_state', room);
      broadcastAvailableRooms();
      socket.emit('notification', { type: 'success', message: `Reconnected as ${existingPlayer.name}!` });
      console.log(`Player ${trimmedName} reconnected/took over in room ${roomCode}`);
      return;
    }

    // If game has started (locked) and not a reconnect, they can only join as spectator
    if (room.locked && !isSpectator) {
      socket.emit('error_message', 'Room is locked because the game has already started. You can join as a spectator.');
      return;
    }

    // Join room as a new player
    const player: Player = {
      id: socket.id,
      name: trimmedName,
      isHost: false,
      isSpectator: !!isSpectator,
      isConnected: true,
      board: [],
      markedIndices: []
    };

    room.players[socket.id] = player;
    currentRoomCode = roomCode;
    currentPlayerId = socket.id;

    socket.join(roomCode);
    touchRoom(roomCode);

    io.to(roomCode).emit('room_state', room);
    broadcastAvailableRooms();
    socket.emit('notification', { type: 'success', message: `Joined room ${roomCode}` });
    console.log(`Player ${trimmedName} joined room ${roomCode}`);
  });

  socket.on('setup_game', ({ items, freeSpaceEnabled }: { items: string[]; freeSpaceEnabled: boolean }) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms[currentRoomCode];
    if (!room) return;

    if (room.hostId !== currentPlayerId) {
      socket.emit('error_message', 'Only the host can setup the game');
      return;
    }

    const len = items.length;
    if (len !== 25 && len !== 49) {
      socket.emit('error_message', 'Exactly 25 or 49 items are required to start');
      return;
    }

    room.items = items.slice(0, len);
    room.freeSpaceEnabled = freeSpaceEnabled;
    touchRoom(currentRoomCode);

    io.to(currentRoomCode).emit('room_state', room);
    socket.emit('notification', { type: 'success', message: 'Bingo board configured!' });
  });

  socket.on('save_player_board', ({ items }: { items: string[] }) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms[currentRoomCode];
    if (!room) return;

    const player = room.players[currentPlayerId];
    if (!player) return;

    const len = items.length;
    if (len !== 25 && len !== 49) {
      socket.emit('error_message', 'Exactly 25 or 49 items are required');
      return;
    }

    player.board = items.slice(0, len);
    player.boardSaved = true;
    touchRoom(currentRoomCode);

    io.to(currentRoomCode).emit('room_state', room);
    socket.emit('notification', { type: 'success', message: 'Your board setup is saved!' });
  });

  socket.on('send_chat_message', ({ text }: { text: string }) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms[currentRoomCode];
    if (!room) return;

    const player = room.players[currentPlayerId];
    if (!player) return;

    const trimmedText = text.trim();
    if (!trimmedText) return;

    const message = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: currentPlayerId,
      senderName: player.name,
      text: trimmedText,
      timestamp: Date.now()
    };

    room.chatHistory = room.chatHistory || [];
    room.chatHistory.push(message);

    if (room.chatHistory.length > 100) {
      room.chatHistory.shift();
    }

    touchRoom(currentRoomCode);

    io.to(currentRoomCode).emit('chat_message', message);
    io.to(currentRoomCode).emit('room_state', room);
    console.log(`Chat message sent in room ${currentRoomCode} by ${player.name}: ${trimmedText}`);
  });

  socket.on('start_game', () => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms[currentRoomCode];
    if (!room) return;

    if (room.hostId !== currentPlayerId) {
      socket.emit('error_message', 'Only the host can start the game');
      return;
    }

    const activePlayers = Object.values(room.players).filter((p) => !p.isSpectator && p.isConnected);
    if (activePlayers.length !== 2) {
      socket.emit('error_message', 'Exactly 2 active players are required to start a competitive Bingo match.');
      return;
    }

    room.gameStarted = true;
    room.gameOver = false;
    room.winnerId = null;
    room.winnerName = null;
    room.calledItems = [];
    room.calledItemsHistory = [];
    room.locked = true; // Lock room from new active participants
    room.freeSpaceEnabled = false; // Turn-based classic 1-25 has no free spaces

    // Ensure all active players have a valid board
    activePlayers.forEach((player) => {
      player.markedIndices = [];
      const isBoard49 = player.board.length === 49;
      if (isBoard49) {
        if (!isValidBoard49(player.board)) {
          player.board = shuffle(ALPHABETICAL_ITEMS_49);
          player.boardSaved = true;
        }
      } else {
        if (!isValidBoard(player.board)) {
          player.board = shuffle(DEFAULT_ITEMS);
          player.boardSaved = true;
        }
      }
    });

    // Randomly select which active player gets the first turn
    const activeIds = activePlayers.map((p) => p.id);
    room.turnPlayerId = activeIds[Math.floor(Math.random() * activeIds.length)];

    touchRoom(currentRoomCode);

    const firstTurnPlayerName = room.players[room.turnPlayerId]?.name || 'Unknown';
    io.to(currentRoomCode).emit('notification', {
      type: 'success',
      message: `🎉 The Bingo match has started! First turn: ${firstTurnPlayerName}`
    });

    // Countdown of 3 seconds before starting
    io.to(currentRoomCode).emit('game_started', 3);
    
    // Immediate state sync
    io.to(currentRoomCode).emit('room_state', room);
    broadcastAvailableRooms();
    console.log(`Game started in room ${currentRoomCode}. First turn: ${room.turnPlayerId}`);
  });

  socket.on('select_number', ({ number }: { number: string }) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms[currentRoomCode];
    if (!room) return;

    if (!room.gameStarted || room.gameOver) {
      socket.emit('error_message', 'The game is not active!');
      return;
    }

    if (room.turnPlayerId !== currentPlayerId) {
      socket.emit('error_message', 'It is not your turn!');
      return;
    }

    const trimmedNum = number.trim();
    if (!trimmedNum) return;

    // Check if the number was already selected
    if (room.calledItems.includes(trimmedNum)) {
      socket.emit('error_message', 'This number has already been marked.');
      return;
    }

    // Validate item selection depending on board size
    const isBoard49 = Object.values(room.players).some((p) => p.board.length === 49);
    if (isBoard49) {
      const allowedSet = new Set(ALPHABETICAL_ITEMS_49);
      if (!allowedSet.has(trimmedNum)) {
        socket.emit('error_message', 'Invalid alphabetical or numerical value.');
        return;
      }
    } else {
      const numVal = parseInt(trimmedNum, 10);
      if (isNaN(numVal) || numVal < 1 || numVal > 25) {
        socket.emit('error_message', 'Only numbers 1 to 25 can be selected.');
        return;
      }
    }

    // Register selection on the server
    room.calledItems.push(trimmedNum);
    room.calledItemsHistory.unshift({ item: trimmedNum, calledAt: Date.now() });

    // Automatically mark this number on BOTH players' boards (server-authoritative)
    const activePlayers = Object.values(room.players).filter((p) => !p.isSpectator && p.isConnected);
    activePlayers.forEach((player) => {
      const idx = player.board.indexOf(trimmedNum);
      if (idx !== -1 && !player.markedIndices.includes(idx)) {
        player.markedIndices.push(idx);
      }
    });

    // Switch turn to the other active player
    const otherPlayer = activePlayers.find((p) => p.id !== currentPlayerId);
    if (otherPlayer) {
      room.turnPlayerId = otherPlayer.id;
    }

    // Automatically count lines and check for winners after this move
    if (activePlayers.length === 2) {
      const p1 = activePlayers[0];
      const p2 = activePlayers[1];

      const score1 = countCompletedLines(p1).count;
      const score2 = countCompletedLines(p2).count;

      if (score1 >= 5 && score2 >= 5) {
        // Double winner = whoever selected the number first (the active player) wins!
        const winner = p1.id === currentPlayerId ? p1 : p2;
        const winningScore = p1.id === currentPlayerId ? score1 : score2;
        room.gameOver = true;
        room.gameStarted = false;
        room.winnerId = winner.id;
        room.winnerName = winner.name;
        io.to(currentRoomCode).emit('notification', {
          type: 'success',
          message: `🎉 BINGO! ${winner.name} chose the final number first, completed ${winningScore} lines and won the match!`
        });
      } else if (score1 >= 5) {
        // Player 1 wins
        room.gameOver = true;
        room.gameStarted = false;
        room.winnerId = p1.id;
        room.winnerName = p1.name;
        io.to(currentRoomCode).emit('notification', {
          type: 'success',
          message: `🎉 BINGO! ${p1.name} completed ${score1} lines and won the match!`
        });
      } else if (score2 >= 5) {
        // Player 2 wins
        room.gameOver = true;
        room.gameStarted = false;
        room.winnerId = p2.id;
        room.winnerName = p2.name;
        io.to(currentRoomCode).emit('notification', {
          type: 'success',
          message: `🎉 BINGO! ${p2.name} completed ${score2} lines and won the match!`
        });
      }
    }

    touchRoom(currentRoomCode);
    io.to(currentRoomCode).emit('room_state', room);
    console.log(`Number ${trimmedNum} selected in room ${currentRoomCode} by ${room.players[currentPlayerId]?.name}`);
  });

  // Keep obsolete listeners as empty stubs so clients don't crash
  socket.on('call_item', () => {});
  socket.on('mark_cell', () => {});
  socket.on('claim_bingo', () => {});

  socket.on('kick_player', ({ playerId }: { playerId: string }) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms[currentRoomCode];
    if (!room) return;

    if (room.hostId !== currentPlayerId) {
      socket.emit('error_message', 'Only the host can kick players');
      return;
    }

    if (playerId === room.hostId) {
      socket.emit('error_message', 'Host cannot kick themselves');
      return;
    }

    const kickedPlayer = room.players[playerId];
    if (kickedPlayer) {
      const kickedName = kickedPlayer.name;
      delete room.players[playerId];

      touchRoom(currentRoomCode);

      io.to(playerId).emit('player_kicked', playerId);
      // Disconnect socket from room
      const kickedSocket = io.sockets.sockets.get(playerId);
      if (kickedSocket) {
        kickedSocket.leave(currentRoomCode);
      }

      io.to(currentRoomCode).emit('room_state', room);
      broadcastAvailableRooms();
      io.to(currentRoomCode).emit('notification', { type: 'warning', message: `${kickedName} was kicked from the room` });
      console.log(`Kicked player ${kickedName} from room ${currentRoomCode}`);
    }
  });

  socket.on('leave_room', () => {
    handleUserExit();
  });

  socket.on('rtc_signal', ({ targetId, signal }: { targetId: string; signal: any }) => {
    if (!currentRoomCode || !currentPlayerId) return;
    // Relay WebRTC signal directly to target player
    io.to(targetId).emit('rtc_signal', {
      senderId: currentPlayerId,
      signal
    });
  });

  socket.on('toggle_voice_state', ({ isVoiceJoined, isMuted, isDeafened }: { isVoiceJoined?: boolean; isMuted?: boolean; isDeafened?: boolean }) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms[currentRoomCode];
    if (!room) return;

    const player = room.players[currentPlayerId];
    if (!player) return;

    if (isVoiceJoined !== undefined) player.isVoiceJoined = isVoiceJoined;
    if (isMuted !== undefined) player.isMuted = isMuted;
    if (isDeafened !== undefined) player.isDeafened = isDeafened;

    touchRoom(currentRoomCode);
    io.to(currentRoomCode).emit('room_state', room);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    handleUserExit(true); // isDisconnect
  });

  socket.on('request_state', () => {
    if (currentRoomCode && rooms[currentRoomCode]) {
      socket.emit('room_state', rooms[currentRoomCode]);
    }
  });

  // Handle player leaving or disconnecting
  function handleUserExit(isDisconnect = false) {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms[currentRoomCode];
    if (!room) return;

    const player = room.players[currentPlayerId];
    if (!player) return;

    touchRoom(currentRoomCode);

    if (isDisconnect) {
      // Mark as disconnected to allow reconnection
      player.isConnected = false;
      player.isVoiceJoined = false;
      io.to(currentRoomCode).emit('room_state', room);
      broadcastAvailableRooms();
      io.to(currentRoomCode).emit('notification', { type: 'info', message: `${player.name} lost connection` });
      console.log(`Player ${player.name} disconnected (temporary) from room ${currentRoomCode}`);
      return;
    }

    // Actual user clicked "Leave Room" or was deleted
    const leavingName = player.name;
    const isHost = player.isHost;

    delete room.players[currentPlayerId];
    socket.leave(currentRoomCode);

    // If host leaves, assign a new host or close the room
    const remainingPlayers = Object.values(room.players).filter((p) => p.isConnected && !p.isSpectator);
    
    if (isHost) {
      if (remainingPlayers.length > 0) {
        const newHost = remainingPlayers[0];
        newHost.isHost = true;
        room.hostId = newHost.id;
        io.to(currentRoomCode).emit('room_state', room);
        io.to(currentRoomCode).emit('notification', { type: 'info', message: `${leavingName} (Host) left. ${newHost.name} is the new Host.` });
      } else {
        // No connected participants left, delete room
        delete rooms[currentRoomCode];
        console.log(`Room ${currentRoomCode} deleted because host left and no active participants remained.`);
      }
    } else {
      io.to(currentRoomCode).emit('room_state', room);
      io.to(currentRoomCode).emit('notification', { type: 'info', message: `${leavingName} left the room` });
    }

    currentRoomCode = null;
    currentPlayerId = null;
    broadcastAvailableRooms();
  }
});

// Periodic room sweeper (Auto-delete inactive rooms after 30 minutes)
setInterval(() => {
  const now = Date.now();
  const inactivityThreshold = 30 * 60 * 1000; // 30 mins

  Object.keys(rooms).forEach((code) => {
    const room = rooms[code];
    const isInactive = now - room.lastActiveAt > inactivityThreshold;
    
    // Check if there are any connected sockets in this room
    const clientsInRoom = io.sockets.adapter.rooms.get(code);
    const hasActivePlayers = clientsInRoom && clientsInRoom.size > 0;

    if (isInactive && !hasActivePlayers) {
      console.log(`Sweeper: Deleting inactive room ${code}`);
      delete rooms[code];
    }
  });
}, 5 * 60 * 1000); // Check every 5 minutes

// Setup Express and Vite Middleware integration
async function startServer() {
  // API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', roomsCount: Object.keys(rooms).length });
  });

  // Serve static UI or let Vite middleware handle assets
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-Stack Server running on http://localhost:${PORT}`);
  });
}

startServer();
export default app;
