export type ChordCallback = (chord: string, shiftHeld: boolean) => void;
export type SpaceCallback = (action: "seal" | "cast") => void;
export type SlotSelectCallback = (slot: 1 | 2 | 3) => void;
export type TabCallback = () => void;

export class InputHandler {
  private heldKeys = new Set<string>();
  private shiftHeld = false;
  private onChordChange: ChordCallback;
  private onSpacePress: SpaceCallback;
  private onSlotSelect: SlotSelectCallback;
  private onTabPress: TabCallback;
  private isSilenced: () => boolean;
  private onSilenceKeyPress: (key: string) => void;
  private activeChord = "";

  constructor(
    onChordChange: ChordCallback,
    onSpacePress: SpaceCallback,
    onSlotSelect: SlotSelectCallback,
    onTabPress: TabCallback,
    isSilenced: () => boolean,
    onSilenceKeyPress: (key: string) => void
  ) {
    this.onChordChange = onChordChange;
    this.onSpacePress = onSpacePress;
    this.onSlotSelect = onSlotSelect;
    this.onTabPress = onTabPress;
    this.isSilenced = isSilenced;
    this.onSilenceKeyPress = onSilenceKeyPress;
    
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  public destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Prevent default browser tab navigation
    if (e.key === "Tab") {
      e.preventDefault();
      this.onTabPress();
      return;
    }

    const key = e.key.toUpperCase();

    if (this.isSilenced()) {
      if (["Q", "W", "E", "R"].includes(key)) {
        e.preventDefault();
        this.onSilenceKeyPress(key);
      }
      if (["1", "2", "3", " ", "SHIFT"].includes(key)) {
        e.preventDefault();
      }
      return;
    }

    // Avoid default browser scrolling for Space key
    if (e.key === " ") {
      e.preventDefault();
    }

    if (["1", "2", "3"].includes(key)) {
      this.onSlotSelect(parseInt(key) as 1 | 2 | 3);
      return;
    }

    if (e.repeat) return;

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
    if (this.isSilenced()) return;

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
    const keyOrder = ["Q", "W", "E", "R"];
    const sortedKeys = Array.from(this.heldKeys).sort((a, b) => keyOrder.indexOf(a) - keyOrder.indexOf(b));
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
