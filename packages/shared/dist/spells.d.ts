export type SpellId = "Q" | "W" | "E" | "R" | "Q+W" | "Q+E" | "Q+R" | "W+E" | "W+R" | "E+R";
export interface SpellDefinition {
    id: SpellId;
    name: string;
    chord: string;
    elements: string[];
    unicodeSymbol: string;
    manaCost: number;
    description: string;
}
export declare const SPELLBOOK: Record<SpellId, SpellDefinition>;
