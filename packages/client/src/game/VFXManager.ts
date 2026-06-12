import type { SpellId } from "shared";

// Premium Gigapack & Sample VFX Imports
import fireExplosionVfx from "../assets/spells/Super Pixel Effects Gigapack (Free Version)/spritesheet/Explosions/stylized_explosion_001/stylized_explosion_001_large_yellow/spritesheet.png";
import absorbVfx from "../assets/spells/Super Pixel Effects Gigapack (Free Version)/spritesheet/Fantasy Spells/spell_absorb_001/spell_absorb_001_large_violet/spritesheet.png";
import defenseVfx from "../assets/spells/Super Pixel Effects Gigapack (Free Version)/spritesheet/Fantasy Spells/spell_defense_up_001/spell_defense_up_001_large_blue/spritesheet.png";
import heartBurstVfx from "../assets/spells/Super Pixel Effects Gigapack (Free Version)/spritesheet/Magic Bursts/round_heart_burst_001/round_heart_burst_001_large_red/spritesheet.png";
import skullSmokeVfx from "../assets/spells/Super Pixel Effects Gigapack (Free Version)/spritesheet/Smoke Bursts/stylized_skull_smoke_burst_001/stylized_skull_smoke_burst_001_large_white/spritesheet.png";
import poisonVfx from "../assets/spells/Super Pixel Effects Gigapack (Free Version)/spritesheet/Fantasy Spells/spell_poison_001/spell_poison_001_large_green/spritesheet.png";
import lightningVfx from "../assets/spells/Super Pixel Effects Gigapack (Free Version)/spritesheet/Lightning/lightning_strike_001/lightning_strike_001_large_violet/spritesheet.png";
import warpVfx from "../assets/spells/Super Pixel Effects Gigapack (Free Version)/spritesheet/Sci-fi/scifi_warp_003/scifi_warp_003_large_blue/spritesheet.png";

interface VFXConfig {
  src: string;
  frames: number;
  duration: number; // in seconds
  scale: number;
  position: "center" | "bottom" | "fill";
  filter?: string;
}

const VFX_MAP: Record<SpellId | "inversion" | "reflect", VFXConfig> = {
  "Q": { src: fireExplosionVfx, frames: 9, duration: 0.5, scale: 6.5, position: "center" }, // HUGE fireball explosion!
  "W": { src: absorbVfx, frames: 31, duration: 0.9, scale: 5.5, position: "center", filter: "hue-rotate(120deg) saturate(1.5)" }, // Blue water absorb portal
  "E": { src: defenseVfx, frames: 18, duration: 0.7, scale: 5.5, position: "center" }, // Shield matrix columns
  "R": { src: heartBurstVfx, frames: 23, duration: 0.8, scale: 5.5, position: "center" }, // Heart burst heal
  "Q+W": { src: skullSmokeVfx, frames: 12, duration: 0.6, scale: 6.5, position: "center" }, // Silence skull smoke
  "Q+E": { src: poisonVfx, frames: 17, duration: 0.6, scale: 5.5, position: "bottom", filter: "hue-rotate(280deg) saturate(2)" }, // Purple/Red Gravebind curse
  "Q+R": { src: lightningVfx, frames: 7, duration: 0.4, scale: 6.5, position: "center" }, // Lightning bolt blinkstrike
  "W+E": { src: poisonVfx, frames: 17, duration: 0.6, scale: 5.5, position: "bottom" }, // Green Tidecurse
  "W+R": { src: warpVfx, frames: 12, duration: 0.6, scale: 6.0, position: "center" }, // Blue warp portal reflection
  "E+R": { src: defenseVfx, frames: 18, duration: 0.7, scale: 5.5, position: "center" }, // Stonewind (Shield + Heal)
  "inversion": { src: warpVfx, frames: 12, duration: 0.6, scale: 5.5, position: "center", filter: "hue-rotate(240deg) saturate(1.8)" }, // Golden nullification ward portal
  "reflect": { src: warpVfx, frames: 12, duration: 0.6, scale: 6.0, position: "center" }, // Reflect portal shield
};

export class VFXManager {
  public static play(spellId: SpellId | "inversion" | "reflect", container: HTMLElement | null) {
    if (!container) return;

    const config = VFX_MAP[spellId];
    if (!config) return;

    // Trigger base VFX
    this.createEffect(config, container);

    // Special double effect for Stonewind (E+R) - show defense matrix and healing hearts!
    if (spellId === "E+R") {
      setTimeout(() => {
        const heartConfig: VFXConfig = {
          src: heartBurstVfx,
          frames: 23,
          duration: 0.8,
          scale: 5.5,
          position: "center",
        };
        this.createEffect(heartConfig, container);
      }, 150);
    }
  }

  private static createEffect(config: VFXConfig, container: HTMLElement) {
    const el = document.createElement("div");
    el.className = "sprite-vfx-element";
    
    // Assign CSS variables for custom spritesheet parameters
    el.style.setProperty("--sprite-frames", config.frames.toString());
    el.style.setProperty("--sprite-duration", `${config.duration}s`);
    
    // Styles
    el.style.backgroundImage = `url(${config.src})`;
    
    // Size scaling
    const size = 72 * config.scale;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.backgroundSize = `${size * config.frames}px ${size}px`;
    el.style.setProperty("--sprite-end-x", `-${size * config.frames}px`);
    
    if (config.filter) {
      el.style.filter = config.filter;
    }

    // Position
    if (config.position === "center") {
      el.style.left = "50%";
      el.style.top = "50%";
      el.style.transform = "translate(-50%, -50%)";
    } else if (config.position === "bottom") {
      el.style.left = "50%";
      el.style.bottom = "0px";
      el.style.transform = "translate(-50%, 0%)";
    }

    container.appendChild(el);

    // Remove element on animation end
    el.addEventListener("animationend", () => {
      el.remove();
    });

    // Fallback cleanup
    setTimeout(() => {
      if (el.parentNode) {
        el.remove();
      }
    }, config.duration * 1000 + 100);
  }
}

