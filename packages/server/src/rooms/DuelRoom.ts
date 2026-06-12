import { Room, Client } from "colyseus";
import { DuelState, PlayerState, SpellSlot } from "../game/GameState";
import { SpellResolver } from "../game/SpellResolver";
import { EffectEngine, createInitialEffects, ActiveEffects } from "../game/EffectEngine";
import { SPELLBOOK, SpellId, StrokePoint, Recognizer, Point, GAME } from "shared";
import { recordMatchResult, getOrCreateUser } from "../game/db";

export class DuelRoom extends Room<DuelState> {
  maxClients = 2;
  private recognizer = new Recognizer();
  
  // Session IDs mapping
  private playerMap = new Map<string, PlayerState>();
  private effectsMap = new Map<string, ActiveEffects>();
  private pointsMap = new Map<string, StrokePoint[]>();

  // Global room state for cast race and interrupt window
  private interruptState = {
    end: 0,
    targetSpell: "" as SpellId | "",
    targetPlayer: "", // player who is drawing
    active: false
  };

  private castRaceState = {
    winnerId: "",
    active: false
  };

  private lastOvertimeTickTime: number = 0;

  onCreate(options: any) {
    this.setState(new DuelState());
    
    // Server game tick (100ms)
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 100);

    // Message handler: Chord update
    this.onMessage("CHORD_UPDATE", (client, message: { chord: string; shiftHeld: boolean }) => {
      if (this.state.phase !== "active") return;
      const player = this.playerMap.get(client.sessionId);
      if (!player) return;

      // Silence check
      if (player.silenced && message.chord !== "") {
        // Player is silenced, cannot draw
        return;
      }

      player.activeChord = message.chord;
      player.shiftHeld = message.shiftHeld;

      if (message.chord === "") {
        // Reset drawing points when chord is released
        this.pointsMap.set(client.sessionId, []);
        player.drawConfidence = 0;
        this.broadcast("OPPONENT_CLEAR_CANVAS", null, { except: client });
        
        // Close interrupt window if this player was drawing
        if (this.interruptState.active && this.interruptState.targetPlayer === client.sessionId) {
          this.closeInterruptWindow();
        }
      }
    });

    // Message handler: Slot selection
    this.onMessage("SLOT_SELECT", (client, message: { slot: number }) => {
      if (this.state.phase !== "active") return;
      const player = this.playerMap.get(client.sessionId);
      if (!player) return;
      if (message.slot >= 1 && message.slot <= 3) {
        player.selectedSlot = message.slot;
      }
    });

    // Message handler: Real-time stroke point
    this.onMessage("STROKE_POINT", (client, message: { x: number; y: number; pressure: number; timestamp: number }) => {
      if (this.state.phase !== "active") return;
      const player = this.playerMap.get(client.sessionId);
      if (!player) return;

      if (player.silenced) return;

      // Broadcast stroke point to opponent
      this.broadcast("OPPONENT_STROKE_POINT", {
        x: message.x,
        y: message.y,
        pressure: message.pressure,
        timestamp: message.timestamp
      }, { except: client });

      // Record point for server-side recognition
      let points = this.pointsMap.get(client.sessionId) || [];
      points.push(message);
      this.pointsMap.set(client.sessionId, points);

      // Run live recognition for early-lock / interrupt window
      if (points.length >= 5 && player.activeChord !== "") {
        const candidatePoints: Point[] = points.map(p => ({ x: p.x, y: p.y }));
        
        // Invert points if Shift is held
        let evalPoints = candidatePoints;
        if (player.shiftHeld) {
          let maxY = 0;
          for (const p of candidatePoints) {
            if (p.y > maxY) maxY = p.y;
          }
          evalPoints = candidatePoints.map(p => ({ x: p.x, y: maxY - p.y }));
        }

        const result = this.recognizer.recognize(evalPoints, player.activeChord ? (player.activeChord as SpellId) : undefined);
        
        // Check if the recognized spell matches templates for the currently held chord
        // e.g. Q chord can only match Q spell. Q+W chord can only match Q+W spell.
        const matchesChord = result.name === player.activeChord;
        
        if (matchesChord) {
          player.drawConfidence = result.score;

          // 1. Interrupt window check (confidence > 40%)
          if (
            result.score >= GAME.INTERRUPT_WINDOW_THRESHOLD && 
            !this.interruptState.active &&
            !player.shiftHeld // Can't interrupt an inversion attempt
          ) {
            this.openInterruptWindow(client.sessionId, result.name);
          }

          // 2. Cast race check (confidence > 70% or 55% for Asurel)
          let earlyLockThreshold: number = GAME.EARLY_LOCK_THRESHOLD;
          if (result.name === "Q+R") {
            // Asurel has a faster cast window (55% threshold)
            earlyLockThreshold = 0.55;
          }

          if (
            result.score >= earlyLockThreshold &&
            !this.castRaceState.active &&
            !player.shiftHeld
          ) {
            this.winCastRace(client.sessionId);
          }
        } else {
          player.drawConfidence = 0;
        }
      }
    });

