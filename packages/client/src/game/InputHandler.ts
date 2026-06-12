export type ChordCallback = (chord: string, shiftHeld: boolean) => void;
export type SpaceCallback = (action: "seal" | "cast") => void;

export class InputHandler {
  private heldKeys = new Set<string>();
  private shiftHeld = false;
  private onChordChange: ChordCallback;
  private onSpacePress: SpaceCallback;
  private activeChord = "";

  constructor(onChordChange: ChordCallback, onSpacePress: SpaceCallback) {
    this.onChordChange = onChordChange;
    this.onSpacePress = onSpacePress;
    
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  public destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Avoid default browser scrolling for Space key
    if (e.key === " ") {
      e.preventDefault();
    }

    if (e.repeat) return;

    const key = e.key.toUpperCase();

    if (key === "SHIFT") {
      this.shiftHeld = true;
      this.triggerChordUpdate();
      return;
    }

    if (key === " ") {
      // Space is dual-purpose:
      // If we are actively holding a chord, we want to seal the spell.
      // Otherwise, we want to cast all sealed spells.
      if (this.activeChord !== "") {
        this.onSpacePress("seal");
      } else {
        this.onSpacePress("cast");
      }
      return;
    }

    if (["Q", "W", "E", "R"].includes(key)) {
      this.heldKeys.add(key);
      this.triggerChordUpdate();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toUpperCase();

    if (key === "SHIFT") {
      this.shiftHeld = false;
      this.triggerChordUpdate();
      return;
    }

    if (["Q", "W", "E", "R"].includes(key)) {
      this.heldKeys.delete(key);
      this.triggerChordUpdate();
    }
  };

  private triggerChordUpdate() {
    // Generate active chord string (sorted list of held keys)
    const sortedKeys = Array.from(this.heldKeys).sort();
    const newChord = sortedKeys.join("+");

    if (newChord !== this.activeChord) {
      this.activeChord = newChord;
    }
    
    this.onChordChange(this.activeChord, this.shiftHeld);
  }

  public getActiveChord(): string {
    return this.activeChord;
  }

  public isShiftHeld(): boolean {
    return this.shiftHeld;
  }
}
