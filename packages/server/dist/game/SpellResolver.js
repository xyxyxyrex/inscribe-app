"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpellResolver = void 0;
const shared_1 = require("shared");
class SpellResolver {
    /**
     * Resolves casting all filled slots for a player.
     * Modifies state of caster and target, and updates active effects.
     */
    static resolveCast(caster, casterEffects, target, targetEffects, currentTime, casterId) {
        const results = [];
        const filledCount = caster.slots.filter(s => s && s.filled).length;
        const comboMultiplier = filledCount === 2 ? 1.15 : (filledCount === 3 ? 1.35 : 1.0);
        // Process slots in order: slot 1 -> slot 2 -> slot 3
        for (let i = 0; i < caster.slots.length; i++) {
            const slot = caster.slots[i];
            if (!slot || !slot.filled)
                continue;
            const spellId = slot.spellId;
            const spell = shared_1.SPELLBOOK[spellId];
            if (!spell)
                continue;
            // Deduct mana cost
            if (caster.mana < spell.manaCost) {
                results.push({
                    casterId,
                    spellId,
                    accuracy: slot.accuracy,
                    inverted: slot.inverted,
                    damageDealt: 0,
                    hpHealed: 0,
                    manaRestored: 0,
                    shieldGained: 0,
                    interrupted: false,
                    reflected: false,
                    silenced: false,
                    message: `Insufficient mana to cast ${spell.name} (${spell.manaCost} required, ${Math.floor(caster.mana)} available).`
                });
                slot.filled = false;
                slot.spellId = "";
                slot.accuracy = 0;
                slot.inverted = false;
                slot.speedBonus = false;
                continue;
            }
            caster.mana -= spell.manaCost;
            // Check for reflect on Q-based spells
            const isQBased = spell.chord.includes("Q");
            const isReflected = isQBased && currentTime < targetEffects.reflectEnd;
            let damageDealt = 0;
            let hpHealed = 0;
            let manaRestored = 0;
            let shieldGained = 0;
            let interrupted = false;
            let silenced = false;
            let message = "";
            // Calculate speed bonus multiplier (1.08) and combo multiplier
            const multiplier = (slot.speedBonus ? shared_1.GAME.SPEED_BONUS_MULTIPLIER : 1.0) * comboMultiplier;
            // Apply base effects
            switch (spellId) {
                case "Q": { // Quyra (Fire): 12 flat damage + DOT ticks
                    const baseDamage = Math.round(12 * slot.accuracy * multiplier);
                    if (isReflected) {
                        damageDealt = this.applyDamage(caster, Math.round(baseDamage * shared_1.GAME.REFLECT_DAMAGE_MULTIPLIER));
                        const ticks = slot.accuracy >= 0.9 ? 3 : (slot.accuracy >= 0.6 ? 2 : (slot.accuracy >= 0.3 ? 1 : 0));
                        if (ticks > 0) {
                            casterEffects.dotTicks = ticks;
                            casterEffects.dotNextTick = currentTime + 1000;
                        }
                        message = `${spell.name} reflected back for 80% damage!`;
                    }
                    else {
                        damageDealt = this.applyDamage(target, baseDamage);
                        const ticks = slot.accuracy >= 0.9 ? 3 : (slot.accuracy >= 0.6 ? 2 : (slot.accuracy >= 0.3 ? 1 : 0));
                        if (ticks > 0) {
                            targetEffects.dotTicks = ticks;
                            targetEffects.dotNextTick = currentTime + 1000;
                        }
                        message = `Dealt ${damageDealt} fire damage and applied DOT.`;
                    }
                    // Cleanse interaction: Quyra cast within 1s of Sorveth's curse cleanses mana drain ticks
                    if (casterEffects.tidecurseActive && currentTime - casterEffects.tidecurseAppliedAt <= 1000) {
                        casterEffects.manaDrainTicks = 0;
                        casterEffects.tidecurseActive = false;
                        message += " Cleansed Tidecurse mana drain!";
                    }
                    casterEffects.lastQuyraTime = currentTime;
                    break;
                }
                case "W": { // Wyra (Water): Restore mana. Base 25 at 100% acc, scales to 8 at 0%
                    let restoreVal = 8 + (25 - 8) * slot.accuracy;
                    if (casterEffects.tidecurseActive) {
                        restoreVal *= 0.5; // Tidecurse reduces Wyra by 50%
                        casterEffects.tidecurseActive = false; // consume debuff
                    }
                    manaRestored = Math.round(restoreVal * multiplier);
                    caster.mana = Math.min(shared_1.GAME.MANA_MAX, caster.mana + manaRestored);
                    message = `Restored ${manaRestored} mana.`;
                    break;
                }
                case "E": { // Eldra (Earth): Generate shield. 20 shield at 100% acc, scales to 5 at 0%
                    // Gravebind curse check: if caster is cursed, shield shatters and deals 8 recoil damage
                    if (casterEffects.gravebindActive) {
                        damageDealt = this.applyDamage(caster, 8);
                        casterEffects.gravebindActive = false; // consume curse
                        interrupted = true;
                        message = `Shield shattered by Tharyn's curse! Took 8 recoil damage.`;
                    }
                    else {
                        const shieldVal = 5 + (20 - 5) * slot.accuracy;
                        shieldGained = Math.round(shieldVal * multiplier);
                        caster.shield = Math.max(caster.shield, shieldGained);
                        message = `Gained ${shieldGained} shield.`;
                    }
                    break;
                }
                case "R": { // Rhael (Air): Restore HP. 15 HP at 100% acc, scales to 4 at 0%
                    const restoreVal = 4 + (15 - 4) * slot.accuracy;
                    hpHealed = Math.round(restoreVal * multiplier);
                    caster.hp = Math.min(shared_1.GAME.HP_MAX, caster.hp + hpHealed);
                    message = `Healed ${hpHealed} HP.`;
                    // Cleanse check: Rhael cast within 2s of Tharyn's curse cleanses it
                    if (casterEffects.gravebindActive && currentTime - casterEffects.gravebindAppliedAt <= 2000) {
                        casterEffects.gravebindActive = false;
                        message += " Cleansed Gravebind curse!";
                    }
                    casterEffects.lastRhaelTime = currentTime;
                    break;
                }
                case "Q+W": { // Vael (Cinderstorm): Silences opponent
                    const baseLength = Math.max(5, Math.round(5 * (slot.speedBonus ? shared_1.GAME.SPEED_BONUS_MULTIPLIER : 1.0) * slot.accuracy));
                    const extraKeys = (filledCount >= 2) ? (filledCount * 2) : 0;
                    const length = baseLength + extraKeys;
                    const keys = ["Q", "W", "E", "R"];
                    let seq = "";
                    for (let k = 0; k < length; k++) {
                        seq += keys[Math.floor(Math.random() * keys.length)];
                    }
                    if (isReflected) {
                        caster.silenceSequence = seq;
                        caster.silenceIndex = 0;
                        caster.silenced = true;
                        message = `${spell.name} reflected! Silenced yourself. Input sequence ${seq} to break.`;
                    }
                    else {
                        target.silenceSequence = seq;
                        target.silenceIndex = 0;
                        target.silenced = true;
                        silenced = true;
                        message = `Silenced opponent. They need to input sequence: ${seq}`;
                    }
                    break;
                }
                case "Q+E": { // Tharyn (Gravebind): 15 damage + curses opponent's next Eldra cast within 3s
                    const baseDamage = Math.round(15 * slot.accuracy * multiplier);
                    if (isReflected) {
                        damageDealt = this.applyDamage(caster, Math.round(baseDamage * shared_1.GAME.REFLECT_DAMAGE_MULTIPLIER));
                        casterEffects.gravebindActive = true;
                        casterEffects.gravebindEnd = currentTime + shared_1.GAME.GRAVEBIND_WINDOW_MS * comboMultiplier;
                        casterEffects.gravebindAppliedAt = currentTime;
                        message = `${spell.name} reflected! Cursed yourself.`;
                    }
                    else {
                        damageDealt = this.applyDamage(target, baseDamage);
                        targetEffects.gravebindActive = true;
                        targetEffects.gravebindEnd = currentTime + shared_1.GAME.GRAVEBIND_WINDOW_MS * comboMultiplier;
                        targetEffects.gravebindAppliedAt = currentTime;
                        message = `Dealt ${damageDealt} damage and cursed opponent's next Eldra cast.`;
                    }
                    break;
                }
                case "Q+R": { // Asurel (Blinkstrike): 25 damage, no secondary effect
                    const baseDamage = Math.round(25 * slot.accuracy * multiplier);
                    if (isReflected) {
                        damageDealt = this.applyDamage(caster, Math.round(baseDamage * shared_1.GAME.REFLECT_DAMAGE_MULTIPLIER));
                        message = `${spell.name} reflected! Took ${damageDealt} damage.`;
                    }
                    else {
                        damageDealt = this.applyDamage(target, baseDamage);
                        message = `Dealt ${damageDealt} direct damage.`;
                    }
                    break;
                }
                case "W+E": { // Sorveth (Tidecurse): Drains 20 mana over 4s (5/s), reduces next Wyra by 50%
                    targetEffects.manaDrainTicks = 4;
                    targetEffects.manaDrainNextTick = currentTime + 1000;
                    targetEffects.tidecurseActive = true;
                    targetEffects.tidecurseEnd = currentTime + shared_1.GAME.TIDECURSE_DURATION_MS * comboMultiplier;
                    targetEffects.tidecurseAppliedAt = currentTime;
                    message = "Applied Tidecurse (mana drain and Wyra debuff).";
                    break;
                }
                case "W+R": { // Luneth (Mirrorwind): 1.2s reflect window for Q-based spells
                    casterEffects.reflectEnd = currentTime + shared_1.GAME.MIRRORWIND_WINDOW_MS * comboMultiplier;
                    message = `Activated Mirrorwind (${(shared_1.GAME.MIRRORWIND_WINDOW_MS * comboMultiplier / 1000).toFixed(1)}s reflect window).`;
                    break;
                }
                case "E+R": { // Draeven (Stonewind): Generates 12 shield + restores 8 HP
                    shieldGained = Math.round(12 * multiplier);
                    hpHealed = Math.round(8 * multiplier);
                    caster.shield = Math.max(caster.shield, shieldGained);
                    caster.hp = Math.min(shared_1.GAME.HP_MAX, caster.hp + hpHealed);
                    message = `Gained ${shieldGained} shield and healed ${hpHealed} HP.`;
                    break;
                }
            }
            results.push({
                casterId,
                spellId,
                accuracy: slot.accuracy,
                inverted: slot.inverted,
                damageDealt,
                hpHealed,
                manaRestored,
                shieldGained,
                interrupted,
                reflected: isReflected,
                silenced,
                message
            });
            // Clear the slot after cast
            slot.filled = false;
            slot.spellId = "";
            slot.accuracy = 0;
            slot.inverted = false;
            slot.speedBonus = false;
        }
        return results;
    }
    static applyDamage(target, amount) {
        if (target.shield > 0) {
            if (target.shield >= amount) {
                target.shield -= amount;
                return 0;
            }
            else {
                const bleed = amount - target.shield;
                target.shield = 0;
                target.hp = Math.max(0, target.hp - bleed);
                return bleed;
            }
        }
        else {
            target.hp = Math.max(0, target.hp - amount);
            return amount;
        }
    }
}
exports.SpellResolver = SpellResolver;