    // Message handler: Seal Spell (SPACE first press)
    this.onMessage("SEAL_SPELL", (client, message: { strokePoints: StrokePoint[] }) => {
      if (this.state.phase !== "active") return;
      const player = this.playerMap.get(client.sessionId);
      const opponent = this.getOpponent(client.sessionId);
      const effects = this.effectsMap.get(client.sessionId);
      if (!player || !effects || !opponent) return;

      if (player.silenced) return;

      const points = message.strokePoints || this.pointsMap.get(client.sessionId) || [];
      if (points.length < 2) return;

      const candidatePoints: Point[] = points.map(p => ({ x: p.x, y: p.y }));
      
      // Invert points if Shift is held
      let evalPoints = candidatePoints;
      if (player.shiftHeld) {
        let maxY = 0;
        for (const p of candidatePoints) {
          if (p.y > maxY) maxY = p.y;
        }
        evalPoints = candidatePoints.map(p => ({ x: p.x, y: maxY - p.y }));
      }

      const result = this.recognizer.recognize(evalPoints, player.activeChord ? (player.activeChord as SpellId) : undefined);
      
      // Authoritative verification: Must match held chord and meet accuracy threshold (50% or 0.5)
      const matchesChord = result.name === player.activeChord;
      const accuracyThreshold = 0.5;

      if (matchesChord && result.score >= accuracyThreshold) {
        if (player.shiftHeld) {
          // --- INVERSION / NULLIFICATION MECHANIC ---
          const targetSpell = result.name;
          const targetSpellDef = SPELLBOOK[targetSpell];
          let nullified = false;

          if (targetSpellDef) {
            // Check if the inversion was sealed during an active interrupt window on the opponent
            const isInterruptSuccessful = 
              this.interruptState.active && 
              this.interruptState.targetPlayer === opponent.sessionId &&
              this.interruptState.targetSpell === targetSpell;

            if (isInterruptSuccessful) {
              // Nullify active draw
              opponent.activeChord = "";
              opponent.drawConfidence = 0;
              this.pointsMap.set(opponent.sessionId, []);
              this.broadcast("OPPONENT_CLEAR_CANVAS", null, { except: this.clients.find(c => c.sessionId === opponent.sessionId) });
              this.closeInterruptWindow();
              nullified = true;
            } else {
              // Try to nullify the opponent's active drawing elements
              const sharesElements = (spellId: SpellId) => {
                const s = SPELLBOOK[spellId];
                if (!s) return false;
                return s.elements.some(el => targetSpellDef.elements.includes(el));
              };

              if (opponent.activeChord !== "" && sharesElements(opponent.activeChord as SpellId)) {
                // Nullify active draw
                opponent.activeChord = "";
                opponent.drawConfidence = 0;
                this.pointsMap.set(opponent.sessionId, []);
                this.broadcast("OPPONENT_CLEAR_CANVAS", null, { except: this.clients.find(c => c.sessionId === opponent.sessionId) });
                nullified = true;
              } else {
                // Target most recently sealed slot
                for (let i = opponent.slots.length - 1; i >= 0; i--) {
                  const slot = opponent.slots[i];
                  if (slot && slot.filled && sharesElements(slot.spellId as SpellId)) {
                    // Nullify slot
                    slot.filled = false;
                    slot.spellId = "";
                    slot.accuracy = 0;
                    slot.inverted = false;
                    slot.speedBonus = false;
                    nullified = true;
                    break;
                  }
                }
              }
            }
          }

          // Inversions are consumed (never stored in own slot)
          client.send("RECOGNITION_RESULT", {
            accuracy: result.score,
            spellId: result.name,
            slot: 0, // 0 slot indicates inversion resolution
            message: nullified ? "Nullified opponent's element!" : "Inversion failed (no matching opponent element)."
          });
        } else {
          // --- STANDARD SPELL SEALING ---
          // Seal directly into the selected slot!
          const targetIndex = player.selectedSlot - 1;
          const slot = player.slots[targetIndex];
          if (slot) {
            slot.spellId = result.name;
            slot.accuracy = result.score;
            slot.filled = true;
            slot.inverted = false;
            
            // Apply cast race speed bonus
            if (effects.speedBonusActive) {
              slot.speedBonus = true;
              effects.speedBonusActive = false; // consume
            }

            client.send("RECOGNITION_RESULT", {
              accuracy: result.score,
              spellId: result.name,
              slot: player.selectedSlot,
              message: `Sealed ${SPELLBOOK[result.name].name} (${Math.round(result.score * 100)}% acc) into Slot ${player.selectedSlot}`
            });
          }
        }
      } else {
        client.send("RECOGNITION_RESULT", {
          accuracy: result.score,
          spellId: result.name,
          slot: -1,
          message: "Failed to recognize spell (low accuracy or wrong chord)."
        });
      }

      // Reset drawing states
      player.activeChord = "";
      player.drawConfidence = 0;
      player.shiftHeld = false;
      this.pointsMap.set(client.sessionId, []);
      this.broadcast("OPPONENT_CLEAR_CANVAS", null, { except: client });

      // Close interrupt window if this player was drawing
      if (this.interruptState.active && this.interruptState.targetPlayer === client.sessionId) {
        this.closeInterruptWindow();
      }
    });

