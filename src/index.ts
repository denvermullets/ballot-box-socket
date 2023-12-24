import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createClient, RedisClientType } from "redis";

const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const app = express();

app.set("trust proxy", 1);
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/api/ws/" });

const pubClient: RedisClientType = createClient({ url: REDIS_URL });
const subClient: RedisClientType = pubClient.duplicate();

const initPubSub = async () => {
  await Promise.all([pubClient.connect(), subClient.connect()]);

  await subClient.subscribe("activity_feed", (message, channel) => {
    console.log(`Received message: ${message} from channel: ${channel}`);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
};

initPubSub();

pubClient.on("error", (err) => console.error("Redis pubClient Error:", err));
subClient.on("error", (err) => console.error("Redis subClient Error:", err));

wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.on("message", (message) => console.log("Received:", message));
  ws.on("close", () => console.log("Client disconnected"));
});

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
