"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const colyseus_1 = require("colyseus");
const ws_transport_1 = require("@colyseus/ws-transport");
const monitor_1 = require("@colyseus/monitor");
const DuelRoom_1 = require("./rooms/DuelRoom");
// Load environment variables
dotenv_1.default.config();
const port = Number(process.env.PORT || 2567);
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Express status check route
app.get("/status", (req, res) => {
    res.json({ status: "running", time: new Date() });
});
// Register Colyseus monitor for debugging
app.use("/colyseus", (0, monitor_1.monitor)());
const server = http_1.default.createServer(app);
// Initialize Colyseus Game Server
const gameServer = new colyseus_1.Server({
    transport: new ws_transport_1.WebSocketTransport({
        server,
        pingInterval: 5000,
        pingMaxRetries: 3,
        maxPayload: 1024 * 1024 // 1MB payload limit
    })
});
// Register Duel Room
gameServer.define("duel", DuelRoom_1.DuelRoom);
server.listen(port, () => {
    console.log(`[Server] Sigil Duel server running on http://localhost:${port}`);
    console.log(`[Server] Monitor dashboard available at http://localhost:${port}/colyseus`);
});
