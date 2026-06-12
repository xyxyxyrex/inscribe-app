export type SpellId = 
  | "Q"   // Quyra
  | "W"   // Wyra
  | "E"   // Eldra
  | "R"   // Rhael
  | "Q+W" // Vael - Cinderstorm
  | "Q+E" // Tharyn - Gravebind
  | "Q+R" // Asurel - Blinkstrike
  | "W+E" // Sorveth - Tidecurse
  | "W+R" // Luneth - Mirrorwind
  | "E+R"; // Draeven - Stonewind

export interface SpellDefinition {
  id: SpellId;
  name: string;
  chord: string;
  elements: string[];
  unicodeSymbol: string;
  manaCost: number;
  description: string;
}

export const SPELLBOOK: Record<SpellId, SpellDefinition> = {
  "Q": {
    id: "Q",
    name: "Quyra",
    chord: "Q",
    elements: ["Fire"],
    unicodeSymbol: "🜂",
    manaCost: 20,
    description: "12 flat damage + 3 DOT ticks (2 dmg/tick, 1s each). Accuracy scales DOT duration (50% acc = 1 tick, 100% = 3 ticks)."
  },
  "W": {
    id: "W",
    name: "Wyra",
    chord: "W",
    elements: ["Water"],
    unicodeSymbol: "🜄",
    manaCost: 5,
    description: "Restore mana. Base 25 mana at 100% accuracy, scales linearly to 8 mana at 0%."
  },
  "E": {
    id: "E",
    name: "Eldra",
    chord: "E",
    elements: ["Earth"],
    unicodeSymbol: "🜃",
    manaCost: 25,
    description: "Generate shield. 20 shield HP at 100% accuracy, scales to 5 at 0%. Shield decays 2 HP/second."
  },
  "R": {
    id: "R",
    name: "Rhael",
    chord: "R",
    elements: ["Air"],
    unicodeSymbol: "🜁",
    manaCost: 30,
    description: "Restore HP. 15 HP at 100% accuracy, scales to 4 HP at 0%."
  },
  "Q+W": {
    id: "Q+W",
    name: "Vael",
    chord: "Q+W",
    elements: ["Fire", "Water"],
    unicodeSymbol: "⚡",
    manaCost: 35,
    description: "20 burst damage + silences opponent for 1.5s (cannot begin new draw)."
  },
  "Q+E": {
    id: "Q+E",
    name: "Tharyn",
    chord: "Q+E",
    elements: ["Fire", "Earth"],
    unicodeSymbol: "⛧",
    manaCost: 40,
    description: "15 damage + curses opponent's next Eldra cast: if they cast Eldra within 3s, shield shatters and deals 8 recoil damage."
  },
  "Q+R": {
    id: "Q+R",
    name: "Asurel",
    chord: "Q+R",
    elements: ["Fire", "Air"],
    unicodeSymbol: "☄",
    manaCost: 30,
    description: "25 damage, no secondary effect. Fastest cast window of all combos (+15% speed bonus threshold instead of 70%, i.e., 55%)."
  },
  "W+E": {
    id: "W+E",
    name: "Sorveth",
    chord: "W+E",
    elements: ["Water", "Earth"],
    unicodeSymbol: "🝆",
    manaCost: 35,
    description: "Drains 20 mana from opponent over 4s (5/s). Reduces their next Wyra effectiveness by 50%."
  },
  "W+R": {
    id: "W+R",
    name: "Luneth",
    chord: "W+R",
    elements: ["Water", "Air"],
    unicodeSymbol: "☽",
    manaCost: 30,
    description: "Creates a 1.2s reflect window. Any Q-based spell cast by opponent during window is reflected back at them for 80% of its original damage."
  },
  "E+R": {
    id: "E+R",
    name: "Draeven",
    chord: "E+R",
    elements: ["Earth", "Air"],
    unicodeSymbol: "⬡",
    manaCost: 45,
    description: "Generates 12 shield HP + restores 8 HP simultaneously."
  }
};
