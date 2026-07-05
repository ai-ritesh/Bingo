# 🎲 BingoLive - Real-Time Multiplayer Bingo Platform

A full-stack, real-time multiplayer Bingo game built with **React**, **Socket.IO**, **Express**, and **Tailwind CSS**. Play classic 5×5 Bingo or challenge yourself with 7×7 boards. Features live chat, voice communication, spectator mode, and dynamic board customization.

![BingoLive](https://img.shields.io/badge/Status-Active-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue) ![Node Version](https://img.shields.io/badge/Node-18+-green)

---

## 🚀 Features

### Core Gameplay
- **Two Board Sizes**: 5×5 (25 items) and 7×7 (49 items)
- **Dynamic Target Lines**: 
  - 5×5 Board: Win by completing 5 lines
  - 7×7 Board: Win by completing 7 lines
- **Turn-Based Selection**: Players alternate selecting numbers/letters
- **Server-Authoritative Marking**: All marks validated on the server
- **Real-Time Synchronization**: Instant state updates via Socket.IO

### Multiplayer Features
- **Create & Join Rooms**: Simple 4-character room codes
- **Host Controls**: Manage players, start/restart games, configure boards
- **Spectator Mode**: Watch ongoing matches without affecting gameplay
- **Player Roster**: Live connection status and role indicators
- **Auto-Reconnection**: Resume games after temporary disconnections

### Communication
- **Live Chat**: In-game messaging between players
- **WebRTC Voice Chat**: Real-time audio communication
- **Toast Notifications**: In-game alerts for actions and game events

### User Experience
- **Dark/Light Mode**: Theme toggle for comfort
- **Smooth Animations**: Confetti celebrations, motion transitions
- **Responsive Design**: Works on desktop and tablet
- **Accessibility**: Clear role badges (HOST, PARTICIPANT, SPECTATOR)

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Tailwind CSS 4, Motion (Framer Motion) |
| **Real-Time Communication** | Socket.IO (WebSocket + Polling fallback) |
| **Backend** | Express.js, Node.js, TypeScript |
| **UI Components** | Lucide React Icons, Canvas Confetti |
| **Voice** | WebRTC via Socket.IO signal relay |
| **Build** | Vite, ESBuild |

### Folder Structure

```
bingo/
├── src/
│   ├── components/
│   │   ├── BingoBoard.tsx          # Interactive game board (5×5 or 7×7)
│   │   ├── SetupBoard.tsx          # Pre-game board configuration
│   │   ├── Lobby.tsx               # Room creation/joining
│   │   ├── PlayerGrid.tsx          # Player roster with connection status
│   │   ├── CalledHistory.tsx       # Called items history display
│   │   ├── LiveChat.tsx            # In-game chat interface
│   │   ├── VoiceChat.tsx           # WebRTC voice communication
│   │   ├── ThemeToggle.tsx         # Dark/light mode switcher
│   │   └── Toast.tsx               # Notification system
│   ├── App.tsx                     # Main application component
│   ├── types.ts                    # TypeScript interfaces
│   ├── main.tsx                    # React entry point
│   └── index.css                   # Global styles
├── server.ts                       # Express + Socket.IO server
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── vite.config.ts                  # Vite bundler config
└── README.md                       # This file
```

---

## 🎮 Game Rules

### Board Selection
1. **5×5 Board**: Classic Bingo with 25 items (numbers 1-25)
2. **7×7 Board**: Extended mode with 49 items (A-Z plus 1-23)

### Winning Conditions
- **5×5 Mode**: Complete **5 consecutive lines** (horizontal, vertical, or diagonal)
- **7×7 Mode**: Complete **7 consecutive lines** (horizontal, vertical, or diagonal)

A "line" is a complete row, column, or diagonal of marked numbers.

### Turn Order
- Players alternate selecting numbers each turn
- After a number is selected, it's marked on **both** player boards automatically
- The other player gets the next turn

### Server Validation
- All selections are validated on the server
- Prevents duplicate selections
- Automatically marks numbers on both boards
- Detects wins immediately after each turn

---

## 🛠️ Setup & Installation

### Prerequisites
- **Node.js** 18+ 
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ai-ritesh/Bingo.git
   cd Bingo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file** (optional)
   ```env
   PORT=3000
   NODE_ENV=development
   ```

---

## 🚀 Running the Application

### Development Mode
Runs both Vite dev server and Socket.IO server with hot reload:
```bash
npm run dev
```
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend: `http://localhost:3000` (Express server)

### Production Build
```bash
npm run build
npm start
```

### Clean Build Artifacts
```bash
npm run clean
```

### Type Checking
```bash
npm run lint
```

---

## 🎯 How to Play

### Creating a Game
1. **Start the app** and you'll see the Lobby screen
2. **Enter your name** and click "Create Room"
3. **Share the room code** with another player
4. **Configure your board**: 
   - Select board size (5×5 or 7×7)
   - Customize items if desired (optional)
5. **Save your setup** and wait for the other player

### Joining a Game
1. **Enter room code** provided by the host
2. **Enter your name**
3. **Select board size** (must match host's selection)
4. **Save your board** when ready

### During the Game
1. **Wait for your turn** (indicated by green highlight)
2. **Select a number/letter** from your board
3. **The number is automatically marked** on both boards
4. **Strategy**: Try to complete 5 lines (or 7 for 7×7) before opponent

### Winning
- First player to complete the required number of lines wins
- Confetti animation celebrates the victory
- Game ends and you can restart

### Spectator Mode
- Join as "Spectator" to watch without playing
- See both player boards and called history
- Chat and voice are still available

---

## 📡 Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create_room` | `{ name: string }` | Create new game room |
| `join_room` | `{ name, code, isSpectator? }` | Join existing room |
| `start_game` | — | Start the game (host only) |
| `select_number` | `{ number: string }` | Select/mark a number |
| `save_player_board` | `{ items: string[] }` | Save custom board |
| `send_chat_message` | `{ text: string }` | Send chat message |
| `kick_player` | `{ playerId: string }` | Remove player (host only) |
| `leave_room` | — | Leave current room |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room_state` | `RoomState` | Full room state sync |
| `game_started` | `countdownSeconds` | Game starting, countdown |
| `bingo_claimed` | `{ playerId, playerName, patterns }` | Win detected |
| `notification` | `{ type, message }` | In-game notification |
| `available_rooms` | `Room[]` | List of joinable rooms |
| `chat_message` | `ChatMessage` | New chat message |
| `player_kicked` | `playerId` | Player was removed |

---

## 📊 Game State Structure

```typescript
interface RoomState {
  code: string;                    // 4-char room code
  hostId: string;                  // Socket ID of host
  players: Record<string, Player>; // Active players
  items: string[];                 // Board items (25 or 49)
  calledItems: string[];           // Items called so far
  gameStarted: boolean;            // Game in progress
  gameOver: boolean;               // Game ended
  winnerId: string | null;         // Winner's socket ID
  turnPlayerId: string | null;     // Current player's turn
  locked: boolean;                 // Room locked (game started)
  chatHistory: ChatMessage[];      // Recent messages
}

interface Player {
  id: string;
  name: string;
  board: string[];                 // Shuffled items (25 or 49)
  markedIndices: number[];         // Which cells are marked (0-24 or 0-48)
  isHost: boolean;
  isSpectator: boolean;
  isConnected: boolean;
  isVoiceJoined?: boolean;
  isMuted?: boolean;
}
```

---

## 🔧 Development

### Code Organization

- **`App.tsx`**: Main orchestrator, handles Socket.IO connections and state
- **`server.ts`**: Backend logic, room management, win detection, turn validation
- **`types.ts`**: Shared TypeScript interfaces for type safety
- **Components**: Modular, reusable UI pieces

### Key Algorithms

#### Line Detection (7×7 Support)
The `countCompletedLines()` function dynamically calculates:
- **Rows**: `boardSize` rows of `boardSize` items each
- **Columns**: `boardSize` columns of `boardSize` items each
- **Main Diagonal**: Top-left to bottom-right
- **Anti Diagonal**: Top-right to bottom-left

For 7×7, this generates 16 total lines (7 rows + 7 columns + 2 diagonals).

#### Win Condition
```typescript
const boardSize = player.board.length === 49 ? 7 : 5;
const targetLines = boardSize; // Matches board size
if (completedLinesCount >= targetLines) { /* WIN */ }
```

#### Server-Authoritative Marking
1. Player selects number
2. Server validates it's valid & not already called
3. Server marks on **both** player boards
4. Server checks for winner
5. Broadcasts updated state to all clients

---

## 🐛 Known Issues & Fixes

### Issue: 7×7 Board showing win at 5 lines
**Fixed in commit `42c39a1`**: Target lines now correctly scale with board size.
- **Before**: Always required 5 lines (hardcoded)
- **After**: 5×5 requires 5 lines, 7×7 requires 7 lines

---

## 📦 Dependencies

### Core Dependencies
- `react@19.0.1` - UI framework
- `react-dom@19.0.1` - React rendering
- `socket.io@4.8.3` - Real-time communication
- `socket.io-client@4.8.3` - Client-side Socket.IO
- `express@4.21.2` - HTTP server
- `tailwindcss@4.1.14` - Utility-first CSS
- `motion@12.23.24` - Animation library (Framer Motion)
- `lucide-react@0.546.0` - Icon library
- `canvas-confetti@1.9.4` - Celebration effects

### Dev Dependencies
- `typescript@5.8.2` - Type checking
- `vite@6.2.3` - Build tool & dev server
- `tsx@4.21.0` - TypeScript executor

---

## 📄 License

This project is licensed under the **MIT License** - see LICENSE file for details.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/ai-ritesh/Bingo/issues)
- **Author**: Ritesh Kumar
- **Repository**: https://github.com/ai-ritesh/Bingo

---

## 🎉 Acknowledgments

- Socket.IO for real-time communication
- React community for amazing libraries
- Tailwind CSS for responsive design utilities
- Framer Motion for smooth animations
- Canvas Confetti for celebration effects

---

## 🚀 Future Enhancements

- [ ] Multiple game modes (speed Bingo, pattern Bingo)
- [ ] Leaderboard and statistics tracking
- [ ] Custom patterns beyond rows/columns/diagonals
- [ ] Mobile app (React Native)
- [ ] AI opponent for single-player mode
- [ ] Tournament management system
- [ ] Sound effects and background music
- [ ] Profile system with avatars

---

**Happy Bingo Playing! 🎲**

Made with ❤️ by [Ritesh Kumar](https://github.com/ai-ritesh)
