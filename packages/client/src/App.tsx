import { useState, useEffect, useRef } from "react";
import { Room } from "colyseus.js";
import { StrokePoint, SpellResult } from "shared";
import { GameClient } from "./game/GameClient";
import { InputHandler } from "./game/InputHandler";
import { DrawingCanvas } from "./components/DrawingCanvas";
import { OpponentCanvas, OpponentCanvasRef } from "./components/OpponentCanvas";
import { HUD } from "./components/HUD";
import { Matchmaking } from "./components/Matchmaking";

export default function App() {
  const [username, setUsername] = useState("");
  const [matchmakingStatus, setMatchmakingStatus] = useState<"idle" | "connecting" | "queueing" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  
  // Game state (synced from Colyseus Room Schema)
  const [phase, setPhase] = useState<"waiting" | "active" | "ended">("waiting");
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [winnerId, setWinnerId] = useState("");
  
  // Player state variables
  const [playerHP, setPlayerHP] = useState(100);
  const [playerMana, setPlayerMana] = useState(100);
  const [playerShield, setPlayerShield] = useState(0);
  const [playerSilenced, setPlayerSilenced] = useState(false);
  const [playerSlots, setPlayerSlots] = useState<{ spellId: string; accuracy: number; filled: boolean; speedBonus?: boolean }[]>([]);

  // Opponent state variables
  const [opponentHP, setOpponentHP] = useState(100);
  const [opponentMana, setOpponentMana] = useState(100);
  const [opponentShield, setOpponentShield] = useState(0);
  const [opponentSilenced, setOpponentSilenced] = useState(false);
  const [opponentSlots, setOpponentSlots] = useState<{ spellId: string; accuracy: number; filled: boolean }[]>([]);

  // Local interaction states
  const [activeChord, setActiveChord] = useState("");
  const [shiftHeld, setShiftHeld] = useState(false);
  const [castRaceWinner, setCastRaceWinner] = useState("");
  const [spellFeed, setSpellFeed] = useState<string[]>([]);
  
  // Client instance refs
  const gameClientRef = useRef<GameClient | null>(null);
  const inputHandlerRef = useRef<InputHandler | null>(null);
  const lastStrokePointsRef = useRef<StrokePoint[]>([]);
  const opponentCanvasRef = useRef<OpponentCanvasRef | null>(null);

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

  const handleJoinQueue = async (name: string) => {
    setUsername(name);
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

        const isPlayer1 = state.player1.sessionId === roomInstance.sessionId;
        const me = isPlayer1 ? state.player1 : state.player2;
        const opp = isPlayer1 ? state.player2 : state.player1;

        if (me) {
          setPlayerHP(me.hp);
          setPlayerMana(me.mana);
          setPlayerShield(me.shield);
          setPlayerSilenced(me.silenced);
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
        });
        setSpellFeed((prev) => [...logs, ...prev].slice(0, 15));
      });

      roomInstance.onMessage("RECOGNITION_RESULT", (msg: { spellId: string; accuracy: number; slot: number; message: string }) => {
        setSpellFeed((prev) => [`[System] ${msg.message}`, ...prev].slice(0, 15));
      });

      roomInstance.onMessage("MATCH_END", (msg: { winnerId: string; reason: string }) => {
        setSpellFeed((prev) => [`[Match End] ${msg.reason === "hp_zero" ? "A Mage was defeated." : "Time limit reached."}`, ...prev].slice(0, 15));
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
          } else {
            if (gameClientRef.current) {
              gameClientRef.current.sendCastSpells();
            }
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
  }, [phase, room]);

  const handleManualCast = () => {
    if (gameClientRef.current) {
      gameClientRef.current.sendCastSpells();
    }
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans antialiased selection:bg-purple-500/30">
      {room === null || phase === "waiting" ? (
        <Matchmaking
          onJoin={handleJoinQueue}
          status={matchmakingStatus}
          errorMessage={errorMessage}
        />
      ) : (
        <div className="flex flex-col gap-6 items-center py-4 max-w-6xl mx-auto">
          {/* Main Dueling Arena HUD */}
          <HUD
            playerHP={playerHP}
            playerMana={playerMana}
            playerShield={playerShield}
            playerSilenced={playerSilenced}
            playerSlots={playerSlots}
            opponentHP={opponentHP}
            opponentMana={opponentMana}
            opponentShield={opponentShield}
            opponentSilenced={opponentSilenced}
            opponentSlots={opponentSlots}
            timeRemaining={timeRemaining}
            onCastPress={handleManualCast}
            castRaceWinner={castRaceWinner}
            mySessionId={room.sessionId}
            opponentSessionId={room.sessionId === room.state.player1.sessionId ? room.state.player2.sessionId : room.state.player1.sessionId}
          />

          {/* Dueling Canvas Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl h-[450px]">
            {/* Opponent Canvas Mirror */}
            <div className="flex flex-col gap-1.5 h-full">
              <span className="text-3xs text-cyan-400 font-bold uppercase tracking-wider pl-1">
                Opponent Inscribing
              </span>
              <OpponentCanvas
                ref={opponentCanvasRef}
                activeChord={room.sessionId === room.state.player1.sessionId ? room.state.player2.activeChord : room.state.player1.activeChord}
                shiftHeld={room.sessionId === room.state.player1.sessionId ? room.state.player2.shiftHeld : room.state.player1.shiftHeld}
              />
            </div>

            {/* Player Drawing Canvas */}
            <div className="flex flex-col gap-1.5 h-full">
              <span className="text-3xs text-purple-400 font-bold uppercase tracking-wider pl-1">
                Your Arcane Canvas
              </span>
              <DrawingCanvas
                activeChord={activeChord}
                shiftHeld={shiftHeld}
                onStrokePoint={(x, y, pressure, timestamp) => {
                  if (gameClientRef.current) {
                    gameClientRef.current.sendStrokePoint(x, y, pressure, timestamp);
                  }
                }}
                onStrokeEnd={(points) => {
                  lastStrokePointsRef.current = points;
                }}
              />
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
        </div>
      )}
    </main>
  );
}
