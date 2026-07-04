import { useState } from 'react';
import { Sparkles, Play, Check, Shuffle, HelpCircle } from 'lucide-react';

interface SetupBoardProps {
  onSaveSetup: (items: string[], freeSpaceEnabled: boolean) => void;
  onStartGame?: () => void;
  gameStarted: boolean;
  hasSavedSetup: boolean;
  initialItems?: string[];
  initialFreeSpaceEnabled?: boolean;
  isHost?: boolean;
}

const PRESETS = {
  office: {
    name: '👔 Office & Buzzwords',
    items: [
      'Circle Back', 'Synergy', 'Deep Dive', 'Bandwidth', 'ASAP',
      'Action Item', 'Alignment', 'Pivot', 'Win-Win', 'Deliverable',
      'Touch Base', 'Next Steps', 'Brainstorm', 'Low Hanging Fruit', 'Value Add',
      'Out of Office', 'KPI', 'Standup Meeting', 'KPIs', 'Buy-in',
      'Work-Life Balance', 'Zoom Mute', 'Ping Me', 'On My Radar', 'Feedback Loop'
    ]
  },
  emojis: {
    name: '🎉 Fun & Emojis',
    items: [
      '🎉 Party', '🚀 Rocket', '🍕 Pizza', '☕ Coffee', '🔥 Fire',
      '📈 Chart Up', '🎯 Target', '🤖 Robot', '🎨 Paint', '🌟 Star',
      '👾 Alien', '🍻 Beers', '🥑 Avocado', '💡 Idea', '🌈 Rainbow',
      '🧩 Puzzle', '⚡ Lightning', '🔮 Crystal Ball', '👑 Crown', '🧠 Brain',
      '🛠️ Tools', '🐱 Cat', '🎵 Music', '💸 Money', '🏆 Trophy'
    ]
  }
};

// Generates 25 random numbers between 1 and 75
function generateNumberPreset(): string[] {
  const nums = new Set<number>();
  while (nums.size < 25) {
    nums.add(Math.floor(Math.random() * 75) + 1);
  }
  return Array.from(nums).sort((a, b) => a - b).map(n => `Number ${n}`);
}

export default function SetupBoard({
  onSaveSetup,
  onStartGame,
  gameStarted,
  hasSavedSetup,
  initialItems,
  initialFreeSpaceEnabled = true,
  isHost = true,
}: SetupBoardProps) {
  const [items, setItems] = useState<string[]>(() => {
    if (initialItems && initialItems.length === 25) {
      return [...initialItems];
    }
    // Default to Emojis Preset
    return [...PRESETS.emojis.items];
  });
  const [freeSpaceEnabled, setFreeSpaceEnabled] = useState(initialFreeSpaceEnabled);
  const [activePreset, setActivePreset] = useState<string>(
    initialItems && JSON.stringify(initialItems) === JSON.stringify(PRESETS.emojis.items) ? 'emojis' : ''
  );

  const handleApplyPreset = (key: string) => {
    setActivePreset(key);
    if (key === 'numbers') {
      setItems(generateNumberPreset());
    } else if (key in PRESETS) {
      setItems([...PRESETS[key as keyof typeof PRESETS].items]);
    }
  };

  const handleItemChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index] = val;
    setItems(updated);
    setActivePreset(''); // Custom editing removes active preset styling
  };

  const handleShuffle = () => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setItems(shuffled);
    setActivePreset('');
  };

  const handleSave = () => {
    // Validate inputs
    const validated = items.map((it, idx) => {
      const trim = it.trim();
      if (idx === 12 && freeSpaceEnabled) {
        return trim || 'FREE SPACE';
      }
      return trim || `Tile ${idx + 1}`;
    });
    onSaveSetup(validated, freeSpaceEnabled);
  };

  return (
    <div id="setup-board-container" className="w-full space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              Configure Bingo Board Items
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Provide exactly 25 custom words, numbers, or emojis. Each player can save their own layout.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              id="preset-emojis"
              onClick={() => handleApplyPreset('emojis')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                activePreset === 'emojis'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300'
                  : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              🎉 Emojis
            </button>
            <button
              id="preset-office"
              onClick={() => handleApplyPreset('office')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                activePreset === 'office'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300'
                  : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              👔 Office
            </button>
            <button
              id="preset-numbers"
              onClick={() => handleApplyPreset('numbers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                activePreset === 'numbers'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300'
                  : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              🔢 Numbers
            </button>
          </div>
        </div>

        {/* Free space setting */}
        <div className="flex items-center justify-between py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <input
              id="free-space-checkbox"
              type="checkbox"
              checked={freeSpaceEnabled}
              onChange={(e) => setFreeSpaceEnabled(e.target.checked)}
              className="w-4.5 h-4.5 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
            />
            <label htmlFor="free-space-checkbox" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer select-none">
              Enable Free Space Center Cell
            </label>
          </div>

          <button
            id="shuffle-items-btn"
            onClick={handleShuffle}
            className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Shuffle Items
          </button>
        </div>

        {/* Real-time Grid Editor Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1">
              <span>List View</span>
              <span className="text-zinc-400 font-normal normal-case">(Type in cells to customize)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-2">
              {items.map((item, idx) => {
                const isCenter = idx === 12;
                const isFree = isCenter && freeSpaceEnabled;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400 w-5 shrink-0 text-right">{idx + 1}.</span>
                    <input
                      id={`setup-item-input-${idx}`}
                      type="text"
                      disabled={isFree}
                      value={isFree ? '★ FREE SPACE ★' : item}
                      onChange={(e) => handleItemChange(idx, e.target.value)}
                      placeholder={`Item ${idx + 1}`}
                      className={`flex-1 px-3 py-1.5 text-xs font-medium border rounded-lg focus:outline-none transition-all ${
                        isFree
                          ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300 font-bold'
                          : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                Live 5×5 Grid Visualizer
              </h3>
              
              <div className="grid grid-cols-5 gap-1.5 bg-zinc-100 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 aspect-square w-full max-w-[340px] mx-auto lg:mx-0">
                {items.map((item, idx) => {
                  const isCenter = idx === 12;
                  const isFree = isCenter && freeSpaceEnabled;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col items-center justify-center p-1 rounded-lg border text-center select-none overflow-hidden text-[10px] leading-tight font-medium aspect-square shadow-sm ${
                        isFree
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {isFree ? (
                        <>
                          <span className="text-amber-500 text-sm">★</span>
                          <span className="scale-90 font-bold tracking-wider">FREE</span>
                        </>
                      ) : (
                        <span className="line-clamp-2 break-words p-0.5">{item || `Tile ${idx + 1}`}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6 lg:mt-0">
              <button
                id="save-board-setup-btn"
                onClick={handleSave}
                className={`w-full py-3 px-4 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  hasSavedSetup
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10'
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
                  <Play className="w-4 h-4 animate-pulse-subtle" />
                  Start Bingo Game
                </button>
              )}
              {!hasSavedSetup && (
                <p className="text-[10px] text-zinc-400 text-center font-medium">
                  {isHost 
                    ? '* Must save your board configuration before starting the game' 
                    : '* Click save to confirm your board configuration'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
