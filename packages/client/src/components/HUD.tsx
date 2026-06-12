import React from "react";
import { SPELLBOOK, SpellId } from "shared";

interface HUDProps {
  playerHP: number;
  playerMana: number;
  playerShield: number;
  playerSilenced: boolean;
  playerSlots: { spellId: string; accuracy: number; filled: boolean; speedBonus?: boolean }[];
  opponentHP: number;
  opponentMana: number;
  opponentShield: number;
  opponentSilenced: boolean;
  opponentSlots: { spellId: string; accuracy: number; filled: boolean }[];
  timeRemaining: number;
  onCastPress: () => void;
  castRaceWinner?: string;
  mySessionId: string;
  opponentSessionId: string;
}

export const HUD: React.FC<HUDProps> = ({
  playerHP,
  playerMana,
  playerShield,
  playerSilenced,
  playerSlots,
  opponentHP,
  opponentMana,
  opponentShield,
  opponentSilenced,
  opponentSlots,
  timeRemaining,
  onCastPress,
  castRaceWinner,
  mySessionId,
  opponentSessionId
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSpellIcon = (spellId: string) => {
    const spell = SPELLBOOK[spellId as SpellId];
    return spell ? spell.unicodeSymbol : "✨";
  };

  const getSpellName = (spellId: string) => {
    const spell = SPELLBOOK[spellId as SpellId];
    return spell ? spell.name : "Unknown";
  };

  const hasFilledSlots = playerSlots.some(s => s.filled);

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto gap-4 select-none">
      {/* 1. Opponent HUD */}
      <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-xl p-3 backdrop-blur-md shadow-lg">
        <div className="flex flex-col gap-1 w-full max-w-md">
          <div className="flex justify-between text-xs text-slate-400 font-semibold">
            <span>OPPONENT {opponentSilenced && <span className="text-red-400 font-bold ml-2">SILENCED</span>}</span>
            <span>{Math.round(opponentHP)} / 100 HP {opponentShield > 0 && <span className="text-cyan-400 font-bold ml-1">(+{Math.round(opponentShield)} Shield)</span>}</span>
          </div>
          {/* HP Bar */}
          <div className="w-full h-4 bg-slate-950 border border-slate-800 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-200"
              style={{ width: `${Math.max(0, Math.min(100, opponentHP))}%` }}
            />
            {opponentShield > 0 && (
              <div
                className="absolute top-0 right-0 h-full bg-cyan-400/30 border-l border-cyan-400 transition-all duration-200"
                style={{ width: `${Math.max(0, Math.min(100, opponentShield))}%` }}
              />
            )}
          </div>
          {/* Mana Bar */}
          <div className="flex justify-between text-2xs text-slate-500 font-medium mt-1">
            <span>Mana: {Math.round(opponentMana)} / 100</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-600 transition-all duration-200"
              style={{ width: `${Math.max(0, Math.min(100, opponentMana))}%` }}
            />
          </div>
        </div>

        {/* Opponent Spell Queue */}
        <div className="flex gap-2">
          {opponentSlots.map((slot, i) => (
            <div
              key={i}
              className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg border text-sm font-bold transition-all ${
                slot.filled
                  ? "bg-slate-950/90 border-cyan-500/50 text-cyan-400 shadow-md shadow-cyan-500/10"
                  : "bg-slate-950/20 border-slate-800 text-slate-700"
              }`}
            >
              {slot.filled ? (
                <>
                  <span className="text-lg">{getSpellIcon(slot.spellId)}</span>
                  <span className="text-3xs text-slate-500 font-semibold">{getSpellName(slot.spellId)}</span>
                </>
              ) : (
                <span className="text-slate-800 font-normal">{i + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Match Timer Area */}
      <div className="flex justify-between items-center px-4 py-1">
        <div className="text-slate-400 font-semibold text-xs tracking-wider">
          {castRaceWinner === mySessionId && (
            <span className="text-purple-400 font-bold animate-pulse">SPEED BONUS ACTIVE (+8%)</span>
          )}
          {castRaceWinner === opponentSessionId && (
            <span className="text-amber-400 font-bold animate-pulse">OPPONENT HAS SPEED BONUS</span>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-full px-5 py-2 font-mono text-xl text-yellow-500 font-extrabold shadow-inner flex items-center gap-2">
          <span>⏱</span>
          <span>{formatTime(timeRemaining)}</span>
        </div>
        <div className="w-40" /> {/* Spacer */}
      </div>

      {/* 3. Player HUD */}
      <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-xl p-3 backdrop-blur-md shadow-lg">
        <div className="flex flex-col gap-1 w-full max-w-md">
          <div className="flex justify-between text-xs text-slate-400 font-semibold">
            <span>YOU {playerSilenced && <span className="text-red-500 font-bold ml-2 animate-bounce">SILENCED</span>}</span>
            <span>{Math.round(playerHP)} / 100 HP {playerShield > 0 && <span className="text-purple-400 font-bold ml-1">(+{Math.round(playerShield)} Shield)</span>}</span>
          </div>
          {/* HP Bar */}
          <div className="w-full h-4 bg-slate-950 border border-slate-800 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-green-500 transition-all duration-200"
              style={{ width: `${Math.max(0, Math.min(100, playerHP))}%` }}
            />
            {playerShield > 0 && (
              <div
                className="absolute top-0 right-0 h-full bg-purple-400/30 border-l border-purple-400 transition-all duration-200"
                style={{ width: `${Math.max(0, Math.min(100, playerShield))}%` }}
              />
            )}
          </div>
          {/* Mana Bar */}
          <div className="flex justify-between text-2xs text-slate-500 font-medium mt-1">
            <span>Mana: {Math.round(playerMana)} / 100</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${Math.max(0, Math.min(100, playerMana))}%` }}
            />
          </div>
        </div>

        {/* Player Queue & Cast Button */}
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {playerSlots.map((slot, i) => (
              <div
                key={i}
                className={`w-14 h-14 flex flex-col items-center justify-center rounded-lg border text-sm font-bold relative transition-all ${
                  slot.filled
                    ? "bg-slate-950 border-purple-500 text-purple-400 shadow-md shadow-purple-500/10"
                    : "bg-slate-950/20 border-slate-800 text-slate-700"
                }`}
              >
                {slot.filled ? (
                  <>
                    <span className="text-xl">{getSpellIcon(slot.spellId)}</span>
                    <span className="text-3xs text-slate-500 font-semibold">{getSpellName(slot.spellId)}</span>
                    <span className="absolute bottom-0.5 text-4xs text-purple-400/70 font-semibold">
                      {Math.round(slot.accuracy * 100)}%
                    </span>
                    {slot.speedBonus && (
                      <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white rounded-full text-4xs w-4 h-4 flex items-center justify-center shadow font-black border border-purple-400 animate-pulse">
                        ⚡
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-800 font-normal">{i + 1}</span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={onCastPress}
            disabled={!hasFilledSlots || playerSilenced}
            className={`h-14 px-5 font-bold uppercase rounded-lg border tracking-widest text-xs transition-all ${
              hasFilledSlots && !playerSilenced
                ? "bg-gradient-to-r from-purple-700 to-indigo-700 border-purple-500 text-white hover:from-purple-600 hover:to-indigo-600 active:scale-95 shadow-md shadow-purple-500/20"
                : "bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed"
            }`}
          >
            Cast Spells
          </button>
        </div>
      </div>

      {/* 4. Keyboard Chord Reference Bar */}
      <div className="flex flex-wrap justify-between items-center bg-slate-950/80 border border-slate-900 rounded-lg py-2 px-3 text-3xs text-slate-500 font-medium font-sans">
        <div className="flex gap-4">
          <span className="text-slate-400 font-bold uppercase">Spells:</span>
          <span>[Q] Quyra (Fire)</span>
          <span>[W] Wyra (Water)</span>
          <span>[E] Eldra (Earth)</span>
          <span>[R] Rhael (Air)</span>
        </div>
        <div className="flex gap-4">
          <span className="text-slate-400 font-bold uppercase">Combos:</span>
          <span>Q+W Vael</span>
          <span>Q+E Tharyn</span>
          <span>Q+R Asurel</span>
          <span>W+E Sorveth</span>
          <span>W+R Luneth</span>
          <span>E+R Draeven</span>
        </div>
        <div className="text-purple-400/80 font-semibold">
          [Shift] + Chord = Draw Inverted Sigil (Nullify)
        </div>
      </div>
    </div>
  );
};
