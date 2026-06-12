import React, { useState, useEffect } from "react";
import { SPELLBOOK } from "shared";
import type { SpellId, SpellDefinition } from "shared";

interface SpellDictionaryProps {
  isOpen: boolean;
  onClose: () => void;
  activeChord: string;
  shiftHeld: boolean;
}

export const SpellDictionary: React.FC<SpellDictionaryProps> = ({
  isOpen,
  onClose,
  activeChord,
  shiftHeld
}) => {
  const [hoveredSpell, setHoveredSpell] = useState<SpellDefinition | null>(null);

  // Auto-focus on active chord spell if it changes
  useEffect(() => {
    if (activeChord && SPELLBOOK[activeChord as SpellId]) {
      setHoveredSpell(SPELLBOOK[activeChord as SpellId]);
    }
  }, [activeChord]);

  if (!isOpen) return null;

  // Group spells
  const baseSpells = Object.values(SPELLBOOK).filter(s => !s.chord.includes("+"));
  const comboSpells = Object.values(SPELLBOOK).filter(s => s.chord.includes("+"));

  const currentDetails = hoveredSpell || (activeChord && SPELLBOOK[activeChord as SpellId]) || SPELLBOOK["Q"];

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-fade-in">
      <div className="bg-slate-900 border border-purple-500/20 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500" />
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
          <div className="flex flex-col">
            <h2 className="text-xl font-black tracking-widest text-slate-100 uppercase">
              Arcane Spell Codex
            </h2>
            <span className="text-4xs text-slate-500 font-semibold tracking-wider uppercase mt-0.5">
              Press Tab or Click close to return to the arena
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 bg-slate-950/40 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-3xs font-black tracking-wider uppercase transition-all cursor-pointer"
          >
            Close [Tab]
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Organized List of Spells */}
          <div className="w-7/12 border-r border-slate-800 p-6 overflow-y-auto flex flex-col gap-6 scrollbar-thin">
            
            {/* Group 1: Base Elementals */}
            <div className="flex flex-col gap-2.5">
              <span className="text-4xs text-purple-400 font-extrabold uppercase tracking-widest pl-1">
                Base Elemental Sigils
              </span>
              <div className="grid grid-cols-2 gap-3">
                {baseSpells.map(spell => {
                  const isHighlighted = activeChord === spell.chord;
                  return (
                    <div
                      key={spell.id}
                      onMouseEnter={() => setHoveredSpell(spell)}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                        isHighlighted
                          ? "bg-purple-950/35 border-purple-500/60 shadow-lg shadow-purple-500/5 ring-1 ring-purple-500/30 scale-102"
                          : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/60"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold border transition-all ${
                        isHighlighted ? "bg-purple-900/40 border-purple-400 text-purple-400" : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}>
                        {spell.unicodeSymbol}
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-2xs font-extrabold tracking-wider ${isHighlighted ? "text-purple-300" : "text-slate-200"}`}>
                          {spell.name}
                        </span>
                        <span className="text-4xs font-bold text-slate-500 mt-0.5">
                          Hold [{spell.chord}]
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Group 2: Combined Leylines */}
            <div className="flex flex-col gap-2.5">
              <span className="text-4xs text-cyan-400 font-extrabold uppercase tracking-widest pl-1">
                Combined Arcane Leylines
              </span>
              <div className="grid grid-cols-2 gap-3">
                {comboSpells.map(spell => {
                  const isHighlighted = activeChord === spell.chord;
                  return (
                    <div
                      key={spell.id}
                      onMouseEnter={() => setHoveredSpell(spell)}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                        isHighlighted
                          ? "bg-cyan-950/35 border-cyan-500/60 shadow-lg shadow-cyan-500/5 ring-1 ring-cyan-500/30 scale-102"
                          : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/60"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold border transition-all ${
                        isHighlighted ? "bg-cyan-900/40 border-cyan-400 text-cyan-400" : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}>
                        {spell.unicodeSymbol}
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-2xs font-extrabold tracking-wider ${isHighlighted ? "text-cyan-300" : "text-slate-200"}`}>
                          {spell.name}
                        </span>
                        <span className="text-4xs font-bold text-slate-500 mt-0.5">
                          Hold [{spell.chord}]
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Detailed Spell Card */}
          <div className="w-5/12 bg-slate-950/30 p-6 flex flex-col gap-5 justify-between relative overflow-hidden">
            
            {/* Background elements watermark */}
            <div className="absolute -bottom-10 -right-10 text-9xl font-black text-slate-900/10 font-sans pointer-events-none select-none">
              {currentDetails.unicodeSymbol}
            </div>

            <div className="flex flex-col gap-4 relative z-10">
              
              {/* Rune & Name Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/30 flex items-center justify-center text-3xl font-black text-purple-400 shadow-md shadow-purple-500/5">
                  {currentDetails.unicodeSymbol}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-2xl font-black tracking-wider text-slate-100 uppercase">
                    {currentDetails.name}
                  </h3>
                  <div className="flex gap-1.5 mt-1.5">
                    {currentDetails.elements.map(el => (
                      <span key={el} className={`text-4xs font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        el === "Fire" ? "bg-red-950/70 border border-red-500/30 text-red-400" :
                        el === "Water" ? "bg-blue-950/70 border border-blue-500/30 text-blue-400" :
                        el === "Earth" ? "bg-emerald-950/70 border border-emerald-500/30 text-emerald-400" :
                        "bg-yellow-950/70 border border-yellow-500/30 text-yellow-400"
                      }`}>
                        {el}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 my-2" />

              {/* Stats / Cost */}
              <div className="grid grid-cols-2 gap-3 text-3xs font-semibold">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 flex flex-col gap-0.5">
                  <span className="text-slate-500 uppercase font-bold text-4xs">Mana Cost</span>
                  <span className="text-slate-200 font-extrabold text-2xs">{currentDetails.manaCost} Mana</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 flex flex-col gap-0.5">
                  <span className="text-slate-500 uppercase font-bold text-4xs">Cast Chord</span>
                  <span className="text-purple-400 font-extrabold text-2xs">{currentDetails.chord}</span>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-4xs text-slate-500 font-bold uppercase tracking-wider">
                  Arcane Description
                </span>
                <p className="text-slate-400 font-medium text-xs leading-relaxed bg-slate-900/40 border border-slate-800/50 rounded-xl p-4.5">
                  {currentDetails.description}
                </p>
              </div>

            </div>

            {/* Bottom Inversion info */}
            <div className={`border rounded-xl p-3 text-4xs leading-relaxed font-medium mt-auto relative z-10 transition-all duration-300 ${
              shiftHeld 
                ? "bg-red-950/30 border-red-500/30 text-red-200 shadow-lg shadow-red-500/5" 
                : "bg-purple-950/15 border-purple-500/10 text-slate-500"
            }`}>
              <span className={`font-bold uppercase tracking-widest block mb-1 ${shiftHeld ? "text-red-400" : "text-purple-400"}`}>
                {shiftHeld ? "Inversion Mode Active" : "Inversion Nullification"}
              </span>
              {shiftHeld 
                ? "You are currently holding Shift. Drawing and sealing this spell will cast its Inverted version, countering opponent slots that share its elements."
                : "Hold Shift while drawing this sigil to counter or nullify your opponent's active slots sharing the same elements."
              }
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
