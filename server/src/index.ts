import express from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { SERVER_CONFIG } from "./config.js";
import { World } from "./world/World.js";
import { SocketServer } from "./net/socketServer.js";
import { initDatabase, closeDatabase } from "./db/database.js";
import { TICK_MS } from "@tidefall/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", players: 0 });
});

// Serve client build in production
if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const httpServer = createServer(app);
const world = new World((msg) => socketServer.broadcast(msg as import("@tidefall/shared").ServerMessage));
const socketServer = new SocketServer(httpServer, world);

await initDatabase();

socketServer.start();

const tickInterval = setInterval(() => {
  world.tick(TICK_MS / 1000);
}, TICK_MS);

httpServer.listen(SERVER_CONFIG.port, () => {
  console.log(`Tidefall server running on port ${SERVER_CONFIG.port}`);
});

process.on("SIGINT", () => {
  clearInterval(tickInterval);
  socketServer.stop();
  closeDatabase();
  process.exit(0);
});
