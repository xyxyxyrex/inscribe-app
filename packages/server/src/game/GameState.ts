import { Schema, type, ArraySchema } from "@colyseus/schema";

export class SpellSlot extends Schema {
  @type("string") spellId: string = "";        // spell key e.g. "Q+W"
  @type("number") accuracy: number = 0;        // 0.0–1.0
  @type("boolean") filled: boolean = false;
  @type("boolean") inverted: boolean = false;
}

export class PlayerState extends Schema {
  @type("string") sessionId: string = "";
  @type("number") hp: number = 100;
  @type("number") mana: number = 100;
  @type("number") shield: number = 0;
  @type("boolean") silenced: boolean = false;
  @type("string") activeChord: string = "";    // e.g. "Q+W" currently held
  @type("number") drawConfidence: number = 0;  // 0.0–1.0 live recognizer score
  @type("boolean") shiftHeld: boolean = false; // whether inversion is active
  @type([SpellSlot]) slots = new ArraySchema<SpellSlot>(); // 3 slots

  constructor() {
    super();
    // Pre-populate 3 slots
    for (let i = 0; i < 3; i++) {
      this.slots.push(new SpellSlot());
    }
  }
}

export class DuelState extends Schema {
  @type(PlayerState) player1 = new PlayerState();
  @type(PlayerState) player2 = new PlayerState();
  @type("number") timeRemaining: number = 90;
  @type("string") phase: string = "waiting";  // waiting | active | ended
  @type("string") winnerId: string = "";
}
