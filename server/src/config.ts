import { SAFE_ZONE_RADIUS, STORM_WALL_RADIUS, WORLD_SIZE } from "@tidefall/shared";

export const SERVER_CONFIG = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  tickRate: 20,
  snapshotRate: 10,
  dbPath: process.env.DB_PATH || "./tidefall.db",
  worldSize: WORLD_SIZE,
  stormWallRadius: STORM_WALL_RADIUS,
  safeZoneRadius: SAFE_ZONE_RADIUS,
  maxPlayers: 64,
  devMode: process.env.NODE_ENV !== "production",
};
