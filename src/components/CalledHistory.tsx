import { motion, AnimatePresence } from 'motion/react';
import { History, Award, Play } from 'lucide-react';

interface CalledHistoryProps {
  calledItemsHistory: { item: string; calledAt: number }[];
  gameStarted: boolean;
  gameOver: boolean;
  winnerName: string | null;
}

export default function CalledHistory({ calledItemsHistory, gameStarted, gameOver, winnerName }: CalledHistoryProps) {
  const latestCall = calledItemsHistory[0];
  const remainingCalls = calledItemsHistory.slice(1);

  return (
    <div id="called-history-container" className="space-y-4 font-sans">
      {/* Latest Selected Number (3D Glassmorphic Container) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Abstract background graphics */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl -translate-x-12 -translate-y-12" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-2xl translate-x-12 translate-y-12" />

        {gameOver && winnerName ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-3 z-10">
            <motion.div
              initial={{ scale: 0.5, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30 text-amber-500"
            >
              <Award className="w-8 h-8 animate-bounce" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">MATCH OVER</h3>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">
                🏆 {winnerName === 'Draw Match' ? 'It is a DRAW!' : `${winnerName} won the match!`}
              </p>
            </div>
          </div>
        ) : !gameStarted ? (
          <div className="py-8 text-zinc-400 dark:text-zinc-500 font-medium z-10 text-sm">
            Waiting for Host to start the match...
          </div>
        ) : !latestCall ? (
          <div className="py-8 text-zinc-400 dark:text-zinc-500 font-medium z-10 text-sm flex flex-col items-center gap-2">
            <Play className="w-5 h-5 text-indigo-400 animate-pulse" />
            Match started! Waiting for the first turn...
          </div>
        ) : (
          <div className="w-full z-10 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
              Last Number Chosen:
            </span>

            <AnimatePresence mode="wait">
              <motion.div
                key={latestCall.item}
                initial={{ scale: 0.3, rotate: -45, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 15 } }}
                exit={{ scale: 1.5, opacity: 0, transition: { duration: 0.15 } }}
                className="flex flex-col items-center justify-center py-2"
              >
                {/* 3D simulated ball */}
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xl flex flex-col items-center justify-center p-3 border-4 border-white/25 relative">
                  <div className="absolute top-1.5 w-1/2 h-4 bg-white/20 rounded-full blur-[1px]" />
                  <span className="text-xs font-bold font-mono tracking-widest opacity-80 mb-1">NUMBER</span>
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                    {latestCall.item}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Selected Numbers History list */}
      {gameStarted && calledItemsHistory.length > 1 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xl space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Selected Numbers ({remainingCalls.length})
          </h3>

          <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
            <AnimatePresence>
              {remainingCalls.map((historyCall, idx) => (
                <motion.div
                  key={historyCall.item}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-2.5 py-1 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg flex items-center gap-1.5"
                >
                  <span className="text-[9px] font-mono font-bold text-zinc-400">
                    #{calledItemsHistory.length - 1 - idx}
                  </span>
                  <span>{historyCall.item}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
