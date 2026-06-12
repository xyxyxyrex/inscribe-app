import { PlayerState } from "./GameState";
import { GAME } from "shared";

export interface ActiveEffects {
  silenceEnd: number;
  reflectEnd: number;
  gravebindEnd: number;
  gravebindActive: boolean;
  tidecurseEnd: number;
  tidecurseActive: boolean;
  dotTicks: number;
  dotNextTick: number;
  manaDrainTicks: number;
  manaDrainNextTick: number;
  speedBonusActive: boolean; // Speed bonus for next spell cast
  lastQuyraTime: number;      // For Quyra cleansing Sorveth
  lastRhaelTime: number;      // For Rhael cleansing Tharyn
}

export function createInitialEffects(): ActiveEffects {
  return {
    silenceEnd: 0,
    reflectEnd: 0,
    gravebindEnd: 0,
    gravebindActive: false,
    tidecurseEnd: 0,
    tidecurseActive: false,
    dotTicks: 0,
    dotNextTick: 0,
    manaDrainTicks: 0,
    manaDrainNextTick: 0,
    speedBonusActive: false,
    lastQuyraTime: 0,
    lastRhaelTime: 0
  };
}

export class EffectEngine {
  static update(
    p1State: PlayerState,
    p1Effects: ActiveEffects,
    p2State: PlayerState,
    p2Effects: ActiveEffects,
    deltaTimeMs: number,
    currentTime: number
  ) {
    const dtSeconds = deltaTimeMs / 1000;

    // 1. Passive Mana Regeneration (5 mana/second, max 100)
    if (p1State.hp > 0 && p2State.hp > 0) {
      p1State.mana = Math.min(GAME.MANA_MAX, p1State.mana + GAME.MANA_REGEN_PER_SECOND * dtSeconds);
      p2State.mana = Math.min(GAME.MANA_MAX, p2State.mana + GAME.MANA_REGEN_PER_SECOND * dtSeconds);
    }

    // 2. Shield Decay (2 HP/second)
    if (p1State.shield > 0) {
      p1State.shield = Math.max(0, p1State.shield - GAME.SHIELD_DECAY_PER_SECOND * dtSeconds);
    }
    if (p2State.shield > 0) {
      p2State.shield = Math.max(0, p2State.shield - GAME.SHIELD_DECAY_PER_SECOND * dtSeconds);
    }

    // 3. Silence Check
    p1State.silenced = currentTime < p1Effects.silenceEnd;
    p2State.silenced = currentTime < p2Effects.silenceEnd;

    // 4. Gravebind Curse Expiration
    if (p1Effects.gravebindActive && currentTime > p1Effects.gravebindEnd) {
      p1Effects.gravebindActive = false;
    }
    if (p2Effects.gravebindActive && currentTime > p2Effects.gravebindEnd) {
      p2Effects.gravebindActive = false;
    }

    // 5. Tidecurse Expiration
    if (p1Effects.tidecurseActive && currentTime > p1Effects.tidecurseEnd) {
      p1Effects.tidecurseActive = false;
    }
    if (p2Effects.tidecurseActive && currentTime > p2Effects.tidecurseEnd) {
      p2Effects.tidecurseActive = false;
    }

    // 6. DOT Ticks (Quyra)
    this.processDOT(p1State, p1Effects, currentTime);
    this.processDOT(p2State, p2Effects, currentTime);

    // 7. Mana Drain Ticks (Sorveth)
    this.processManaDrain(p1State, p1Effects, p2State, p2Effects, currentTime);
    this.processManaDrain(p2State, p2Effects, p1State, p1Effects, currentTime);
  }

  private static processDOT(player: PlayerState, effects: ActiveEffects, currentTime: number) {
    if (effects.dotTicks > 0 && currentTime >= effects.dotNextTick) {
      const damage = 2;
      // Apply damage through shield first
      if (player.shield > 0) {
        if (player.shield >= damage) {
          player.shield -= damage;
        } else {
          const bleed = damage - player.shield;
          player.shield = 0;
          player.hp = Math.max(0, player.hp - bleed);
        }
      } else {
        player.hp = Math.max(0, player.hp - damage);
      }

      effects.dotTicks--;
      effects.dotNextTick = currentTime + 1000;
    }
  }

  private static processManaDrain(
    victim: PlayerState,
    victimEffects: ActiveEffects,
    drainer: PlayerState,
    drainerEffects: ActiveEffects,
    currentTime: number
  ) {
    if (victimEffects.manaDrainTicks > 0 && currentTime >= victimEffects.manaDrainNextTick) {
      const drainAmount = Math.min(5, victim.mana);
      victim.mana = Math.max(0, victim.mana - drainAmount);
      drainer.mana = Math.min(GAME.MANA_MAX, drainer.mana + drainAmount);

      victimEffects.manaDrainTicks--;
      victimEffects.manaDrainNextTick = currentTime + 1000;
    }
  }
}
