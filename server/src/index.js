import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

import { registerSocketEvents } from "./socket/events.js";

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    name: "ProxySpeak Server",
    status: "running"
  });
});

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "proxyspeak-server"
  });
});

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

// Socket.io connection/join/leave lifecycle is owned by the real-time event module.
registerSocketEvents(io);

httpServer.listen(PORT, () => {
  console.log(`ProxySpeak server running on http://localhost:${PORT}`);
});
