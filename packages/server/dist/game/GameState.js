"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuelState = exports.PlayerState = exports.SpellSlot = void 0;
const schema_1 = require("@colyseus/schema");
const shared_1 = require("shared");
class SpellSlot extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.spellId = ""; // spell key e.g. "Q+W"
        this.accuracy = 0; // 0.0–1.0
        this.filled = false;
        this.inverted = false;
        this.speedBonus = false;
    }
}
exports.SpellSlot = SpellSlot;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], SpellSlot.prototype, "spellId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], SpellSlot.prototype, "accuracy", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], SpellSlot.prototype, "filled", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], SpellSlot.prototype, "inverted", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], SpellSlot.prototype, "speedBonus", void 0);
class PlayerState extends schema_1.Schema {
    constructor() {
        super();
        this.sessionId = "";
        this.hp = shared_1.GAME.HP_MAX;
        this.mana = 100;
        this.shield = 0;
        this.silenced = false;
        this.silenceSequence = "";
        this.silenceIndex = 0;
        this.reflecting = false; // Mirrorwind active
        this.cursed = false; // Gravebind active
        this.draining = false; // Tidecurse active
        this.activeChord = ""; // e.g. "Q+W" currently held
        this.drawConfidence = 0; // 0.0–1.0 live recognizer score
        this.shiftHeld = false; // whether inversion is active
        this.selectedSlot = 1; // currently active slot (1, 2, or 3)
        this.slots = new schema_1.ArraySchema(); // 3 slots
        // Pre-populate 3 slots
        for (let i = 0; i < 3; i++) {
            this.slots.push(new SpellSlot());
        }
    }
}
exports.PlayerState = PlayerState;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlayerState.prototype, "sessionId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerState.prototype, "hp", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerState.prototype, "mana", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerState.prototype, "shield", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], PlayerState.prototype, "silenced", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlayerState.prototype, "silenceSequence", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerState.prototype, "silenceIndex", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], PlayerState.prototype, "reflecting", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], PlayerState.prototype, "cursed", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], PlayerState.prototype, "draining", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlayerState.prototype, "activeChord", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerState.prototype, "drawConfidence", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], PlayerState.prototype, "shiftHeld", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerState.prototype, "selectedSlot", void 0);
__decorate([
    (0, schema_1.type)([SpellSlot]),
    __metadata("design:type", Object)
], PlayerState.prototype, "slots", void 0);
class DuelState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.player1 = new PlayerState();
        this.player2 = new PlayerState();
        this.timeRemaining = 90;
        this.phase = "waiting"; // waiting | active | ended
        this.winnerId = "";
        this.overtime = false;
    }
}
exports.DuelState = DuelState;
__decorate([
    (0, schema_1.type)(PlayerState),
    __metadata("design:type", Object)
], DuelState.prototype, "player1", void 0);
__decorate([
    (0, schema_1.type)(PlayerState),
    __metadata("design:type", Object)
], DuelState.prototype, "player2", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], DuelState.prototype, "timeRemaining", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], DuelState.prototype, "phase", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], DuelState.prototype, "winnerId", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], DuelState.prototype, "overtime", void 0);
