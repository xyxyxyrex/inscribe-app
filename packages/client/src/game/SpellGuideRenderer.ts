import { SPELLBOOK } from "shared";
import type { SpellId } from "shared";

export class SpellGuideRenderer {
  public static draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    chord: string,
    shiftHeld: boolean
  ) {
    const spell = SPELLBOOK[chord as SpellId];
    if (!spell) return;

    ctx.save();
    
    // Set up canvas origin at center for rotation
    ctx.translate(width / 2, height / 2);

    if (shiftHeld) {
      // Inversion guide: rotated 180 degrees
      ctx.rotate(Math.PI);
    }

    // Render the Unicode glyph centered
    const fontSize = Math.min(width, height) * 0.5;
    ctx.font = `bold ${fontSize}px "Noto Sans Runic", "Outfit", "Inter", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Choose a premium glow style
    // Fire -> reddish-orange, Water -> azure, Earth -> emerald, Air -> gold, Combos -> purple/violet
    let glowColor = "rgba(168, 85, 247, 0.25)"; // Purple default for combos
    if (spell.chord === "Q") glowColor = "rgba(239, 68, 68, 0.25)"; // Red
    else if (spell.chord === "W") glowColor = "rgba(59, 130, 246, 0.25)"; // Blue
    else if (spell.chord === "E") glowColor = "rgba(16, 185, 129, 0.25)"; // Green
    else if (spell.chord === "R") glowColor = "rgba(234, 179, 8, 0.25)"; // Gold

    ctx.fillStyle = glowColor;
    
    // Draw shadow/glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = glowColor.replace("0.25", "0.8");
    ctx.fillText(spell.unicodeSymbol, 0, 0);

    ctx.restore();
  }
}
