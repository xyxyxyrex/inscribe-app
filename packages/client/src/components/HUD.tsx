import React from "react";
import { SPELLBOOK, GAME } from "shared";
import type { SpellId } from "shared";

interface HUDProps {
  playerHP: number;
  playerMana: number;
  playerShield: number;
  playerSilenced: boolean;
  playerReflecting: boolean;
  playerCursed: boolean;
  playerDraining: boolean;
  playerSlots: { spellId: string; accuracy: number; filled: boolean; speedBonus?: boolean }[];
  playerSelectedSlot: number;
  opponentHP: number;
  opponentMana: number;
  opponentShield: number;
  opponentSilenced: boolean;
  opponentReflecting: boolean;
  opponentCursed: boolean;
  opponentDraining: boolean;
  opponentSlots: { spellId: string; accuracy: number; filled: boolean }[];
  opponentSelectedSlot: number;
  timeRemaining: number;
  onCastPress: () => void;
  castRaceWinner?: string;
  mySessionId: string;
  opponentSessionId: string;
  onSlotClick: (slot: 1 | 2 | 3) => void;
  overtime?: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  playerHP,
  playerMana,
  playerShield,
  playerSilenced,
  playerReflecting,
  playerCursed,
  playerDraining,
  playerSlots,
  playerSelectedSlot,
  opponentHP,
  opponentMana,
  opponentShield,
  opponentSilenced,
  opponentReflecting,
  opponentCursed,
  opponentDraining,
  opponentSlots,
  opponentSelectedSlot,
  timeRemaining,
  onCastPress,
  castRaceWinner,
  mySessionId,
  opponentSessionId,
  onSlotClick,
  overtime = false
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
  const playerFilledCount = playerSlots.filter(s => s.filled).length;
  const opponentFilledCount = opponentSlots.filter(s => s.filled).length;

  const opponentBorderClass = opponentReflecting
    ? "border-cyan-500/50 shadow-lg shadow-cyan-500/20"
    : opponentCursed
    ? "border-rose-600/50 shadow-lg shadow-rose-500/20"
    : opponentDraining
    ? "border-blue-500/50 shadow-lg shadow-blue-500/20"
    : "border-slate-800";

  const playerBorderClass = playerReflecting
    ? "border-cyan-500/50 shadow-lg shadow-cyan-500/20"
    : playerCursed
    ? "border-rose-600/50 shadow-lg shadow-rose-500/20"
    : playerDraining
    ? "border-blue-500/50 shadow-lg shadow-blue-500/20"
    : "border-slate-800";

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto gap-4 select-none">
      {/* 1. Opponent HUD */}
      <div className={`flex justify-between items-center pixel-panel-red p-3 shadow-lg transition-all duration-300 ${opponentBorderClass}`}>
        <div className="flex flex-col gap-1 w-full max-w-md">
          <div className="flex justify-between text-xs text-slate-400 font-semibold items-center">
            <span className="flex items-center gap-1.5">
              OPPONENT 
              {opponentSilenced && <span className="bg-red-950/85 border border-red-500/80 text-red-400 text-4xs font-extrabold px-1.5 py-0.5 rounded leading-none">SILENCED</span>}
              {opponentReflecting && <span className="bg-cyan-950/85 border border-cyan-500/80 text-cyan-400 text-4xs font-extrabold px-1.5 py-0.5 rounded leading-none animate-pulse">REFLECT</span>}
              {opponentCursed && <span className="bg-rose-950/85 border border-rose-600/80 text-rose-400 text-4xs font-extrabold px-1.5 py-0.5 rounded leading-none animate-pulse">CURSED</span>}
              {opponentDraining && <span className="bg-blue-950/85 border border-blue-500/80 text-blue-400 text-4xs font-extrabold px-1.5 py-0.5 rounded leading-none animate-pulse">DRAINING</span>}
            </span>
            <span>{Math.round(opponentHP)} / {GAME.HP_MAX} HP {opponentShield > 0 && <span className="text-cyan-400 font-bold ml-1">(+{Math.round(opponentShield)} Shield)</span>}</span>
          </div>
          {/* HP Bar */}
          <div className="w-full h-4.5 pixel-bar-bg relative">
            <div
              className="h-full pixel-bar-fill-enemy-hp transition-all duration-200"
              style={{ width: `${Math.max(0, Math.min(100, (opponentHP / GAME.HP_MAX) * 100))}%` }}
            />
            {opponentShield > 0 && (
              <div
                className="absolute top-0 right-0 h-full pixel-bar-fill-shield border-l-2 border-purple-400 transition-all duration-200"
                style={{ width: `${Math.max(0, Math.min(100, (opponentShield / GAME.HP_MAX) * 100))}%` }}
              />
            )}
          </div>
          {/* Mana Bar */}
          <div className="flex justify-between text-2xs text-slate-500 font-medium mt-1">
            <span>Mana: {Math.round(opponentMana)} / 100</span>
          </div>
          <div className="w-full h-2.5 pixel-bar-bg">
            <div
              className="h-full pixel-bar-fill-mana transition-all duration-200"
              style={{ width: `${Math.max(0, Math.min(100, opponentMana))}%` }}
            />
          </div>
        </div>

