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

  // Grid Header columns (B I N G O)
  const headerLetters = ['B', 'I', 'N', 'G', 'O'];

  return (
    <div id="bingo-board-wrapper" className="w-full max-w-lg mx-auto space-y-4 font-sans">
      {/* Letters Header */}
      <div className="grid grid-cols-5 gap-2 text-center select-none px-2">
        {headerLetters.map((char, index) => (
          <div
            key={index}
            className="text-2xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-b from-indigo-500 to-purple-600 bg-clip-text text-transparent"
          >
            {char}
          </div>
        ))}
      </div>

      {/* 5x5 Board Grid */}
      <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 sm:p-4 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl aspect-square w-full">
        <div className="grid grid-cols-5 gap-2 h-full w-full">
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
