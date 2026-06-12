import { Client, Room } from "colyseus.js";
import type { StrokePoint } from "shared";

const COLYSEUS_URL = (import.meta.env.VITE_COLYSEUS_URL as string) || `ws://${window.location.hostname}:2567`;

export class GameClient {
  private client: Client;
  private room: Room | null = null;

  constructor() {
    this.client = new Client(COLYSEUS_URL);
  }

  public async joinDuel(username: string): Promise<Room> {
    console.log(`[Colyseus] Connecting to ${COLYSEUS_URL}...`);
    this.room = await this.client.joinOrCreate("duel", { username });
    console.log(`[Colyseus] Connected. Room ID: ${this.room.id}, Session ID: ${this.room.sessionId}`);
    return this.room;
  }

  public leave() {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
  }

  public sendChordUpdate(chord: string, shiftHeld: boolean) {
    if (this.room) {
      this.room.send("CHORD_UPDATE", { chord, shiftHeld });
    }
  }

  public sendStrokePoint(x: number, y: number, pressure: number, timestamp: number) {
    if (this.room) {
      this.room.send("STROKE_POINT", { x, y, pressure, timestamp });
    }
  }

  public sendSealSpell(strokePoints: StrokePoint[]) {
    if (this.room) {
      this.room.send("SEAL_SPELL", { strokePoints });
    }
  }

  public sendCastSpells() {
    if (this.room) {
      this.room.send("CAST_SPELLS");
    }
  }

  public sendSlotSelect(slot: 1 | 2 | 3) {
    if (this.room) {
      this.room.send("SLOT_SELECT", { slot });
    }
  }

  public sendBreakSilenceKey(key: string) {
    if (this.room) {
      this.room.send("BREAK_SILENCE_KEY", { key });
    }
  }

  public getRoom(): Room | null {
    return this.room;
  }
}
