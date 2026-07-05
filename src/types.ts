export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isSpectator: boolean;
  isConnected: boolean;
  board: string[]; // 25 shuffled or custom items
  markedIndices: number[]; // Indices 0-24 that have been marked/daubed by player
  boardSaved?: boolean; // Whether the player has explicitly saved their custom board
  isVoiceJoined?: boolean; // Voice chat connection state
  isMuted?: boolean; // Microphone mute state
  isDeafened?: boolean; // Sound deafen state
}

export interface BoardCell {
  text: string;
  index: number; // Flat index 0-24
  isMarked: boolean;
  isCalled: boolean; // Server-authoritative called state
  isFreeSpace: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Record<string, Player>;
  items: string[]; // 25 custom items set by host
  freeSpaceEnabled: boolean;
  calledItems: string[]; // List of items called so far
  calledItemsHistory: { item: string; calledAt: number }[];
  gameStarted: boolean;
  gameOver: boolean;
  winnerId: string | null;
  winnerName: string | null;
  createdAt: number;
  lastActiveAt: number;
  locked: boolean;
  chatHistory?: ChatMessage[];
  turnPlayerId?: string | null;
}

export type WinPatternType = 'Row' | 'Column' | 'Diagonal' | 'Four Corners' | 'X Pattern' | 'Full House';

export interface WinDetails {
  pattern: WinPatternType;
  indices: number[];
}

export interface ServerToClientEvents {
  room_state: (state: RoomState) => void;
  game_started: (countdownSeconds: number) => void;
  item_called: (item: string, history: { item: string; calledAt: number }[]) => void;
  bingo_claimed: (data: { playerId: string; playerName: string; patterns: WinDetails[] }) => void;
  bingo_rejected: (data: { playerId: string; reason: string }) => void;
  player_kicked: (playerId: string) => void;
  error_message: (message: string) => void;
  notification: (data: { type: 'info' | 'success' | 'warning' | 'error'; message: string }) => void;
  available_rooms: (rooms: { code: string; playerCount: number; gameStarted: boolean }[]) => void;
  chat_message: (message: ChatMessage) => void;
  rtc_signal: (data: { senderId: string; signal: any }) => void;
}

export interface ClientToServerEvents {
  create_room: (data: { name: string }) => void;
  join_room: (data: { name: string; code: string; isSpectator?: boolean }) => void;
  setup_game: (data: { items: string[]; freeSpaceEnabled: boolean }) => void;
  save_player_board: (data: { items: string[] }) => void;
  start_game: () => void;
  call_item: () => void;
  select_number: (data: { number: string }) => void;
  mark_cell: (data: { index: number; isMarked: boolean }) => void;
  claim_bingo: () => void;
  kick_player: (data: { playerId: string }) => void;
  leave_room: () => void;
  request_state: () => void;
  get_available_rooms: () => void;
  send_chat_message: (data: { text: string }) => void;
  rtc_signal: (data: { targetId: string; signal: any }) => void;
  toggle_voice_state: (data: { isVoiceJoined?: boolean; isMuted?: boolean; isDeafened?: boolean }) => void;
}
