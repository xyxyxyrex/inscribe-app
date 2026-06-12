import { SpellId } from "./spells";

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface SpellResult {
  casterId: string;
  spellId: SpellId;
  accuracy: number;
  inverted: boolean;
  damageDealt: number;
  hpHealed: number;
  manaRestored: number;
  shieldGained: number;
  interrupted: boolean;
  reflected: boolean;
  silenced: boolean;
  message: string;
}

export type ClientMessage =
  | { type: "CHORD_UPDATE"; chord: string; shiftHeld: boolean }
  | { type: "STROKE_POINT"; x: number; y: number; pressure: number; timestamp: number }
  | { type: "SEAL_SPELL"; strokePoints: StrokePoint[] }
  | { type: "CAST_SPELLS" }
  | { type: "SLOT_SELECT"; slot: 1 | 2 | 3 };

export type ServerMessage =
  | { type: "SPELL_RESOLVED"; results: SpellResult[] }
  | { type: "INTERRUPT_WINDOW_OPEN"; targetSpell: string }
  | { type: "INTERRUPT_WINDOW_CLOSED" }
  | { type: "CAST_RACE_WON"; winnerId: string }
  | { type: "MATCH_END"; winnerId: string; reason: "timer" | "hp_zero" }
  | { type: "RECOGNITION_RESULT"; accuracy: number; spellId: string; slot: number }
  | { type: "OPPONENT_STROKE_POINT"; x: number; y: number; pressure: number; timestamp: number }
  | { type: "OPPONENT_CLEAR_CANVAS" };
