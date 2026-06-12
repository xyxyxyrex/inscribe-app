import React, { useState, useEffect, useRef } from "react";
import { SPELLBOOK, Recognizer, GAME } from "shared";
import type { SpellId, StrokePoint, Point } from "shared";
import { DrawingCanvas } from "./DrawingCanvas";
import { VFXManager } from "../game/VFXManager";
import { SpellDictionary } from "./SpellDictionary";
import { gsap } from "gsap";
import { SoundManager } from "../game/SoundManager";

interface PracticeModeProps {
  onBack: () => void;
}

interface QueuedSpell {
  spellId: string;
  accuracy: number;
  filled: boolean;
  speedBonus?: boolean;
  inverted?: boolean;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({ onBack }) => {
  // Stats
  const [playerHP, setPlayerHP] = useState<number>(GAME.HP_MAX);
  const [playerMana, setPlayerMana] = useState(100);
  const [playerShield, setPlayerShield] = useState(0);
  const [dummyHP, setDummyHP] = useState<number>(GAME.HP_MAX);
  const [dummyShield, setDummyShield] = useState(0);

  // States
  const [activeChord, setActiveChord] = useState("");
  const [shiftHeld, setShiftHeld] = useState(false);
  const [drawConfidence, setDrawConfidence] = useState(0);
  const [showDictionary, setShowDictionary] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(true);

  // Slots
  const [slots, setSlots] = useState<QueuedSpell[]>([
    { spellId: "", accuracy: 0, filled: false },
    { spellId: "", accuracy: 0, filled: false },
    { spellId: "", accuracy: 0, filled: false },
  ]);
  const [selectedSlot, setSelectedSlot] = useState(1);

  // Active Effects
  const [silenceSequence, setSilenceSequence] = useState("");
  const [silenceIndex, setSilenceIndex] = useState(0);
  const playerSilenced = silenceSequence.length > 0;

  // Training state
  const [trainingMode, setTrainingMode] = useState<"idle" | "active" | "success" | "failed">("idle");
  const [trainingSpell, setTrainingSpell] = useState<SpellId | "">("");
  const [trainingTimer, setTrainingTimer] = useState(0);
  const [trainingDuration, setTrainingDuration] = useState(1500);

  // Debug points
  const [strokePoints, setStrokePoints] = useState<StrokePoint[]>([]);
  const [logs, setLogs] = useState<string[]>([
    "[System] Welcome to the Arcane Practice Room. Draw sigils to analyze calculation details.",
    "[System] Hold Q, W, E, R (or combos) and draw with your mouse/stylus. Press Space to seal.",
    "[System] Press Space without holding keys to resolve your cast queue."
  ]);

  const recognizerRef = useRef(new Recognizer());
  const trainingIntervalRef = useRef<any>(null);

  // Speed bonus tracking
  const [hasReachedThreshold, setHasReachedThreshold] = useState(false);

  const heldKeysRef = useRef<Set<string>>(new Set());
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const dummyContainerRef = useRef<HTMLDivElement | null>(null);

  const prevPlayerHP = useRef<number>(GAME.HP_MAX);
  const prevDummyHP = useRef<number>(GAME.HP_MAX);

  // Shake player canvas on damage
  useEffect(() => {
    if (playerHP < prevPlayerHP.current) {
      SoundManager.playHit();
      if (playerContainerRef.current) {
        gsap.fromTo(
          playerContainerRef.current,
          { x: -5, y: -5 },
          {
            x: 5,
            y: 5,
            duration: 0.04,
            repeat: 7,
            yoyo: true,
            ease: "sine.inOut",
            onComplete: () => {
              if (playerContainerRef.current) {
                playerContainerRef.current.style.transform = "none";
              }
            }
          }
        );
      }
    }
    prevPlayerHP.current = playerHP;
  }, [playerHP]);

  // Shake dummy panel on damage
  useEffect(() => {
    if (dummyHP < prevDummyHP.current) {
      SoundManager.playHit();
      if (dummyContainerRef.current) {
        gsap.fromTo(
          dummyContainerRef.current,
          { x: -5, y: -5 },
          {
            x: 5,
            y: 5,
            duration: 0.04,
            repeat: 7,
            yoyo: true,
            ease: "sine.inOut",
            onComplete: () => {
              if (dummyContainerRef.current) {
                dummyContainerRef.current.style.transform = "none";
              }
            }
          }
        );
      }
    }
    prevDummyHP.current = dummyHP;
  }, [dummyHP]);

  // Play audio for training mode success/fail
  useEffect(() => {
    if (trainingMode === "success") {
      SoundManager.playInversionSuccess();
    } else if (trainingMode === "failed") {
      SoundManager.playInversionFail();
    }
  }, [trainingMode]);

  // Handle keys locally
  useEffect(() => {
    const getNewChord = () => {
      const keyOrder = ["Q", "W", "E", "R"];
      const sortedKeys = Array.from(heldKeysRef.current).sort((a, b) => keyOrder.indexOf(a) - keyOrder.indexOf(b));
      return sortedKeys.join("+");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setShowDictionary((prev) => !prev);
        return;
      }

      if (playerSilenced) {
        const key = e.key.toUpperCase();
        if (["Q", "W", "E", "R"].includes(key)) {
          e.preventDefault();
          const expectedKey = silenceSequence[silenceIndex];
          if (key === expectedKey) {
            const nextIndex = silenceIndex + 1;
            if (nextIndex >= silenceSequence.length) {
              setSilenceSequence("");
              setSilenceIndex(0);
              addLog("[System] Silence broken! Your canvas is unlocked.");
              SoundManager.playInversionSuccess();
            } else {
              setSilenceIndex(nextIndex);
              SoundManager.playSeal();
            }
          } else {
            setSilenceIndex(0);
            addLog("[System] MISTAKE! Silence sequence reset. Start over!");
            SoundManager.playHit();
            if (playerContainerRef.current) {
              gsap.fromTo(
                playerContainerRef.current,
                { x: -8 },
                {
                  x: 8,
                  duration: 0.05,
                  repeat: 3,
                  yoyo: true,
                  ease: "sine.inOut",
                  onComplete: () => {
                    if (playerContainerRef.current) {
                      playerContainerRef.current.style.transform = "none";
                    }
                  }
                }
              );
            }
          }
        } else if (["1", "2", "3", " ", "Shift"].includes(e.key)) {
          e.preventDefault();
        }
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        if (activeChord !== "") {
          // Seal Spell
          sealCurrentSpell();
        } else {
          // Cast spells
          resolvePracticeCast();
        }
        return;
      }

      if (["1", "2", "3"].includes(e.key)) {
        setSelectedSlot(parseInt(e.key));
        return;
      }

      if (e.repeat) return;

      if (e.key === "Shift") {
        setShiftHeld(true);
      } else if (["q", "w", "e", "r", "Q", "W", "E", "R"].includes(e.key)) {
        heldKeysRef.current.add(e.key.toUpperCase());
        const chord = getNewChord();
        setActiveChord(chord);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (playerSilenced) return;

      if (e.key === "Shift") {
        setShiftHeld(false);
      } else if (["q", "w", "e", "r", "Q", "W", "E", "R"].includes(e.key)) {
        heldKeysRef.current.delete(e.key.toUpperCase());
        const chord = getNewChord();
        setActiveChord(chord);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (trainingIntervalRef.current) {
        clearInterval(trainingIntervalRef.current);
      }
    };
  }, [activeChord, shiftHeld, slots, selectedSlot, strokePoints, hasReachedThreshold, trainingMode, trainingSpell, playerHP, playerSilenced, silenceSequence, silenceIndex]);

  // Handle countdown during training mode
  useEffect(() => {
    if (trainingMode === "active") {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, trainingDuration - elapsed);
        setTrainingTimer(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          setTrainingMode("failed");
          applyDummySpellHit();
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [trainingMode, trainingDuration, trainingSpell]);

  // Live recognition as points are drawn
  const handleStrokePoint = (x: number, y: number, pressure: number, timestamp: number) => {
    if (playerSilenced) return;
    if (activeChord === "") return;
    
    const newPt: StrokePoint = { x, y, pressure, timestamp };
    const nextPoints = [...strokePoints, newPt];
    setStrokePoints(nextPoints);

    if (nextPoints.length >= 5) {
      // Map candidate points
      const candidatePoints: Point[] = nextPoints.map(p => ({ x: p.x, y: p.y }));
      
      // Invert points if Shift is held
      let evalPoints = candidatePoints;
      if (shiftHeld) {
        let maxY = 0;
        for (const p of candidatePoints) {
          if (p.y > maxY) maxY = p.y;
        }
        evalPoints = candidatePoints.map(p => ({ x: p.x, y: maxY - p.y }));
      }

      const result = recognizerRef.current.recognize(evalPoints, activeChord as SpellId);
      
      if (result.name === activeChord) {
        setDrawConfidence(result.score);
        if (result.score >= GAME.EARLY_LOCK_THRESHOLD && !hasReachedThreshold) {
          setHasReachedThreshold(true);
        }
      }
    }
  };

  const handleStrokeEnd = () => {
    // Keep stroke points buffered until Sealed or key chord released
  };

  useEffect(() => {
    if (activeChord === "") {
      setStrokePoints([]);
      setDrawConfidence(0);
      setHasReachedThreshold(false);
    }
  }, [activeChord]);

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev].slice(0, 30));
  };

  const sealCurrentSpell = () => {
    if (activeChord === "") return;
    const spell = SPELLBOOK[activeChord as SpellId];
    if (!spell) {
      addLog("[System] Failed to seal: Unrecognized chord.");
      return;
    }

    // Determine final accuracy score
    const finalScore = drawConfidence;
    if (finalScore < 0.30) {
      addLog(`[System] Spell seal failed: Accuracy too low (${Math.round(finalScore * 100)}% < 30%).`);
      return;
    }

    // Check if player is performing inversion training
    if (trainingMode === "active") {
      if (shiftHeld && activeChord === trainingSpell) {
        setTrainingMode("success");
        addLog(`✨ SUCCESSFUL INVERSION! You nullified the opponent's ${SPELLBOOK[trainingSpell as SpellId].name} (${Math.round(finalScore * 100)}% Acc).`);
        setStrokePoints([]);
        return;
      }
    }

    // Seal the spell in the selected slot
    setSlots((prev) => {
      const updated = [...prev];
      updated[selectedSlot - 1] = {
        spellId: activeChord,
        accuracy: finalScore,
        filled: true,
        speedBonus: hasReachedThreshold,
        inverted: shiftHeld,
      };
      return updated;
    });

    addLog(`[Sealed] Slot ${selectedSlot}: ${spell.name}${shiftHeld ? " (Inverted)" : ""} at ${Math.round(finalScore * 100)}% accuracy. Speed bonus? ${hasReachedThreshold ? "YES (+8%)" : "NO"}`);
    
    // Select next empty or next slot
    setSelectedSlot((prev) => (prev % 3) + 1);
    setStrokePoints([]);
  };

  const clearQueue = () => {
    setSlots([
      { spellId: "", accuracy: 0, filled: false },
      { spellId: "", accuracy: 0, filled: false },
      { spellId: "", accuracy: 0, filled: false },
    ]);
    addLog("[System] Clear: Spell queue emptied.");
  };

  const applyDummySpellHit = () => {
    if (!trainingSpell) return;
    const spell = SPELLBOOK[trainingSpell];
    addLog(`💥 FAILED INTERRUPT! Opponent casted ${spell.name} and hit you.`);
    
    // Calculate simulated damage
    if (trainingSpell === "Q") {
      // 12 damage
      const dmg = 12;
      setPlayerHP((prev) => Math.max(0, prev - dmg));
      addLog(` - Quyra deals 12 damage and inflicts burning DOT. Caster HP decreased.`);
    } else if (trainingSpell === "Q+W") {
      // Vael: 20 damage + silence
      setPlayerHP((prev) => Math.max(0, prev - 20));
      const keys = ["Q", "W", "E", "R"];
      let seq = "";
      for (let k = 0; k < 5; k++) {
        seq += keys[Math.floor(Math.random() * keys.length)];
      }
      setSilenceSequence(seq);
      setSilenceIndex(0);
      addLog(` - Vael deals 20 damage and silences you. Input sequence ${seq} to break it!`);
    } else if (trainingSpell === "Q+R") {
      // Asurel: 25 damage
      setPlayerHP((prev) => Math.max(0, prev - 25));
      addLog(` - Asurel deals 25 burst damage.`);
    }
  };

  const startInterruptTraining = () => {
    const list: SpellId[] = ["Q", "Q+W", "Q+R"];
    const randSpell = list[Math.floor(Math.random() * list.length)];
    setTrainingSpell(randSpell);
    setTrainingDuration(1800);
    setTrainingTimer(1800);
    setTrainingMode("active");
    addLog(`⚠️ WARNING: Simulated Opponent begins casting ${SPELLBOOK[randSpell].name}! Draw inverted chord (Shift + ${randSpell}) and Space-seal it immediately!`);
  };

  const triggerPracticeComboFlash = (castCount: number) => {
    if (playerContainerRef.current) {
      const flashColor = castCount === 3 ? "rgba(234, 179, 8, 0.4)" : "rgba(168, 85, 247, 0.3)";
      const shakeRange = castCount === 3 ? 12 : 6;
      const shakeRepeat = castCount === 3 ? 12 : 8;

      gsap.fromTo(
        playerContainerRef.current,
        { x: -shakeRange, y: -shakeRange },
        {
          x: shakeRange,
          y: shakeRange,
          duration: 0.04,
          repeat: shakeRepeat,
          yoyo: true,
          ease: "sine.inOut",
          onComplete: () => {
            if (playerContainerRef.current) {
              playerContainerRef.current.style.transform = "none";
            }
          }
        }
      );

      const flashDiv = document.createElement("div");
      flashDiv.style.position = "absolute";
      flashDiv.style.inset = "0";
      flashDiv.style.backgroundColor = flashColor;
      flashDiv.style.pointerEvents = "none";
      flashDiv.style.borderRadius = "0.75rem";
      flashDiv.style.zIndex = "40";
      flashDiv.style.opacity = "1";
      playerContainerRef.current.appendChild(flashDiv);

      gsap.to(flashDiv, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => {
          flashDiv.remove();
        }
      });
    }
  };

