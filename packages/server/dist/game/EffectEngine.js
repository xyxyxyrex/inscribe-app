"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EffectEngine = void 0;
exports.createInitialEffects = createInitialEffects;
const shared_1 = require("shared");
function createInitialEffects() {
    return {
        silenceEnd: 0,
        reflectEnd: 0,
        gravebindEnd: 0,
        gravebindActive: false,
        gravebindAppliedAt: 0,
        tidecurseEnd: 0,
        tidecurseActive: false,
        tidecurseAppliedAt: 0,
        dotTicks: 0,
        dotNextTick: 0,
        manaDrainTicks: 0,
        manaDrainNextTick: 0,
        speedBonusActive: false,
        lastQuyraTime: 0,
        lastRhaelTime: 0
    };
}
class EffectEngine {
    static update(p1State, p1Effects, p2State, p2Effects, deltaTimeMs, currentTime) {
        const dtSeconds = deltaTimeMs / 1000;
        // 1. Passive Mana Regeneration (5 mana/second, max 100)
        if (p1State.hp > 0 && p2State.hp > 0) {
            p1State.mana = Math.min(shared_1.GAME.MANA_MAX, p1State.mana + shared_1.GAME.MANA_REGEN_PER_SECOND * dtSeconds);
            p2State.mana = Math.min(shared_1.GAME.MANA_MAX, p2State.mana + shared_1.GAME.MANA_REGEN_PER_SECOND * dtSeconds);
        }
        // 2. Shield Decay (2 HP/second)
        if (p1State.shield > 0) {
            p1State.shield = Math.max(0, p1State.shield - shared_1.GAME.SHIELD_DECAY_PER_SECOND * dtSeconds);
        }
        if (p2State.shield > 0) {
            p2State.shield = Math.max(0, p2State.shield - shared_1.GAME.SHIELD_DECAY_PER_SECOND * dtSeconds);
        }
        // 3. Silence & Indicator Checks
        p1State.silenced = p1State.silenceSequence.length > 0;
        p2State.silenced = p2State.silenceSequence.length > 0;
        p1State.reflecting = currentTime < p1Effects.reflectEnd;
        p2State.reflecting = currentTime < p2Effects.reflectEnd;
        p1State.cursed = p1Effects.gravebindActive;
        p2State.cursed = p2Effects.gravebindActive;
        p1State.draining = p1Effects.tidecurseActive;
        p2State.draining = p2Effects.tidecurseActive;
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
    static processDOT(player, effects, currentTime) {
        if (effects.dotTicks > 0 && currentTime >= effects.dotNextTick) {
            const damage = 2;
            // Apply damage through shield first
            if (player.shield > 0) {
                if (player.shield >= damage) {
                    player.shield -= damage;
                }
                else {
                    const bleed = damage - player.shield;
                    player.shield = 0;
                    player.hp = Math.max(0, player.hp - bleed);
                }
            }
            else {
                player.hp = Math.max(0, player.hp - damage);
            }
            effects.dotTicks--;
            effects.dotNextTick = currentTime + 1000;
        }
    }
    static processManaDrain(victim, victimEffects, drainer, drainerEffects, currentTime) {
        if (victimEffects.manaDrainTicks > 0 && currentTime >= victimEffects.manaDrainNextTick) {
            const drainAmount = Math.min(5, victim.mana);
            victim.mana = Math.max(0, victim.mana - drainAmount);
            drainer.mana = Math.min(shared_1.GAME.MANA_MAX, drainer.mana + drainAmount);
            victimEffects.manaDrainTicks--;
            victimEffects.manaDrainNextTick = currentTime + 1000;
        }
    }
}
exports.EffectEngine = EffectEngine;
