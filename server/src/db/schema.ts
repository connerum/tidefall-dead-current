export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS players (
  playerId TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  lastSeen INTEGER NOT NULL,
  scrap INTEGER NOT NULL DEFAULT 0,
  reputation_freeport INTEGER NOT NULL DEFAULT 0,
  reputation_salvagers INTEGER NOT NULL DEFAULT 0,
  reputation_wardens INTEGER NOT NULL DEFAULT 0,
  reputation_blackflag INTEGER NOT NULL DEFAULT 0,
  unlockedBlueprints TEXT NOT NULL DEFAULT '[]',
  stats_playerKills INTEGER NOT NULL DEFAULT 0,
  stats_aiKills INTEGER NOT NULL DEFAULT 0,
  stats_deaths INTEGER NOT NULL DEFAULT 0,
  stats_contractsCompleted INTEGER NOT NULL DEFAULT 0,
  stats_lootExtracted INTEGER NOT NULL DEFAULT 0,
  stats_distanceTraveled REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stash (
  playerId TEXT NOT NULL,
  itemId TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  data TEXT,
  PRIMARY KEY (playerId, itemId)
);

CREATE TABLE IF NOT EXISTS sessions (
  playerId TEXT PRIMARY KEY,
  connectedAt INTEGER NOT NULL
);
`;
