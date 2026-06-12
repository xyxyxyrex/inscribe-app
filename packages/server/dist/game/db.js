"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateUser = getOrCreateUser;
exports.recordMatchResult = recordMatchResult;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
// Initialize SQLite database in the server directory
const dbPath = path_1.default.join(__dirname, "../..", "sigil-duel.db");
const db = new better_sqlite3_1.default(dbPath);
// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    player1_id TEXT NOT NULL,
    player2_id TEXT NOT NULL,
    winner_id TEXT,
    reason TEXT,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
function getOrCreateUser(id, defaultUsername) {
    const selectStmt = db.prepare("SELECT * FROM users WHERE id = ?");
    const user = selectStmt.get(id);
    if (user) {
        return user;
    }
    const insertStmt = db.prepare("INSERT INTO users (id, username) VALUES (?, ?)");
    insertStmt.run(id, defaultUsername);
    return { id, username: defaultUsername, wins: 0, losses: 0 };
}
function recordMatchResult(p1Id, p2Id, winnerId, reason) {
    const matchId = Math.random().toString(36).substring(2, 11);
    const insertStmt = db.prepare(`
    INSERT INTO matches (id, player1_id, player2_id, winner_id, reason)
    VALUES (?, ?, ?, ?, ?)
  `);
    insertStmt.run(matchId, p1Id, p2Id, winnerId || null, reason);
    if (winnerId) {
        const loserId = winnerId === p1Id ? p2Id : p1Id;
        // Increment wins/losses
        db.prepare("UPDATE users SET wins = wins + 1 WHERE id = ?").run(winnerId);
        db.prepare("UPDATE users SET losses = losses + 1 WHERE id = ?").run(loserId);
    }
    console.log(`[DB] Recorded match ${matchId}. Winner: ${winnerId || 'Draw'}`);
}
exports.default = db;
