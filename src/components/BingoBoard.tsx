import { motion } from 'motion/react';
import { Star } from 'lucide-react';

interface BingoBoardProps {
  board: string[];
  markedIndices: number[];
  calledItems: string[];
  freeSpaceEnabled: boolean;
  onMarkCell: (index: number, isMarked: boolean) => void;
  isSpectator: boolean;
  gameStarted: boolean;
  gameOver: boolean;
}

export default function BingoBoard({
  board,
  markedIndices,
  calledItems,
  freeSpaceEnabled,
  onMarkCell,
  isSpectator,
  gameStarted,
  gameOver
}: BingoBoardProps) {
  
  if (!board || board.length === 0) {
    return (
      <div id="no-board" className="flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl min-h-[300px]">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium text-center">
          Waiting for the game to start to generate your randomized board...
        </p>
      </div>
    );
  }

  const handleCellClick = (idx: number) => {
    if (isSpectator) return;
    if (!gameStarted || gameOver) return;

    const isCenter = idx === 12;
    if (isCenter && freeSpaceEnabled) return; // Free space is locked marked

    const isAlreadyMarked = markedIndices.includes(idx);
    onMarkCell(idx, !isAlreadyMarked);
  };

  // Grid Header columns (B I N G O)
  const headerLetters = ['B', 'I', 'N', 'G', 'O'];

  return (
    <div id="bingo-board-wrapper" className="w-full max-w-lg mx-auto space-y-4">
      {/* Letters Header */}
      <div className="grid grid-cols-5 gap-2 text-center select-none px-2">
        {headerLetters.map((char, index) => (
          <div
            key={index}
            className="text-2xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-b from-indigo-500 to-purple-600 bg-clip-text text-transparent font-sans"
          >
            {char}
          </div>
        ))}
      </div>

      {/* 5x5 Board Grid */}
      <div className="bg-zinc-100 dark:bg-zinc-950 p-2 sm:p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 shadow-xl aspect-square w-full">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 h-full w-full">
          {board.map((item, idx) => {
            const isCenter = idx === 12;
            const isFree = isCenter && freeSpaceEnabled;
            const isMarked = markedIndices.includes(idx) || isFree;
            const isCalled = calledItems.includes(item);
            
            // Highlight cells that are CALLED but NOT marked yet (Alert player to mark!)
            const shouldAlertMark = isCalled && !isMarked && !isSpectator && !gameOver;

            return (
              <motion.button
                key={idx}
                id={`board-cell-${idx}`}
                onClick={() => handleCellClick(idx)}
                disabled={isSpectator || !gameStarted || gameOver || isFree}
                whileHover={(!isSpectator && gameStarted && !gameOver) ? { scale: 1.03 } : {}}
                whileTap={(!isSpectator && gameStarted && !gameOver) ? { scale: 0.97 } : {}}
                className={`relative flex flex-col items-center justify-center p-1 rounded-xl border text-center font-semibold text-[10px] sm:text-xs leading-tight transition-all duration-300 aspect-square select-none overflow-hidden ${
                  isFree
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-800 dark:text-amber-300 font-extrabold shadow-amber-500/5 shadow-inner'
                    : isMarked
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : shouldAlertMark
                    ? 'bg-amber-50 border-amber-400 dark:bg-amber-950/20 dark:border-amber-500/60 text-zinc-900 dark:text-zinc-50 border-dashed animate-pulse ring-2 ring-amber-500/30'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
                style={{ contentVisibility: 'auto' }}
              >
                {/* Visual stamp / dauber circle overlay */}
                {isMarked && !isFree && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.25 }}
                    className="absolute inset-2 rounded-full bg-white pointer-events-none"
                  />
                )}

                {isFree ? (
                  <div className="flex flex-col items-center justify-center space-y-0.5">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                    <span className="text-[9px] font-extrabold tracking-widest text-amber-600 dark:text-amber-400">FREE</span>
                  </div>
                ) : (
                  <span className="break-words line-clamp-3 p-0.5 select-none font-medium sm:font-semibold">
                    {item}
                  </span>
                )}

                {/* Corner Badge for Called State if not marked */}
                {isCalled && !isMarked && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
