import { motion } from 'motion/react';

interface BingoBoardProps {
  board: string[];
  markedIndices: number[];
  calledItems: string[];
  isSpectator: boolean;
  gameStarted: boolean;
  gameOver: boolean;
  isMyTurn: boolean;
  onSelectNumber: (num: string) => void;
  turnPlayerName?: string;
}

interface CompletedLine {
  id: string;
  type: 'row' | 'col' | 'diag';
  index: number;
  completionIndex: number;
}

export default function BingoBoard({
  board,
  markedIndices,
  calledItems,
  isSpectator,
  gameStarted,
  gameOver,
  isMyTurn,
  onSelectNumber,
  turnPlayerName = ''
}: BingoBoardProps) {
  
  if (!board || board.length === 0) {
    return (
      <div id="no-board" className="flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl min-h-[300px] font-sans">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-semibold text-center">
          Waiting for the game to start to load your 1–25 Bingo board...
        </p>
      </div>
    );
  }

  const handleCellClick = (idx: number, num: string) => {
    if (isSpectator) return;
    if (!gameStarted || gameOver) return;
    if (!isMyTurn) return;

    const isMarked = markedIndices.includes(idx);
    if (isMarked) return;

    onSelectNumber(num);
  };

  // Grid Header columns (B I N G O or custom grid header)
  const headerLetters = board.length === 49 
    ? ['I', 'L', 'O', 'V', 'E', 'U', '💓']
    : ['B', 'I', 'N', 'G', 'O'];

  // Dynamically compute completed rows, columns, and diagonals sorted chronologically
  const getCompletedLinesList = (): CompletedLine[] => {
    if (!board || (board.length !== 25 && board.length !== 49)) return [];
    const boardSize = board.length === 49 ? 7 : 5;
    const completedList: CompletedLine[] = [];

    // Rows
    for (let r = 0; r < boardSize; r++) {
      const rowIndices: number[] = [];
      for (let c = 0; c < boardSize; c++) {
        rowIndices.push(r * boardSize + c);
      }
      if (rowIndices.every(idx => markedIndices.includes(idx))) {
        const completionIndex = Math.max(...rowIndices.map(idx => markedIndices.indexOf(idx)));
        completedList.push({ id: `row-${r}`, type: 'row', index: r, completionIndex });
      }
    }

    // Columns
    for (let c = 0; c < boardSize; c++) {
      const colIndices: number[] = [];
      for (let r = 0; r < boardSize; r++) {
        colIndices.push(r * boardSize + c);
      }
      if (colIndices.every(idx => markedIndices.includes(idx))) {
        const completionIndex = Math.max(...colIndices.map(idx => markedIndices.indexOf(idx)));
        completedList.push({ id: `col-${c}`, type: 'col', index: c, completionIndex });
      }
    }

    // Main Diagonal (top-left to bottom-right)
    const diag1Indices: number[] = [];
    for (let i = 0; i < boardSize; i++) {
      diag1Indices.push(i * boardSize + i);
    }
    if (diag1Indices.every(idx => markedIndices.includes(idx))) {
      const completionIndex = Math.max(...diag1Indices.map(idx => markedIndices.indexOf(idx)));
      completedList.push({ id: 'diag-0', type: 'diag', index: 0, completionIndex });
    }

    // Anti Diagonal (top-right to bottom-left)
    const diag2Indices: number[] = [];
    for (let i = 0; i < boardSize; i++) {
      diag2Indices.push(i * boardSize + (boardSize - 1 - i));
    }
    if (diag2Indices.every(idx => markedIndices.includes(idx))) {
      const completionIndex = Math.max(...diag2Indices.map(idx => markedIndices.indexOf(idx)));
      completedList.push({ id: 'diag-1', type: 'diag', index: 1, completionIndex });
    }

    // Sort chronologically by their final mark step index
    return completedList.sort((a, b) => a.completionIndex - b.completionIndex);
  };

  const completedLines = getCompletedLinesList();

  return (
    <div id="bingo-board-wrapper" className="w-full max-w-lg mx-auto space-y-4 font-sans">
      {/* Letters Header */}
      <div className={`grid gap-2 text-center select-none px-2 ${
        board.length === 49 ? 'grid-cols-7' : 'grid-cols-5'
      }`}>
        {headerLetters.map((char, index) => {
          const isCrossed = completedLines.length > index;
          return (
            <div
              key={index}
              className={`relative flex items-center justify-center p-1 sm:p-2 rounded-xl border transition-all duration-300 ${
                isCrossed 
                  ? 'bg-rose-500/5 border-rose-500/20 dark:border-rose-500/10' 
                  : 'bg-zinc-100/60 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80'
              }`}
            >
              <div
                className={`text-xl sm:text-2xl font-black tracking-wider transition-all duration-300 ${
                  isCrossed
                    ? 'line-through text-rose-500/30 opacity-30 scale-90'
                    : 'bg-gradient-to-b from-indigo-500 to-purple-600 bg-clip-text text-transparent'
                }`}
              >
                {char}
              </div>
              {isCrossed && (
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <span className="text-xs sm:text-sm font-black text-rose-500 drop-shadow-[0_1px_2px_rgba(244,63,94,0.1)]">❌</span>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dynamic Board Grid */}
      <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 sm:p-4 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl aspect-square w-full">
        <div className={`grid gap-2 h-full w-full relative ${
          board.length === 49 ? 'grid-cols-7' : 'grid-cols-5'
        }`}>
          {board.map((item, idx) => {
            const isMarked = markedIndices.includes(idx);
            const isCalled = calledItems.includes(item);
            
            // Highlight cells that can be selected right now because it is my turn
            const isSelectable = !isMarked && isMyTurn && gameStarted && !gameOver && !isSpectator;

            return (
              <motion.button
                key={idx}
                id={`board-cell-${idx}`}
                onClick={() => handleCellClick(idx, item)}
                disabled={isSpectator || !gameStarted || gameOver || isMarked || (!isMyTurn && !isMarked)}
                whileHover={isSelectable ? { scale: 1.05, y: -2 } : {}}
                whileTap={isSelectable ? { scale: 0.95 } : {}}
                className={`relative flex flex-col items-center justify-center p-1 rounded-2xl border text-center font-extrabold text-sm sm:text-base leading-none transition-all duration-300 aspect-square select-none overflow-hidden ${
                  isMarked
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 border-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : isSelectable
                    ? 'bg-white dark:bg-zinc-950 border-indigo-300 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer ring-1 ring-indigo-500/10'
                    : 'bg-zinc-100/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                }`}
                style={{ contentVisibility: 'auto' }}
              >
                {/* Visual stamp dauber circle overlay */}
                {isMarked && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.35 }}
                    className="absolute inset-2.5 rounded-full bg-white pointer-events-none"
                  />
                )}

                <span className="select-none z-10 font-black">
                  {item}
                </span>

                {/* Turn indication visual helper badge */}
                {isSelectable && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                )}
              </motion.button>
            );
          })}

          {/* Visual Completed Lines Overlay */}
          {completedLines.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100">
              <defs>
                <filter id="mild-blur" filterUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                  <feGaussianBlur stdDeviation="1.0" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {completedLines.map((line) => {
                let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
                const boardSize = board.length === 49 ? 7 : 5;

                if (line.type === 'row') {
                  const y = ((line.index + 0.5) / boardSize) * 100;
                  x1 = 4;
                  y1 = y;
                  x2 = 96;
                  y2 = y;
                } else if (line.type === 'col') {
                  const x = ((line.index + 0.5) / boardSize) * 100;
                  x1 = x;
                  y1 = 4;
                  x2 = x;
                  y2 = 96;
                } else if (line.type === 'diag') {
                  if (line.index === 0) {
                    x1 = 6;
                    y1 = 6;
                    x2 = 94;
                    y2 = 94;
                  } else {
                    x1 = 94;
                    y1 = 6;
                    x2 = 6;
                    y2 = 94;
                  }
                }

                return (
                  <g key={line.id}>
                    {/* Uniform, elegant semi-transparent indigo-purple line with a mild blur */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="currentColor"
                      strokeOpacity="0.6"
                      className="text-indigo-500 dark:text-indigo-400"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      filter="url(#mild-blur)"
                    />
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Turn indicator bar beneath the board */}
      {gameStarted && !gameOver && (
        <div className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all ${
          isMyTurn 
            ? 'bg-indigo-500/10 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 shadow-md shadow-indigo-500/5' 
            : 'bg-zinc-100 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-500'
        }`}>
          {isMyTurn ? (
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
              <span>👉 Your Turn! Tap any number on your board to mark it.</span>
            </div>
          ) : (
            <span>⌛ Opponent's Turn ({turnPlayerName || 'Opponent'} is thinking...)</span>
          )}
        </div>
      )}
    </div>
  );
}