    // Message handler: Break Silence Key (key press while silenced)
    this.onMessage("BREAK_SILENCE_KEY", (client, message: { key: string }) => {
      if (this.state.phase !== "active") return;
      const player = this.playerMap.get(client.sessionId);
      if (!player || !player.silenced || !player.silenceSequence) return;

      const expectedKey = player.silenceSequence[player.silenceIndex];
      const pressedKey = message.key.toUpperCase();

      if (pressedKey === expectedKey) {
        player.silenceIndex++;
        if (player.silenceIndex >= player.silenceSequence.length) {
          player.silenceSequence = "";
          player.silenceIndex = 0;
          player.silenced = false;
        }
      } else {
        player.silenceIndex = 0;
        client.send("SILENCE_FAIL");
      }
    });

    // Message handler: Cast Spells (SPACE second press)
    this.onMessage("CAST_SPELLS", (client) => {
      if (this.state.phase !== "active") return;
      const player = this.playerMap.get(client.sessionId);
      const opponent = this.getOpponent(client.sessionId);
      const effects = this.effectsMap.get(client.sessionId);
      const opponentEffects = this.effectsMap.get(opponent?.sessionId || "");

      if (!player || !opponent || !effects || !opponentEffects) return;

      // Resolve casts
      const results = SpellResolver.resolveCast(
        player,
        effects,
        opponent,
        opponentEffects,
        this.clock.currentTime,
        client.sessionId
      );

      if (results.length > 0) {
        this.broadcast("SPELL_RESOLVED", { results });
        
        // Reset cast race state after a cast resolves
        this.castRaceState.winnerId = "";
        this.castRaceState.active = false;
      }
    });
  }

  onJoin(client: Client, options: any) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    this.playerMap.set(client.sessionId, player);
    this.effectsMap.set(client.sessionId, createInitialEffects());
    this.pointsMap.set(client.sessionId, []);

    const username = options?.username || `Mage_${client.sessionId.substring(0, 4)}`;
    getOrCreateUser(client.sessionId, username);

    if (this.clients.length === 1) {
      this.state.player1 = player;
    } else if (this.clients.length === 2) {
      this.state.player2 = player;
      this.state.phase = "active";
      this.state.timeRemaining = 90;
    }
  }

  onLeave(client: Client, consented: boolean) {
    const remainingClient = this.clients.find(c => c.sessionId !== client.sessionId);
    
    if (this.state.phase === "active") {
      this.state.phase = "ended";
      if (remainingClient) {
        this.state.winnerId = remainingClient.sessionId;
        this.broadcast("MATCH_END", {
          winnerId: remainingClient.sessionId,
          reason: "disconnect"
        });
        recordMatchResult(client.sessionId, remainingClient.sessionId, remainingClient.sessionId, "disconnect");
      } else {
        recordMatchResult(client.sessionId, "", "", "disconnect");
      }
    }

    this.playerMap.delete(client.sessionId);
    this.effectsMap.delete(client.sessionId);
    this.pointsMap.delete(client.sessionId);
  }

  private update(deltaTimeMs: number) {
    if (this.state.phase !== "active") return;

    const currentTime = this.clock.currentTime;

    // 1. Timer countdown
    this.state.timeRemaining = Math.max(0, this.state.timeRemaining - deltaTimeMs / 1000);
    
    if (this.state.timeRemaining <= 30) {
      this.state.overtime = true;

      // Tick damage every 1 second (1000ms)
      if (this.state.timeRemaining > 0) {
        if (this.lastOvertimeTickTime === 0) {
          this.lastOvertimeTickTime = currentTime;
        }

        if (currentTime >= this.lastOvertimeTickTime + 1000) {
          this.applyOvertimeDamage(this.state.player1);
          this.applyOvertimeDamage(this.state.player2);
          this.lastOvertimeTickTime = currentTime;
        }
      }
    } else {
      this.state.overtime = false;
      this.lastOvertimeTickTime = 0;
    }
    
    if (this.state.timeRemaining <= 0) {
      this.endMatch("timer");
      return;
    }

    // 2. Active Effects & Regen Update
    const p1 = this.state.player1;
    const p2 = this.state.player2;
    const e1 = this.effectsMap.get(p1.sessionId);
    const e2 = this.effectsMap.get(p2.sessionId);

    if (p1 && p2 && e1 && e2) {
      EffectEngine.update(p1, e1, p2, e2, deltaTimeMs, currentTime);

      // Check for death
      if (p1.hp <= 0 || p2.hp <= 0) {
        this.endMatch("hp_zero");
        return;
      }
    }

    // 3. Interrupt window duration check
    if (this.interruptState.active && currentTime > this.interruptState.end) {
      this.closeInterruptWindow();
    }
  }

  private applyOvertimeDamage(player: PlayerState) {
    if (!player) return;
    if (player.hp > 1) {
      player.hp = Math.max(1, player.hp - 2);
    }
  }

  private getOpponent(sessionId: string): PlayerState | null {
    if (this.state.player1.sessionId === sessionId) return this.state.player2;
    if (this.state.player2.sessionId === sessionId) return this.state.player1;
    return null;
  }

  private openInterruptWindow(drawingPlayerId: string, spellId: SpellId) {
    this.interruptState.active = true;
    this.interruptState.end = this.clock.currentTime + GAME.INTERRUPT_WINDOW_DURATION_MS;
    this.interruptState.targetSpell = spellId;
    this.interruptState.targetPlayer = drawingPlayerId;

    this.broadcast("INTERRUPT_WINDOW_OPEN", {
      targetSpell: spellId
    });
  }

  private closeInterruptWindow() {
    this.interruptState.active = false;
    this.interruptState.targetSpell = "";
    this.interruptState.targetPlayer = "";

    this.broadcast("INTERRUPT_WINDOW_CLOSED", null);
  }

  private winCastRace(playerId: string) {
    this.castRaceState.winnerId = playerId;
    this.castRaceState.active = true;

    const effects = this.effectsMap.get(playerId);
    if (effects) {
      effects.speedBonusActive = true;
    }

    this.broadcast("CAST_RACE_WON", {
      winnerId: playerId
    });
  }

  private endMatch(reason: "timer" | "hp_zero") {
    this.state.phase = "ended";
    
    const p1 = this.state.player1;
    const p2 = this.state.player2;
    
    let winnerId = "";
    if (p1.hp > p2.hp) {
      winnerId = p1.sessionId;
    } else if (p2.hp > p1.hp) {
      winnerId = p2.sessionId;
    } // If equal, winnerId is empty string representing a draw

    this.state.winnerId = winnerId;
    
    // Record to SQLite
    recordMatchResult(p1.sessionId, p2.sessionId, winnerId, reason);

    this.broadcast("MATCH_END", {
      winnerId,
      reason
    });
  }
}
