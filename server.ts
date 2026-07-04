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

// Validate Bingo Claim server-side
function validateBingo(room: RoomState, player: Player): WinDetails[] {
  const board = player.board;
  const marked = player.markedIndices;
  const called = room.calledItems;
  const freeSpace = room.freeSpaceEnabled;

  // Find all validly marked indices (must be in player's marked list AND either free space or called by server)
  const validMarkedIndices = new Set<number>();
  
  for (let i = 0; i < 25; i++) {
    const isFree = i === 12 && freeSpace;
    const item = board[i];
    const isCalled = called.includes(item);
    
    // Player must have marked it, and it must be legally markable
    if (marked.includes(i)) {
      if (isFree || isCalled) {
        validMarkedIndices.add(i);
      }
    }
  }

  const matches: WinDetails[] = [];

  // Check each pattern
  (Object.keys(WINNING_PATTERNS) as WinPatternType[]).forEach((patternName) => {
    const patternsList = WINNING_PATTERNS[patternName];
    patternsList.forEach((indices) => {
      const isWin = indices.every((idx) => validMarkedIndices.has(idx));
      if (isWin) {
        matches.push({
          pattern: patternName,
          indices: [...indices]
        });
      }
    });
  });

  return matches;
}

// Default pre-configured 25 items for newly created rooms (non-tech, emoji-themed)
const DEFAULT_ITEMS = [
  '🎉 Party', '🚀 Rocket', '🍕 Pizza', '☕ Coffee', '🔥 Fire',
  '📈 Chart Up', '🎯 Target', '🤖 Robot', '🎨 Paint', '🌟 Star',
  '👾 Alien', '🍻 Beers', '🥑 Avocado', '💡 Idea', '🌈 Rainbow',
  '🧩 Puzzle', '⚡ Lightning', '🔮 Crystal Ball', '👑 Crown', '🧠 Brain',
  '🛠️ Tools', '🐱 Cat', '🎵 Music', '💸 Money', '🏆 Trophy'
];

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

    if (items.length < 25) {
      socket.emit('error_message', 'Exactly 25 items are required to start');
      return;
    }

    room.items = items.slice(0, 25);
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

    if (items.length < 25) {
      socket.emit('error_message', 'Exactly 25 items are required');
      return;
    }

    player.board = items.slice(0, 25);
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

    room.gameStarted = true;
    room.gameOver = false;
    room.winnerId = null;
    room.winnerName = null;
    room.calledItems = [];
    room.calledItemsHistory = [];
    room.locked = true; // Lock room from new participants

    // Ensure all players have a board. If not saved, generate a shuffled board from room.items
    Object.values(room.players).forEach((player) => {
      player.markedIndices = [];
      if (!player.isSpectator) {
        if (!player.boardSaved || !player.board || player.board.length < 25) {
          player.board = shuffle(room.items.length >= 25 ? room.items : DEFAULT_ITEMS);
          player.boardSaved = true;
        }
        // If free space is enabled, pre-mark the center space index 12 automatically
        if (room.freeSpaceEnabled) {
          if (!player.markedIndices.includes(12)) {
            player.markedIndices.push(12);
          }
        }
      } else {
        player.board = [];
      }
    });

    // Create the master items list from the union of all active players' boards
    const allItems = new Set<string>();
    Object.values(room.players).forEach((player) => {
      if (!player.isSpectator && player.board && player.board.length === 25) {
        player.board.forEach((item) => {
          if (item && item.trim()) {
            allItems.add(item.trim());
          }
        });
      }
    });

    if (allItems.size >= 25) {
      room.items = Array.from(allItems);
    } else {
      if (room.items.length < 25) {
        room.items = [...DEFAULT_ITEMS];
      }
    }

    touchRoom(currentRoomCode);

    // Countdown of 3 seconds before first draw
    io.to(currentRoomCode).emit('game_started', 3);
    
    // Immediate state sync
    io.to(currentRoomCode).emit('room_state', room);
    broadcastAvailableRooms();
    console.log(`Game started in room ${currentRoomCode}`);
  });

  socket.on('call_item', () => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms[currentRoomCode];
    if (!room) return;

    if (room.hostId !== currentPlayerId) {
      socket.emit('error_message', 'Only the host can call items');
      return;
    }

    if (!room.gameStarted || room.gameOver) {
      socket.emit('error_message', 'Game is not active');
      return;
    }

    // Find items not yet called
    const remainingItems = room.items.filter((item) => !room.calledItems.includes(item));
    if (remainingItems.length === 0) {
      socket.emit('error_message', 'All items have been called!');
      return;
    }

    const nextItem = remainingItems[Math.floor(Math.random() * remainingItems.length)];
    room.calledItems.push(nextItem);
    
    const historyItem = { item: nextItem, calledAt: Date.now() };
    room.calledItemsHistory.unshift(historyItem); // Latest first

    touchRoom(currentRoomCode);

    io.to(currentRoomCode).emit('item_called', nextItem, room.calledItemsHistory);
    io.to(currentRoomCode).emit('room_state', room);
    console.log(`Item called in room ${currentRoomCode}: ${nextItem}`);
  });

  socket.on('mark_cell', ({ index, isMarked }: { index: number; isMarked: boolean }) => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms[currentRoomCode];
    if (!room) return;

    const player = room.players[currentPlayerId];
    if (!player || player.isSpectator) return;

    // Check center free space constraint
    if (index === 12 && room.freeSpaceEnabled) {
      // Free space is always marked, ignore client-side toggles
      if (!player.markedIndices.includes(12)) {
        player.markedIndices.push(12);
      }
    } else {
      // Validate that the item at index has actually been called before allowing marking
      const itemText = player.board[index];
      const isCalled = room.calledItems.includes(itemText);

      // We allow marking called items only
      if (isMarked) {
        if (isCalled && !player.markedIndices.includes(index)) {
          player.markedIndices.push(index);
        }
      } else {
        player.markedIndices = player.markedIndices.filter((idx) => idx !== index);
      }
    }

    touchRoom(currentRoomCode);
    io.to(currentRoomCode).emit('room_state', room);
  });

  socket.on('claim_bingo', () => {
    if (!currentRoomCode || !currentPlayerId) return;
    const room = rooms[currentRoomCode];
    if (!room) return;

    const player = room.players[currentPlayerId];
    if (!player || player.isSpectator || !room.gameStarted || room.gameOver) return;

    // Run authoritative server-side validation
    const winningPatterns = validateBingo(room, player);

    if (winningPatterns.length > 0) {
      // Player won!
      room.gameOver = true;
      room.gameStarted = false;
      room.winnerId = player.id;
      room.winnerName = player.name;

      touchRoom(currentRoomCode);

      io.to(currentRoomCode).emit('bingo_claimed', {
        playerId: player.id,
        playerName: player.name,
        patterns: winningPatterns
      });
      io.to(currentRoomCode).emit('room_state', room);
      broadcastAvailableRooms();
      console.log(`BINGO CLAIM CONFIRMED for ${player.name} in room ${currentRoomCode}`);
    } else {
      // Reject claim
      socket.emit('bingo_rejected', {
        playerId: player.id,
        reason: 'Your marked tiles do not complete a winning combination, or some marked tiles have not been called yet!'
      });
      socket.emit('notification', {
        type: 'error',
        message: 'Bingo claim rejected: Check your board, you must complete a full line/pattern of CALLED cells!'
      });
      console.log(`BINGO CLAIM REJECTED for ${player.name} in room ${currentRoomCode}`);
    }
  });

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