  // Perform local offline resolution math
  const resolvePracticeCast = () => {
    const hasFilled = slots.some(s => s.filled);
    if (!hasFilled) {
      addLog("[System] Cast failed: Queue is empty. Draw and seal spells first.");
      return;
    }

    const filledCount = slots.filter(s => s.filled).length;
    const comboMultiplier = filledCount === 2 ? 1.15 : (filledCount === 3 ? 1.35 : 1.0);

    addLog("🔮 RESOLVING CAST QUEUE (Offline Sandbox Calculation):");
    if (comboMultiplier > 1.0) {
      addLog(` 🔥 COMBO ACTIVE: +${comboMultiplier === 1.15 ? "15%" : "35%"} effectiveness multiplier applied!`);
      triggerPracticeComboFlash(filledCount);
    }

    let currentMana = playerMana;
    let currentDummyHP = dummyHP;
    let currentDummyShield = dummyShield;
    let currentCasterHP = playerHP;
    let currentCasterShield = playerShield;

    slots.forEach((slot, index) => {
      if (!slot.filled) return;
      const spellId = slot.spellId as SpellId;
      const spell = SPELLBOOK[spellId];
      if (!spell) return;

      addLog(`--- Slot ${index + 1}: ${spell.name} ---`);
      
      // Mana check
      if (currentMana < spell.manaCost) {
        addLog(` ❌ Failed: Insufficient mana (${spell.manaCost} required, ${Math.floor(currentMana)} available).`);
        return;
      }
      currentMana -= spell.manaCost;
      addLog(` Deducted ${spell.manaCost} mana. Remaining: ${Math.floor(currentMana)}.`);

      const speedMult = (slot.speedBonus ? 1.08 : 1.0) * comboMultiplier;
      if (slot.speedBonus) {
        addLog(` ✨ Speed Bonus active (+8% effectiveness multiplier).`);
      }

      // Check inversion/nullification
      if (slot.inverted) {
        addLog(` 🛡️ Inverted Sigil cast. Base inversion version acts as a magic nullification ward.`);
        VFXManager.play("inversion", playerContainerRef.current);
        return;
      }

      // Trigger spritesheet VFX
      const isSelfTarget = ["W", "E", "R", "W+R", "E+R"].includes(spellId);
      const targetContainer = isSelfTarget ? playerContainerRef.current : dummyContainerRef.current;
      VFXManager.play(spellId, targetContainer);

      switch (spellId) {
        case "Q": {
          const dmg = Math.round(12 * slot.accuracy * speedMult);
          addLog(`  Formula: 12 (Base) * ${Math.round(slot.accuracy * 100)}% (Acc) * ${speedMult} (Speed) = ${dmg} DMG.`);
          // Apply shield bleed
          if (currentDummyShield > 0) {
            if (currentDummyShield >= dmg) {
              currentDummyShield -= dmg;
              addLog(`  Shield absorbed all damage! Dummy Shield remaining: ${currentDummyShield}.`);
            } else {
              const bleed = dmg - currentDummyShield;
              addLog(`  Shield absorbed ${currentDummyShield} damage. ${bleed} damage bled through.`);
              currentDummyShield = 0;
              currentDummyHP = Math.max(0, currentDummyHP - bleed);
            }
          } else {
            currentDummyHP = Math.max(0, currentDummyHP - dmg);
          }
          addLog(`  Dummy status: ${currentDummyHP} HP / ${currentDummyShield} Shield.`);
          break;
        }

        case "W": {
          const restore = Math.round((8 + (25 - 8) * slot.accuracy) * speedMult);
          addLog(`  Formula: (8 + 17 * ${Math.round(slot.accuracy * 100)}% Acc) * ${speedMult} Speed = +${restore} Mana.`);
          currentMana = Math.min(100, currentMana + restore);
          addLog(`  Mana restored: +${restore}. Current Mana: ${Math.floor(currentMana)}.`);
          break;
        }

        case "E": {
          const shield = Math.round((5 + (20 - 5) * slot.accuracy) * speedMult);
          addLog(`  Formula: (5 + 15 * ${Math.round(slot.accuracy * 100)}% Acc) * ${speedMult} Speed = +${shield} Shield.`);
          currentCasterShield = Math.max(currentCasterShield, shield);
          addLog(`  Gained ${shield} Shield. Current Shield: ${currentCasterShield}.`);
          break;
        }

        case "R": {
          const heal = Math.round((4 + (15 - 4) * slot.accuracy) * speedMult);
          addLog(`  Formula: (4 + 11 * ${Math.round(slot.accuracy * 100)}% Acc) * ${speedMult} Speed = +${heal} HP.`);
          currentCasterHP = Math.min(GAME.HP_MAX, currentCasterHP + heal);
          addLog(`  Healed ${heal} HP. Current HP: ${currentCasterHP}.`);
          break;
        }

        case "Q+W": {
          const baseLength = Math.max(5, Math.round(5 * (slot.speedBonus ? 1.08 : 1.0) * slot.accuracy));
          const extraKeys = (filledCount >= 2) ? (filledCount * 2) : 0;
          const length = baseLength + extraKeys;
          addLog(`  Silenced dummy target! Breaks with sequence length: ${length} (Base: ${baseLength} + Combo: ${extraKeys}).`);
          break;
        }

        case "Q+E": {
          const dmg = Math.round(15 * slot.accuracy * speedMult);
          addLog(`  Formula: 15 (Base) * ${Math.round(slot.accuracy * 100)}% (Acc) * ${speedMult} (Speed) = ${dmg} DMG.`);
          if (currentDummyShield > 0) {
            if (currentDummyShield >= dmg) {
              currentDummyShield -= dmg;
            } else {
              const bleed = dmg - currentDummyShield;
              currentDummyShield = 0;
              currentDummyHP = Math.max(0, currentDummyHP - bleed);
            }
          } else {
            currentDummyHP = Math.max(0, currentDummyHP - dmg);
          }
          addLog(`  Inflicted Gravebind Curse on dummy target!`);
          addLog(`  Dummy status: ${currentDummyHP} HP / ${currentDummyShield} Shield.`);
          break;
        }

        case "Q+R": {
          const dmg = Math.round(25 * slot.accuracy * speedMult);
          addLog(`  Formula: 25 (Base) * ${Math.round(slot.accuracy * 100)}% (Acc) * ${speedMult} (Speed) = ${dmg} DMG.`);
          if (currentDummyShield > 0) {
            if (currentDummyShield >= dmg) {
              currentDummyShield -= dmg;
            } else {
              const bleed = dmg - currentDummyShield;
              currentDummyShield = 0;
              currentDummyHP = Math.max(0, currentDummyHP - bleed);
            }
          } else {
            currentDummyHP = Math.max(0, currentDummyHP - dmg);
          }
          addLog(`  Dummy status: ${currentDummyHP} HP / ${currentDummyShield} Shield.`);
          break;
        }

        case "W+E": {
          addLog(`  Sorveth Casted. Inflicted Tidecurse: Drains 20 mana over 4 seconds.`);
          break;
        }

        case "W+R": {
          addLog(`  Luneth Casted. Reflect window opened for 1.2s.`);
          break;
        }

        case "E+R": {
          const shield = Math.round(12 * speedMult);
          const heal = Math.round(8 * speedMult);
          currentCasterShield = Math.max(currentCasterShield, shield);
          currentCasterHP = Math.min(GAME.HP_MAX, currentCasterHP + heal);
          addLog(`  Gained ${shield} Shield and healed ${heal} HP.`);
          break;
        }
      }
    });

    // Update state
    setPlayerMana(currentMana);
    setDummyHP(currentDummyHP);
    setDummyShield(currentDummyShield);
    setPlayerHP(currentCasterHP);
    setPlayerShield(currentCasterShield);

    // Empty slot queue
    setSlots([
      { spellId: "", accuracy: 0, filled: false },
      { spellId: "", accuracy: 0, filled: false },
      { spellId: "", accuracy: 0, filled: false },
    ]);
  };

