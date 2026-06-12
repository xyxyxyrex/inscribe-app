import { useState, useEffect, useRef } from "react";
import { Room } from "colyseus.js";
import { SPELLBOOK, GAME } from "shared";
import type { SpellId, StrokePoint, SpellResult } from "shared";
import { GameClient } from "./game/GameClient";
import { InputHandler } from "./game/InputHandler";
import { DrawingCanvas } from "./components/DrawingCanvas";
import { OpponentCanvas } from "./components/OpponentCanvas";
import type { OpponentCanvasRef } from "./components/OpponentCanvas";
import { HUD } from "./components/HUD";
import { Matchmaking } from "./components/Matchmaking";
import { SpellDictionary } from "./components/SpellDictionary";
import { PracticeMode } from "./components/PracticeMode";
import { gsap } from "gsap";
import { SoundManager } from "./game/SoundManager";
import { VFXManager } from "./game/VFXManager";

export default function App() {
  const [matchmakingStatus, setMatchmakingStatus] = useState<"idle" | "connecting" | "queueing" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  
  // Game state (synced from Colyseus Room Schema)
  const [phase, setPhase] = useState<"waiting" | "active" | "ended">("waiting");
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [winnerId, setWinnerId] = useState("");
  
  // Player state variables
  const [playerHP, setPlayerHP] = useState<number>(GAME.HP_MAX);
  const [playerMana, setPlayerMana] = useState(100);
  const [playerShield, setPlayerShield] = useState(0);
  const [playerSilenced, setPlayerSilenced] = useState(false);
  const [playerSilenceSequence, setPlayerSilenceSequence] = useState("");
  const [playerSilenceIndex, setPlayerSilenceIndex] = useState(0);
  const [playerReflecting, setPlayerReflecting] = useState(false);
  const [playerCursed, setPlayerCursed] = useState(false);
  const [playerDraining, setPlayerDraining] = useState(false);
  const [playerSlots, setPlayerSlots] = useState<{ spellId: string; accuracy: number; filled: boolean; speedBonus?: boolean }[]>([]);
  const [playerSelectedSlot, setPlayerSelectedSlot] = useState(1);
  const [playerDrawConfidence, setPlayerDrawConfidence] = useState(0);

  // Opponent state variables
  const [opponentHP, setOpponentHP] = useState<number>(GAME.HP_MAX);
  const [opponentMana, setOpponentMana] = useState(100);
  const [opponentShield, setOpponentShield] = useState(0);
  const [opponentSilenced, setOpponentSilenced] = useState(false);
  const [opponentSilenceSequence, setOpponentSilenceSequence] = useState("");
  const [opponentSilenceIndex, setOpponentSilenceIndex] = useState(0);
  const [opponentReflecting, setOpponentReflecting] = useState(false);
  const [opponentCursed, setOpponentCursed] = useState(false);
  const [opponentDraining, setOpponentDraining] = useState(false);
  const [opponentSlots, setOpponentSlots] = useState<{ spellId: string; accuracy: number; filled: boolean }[]>([]);
  const [opponentSelectedSlot, setOpponentSelectedSlot] = useState(1);

  // Local interaction states
  const [activeChord, setActiveChord] = useState("");
  const [shiftHeld, setShiftHeld] = useState(false);
  const [castRaceWinner, setCastRaceWinner] = useState("");
  const [spellFeed, setSpellFeed] = useState<string[]>([]);
  const [showDictionary, setShowDictionary] = useState(false);
  const [overtime, setOvertime] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  
  // Client instance refs
  const gameClientRef = useRef<GameClient | null>(null);
  const inputHandlerRef = useRef<InputHandler | null>(null);
  const lastStrokePointsRef = useRef<StrokePoint[]>([]);
  const opponentCanvasRef = useRef<OpponentCanvasRef | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const opponentContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize GameClient on mount
  useEffect(() => {
    gameClientRef.current = new GameClient();
    return () => {
      if (gameClientRef.current) {
        gameClientRef.current.leave();
      }
      if (inputHandlerRef.current) {
        inputHandlerRef.current.destroy();
      }
    };
  }, []);

  const prevPlayerHP = useRef<number>(GAME.HP_MAX);
  const prevOpponentHP = useRef<number>(GAME.HP_MAX);

  // Sound and Screenshake on player taking damage
  useEffect(() => {
    if (phase === "active") {
      if (playerHP < prevPlayerHP.current) {
        SoundManager.playHit();
        if (playerContainerRef.current && !overtime) {
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
    } else {
      prevPlayerHP.current = GAME.HP_MAX;
    }
  }, [playerHP, phase, overtime]);

  // Sound and Screenshake on opponent taking damage
  useEffect(() => {
    if (phase === "active") {
      if (opponentHP < prevOpponentHP.current) {
        SoundManager.playHit();
        if (opponentContainerRef.current) {
          gsap.fromTo(
            opponentContainerRef.current,
            { x: -5, y: -5 },
            {
              x: 5,
              y: 5,
              duration: 0.04,
              repeat: 7,
              yoyo: true,
              ease: "sine.inOut",
              onComplete: () => {
                if (opponentContainerRef.current) {
                  opponentContainerRef.current.style.transform = "none";
                }
              }
            }
          );
        }
      }
      prevOpponentHP.current = opponentHP;
    } else {
      prevOpponentHP.current = GAME.HP_MAX;
    }
  }, [opponentHP, phase]);

  // Handle heartbeat audio during Overtime
  useEffect(() => {
    if (phase === "active" && overtime) {
      SoundManager.startHeartbeat(playerHP);
    } else {
      SoundManager.stopHeartbeat();
    }
    return () => {
      SoundManager.stopHeartbeat();
    };
  }, [overtime, playerHP, phase]);

  // Ambient BGM handler
  useEffect(() => {
    if (phase === "active") {
      SoundManager.startAmbientBGM();
    } else {
      SoundManager.stopAmbientBGM();
    }
    return () => {
      SoundManager.stopAmbientBGM();
    };
  }, [phase]);

  const triggerComboFlash = (casterId: string, castCount: number) => {
    const isMe = room && casterId === room.sessionId;
    const targetRef = isMe ? playerContainerRef : opponentContainerRef;
    
    if (targetRef.current) {
      const flashColor = castCount === 3 ? "rgba(234, 179, 8, 0.4)" : "rgba(168, 85, 247, 0.3)";
      const shakeRange = castCount === 3 ? 12 : 6;
      const shakeRepeat = castCount === 3 ? 12 : 8;

      gsap.fromTo(
        targetRef.current,
        { x: -shakeRange, y: -shakeRange },
        {
          x: shakeRange,
          y: shakeRange,
          duration: 0.04,
          repeat: shakeRepeat,
          yoyo: true,
          ease: "sine.inOut",
          onComplete: () => {
            if (targetRef.current) {
              targetRef.current.style.transform = "none";
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
      targetRef.current.appendChild(flashDiv);

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

  const handleJoinQueue = async (name: string) => {
    setMatchmakingStatus("connecting");
    setErrorMessage("");

    try {
      const gameClient = gameClientRef.current;
      if (!gameClient) return;

      const roomInstance = await gameClient.joinDuel(name);
      setRoom(roomInstance);
      setMatchmakingStatus("queueing");

      // Set up state listeners
      roomInstance.onStateChange((state) => {
        setPhase(state.phase as "waiting" | "active" | "ended");
        setTimeRemaining(state.timeRemaining);
        setWinnerId(state.winnerId);
        setOvertime(state.overtime || false);

        const isPlayer1 = state.player1.sessionId === roomInstance.sessionId;
        const me = isPlayer1 ? state.player1 : state.player2;
        const opp = isPlayer1 ? state.player2 : state.player1;

        if (me) {
          setPlayerHP(me.hp);
          setPlayerMana(me.mana);
          setPlayerShield(me.shield);
          setPlayerSilenced(me.silenced);
          setPlayerSilenceSequence(me.silenceSequence || "");
          setPlayerSilenceIndex(me.silenceIndex || 0);
          setPlayerReflecting(me.reflecting);
          setPlayerCursed(me.cursed);
          setPlayerDraining(me.draining);
          setPlayerDrawConfidence(me.drawConfidence || 0);
          setPlayerSelectedSlot(me.selectedSlot || 1);
          setPlayerSlots(
            me.slots.map((s: any) => ({
              spellId: s.spellId,
              accuracy: s.accuracy,
              filled: s.filled,
              speedBonus: s.speedBonus
            }))
          );
        }

        if (opp) {
          setOpponentHP(opp.hp);
          setOpponentMana(opp.mana);
          setOpponentShield(opp.shield);
          setOpponentSilenced(opp.silenced);
          setOpponentSilenceSequence(opp.silenceSequence || "");
          setOpponentSilenceIndex(opp.silenceIndex || 0);
          setOpponentReflecting(opp.reflecting);
          setOpponentCursed(opp.cursed);
          setOpponentDraining(opp.draining);
          setOpponentSelectedSlot(opp.selectedSlot || 1);
          setOpponentSlots(
            opp.slots.map((s: any) => ({
              spellId: s.spellId,
              accuracy: s.accuracy,
              filled: s.filled
            }))
          );
        }
      });

      // Listen to real-time custom messages from the server
      roomInstance.onMessage("OPPONENT_STROKE_POINT", (msg: { x: number; y: number; pressure: number }) => {
        if (opponentCanvasRef.current) {
          opponentCanvasRef.current.addPoint(msg.x, msg.y, msg.pressure);
        }
      });

      roomInstance.onMessage("OPPONENT_CLEAR_CANVAS", () => {
        if (opponentCanvasRef.current) {
          opponentCanvasRef.current.clearCanvas();
        }
      });

      roomInstance.onMessage("CAST_RACE_WON", (msg: { winnerId: string }) => {
        setCastRaceWinner(msg.winnerId);
      });

      roomInstance.onMessage("SPELL_RESOLVED", (msg: { results: SpellResult[] }) => {
        const logs: string[] = [];
        msg.results.forEach((r) => {
          const casterName = r.casterId === roomInstance.sessionId ? "You" : "Opponent";
          let effectText = r.message;
          logs.push(`[Cast] ${casterName} casted ${r.spellId}: ${effectText}`);

          const isCasterMe = r.casterId === roomInstance.sessionId;
          const isSelfTarget = ["W", "E", "R", "W+R", "E+R"].includes(r.spellId);

          if (r.inverted) {
            // Inverted spell triggers a golden nullification ward on the caster!
            const casterRef = isCasterMe ? playerContainerRef : opponentContainerRef;
            VFXManager.play("inversion", casterRef.current);
          } else if (r.reflected) {
            // Reflect: Caster gets hit by their own spell VFX!
            const casterRef = isCasterMe ? playerContainerRef : opponentContainerRef;
            VFXManager.play(r.spellId as SpellId, casterRef.current);

            // Reflecting player plays the reflect shield VFX!
            const reflectingRef = isCasterMe ? opponentContainerRef : playerContainerRef;
            VFXManager.play("reflect", reflectingRef.current);
          } else {
            // Standard target plays the spell VFX
            const targetRef = isSelfTarget
              ? (isCasterMe ? playerContainerRef : opponentContainerRef)
              : (isCasterMe ? opponentContainerRef : playerContainerRef);
            VFXManager.play(r.spellId as SpellId, targetRef.current);
          }
        });
        setSpellFeed((prev) => [...logs, ...prev].slice(0, 15));

        const castCount = msg.results.length;
        if (castCount >= 2 && msg.results[0]) {
          triggerComboFlash(msg.results[0].casterId, castCount);
        }
      });

      roomInstance.onMessage("RECOGNITION_RESULT", (msg: { spellId: string; accuracy: number; slot: number; message: string }) => {
        setSpellFeed((prev) => [`[System] ${msg.message}`, ...prev].slice(0, 15));
      });

      roomInstance.onMessage("MATCH_END", (msg: { winnerId: string; reason: string }) => {
        setSpellFeed((prev) => [`[Match End] ${msg.reason === "hp_zero" ? "A Mage was defeated." : "Time limit reached."}`, ...prev].slice(0, 15));
      });

      roomInstance.onMessage("SILENCE_FAIL", () => {
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
      });

    } catch (err: any) {
      console.error(err);
      setErrorMessage("Could not connect to Colyseus room. Make sure the server is running.");
      setMatchmakingStatus("idle");
    }
  };

  // Wire up InputHandler when game starts
  useEffect(() => {
    if (phase === "active" && room) {
      inputHandlerRef.current = new InputHandler(
        // onChordChange
        (chord, shift) => {
          if (playerSilenced) return;
          setActiveChord(chord);
          setShiftHeld(shift);
          if (gameClientRef.current) {
            gameClientRef.current.sendChordUpdate(chord, shift);
          }
        },
        // onSpacePress
        (action) => {
          if (action === "seal") {
            const points = lastStrokePointsRef.current;
            if (gameClientRef.current) {
              gameClientRef.current.sendSealSpell(points);
            }
            lastStrokePointsRef.current = [];
            SoundManager.playSeal();
          } else {
            if (gameClientRef.current) {
              gameClientRef.current.sendCastSpells();
            }
            SoundManager.playCast();
          }
        },
        // onSlotSelect
        (slot) => {
          if (gameClientRef.current) {
            gameClientRef.current.sendSlotSelect(slot);
          }
        },
        // onTabPress
        () => {
          setShowDictionary((prev) => !prev);
        },
        // isSilenced
        () => playerSilenced,
        // onSilenceKeyPress
        (key) => {
          if (gameClientRef.current) {
            gameClientRef.current.sendBreakSilenceKey(key);
          }
        }
      );
    }

    return () => {
      if (inputHandlerRef.current) {
        inputHandlerRef.current.destroy();
        inputHandlerRef.current = null;
      }
    };
  }, [phase, room, playerSilenced]);

  const handleManualCast = () => {
    if (gameClientRef.current) {
      gameClientRef.current.sendCastSpells();
    }
    SoundManager.playCast();
  };

  const handleReturnToLobby = () => {
    if (gameClientRef.current) {
      gameClientRef.current.leave();
    }
    setRoom(null);
    setPhase("waiting");
    setMatchmakingStatus("idle");
    setSpellFeed([]);
    setCastRaceWinner("");
  };

  const getRealtimeOutputText = () => {
    if (!activeChord) return "";
    const spell = SPELLBOOK[activeChord as SpellId];
    if (!spell) return "";

    const acc = playerDrawConfidence;
    const pct = Math.round(acc * 100);

    if (activeChord === "Q") {
      const dmg = Math.round(12 * acc);
      return `${dmg} DMG (${pct}% Acc)`;
    }
    if (activeChord === "Q+W") {
      const dmg = Math.round(20 * acc);
      return `${dmg} DMG (${pct}% Acc)`;
    }
    if (activeChord === "Q+E") {
      const dmg = Math.round(15 * acc);
      return `${dmg} DMG (${pct}% Acc)`;
    }
    if (activeChord === "Q+R") {
      const dmg = Math.round(25 * acc);
      return `${dmg} DMG (${pct}% Acc)`;
    }
    if (activeChord === "W") {
      const val = Math.round(8 + 17 * acc);
      return `+${val} Mana (${pct}% Acc)`;
    }
    if (activeChord === "E") {
      const val = Math.round(5 + 15 * acc);
      return `+${val} Shield (${pct}% Acc)`;
    }
    if (activeChord === "R") {
      const val = Math.round(4 + 11 * acc);
      return `+${val} Heal (${pct}% Acc)`;
    }
    return `${pct}% Accuracy`;
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 antialiased selection:bg-purple-500/30">
      {isPracticeMode ? (
        <PracticeMode onBack={() => setIsPracticeMode(false)} />
      ) : room === null || phase === "waiting" ? (
        <Matchmaking
          onJoin={handleJoinQueue}
          status={matchmakingStatus}
          errorMessage={errorMessage}
          onPractice={() => setIsPracticeMode(true)}
        />
      ) : (
        <div className="flex flex-col gap-6 items-center py-4 max-w-6xl mx-auto">
          {/* Main Dueling Arena HUD */}
          <HUD
            playerHP={playerHP}
            playerMana={playerMana}
            playerShield={playerShield}
            playerSilenced={playerSilenced}
            playerReflecting={playerReflecting}
            playerCursed={playerCursed}
            playerDraining={playerDraining}
            playerSlots={playerSlots}
            playerSelectedSlot={playerSelectedSlot}
            opponentHP={opponentHP}
            opponentMana={opponentMana}
            opponentShield={opponentShield}
            opponentSilenced={opponentSilenced}
            opponentReflecting={opponentReflecting}
            opponentCursed={opponentCursed}
            opponentDraining={opponentDraining}
            opponentSlots={opponentSlots}
            opponentSelectedSlot={opponentSelectedSlot}
            timeRemaining={timeRemaining}
            onCastPress={handleManualCast}
            castRaceWinner={castRaceWinner}
            mySessionId={room.sessionId}
            opponentSessionId={room.sessionId === room.state.player1.sessionId ? room.state.player2.sessionId : room.state.player1.sessionId}
            onSlotClick={(slot) => {
              if (gameClientRef.current) {
                gameClientRef.current.sendSlotSelect(slot);
              }
            }}
            overtime={overtime}
          />

          {/* Dueling Canvas Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl h-[550px]">
            {/* Opponent Canvas Mirror */}
            <div ref={opponentContainerRef} className="flex flex-col gap-1.5 h-full relative">
              <span className="text-3xs text-cyan-400 font-bold uppercase tracking-wider pl-1">
                Opponent Inscribing
              </span>
              <div className="flex-1 relative">
                <OpponentCanvas
                  ref={opponentCanvasRef}
                  activeChord={room.sessionId === room.state.player1.sessionId ? room.state.player2.activeChord : room.state.player1.activeChord}
                  shiftHeld={room.sessionId === room.state.player1.sessionId ? room.state.player2.shiftHeld : room.state.player1.shiftHeld}
                  overtime={overtime}
                />
                {opponentSilenced && (
                  <div className="absolute inset-0 bg-red-950/70 border border-red-500/30 rounded-xl flex flex-col items-center justify-center gap-2 z-30 backdrop-blur-sm shadow-xl animate-fade-in pointer-events-none">
                    <span className="text-2xl animate-pulse">🔒</span>
                    <h3 className="text-xs font-black tracking-widest text-red-400 uppercase">OPPONENT SILENCED</h3>
                    <div className="flex flex-wrap gap-1.5 justify-center mt-1 px-2 w-full">
                      {opponentSilenceSequence.split("").map((char, i) => {
                        const isCompleted = i < opponentSilenceIndex;
                        const isActive = i === opponentSilenceIndex;
                        
                        return (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded border flex items-center justify-center font-mono font-black text-[10px] transition-all duration-300 ${
                              isCompleted
                                ? "bg-emerald-950 border-emerald-500 text-emerald-400"
                                : isActive
                                ? "bg-red-950 border-red-500 text-red-400 animate-pulse scale-105"
                                : "bg-slate-900 border-slate-800 text-slate-600"
                            }`}
                          >
                            {char}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-5xs font-bold text-slate-400 tracking-wider">
                      ({opponentSilenceSequence.length - opponentSilenceIndex} keys remaining)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Player Drawing Canvas */}
            <div ref={playerContainerRef} className="flex flex-col gap-1.5 h-full relative">
              <div className="flex justify-between items-center pr-1">
                <span className="text-3xs text-purple-400 font-bold uppercase tracking-wider pl-1">
                  Your Arcane Canvas
                </span>
                {activeChord && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-4xs text-slate-500 font-semibold uppercase">Realtime Output:</span>
                    <span className="text-3xs font-black text-purple-400 bg-purple-950/60 border border-purple-500/20 px-2 py-0.5 rounded animate-pulse">
                      {getRealtimeOutputText()}
                    </span>
                  </div>
                )}
              </div>
              <DrawingCanvas
                key={`${playerSelectedSlot}-${activeChord}-${playerSlots.map(s => s.filled ? '1' : '0').join(',')}`}
                activeChord={activeChord}
                shiftHeld={shiftHeld}
                overtime={overtime}
                onStrokePoint={(x, y, pressure, timestamp) => {
                  if (playerSilenced) return;
                  if (gameClientRef.current) {
                    gameClientRef.current.sendStrokePoint(x, y, pressure, timestamp);
                  }
                }}
                onStrokeEnd={(points) => {
                  if (playerSilenced) return;
                  lastStrokePointsRef.current = points;
                }}
              />

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
                        {playerSilenceSequence.split("").map((char, i) => {
                          const isCompleted = i < playerSilenceIndex;
                          const isActive = i === playerSilenceIndex;
                          
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
                        ({playerSilenceSequence.length - playerSilenceIndex} keys remaining)
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {activeChord && SPELLBOOK[activeChord as SpellId] && (
                <div className="absolute bottom-3 left-3 right-3 p-3 bg-slate-950/90 border border-purple-500/30 rounded-xl text-3xs text-purple-200 backdrop-blur-md shadow-2xl animate-fade-in z-10 pointer-events-none">
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
          </div>

          {/* Bottom logs & Game end overlays */}
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-900/40 border border-slate-800 rounded-xl p-4 h-[120px] overflow-y-auto font-mono text-3xs text-slate-400 flex flex-col gap-1 shadow-inner scrollbar-thin">
              {spellFeed.length === 0 ? (
                <div className="text-slate-600 italic">No spells cast yet. Leyline is silent.</div>
              ) : (
                spellFeed.map((log, index) => (
                  <div key={index} className={log.startsWith("[System]") ? "text-purple-400/80" : log.startsWith("[Match End]") ? "text-yellow-500 font-semibold" : ""}>
                    {log}
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4 text-3xs text-slate-500 flex flex-col justify-center gap-1">
              <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Dueling Tips</div>
              <p>• Fast sigils get <span className="text-purple-400">+8% boost</span> if drawn above threshold first.</p>
              <p>• Catch opponent casting to launch an <span className="text-red-400">Inversion interrupt</span>.</p>
              <p>• Clear DOT (Quyra) by quickly casting any Fire spell.</p>
            </div>
          </div>

          {/* Game Over Modal overlay */}
          {phase === "ended" && (
            <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center backdrop-blur-sm z-50 animate-fade-in">
              <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-8 max-w-md w-full text-center flex flex-col gap-5 shadow-2xl relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-purple-500/30 rounded-full w-20 h-20 flex items-center justify-center text-4xl shadow-lg shadow-purple-500/10">
                  ⚔️
                </div>

                <div className="mt-8 flex flex-col gap-2">
                  <h2 className="text-3xl font-extrabold tracking-widest bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent filter drop-shadow">
                    DUEL CONCLUDED
                  </h2>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    {winnerId === "" ? (
                      <span className="text-yellow-500 font-bold">THE MATCH ENDED IN A DRAW</span>
                    ) : winnerId === room.sessionId ? (
                      <span className="text-green-400 font-bold">VICTORY! YOU ARE THE ARCHMAGE</span>
                    ) : (
                      <span className="text-red-400 font-bold">DEFEAT! THE OPPONENT WAS VICTORIOUS</span>
                    )}
                  </span>
                </div>

                <div className="bg-slate-950/70 rounded-xl p-4 flex flex-col gap-2 text-2xs text-slate-400 font-medium">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span>Your Final HP:</span>
                    <span className="font-bold text-slate-200">{Math.round(playerHP)} / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Opponent Final HP:</span>
                    <span className="font-bold text-slate-200">{Math.round(opponentHP)} / 100</span>
                  </div>
                </div>

                <button
                  onClick={handleReturnToLobby}
                  className="bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 border border-purple-500 text-white font-bold py-3 rounded-lg text-xs tracking-widest uppercase transition-all shadow-lg shadow-purple-500/20 active:scale-97 cursor-pointer"
                >
                  Return to Lobby
                </button>
              </div>
            </div>
          )}

          {/* Spell Dictionary overlay */}
          <SpellDictionary
            isOpen={showDictionary}
            onClose={() => setShowDictionary(false)}
            activeChord={activeChord}
            shiftHeld={shiftHeld}
          />
        </div>
      )}
    </main>
  );
}
