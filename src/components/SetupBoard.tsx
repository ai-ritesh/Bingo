import { useState, useEffect } from 'react';
import { Sparkles, Play, Check, Shuffle, RefreshCw } from 'lucide-react';

interface SetupBoardProps {
  onSaveSetup: (items: string[], freeSpaceEnabled: boolean) => void;
  onStartGame?: () => void;
  gameStarted: boolean;
  hasSavedSetup: boolean;
  initialItems?: string[];
  initialFreeSpaceEnabled?: boolean;
  isHost?: boolean;
}

const DEFAULT_1_TO_25 = Array.from({ length: 25 }, (_, i) => String(i + 1));

function checkIsValid1To25(arr: string[]): boolean {
  const set = new Set(arr.map(x => x.trim()));
  if (set.size !== 25) return false;
  for (let i = 1; i <= 25; i++) {
    if (!set.has(String(i))) return false;
  }
  return true;
}

export default function SetupBoard({
  onSaveSetup,
  onStartGame,
  gameStarted,
  hasSavedSetup,
  initialItems,
  isHost = true,
}: SetupBoardProps) {
  const [items, setItems] = useState<string[]>(() => {
    if (initialItems && initialItems.length === 25) {
      // Check if they are valid, else return sorted 1 to 25
      return [...initialItems];
    }
    // Default to shuffled 1-25
    const list = [...DEFAULT_1_TO_25];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  });

  const handleItemChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index] = val.trim();
    setItems(updated);
  };

  const handleShuffle = () => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setItems(shuffled);
  };

  const handleResetOrdered = () => {
    setItems([...DEFAULT_1_TO_25]);
  };

  const isValid = checkIsValid1To25(items);

  const handleSave = () => {
    if (!isValid) {
      alert("Your board is invalid! It must contain all numbers from 1 to 25 exactly once. Click Shuffle or Reset to fix.");
      return;
    }
    onSaveSetup(items, false);
  };

  return (
    <div id="setup-board-container" className="w-full space-y-6 font-sans">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              Arrange Your 1–25 Bingo Board
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Place numbers 1 through 25 on your board. Click shuffle to randomise or edit them manually.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="reset-items-btn"
              onClick={handleResetOrdered}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 px-3 py-1.5 rounded-lg cursor-pointer transition-all border border-zinc-200 dark:border-zinc-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset 1-25
            </button>
            <button
              id="shuffle-items-btn"
              onClick={handleShuffle}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-md shadow-indigo-600/10"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Shuffle Board
            </button>
          </div>
        </div>

        {/* Validation indicator */}
        <div className="my-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all duration-300">
          {isValid ? (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Board status: Valid 5×5 arrangement (all numbers 1–25 are present exactly once).</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-bounce"></span>
              <span>Board status: Invalid. Please click Shuffle or edit cells to ensure numbers 1–25 are set exactly once.</span>
            </div>
          )}
        </div>

        {/* Real-time Grid Editor Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
              <span>Cell values list</span>
              <span className="text-[10px] text-zinc-400 font-normal normal-case">(type 1-25 in the boxes below)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-2">
              {items.map((item, idx) => {
                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-zinc-400 w-4 shrink-0 text-right">{idx + 1}.</span>
                    <input
                      id={`setup-item-input-${idx}`}
                      type="text"
                      maxLength={2}
                      value={item}
                      onChange={(e) => handleItemChange(idx, e.target.value)}
                      placeholder={String(idx + 1)}
                      className="w-full px-2 py-1 text-xs font-bold text-center border rounded-lg focus:outline-none transition-all bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-1.5 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 text-center lg:text-left">
                Your Board Preview (5×5)
              </h3>
              
              <div className="grid grid-cols-5 gap-1.5 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 aspect-square w-full max-w-[280px] mx-auto lg:mx-0 shadow-inner">
                {items.map((item, idx) => {
                  const numValue = parseInt(item.trim(), 10);
                  const cellIsValid = !isNaN(numValue) && numValue >= 1 && numValue <= 25;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col items-center justify-center p-1 rounded-xl border text-center select-none text-xs leading-none font-extrabold aspect-square shadow-sm transition-all duration-300 ${
                        cellIsValid
                          ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-indigo-700 dark:text-indigo-400'
                          : 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900 text-rose-500'
                      }`}
                    >
                      {item || '?'}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6 lg:mt-0">
              <button
                id="save-board-setup-btn"
                onClick={handleSave}
                disabled={!isValid}
                className={`w-full py-3 px-4 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !isValid
                    ? 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
                    : hasSavedSetup
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/15'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15'
                }`}
              >
                <Check className="w-4 h-4" />
                {hasSavedSetup ? 'Your Board Setup is Saved!' : 'Confirm & Save My Board Setup'}
              </button>

              {isHost && (
                <button
                  id="start-bingo-game-btn"
                  disabled={!hasSavedSetup}
                  onClick={onStartGame}
                  className={`w-full py-3 px-4 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    hasSavedSetup
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/15'
                      : 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  Start Bingo Game
                </button>
              )}
              {!hasSavedSetup && (
                <p className="text-[10px] text-zinc-400 text-center font-medium">
                  {isHost 
                    ? '* Save board setup to enable the start game button' 
                    : '* Click save to declare your board arrangement to the room'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
