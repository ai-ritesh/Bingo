import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Check, Shuffle, Trash2, Edit2 } from 'lucide-react';

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

const ALPHABET_POOL = [
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)), // A-Z
  ...Array.from({ length: 23 }, (_, i) => String(i + 1)) // 1-23
];

function checkIsValid1To25(arr: string[]): boolean {
  if (arr.length !== 25) return false;
  const set = new Set(arr.map(x => x.trim()));
  if (set.size !== 25) return false;
  for (let i = 1; i <= 25; i++) {
    if (!set.has(String(i))) return false;
  }
  return true;
}

function checkIsValidAlphabet(arr: string[]): boolean {
  if (arr.length !== 49) return false;
  const set = new Set(arr.map(x => x.trim()));
  if (set.size !== 49) return false;
  const poolSet = new Set(ALPHABET_POOL);
  for (const item of set) {
    if (!poolSet.has(item)) return false;
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
  const [mode, setMode] = useState<'standard' | 'bubbles' | 'alphabet'>('standard');
  const [items, setItems] = useState<string[]>(() => {
    if (initialItems && initialItems.length === 49 && checkIsValidAlphabet(initialItems)) {
      return [...initialItems];
    }
    if (initialItems && initialItems.length === 25 && checkIsValid1To25(initialItems)) {
      return [...initialItems];
    }
    // Default standard board pre-filled with 1-25 shuffled
    const list = [...DEFAULT_1_TO_25];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  });

  const [selectedSwapIdx, setSelectedSwapIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep mode in sync with incoming initialItems
  useEffect(() => {
    if (initialItems && initialItems.length === 49) {
      setMode('alphabet');
    } else if (initialItems && initialItems.length === 25) {
      // default is standard
    }
  }, [initialItems]);

  // Auto-focus input when a cell enters edit mode
  useEffect(() => {
    if (editingIdx !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingIdx]);

  const handleItemChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index] = val.trim();
    setItems(updated);
  };

  const handleShuffle = () => {
    if (mode === 'alphabet') {
      const shuffled = [...ALPHABET_POOL];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setItems(shuffled);
    } else {
      const shuffled = [...DEFAULT_1_TO_25];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setItems(shuffled);
    }
    setSelectedSwapIdx(null);
    setEditingIdx(null);
  };

  const handleClear = () => {
    if (mode === 'alphabet') {
      setItems(Array(49).fill(''));
    } else {
      setItems(Array(25).fill(''));
    }
    setSelectedSwapIdx(null);
    setEditingIdx(null);
  };

  // Switch modes safely
  const handleModeChange = (newMode: 'standard' | 'bubbles' | 'alphabet') => {
    setMode(newMode);
    setSelectedSwapIdx(null);
    setEditingIdx(null);
    if (newMode === 'alphabet') {
      setItems(Array(49).fill(''));
    } else if (newMode === 'bubbles') {
      setItems(Array(25).fill(''));
    } else {
      const list = [...DEFAULT_1_TO_25];
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      setItems(list);
    }
  };

  // Find the smallest missing item sequentially
  const getNextAvailableItem = (): string => {
    if (mode === 'alphabet') {
      const present = new Set(items.map(x => x.trim()));
      for (const item of ALPHABET_POOL) {
        if (!present.has(item)) {
          return item;
        }
      }
      return '';
    } else {
      const presentNumbers = new Set(
        items.map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n))
      );
      let nextNum = 1;
      while (nextNum <= 25 && presentNumbers.has(nextNum)) {
        nextNum++;
      }
      return String(nextNum);
    }
  };

  // Click handler: supports swap in standard mode, and placing/clearing in bubbles/alphabet modes
  const handleCellClick = (idx: number) => {
    if (editingIdx !== null) return; // block clicks during inline edit

    if (mode === 'bubbles' || mode === 'alphabet') {
      const currentVal = items[idx]?.trim();
      if (currentVal !== '') {
        const updated = [...items];
        updated[idx] = '';
        setItems(updated);
      } else {
        const nextItem = getNextAvailableItem();
        if (nextItem !== '') {
          const updated = [...items];
          updated[idx] = nextItem;
          setItems(updated);
        }
      }
    } else {
      // Standard swap mode
      if (selectedSwapIdx === idx) {
        setSelectedSwapIdx(null);
        return;
      }

      if (selectedSwapIdx !== null) {
        // Swap them!
        const updated = [...items];
        const temp = updated[selectedSwapIdx];
        updated[selectedSwapIdx] = updated[idx];
        updated[idx] = temp;
        setItems(updated);
        setSelectedSwapIdx(null);
      } else {
        // Select cell for swap
        setSelectedSwapIdx(idx);
      }
    }
  };

  const handleCellDoubleClick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (mode === 'alphabet') return; // strictly disabled for Alphabetical 7x7 mode
    setSelectedSwapIdx(null);
    setEditingIdx(idx);
  };

  const isValid = mode === 'alphabet' ? checkIsValidAlphabet(items) : checkIsValid1To25(items);
  const totalSlotsCount = mode === 'alphabet' ? 49 : 25;
  const placedCount = items.filter(x => x.trim() !== '').length;
  const nextNumToPlace = getNextAvailableItem();

  const handleSave = () => {
    if (!isValid) {
      if (mode === 'alphabet') {
        alert("Please ensure your board contains all letters A-Z and numbers 1-23 exactly once before saving.");
      } else {
        alert("Please ensure your board contains all numbers from 1 to 25 exactly once before saving.");
      }
      return;
    }
    onSaveSetup(items, false);
  };

  return (
    <div id="setup-board-container" className="w-full space-y-6 font-sans">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              Arrange Your Bingo Board
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {mode === 'alphabet'
                ? 'Alphabetical 7x7: Click empty cells to place A-Z & 1-23 sequentially, click filled cells to clear.'
                : mode === 'bubbles' 
                ? 'Bubbles Mode: Click empty cells to place numbers 1-25 sequentially, click filled cells to clear.'
                : 'Standard Mode: Click cells to swap their positions, double click to edit numbers directly.'}
            </p>
          </div>

          {/* Controls toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mode selection toggle pill */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80">
              <button
                id="mode-standard-btn"
                type="button"
                onClick={() => handleModeChange('standard')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  mode === 'standard'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Standard
              </button>
              <button
                id="mode-bubbles-btn"
                type="button"
                onClick={() => handleModeChange('bubbles')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  mode === 'bubbles'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Bubbles Mode
              </button>
              <button
                id="mode-alphabet-btn"
                type="button"
                onClick={() => handleModeChange('alphabet')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  mode === 'alphabet'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Alphabetical 7x7
              </button>
            </div>

            {(mode === 'bubbles' || mode === 'alphabet') && (
              <button
                id="clear-items-btn"
                onClick={handleClear}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 px-3 py-1.5 rounded-lg cursor-pointer transition-all border border-rose-200/50 dark:border-rose-900/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}

            {/* Shuffle button - can be used always or when all positions filled */}
            <button
              id="shuffle-items-btn"
              onClick={handleShuffle}
              className="flex items-center gap-1.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg cursor-pointer transition-all shadow-md shadow-indigo-600/10"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Shuffle
            </button>
          </div>
        </div>

        {/* Dynamic Status Bar */}
        <div className="my-5 p-4 rounded-xl text-xs font-semibold border transition-all duration-300 bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200/80 dark:border-zinc-800">
          {isValid ? (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Perfect! Your board has all required values. Press save below!</span>
            </div>
          ) : mode === 'bubbles' || mode === 'alphabet' ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <span>
                  Placed: <strong className="text-zinc-950 dark:text-white font-black">{placedCount} / {totalSlotsCount}</strong>. Next click places: <strong className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 text-[11px] font-black">{nextNumToPlace || 'Done'}</strong>
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                * Click placed item to clear it {mode !== 'alphabet' && '| Double click to edit directly'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Board is missing some numbers. Shuffling or editing will help fix.</span>
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                * Click a cell to select, then click another to swap | Double click to edit directly
              </span>
            </div>
          )}
        </div>

        {/* Real-time Grid Editor Visualizer */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Main Interactive Board Editor Grid */}
          <div className="md:col-span-8 flex justify-center">
            <div className={`w-full ${mode === 'alphabet' ? 'max-w-[460px]' : 'max-w-[340px]'} space-y-4`}>
              <div className={`grid bg-zinc-50 dark:bg-zinc-950 p-4 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 aspect-square w-full shadow-inner relative ${
                mode === 'alphabet' ? 'grid-cols-7 gap-1.5' : 'grid-cols-5 gap-2.5'
              }`}>
                {items.map((item, idx) => {
                  const hasValue = item.trim() !== '';
                  const isEditing = editingIdx === idx;
                  const isSelectedForSwap = selectedSwapIdx === idx;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleCellClick(idx)}
                      onDoubleClick={(e) => handleCellDoubleClick(e, idx)}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border text-center select-none leading-none font-black aspect-square shadow-sm transition-all duration-300 cursor-pointer overflow-hidden ${
                        isEditing
                          ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 text-base'
                          : isSelectedForSwap
                          ? 'bg-indigo-100 border-indigo-500 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 ring-2 ring-indigo-500/30 text-base'
                          : hasValue
                          ? mode === 'alphabet'
                            ? 'bg-gradient-to-tr from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-indigo-500 hover:border-indigo-600 text-white shadow-lg shadow-indigo-600/10 text-xs sm:text-sm md:text-base'
                            : mode === 'bubbles'
                            ? 'bg-gradient-to-tr from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 border-indigo-500 hover:border-indigo-600 text-white shadow-lg shadow-indigo-600/10 text-base sm:text-lg'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-indigo-700 dark:text-indigo-400 hover:border-indigo-400 hover:shadow-md text-base sm:text-lg'
                          : 'bg-white hover:bg-indigo-50/20 dark:bg-zinc-900 dark:hover:bg-zinc-850/30 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-400 border-dashed hover:scale-105'
                      }`}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          maxLength={2}
                          value={item}
                          onClick={(e) => e.stopPropagation()} // stop click bubbling
                          onChange={(e) => handleItemChange(idx, e.target.value)}
                          onBlur={() => setEditingIdx(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingIdx(null);
                          }}
                          className="w-full h-full text-center font-black text-sm sm:text-base border-none outline-none focus:ring-0 bg-transparent text-indigo-800 dark:text-indigo-200"
                        />
                      ) : (
                        <>
                          {hasValue ? (
                            <span className="z-10">{item}</span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 group-hover:bg-indigo-400 animate-pulse" />
                          )}

                          {/* Double-click edit hint icon on hover (only when not editing and not alphabetical) */}
                          {mode !== 'alphabet' && (
                            <div className="absolute top-1 left-1 opacity-0 hover:opacity-75 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <Edit2 className="w-2.5 h-2.5 text-indigo-500/50" />
                            </div>
                          )}

                          {/* Display bubble position indicator helper */}
                          <span className={`absolute bottom-1 right-1.5 text-[8px] font-mono select-none ${
                            hasValue && (mode === 'bubbles' || mode === 'alphabet') ? 'text-white/60' : 'text-zinc-400/40'
                          }`}>
                            #{idx + 1}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action sidebar controls */}
          <div className="md:col-span-4 flex flex-col justify-end space-y-6">
            <div className="flex flex-col gap-3">
              <button
                id="save-board-setup-btn"
                onClick={handleSave}
                disabled={!isValid}
                className={`w-full py-3 px-4 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !isValid
                    ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-850 dark:text-zinc-600 cursor-not-allowed border border-zinc-200 dark:border-zinc-800'
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
                      : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-850 dark:text-zinc-600 cursor-not-allowed border border-zinc-200 dark:border-zinc-800'
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
