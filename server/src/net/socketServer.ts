import { WebSocketServer, WebSocket } from "ws";
import { decodeMessage, encodeMessage, SNAPSHOT_MS, type ClientMessage, type ServerMessage } from "@tidefall/shared";
import type { Server } from "http";
import type { World } from "../world/World.js";
import { PlayerEntity } from "../world/PlayerEntity.js";
import type { PlayerEntity as PlayerEntityType } from "../world/PlayerEntity.js";
import { handleClientMessage } from "./messageHandlers.js";
import { loadOrCreateProfile, loadStash } from "../db/playersRepo.js";
import { PersistenceSystem } from "../systems/PersistenceSystem.js";

interface Client {
  ws: WebSocket;
  playerId?: string;
  player?: PlayerEntityType;
  lastPong: number;
}

export class SocketServer {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, Client>();
  private world: World;
  private persistence: PersistenceSystem;
  private snapshotInterval?: ReturnType<typeof setInterval>;

  constructor(server: Server, world: World) {
    this.world = world;
    this.persistence = new PersistenceSystem();
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.wss.on("connection", (ws) => this.onConnection(ws));
  }

  start(): void {
    this.snapshotInterval = setInterval(() => this.broadcastSnapshots(), SNAPSHOT_MS);
  }

  stop(): void {
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);
    this.wss.close();
  }

  private onConnection(ws: WebSocket): void {
    const client: Client = { ws, lastPong: Date.now() };
    this.clients.set(ws, client);

    ws.on("message", (raw) => {
      const msg = decodeMessage(raw.toString());
      if (!msg) return;
      this.handleMessage(client, msg as ClientMessage);
    });

    ws.on("close", () => {
      if (client.player) {
        this.persistence.savePlayer(client.player);
        this.world.removePlayer(client.player.playerId);
      }
      this.clients.delete(ws);
    });

    ws.on("pong", () => {
      client.lastPong = Date.now();
    });
  }

  private handleMessage(client: Client, msg: ClientMessage): void {
    if (msg.type === "join") {
      const playerId = msg.playerId || `guest_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const name = msg.name || "Raider";
      const player = new PlayerEntity(playerId, name, { x: 0, y: 0, z: 0 });
      this.persistence.loadPlayer(playerId, name, player);
      player.giveStarterGear();
      this.world.respawnPlayerAtHaven(player);
      this.world.addPlayer(player);
      client.playerId = playerId;
      client.player = player;

      this.send(client, { type: "auth", playerId });
      this.sendProfile(client, player);
      this.sendInventory(client, player);
      return;
    }

    if (!client.player) return;
    handleClientMessage(client.player, msg, this.world, (m) => this.send(client, m as ServerMessage));
  }

  send(client: Client, msg: ServerMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(encodeMessage(msg));
    }
  }

  sendProfile(client: Client, player: PlayerEntityType): void {
    const profile = loadOrCreateProfile(player.playerId, player.name);
    this.send(client, { type: "profile", data: profile });
  }

  sendInventory(client: Client, player: PlayerEntityType): void {
    this.send(client, { type: "inventory", data: this.world.serializeInventory(player) });
  }

  broadcastSnapshots(): void {
    for (const client of this.clients.values()) {
      if (!client.player) continue;
      const snapshot = this.world.getSnapshotForPlayer(client.player.playerId);
      this.send(client, { type: "snapshot", data: snapshot });
    }
  }

  broadcast(msg: ServerMessage): void {
    const raw = encodeMessage(msg);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(raw);
      }
    }
  }
}