  const getRealtimePracticeOutput = () => {
    if (!activeChord) return "";
    const pct = Math.round(drawConfidence * 100);
    const speedText = hasReachedThreshold ? " ⚡ SPEED BONUS" : "";
    return `${pct}% Accuracy${speedText}`;
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-6xl mx-auto py-2 select-none text-slate-100">
      
      {/* Header bar */}
      <div className="flex justify-between items-center pixel-panel px-5 py-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-3xs text-purple-400 font-extrabold tracking-widest uppercase">Off-grid sandbox</span>
          <h2 className="text-xl font-black text-purple-400 uppercase">
            ARCANE PRACTICE ROOM
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGuidelines((prev) => !prev)}
            className={`px-3 py-1.5 border-2 text-4xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
              showGuidelines
                ? "bg-purple-950/40 border-purple-500/40 text-purple-400"
                : "bg-slate-950 border-slate-800 text-slate-500"
            }`}
          >
            Guidelines: {showGuidelines ? "Visible" : "Hidden"}
          </button>

          <button
            onClick={onBack}
            className="pixel-btn pixel-btn-close px-4 py-1.5 text-4xs tracking-widest uppercase cursor-pointer"
          >
            Back to Main Menu
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Caster stats */}
        <div className="pixel-panel p-3.5 flex flex-col gap-1.5">
          <div className="flex justify-between text-4xs font-extrabold text-slate-400 tracking-wider uppercase">
            <span>Your Stats (Caster)</span>
            <button
              onClick={() => {
                setPlayerHP(GAME.HP_MAX);
                setPlayerMana(100);
                setPlayerShield(0);
              }}
              className="text-purple-400/80 hover:text-purple-300 hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-5xs font-bold text-slate-500 uppercase">HP</div>
              <div className="text-xs font-black text-emerald-400">{playerHP} / {GAME.HP_MAX}</div>
            </div>
            <div>
              <div className="text-5xs font-bold text-slate-500 uppercase">Mana</div>
              <div className="text-xs font-black text-cyan-400">{playerMana} / 100</div>
            </div>
            <div>
              <div className="text-5xs font-bold text-slate-500 uppercase">Shield</div>
              <div className="text-xs font-black text-purple-400">{playerShield}</div>
            </div>
          </div>
        </div>

        {/* Dummy Target stats */}
        <div ref={dummyContainerRef} className="pixel-panel-red p-3.5 flex flex-col gap-1.5">
          <div className="flex justify-between text-4xs font-extrabold text-slate-400 tracking-wider uppercase">
            <span>Dummy Target</span>
            <button
              onClick={() => {
                setDummyHP(GAME.HP_MAX);
                setDummyShield(0);
              }}
              className="text-purple-400/80 hover:text-purple-300 hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-5xs font-bold text-slate-500 uppercase">HP</div>
              <div className="text-xs font-black text-rose-400">{dummyHP} / {GAME.HP_MAX}</div>
            </div>
            <div>
              <div className="text-5xs font-bold text-slate-500 uppercase">Shield</div>
              <div className="text-xs font-black text-cyan-400">{dummyShield}</div>
            </div>
            <div>
              <div className="text-5xs font-bold text-slate-500 uppercase">Inversion training</div>
              <button
                onClick={startInterruptTraining}
                disabled={trainingMode === "active"}
                className={`px-2 py-0.5 mt-0.5 rounded border text-5xs font-bold uppercase transition-all tracking-wider ${
                  trainingMode === "active"
                    ? "bg-amber-950/60 border-amber-600 text-amber-400 cursor-not-allowed"
                    : "bg-purple-950/40 border-purple-500 hover:bg-purple-900/40 text-purple-400 cursor-pointer"
                }`}
              >
                {trainingMode === "active" ? "Simulating..." : "Trigger training"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main interactive area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch h-[550px] w-full max-w-5xl mx-auto">
        {/* Draw canvas */}
        <div ref={playerContainerRef} className="flex flex-col gap-1.5 h-full relative">
          <div className="flex justify-between items-center pr-1">
            <span className="text-3xs text-purple-400 font-bold uppercase tracking-wider pl-1">
              Sandbox Canvas {shiftHeld ? "(INVERTED)" : ""}
            </span>
            {activeChord && (
              <span className="text-3xs font-black text-purple-400 bg-purple-950/60 border border-purple-500/20 px-2 py-0.5 rounded animate-pulse">
                {getRealtimePracticeOutput()}
              </span>
            )}
          </div>
          <div className="flex-1 relative">
            <DrawingCanvas
              activeChord={showGuidelines ? activeChord : ""}
              shiftHeld={shiftHeld}
              onStrokePoint={handleStrokePoint}
              onStrokeEnd={handleStrokeEnd}
            />
            {!showGuidelines && activeChord !== "" && (
              <div className="absolute inset-0 pointer-events-none border border-dashed border-purple-500/20 rounded-xl" />
            )}

            {playerSilenced && (
              <div className="absolute inset-0 bg-red-950/80 border-2 border-red-500/50 rounded-xl flex flex-col items-center justify-center gap-4 z-30 backdrop-blur-sm shadow-2xl animate-fade-in">
                <div className="text-4xl animate-bounce">🔇</div>
                <div className="text-center px-4 w-full">
                  <h3 className="text-lg font-black tracking-widest text-red-400 uppercase">SILENCED</h3>
                  <p className="text-2xs text-slate-300 font-semibold mt-1">
                    Your canvas is locked out!
                  </p>
                  <div className="mt-4 flex flex-col items-center gap-2 w-full">
                    <div className="text-3xs font-bold text-red-300 uppercase tracking-widest bg-red-900/60 border border-red-500/30 px-3 py-1.5 rounded-lg animate-pulse">
                      Follow the sequence to unlock:
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center mt-2 px-4 w-full">
                      {silenceSequence.split("").map((char, i) => {
                        const isCompleted = i < silenceIndex;
                        const isActive = i === silenceIndex;
                        
                        return (
                          <div
                            key={i}
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center font-mono font-black text-sm transition-all duration-300 shadow-md ${
                              isCompleted
                                ? "bg-emerald-950 border-emerald-500 text-emerald-400 shadow-emerald-500/20"
                                : isActive
                                ? "bg-red-950 border-red-500 text-red-400 shadow-red-500/30 animate-pulse scale-110 ring-2 ring-red-500/20"
                                : "bg-slate-900 border-slate-800 text-slate-500"
                            }`}
                          >
                            {char}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-2xs font-extrabold text-slate-400 tracking-wider mt-1">
                      ({silenceSequence.length - silenceIndex} keys remaining)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Spell detail tooltip */}
          {activeChord && SPELLBOOK[activeChord as SpellId] && (
            <div className="absolute bottom-3 left-3 right-3 p-3 bg-slate-950/95 border border-purple-500/40 rounded-xl text-3xs text-purple-200 backdrop-blur-md shadow-2xl animate-fade-in pointer-events-none z-10">
              <div className="flex justify-between items-center mb-1 font-bold">
                <span className="text-2xs text-purple-300 font-black tracking-wider uppercase">
                  {SPELLBOOK[activeChord as SpellId].name} {shiftHeld ? "(INVERSION)" : ""}
                </span>
                <span className="bg-purple-900/60 border border-purple-500/20 px-1.5 py-0.5 rounded text-purple-400 font-bold">
                  {SPELLBOOK[activeChord as SpellId].manaCost} Mana
                </span>
              </div>
              <p className="text-slate-400 font-semibold leading-relaxed">
                {SPELLBOOK[activeChord as SpellId].description}
              </p>
            </div>
          )}
        </div>

        {/* Debug Panel & Queue */}
        <div className="flex flex-col gap-3 h-full">
          {/* Slots visualizer */}
          <div className="pixel-panel p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center pl-0.5">
              <span className="text-4xs font-bold text-slate-500 uppercase tracking-widest">Spell Slots Queue</span>
              {slots.filter(s => s.filled).length >= 2 && (
                <div className={`text-5xs font-black px-1.5 py-0.5 border tracking-widest uppercase animate-pulse ${
                  slots.filter(s => s.filled).length === 3
                    ? "bg-amber-950/80 border-amber-600/80 text-amber-400 shadow shadow-amber-500/10"
                    : "bg-purple-950/80 border-purple-500/80 text-purple-400"
                }`}>
                  {slots.filter(s => s.filled).length === 3 ? "3x COMBO (+35%)" : "2x COMBO (+15%)"}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {slots.map((slot, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedSlot(i + 1)}
                  className={`flex-1 h-14 flex flex-col items-center justify-center border-2 text-sm font-bold relative transition-all duration-300 cursor-pointer ${
                    selectedSlot === i + 1
                      ? "scale-105 border-purple-400 shadow-md shadow-purple-500/20 ring-2 ring-purple-500/20"
                      : "border-slate-800"
                  } ${
                    slot.filled
                      ? "bg-slate-950 border-purple-500 text-purple-400"
                      : "bg-slate-950/20 text-slate-700 hover:bg-slate-900/20"
                  }`}
                >
                  {slot.filled ? (
                    <>
                      <span className="text-lg">{SPELLBOOK[slot.spellId as SpellId]?.unicodeSymbol || "✨"}</span>
                      <span className="text-5xs text-slate-500 font-semibold uppercase">{SPELLBOOK[slot.spellId as SpellId]?.name}</span>
                      <span className="absolute bottom-0.5 text-5xs text-purple-400/80 font-bold">
                        {Math.round(slot.accuracy * 100)}%
                      </span>
                      {slot.speedBonus && (
                        <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white text-5xs w-4 h-4 flex items-center justify-center shadow font-black border border-purple-400 animate-pulse">
                          ⚡
                        </span>
                      )}
                      {slot.inverted && (
                        <span className="absolute -top-1.5 -left-1.5 bg-red-950 text-red-400 border border-red-500/50 text-5xs w-4 h-4 flex items-center justify-center font-bold">
                          🛡️
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-800 font-normal">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 mt-1">
              <button
                onClick={resolvePracticeCast}
                className="flex-1 py-1.5 pixel-btn text-4xs active:scale-95 cursor-pointer transition-all"
              >
                Cast Spells (Space)
              </button>
              <button
                onClick={clearQueue}
                className="px-3 py-1.5 pixel-btn pixel-btn-close text-4xs active:scale-95 cursor-pointer transition-all"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Interactive Inversion Overlay warning */}
          {trainingMode === "active" && (
            <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-3.5 flex flex-col gap-1.5 animate-pulse shadow-lg shadow-red-500/10">
              <div className="flex justify-between items-center text-4xs font-black text-red-400 uppercase tracking-widest">
                <span>⚠️ OPPONENT INSCRIBING {SPELLBOOK[trainingSpell as SpellId]?.name}!</span>
                <span>{Math.round(trainingTimer / 100) / 10}s left</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-red-950">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${(trainingTimer / trainingDuration) * 100}%` }}
                />
              </div>
              <span className="text-5xs text-red-200 font-semibold leading-relaxed">
                Hold Shift + Draw the {SPELLBOOK[trainingSpell as SpellId]?.name} sigil (inverted) and press SPACE to block it!
              </span>
            </div>
          )}

          {/* Console / Log output */}
          <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto font-mono text-4xs text-slate-400 flex flex-col gap-1 shadow-inner scrollbar-thin">
            {logs.map((log, index) => {
              let textClass = "";
              if (log.startsWith("[Sealed]")) textClass = "text-purple-400 font-semibold";
              else if (log.startsWith("[System]")) textClass = "text-slate-500 italic";
              else if (log.includes("DMG") || log.includes("HP")) textClass = "text-rose-400/90";
              else if (log.includes("Mana")) textClass = "text-cyan-400/90";
              else if (log.includes("Shield")) textClass = "text-purple-400/90";
              else if (log.startsWith("🔮")) textClass = "text-purple-300 font-black tracking-widest border-b border-purple-500/20 pb-1 mb-1";
              else if (log.startsWith("✨")) textClass = "text-emerald-400 font-bold animate-pulse";
              else if (log.startsWith("💥") || log.startsWith("⚠️")) textClass = "text-red-400 font-bold";

              return (
                <div key={index} className={textClass}>
                  {log}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mechanics cheat sheet panel */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
        <span className="text-3xs font-extrabold text-slate-400 tracking-wider uppercase border-b border-slate-800 pb-1">
          ARCANE CALCULATION DETAILS & MATH FORMULAS
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-5xs text-slate-400 leading-relaxed font-semibold">
          <div className="flex flex-col gap-1">
            <span className="text-4xs text-purple-300 uppercase font-black">Accuracy Score</span>
            <p>Calculated dynamically using the 2D template matching distance.</p>
            <p className="font-mono text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-900/50">
              Acc = 1.0 - (Dist / (0.5 * sqrt(250^2 + 250^2)))
            </p>
            <p>Score must exceed <span className="text-purple-400">30%</span> to be recognized. Lower scores are discarded.</p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-4xs text-purple-300 uppercase font-black">Speed Bonus & Max Damage</span>
            <p>If drawing precision crosses <span className="text-purple-400">70%</span> before sealing, slot receives a speed bonus ⚡ (+8% boost).</p>
            <p className="font-mono text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-900/50">
              Max Single: Asurel (25) * 1.08 = 27 DMG
              Max Combo: 3x Asurel * 1.08 = 81 DMG!
            </p>
            <p>Combos execute sequentially. Shields absorb damage before HP bleed.</p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-4xs text-purple-300 uppercase font-black">Inversion Interrupts</span>
            <p>Drawing same chord with <span className="text-red-400">Shift</span> held mirrors the template upside down.</p>
            <p>Sealing an Inversion during the opponent's <span className="text-cyan-400">1.2s cast window</span> completely nullifies their spell cast!</p>
            <p>Practice reacting to opponent casts with the "Inversion training" trigger above.</p>
          </div>
        </div>
      </div>

      {/* Spell Dictionary Modal Overlay */}
      <SpellDictionary
        isOpen={showDictionary}
        onClose={() => setShowDictionary(false)}
        activeChord={activeChord}
        shiftHeld={shiftHeld}
      />
    </div>
  );
};
