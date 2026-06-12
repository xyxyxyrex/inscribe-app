import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { DuelRoom } from "./rooms/DuelRoom";

// Load environment variables
dotenv.config();

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

// Express status check route
app.get("/status", (req, res) => {
  res.json({ status: "running", time: new Date() });
});

// Register Colyseus monitor for debugging
app.use("/colyseus", monitor());

const server = http.createServer(app);

// Initialize Colyseus Game Server
const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    pingInterval: 5000,
    pingMaxRetries: 3
  })
});

// Register Duel Room
gameServer.define("duel", DuelRoom);

server.listen(port, () => {
  console.log(`[Server] Sigil Duel server running on http://localhost:${port}`);
  console.log(`[Server] Monitor dashboard available at http://localhost:${port}/colyseus`);
});