        {/* Opponent Spell Queue */}
        <div className="flex items-center gap-3">
          {opponentFilledCount >= 2 && (
            <div className={`text-5xs font-black px-2 py-1 rounded border tracking-widest uppercase animate-pulse ${
              opponentFilledCount === 3
                ? "bg-amber-950/80 border-amber-600/80 text-amber-400 shadow shadow-amber-500/10"
                : "bg-cyan-950/80 border-cyan-500/80 text-cyan-400"
            }`}>
              {opponentFilledCount === 3 ? "3x COMBO (+35%)" : "2x COMBO (+15%)"}
            </div>
          )}
          <div className="flex gap-2">
          {opponentSlots.map((slot, i) => (
            <div
              key={i}
              className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg border text-sm font-bold transition-all duration-300 ${
                opponentSelectedSlot === i + 1
                  ? "scale-110 border-cyan-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-500/30"
                  : ""
              } ${
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
          ))
        }
        </div>
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
        <div className={`border rounded-full px-5 py-2 font-mono text-xl font-extrabold shadow-inner flex items-center gap-2 transition-all duration-300 ${
          overtime 
            ? "bg-red-950/80 border-red-500 text-red-500 animate-pulse shadow-lg shadow-red-500/20" 
            : "bg-slate-900 border-slate-800 text-yellow-500"
        }`}>
          <span>⏱</span>
          <span>{formatTime(timeRemaining)}</span>
          {overtime && (
            <span className="text-4xs font-black bg-red-900/80 border border-red-500 text-red-100 px-1.5 py-0.5 rounded leading-none tracking-wider uppercase animate-bounce">
              OVERTIME (-2 HP/s)
            </span>
          )}
        </div>
        <div className="w-40" /> {/* Spacer */}
      </div>

      {/* 3. Player HUD */}
      <div className={`flex justify-between items-center pixel-panel p-3 shadow-lg transition-all duration-300 ${playerBorderClass}`}>
        <div className="flex flex-col gap-1 w-full max-w-md">
          <div className="flex justify-between text-xs text-slate-400 font-semibold items-center">
            <span className="flex items-center gap-1.5">
              YOU 
              {playerSilenced && <span className="bg-red-950/85 border border-red-500/80 text-red-400 text-4xs font-extrabold px-1.5 py-0.5 rounded leading-none animate-bounce">SILENCED</span>}
              {playerReflecting && <span className="bg-cyan-950/85 border border-cyan-500/80 text-cyan-400 text-4xs font-extrabold px-1.5 py-0.5 rounded leading-none animate-pulse shadow-sm shadow-cyan-500/30">REFLECTING</span>}
              {playerCursed && <span className="bg-rose-950/85 border border-rose-600/80 text-rose-400 text-4xs font-extrabold px-1.5 py-0.5 rounded leading-none animate-pulse shadow-sm shadow-rose-500/30">CURSED</span>}
              {playerDraining && <span className="bg-blue-950/85 border border-blue-500/80 text-blue-400 text-4xs font-extrabold px-1.5 py-0.5 rounded leading-none animate-pulse shadow-sm shadow-blue-500/30">DRAINING</span>}
            </span>
            <span>{Math.round(playerHP)} / {GAME.HP_MAX} HP {playerShield > 0 && <span className="text-purple-400 font-bold ml-1">(+{Math.round(playerShield)} Shield)</span>}</span>
          </div>
          {/* HP Bar */}
          <div className="w-full h-4.5 pixel-bar-bg relative">
            <div
              className="h-full pixel-bar-fill-hp transition-all duration-200"
              style={{ width: `${Math.max(0, Math.min(100, (playerHP / GAME.HP_MAX) * 100))}%` }}
            />
            {playerShield > 0 && (
              <div
                className="absolute top-0 right-0 h-full pixel-bar-fill-shield border-l-2 border-purple-400 transition-all duration-200"
                style={{ width: `${Math.max(0, Math.min(100, (playerShield / GAME.HP_MAX) * 100))}%` }}
              />
            )}
          </div>
          {/* Mana Bar */}
          <div className="flex justify-between text-2xs text-slate-500 font-medium mt-1">
            <span>Mana: {Math.round(playerMana)} / 100</span>
          </div>
          <div className="w-full h-2.5 pixel-bar-bg">
            <div
              className="h-full pixel-bar-fill-mana transition-all duration-200"
              style={{ width: `${Math.max(0, Math.min(100, playerMana))}%` }}
            />
          </div>
        </div>

        {/* Player Queue & Cast Button */}
        <div className="flex items-center gap-3">
          {playerFilledCount >= 2 && (
            <div className={`text-5xs font-black px-2 py-1 border tracking-widest uppercase animate-pulse ${
              playerFilledCount === 3
                ? "bg-amber-950/80 border-amber-600/80 text-amber-400 shadow shadow-amber-500/10"
                : "bg-purple-950/80 border-purple-500/80 text-purple-400"
            }`}>
              {playerFilledCount === 3 ? "3x COMBO (+35%)" : "2x COMBO (+15%)"}
            </div>
          )}
          <div className="flex gap-2">
            {playerSlots.map((slot, i) => (
              <div
                key={i}
                onClick={() => onSlotClick((i + 1) as 1 | 2 | 3)}
                className={`w-14 h-14 flex flex-col items-center justify-center border-2 text-sm font-bold relative transition-all duration-300 cursor-pointer ${
                  playerSelectedSlot === i + 1
                    ? "scale-115 border-purple-400 shadow-lg shadow-purple-500/25 ring-2 ring-purple-500/30"
                    : ""
                } ${
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
                      <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white text-4xs w-4 h-4 flex items-center justify-center shadow font-black border border-purple-400 animate-pulse">
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
            className={`h-14 px-5 font-bold uppercase tracking-widest text-3xs transition-all active:scale-95 ${
              hasFilledSlots && !playerSilenced
                ? "pixel-btn cursor-pointer"
                : "bg-slate-950 border-2 border-slate-900 text-slate-700 cursor-not-allowed"
            }`}
          >
            Cast Spells
          </button>
        </div>
      </div>

      {/* 4. Keyboard Chord Reference Bar */}
      <div className="flex flex-wrap justify-between items-center bg-slate-950/80 border-2 border-slate-900 py-2 px-3 text-3xs text-slate-500 font-medium">
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
