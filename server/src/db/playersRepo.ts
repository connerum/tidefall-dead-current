import type { Faction, ItemStack, PlayerProfile } from "@tidefall/shared";
import { prepare } from "./sqliteWrapper.js";

const FACTION_COLUMNS: Record<Faction, string> = {
  freeport: "reputation_freeport",
  salvagers: "reputation_salvagers",
  wardens: "reputation_wardens",
  blackflag: "reputation_blackflag",
};

export function loadOrCreateProfile(playerId: string, name: string): PlayerProfile {
  let row = prepare("SELECT * FROM players WHERE playerId = ?").get(playerId) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    const now = Date.now();
    prepare(
      `INSERT INTO players (playerId, name, createdAt, lastSeen) VALUES (?, ?, ?, ?)`
    ).run(playerId, name, now, now);
    row = prepare("SELECT * FROM players WHERE playerId = ?").get(playerId) as Record<string, unknown>;
  } else {
    prepare("UPDATE players SET lastSeen = ?, name = ? WHERE playerId = ?").run(Date.now(), name, playerId);
  }

  return rowToProfile(row);
}

export function saveProfile(profile: PlayerProfile): void {
  prepare(
    `UPDATE players SET
      scrap = ?,
      reputation_freeport = ?,
      reputation_salvagers = ?,
      reputation_wardens = ?,
      reputation_blackflag = ?,
      unlockedBlueprints = ?,
      stats_playerKills = ?,
      stats_aiKills = ?,
      stats_deaths = ?,
      stats_contractsCompleted = ?,
      stats_lootExtracted = ?,
      stats_distanceTraveled = ?,
      lastSeen = ?
    WHERE playerId = ?`
  ).run(
    profile.scrap,
    profile.reputation.freeport,
    profile.reputation.salvagers,
    profile.reputation.wardens,
    profile.reputation.blackflag,
    JSON.stringify(profile.unlockedBlueprints),
    profile.statistics.playerKills,
    profile.statistics.aiKills,
    profile.statistics.deaths,
    profile.statistics.contractsCompleted,
    profile.statistics.lootExtracted,
    profile.statistics.distanceTraveled,
    Date.now(),
    profile.playerId
  );
}

export function loadStash(playerId: string): ItemStack[] {
  const rows = prepare("SELECT itemId, count, data FROM stash WHERE playerId = ?").all(playerId) as Array<{
    itemId: string;
    count: number;
    data: string | null;
  }>;
  return rows.map((r) => {
    const data = r.data ? (JSON.parse(r.data) as Partial<ItemStack>) : {};
    return { itemId: r.itemId, count: r.count, ...data };
  });
}

export function saveStash(playerId: string, stash: ItemStack[]): void {
  const insert = prepare(
    "INSERT OR REPLACE INTO stash (playerId, itemId, count, data) VALUES (?, ?, ?, ?)"
  );
  const deleteStmt = prepare("DELETE FROM stash WHERE playerId = ? AND itemId = ?");
  const existing = new Set(loadStash(playerId).map((s) => s.itemId));
  for (const item of stash) {
    if (item.count <= 0) {
      deleteStmt.run(playerId, item.itemId);
      continue;
    }
    const data: Partial<ItemStack> = { ...item };
    delete (data as { itemId?: string }).itemId;
    delete (data as { count?: number }).count;
    insert.run(playerId, item.itemId, item.count, Object.keys(data).length > 0 ? JSON.stringify(data) : null);
    existing.delete(item.itemId);
  }
  for (const itemId of existing) {
    deleteStmt.run(playerId, itemId);
  }
}

function rowToProfile(row: Record<string, unknown>): PlayerProfile {
  return {
    playerId: row.playerId as string,
    name: row.name as string,
    createdAt: row.createdAt as number,
    lastSeen: row.lastSeen as number,
    scrap: row.scrap as number,
    reputation: {
      freeport: row.reputation_freeport as number,
      salvagers: row.reputation_salvagers as number,
      wardens: row.reputation_wardens as number,
      blackflag: row.reputation_blackflag as number,
    },
    unlockedBlueprints: JSON.parse((row.unlockedBlueprints as string) || "[]"),
    statistics: {
      playerKills: row.stats_playerKills as number,
      aiKills: row.stats_aiKills as number,
      deaths: row.stats_deaths as number,
      contractsCompleted: row.stats_contractsCompleted as number,
      lootExtracted: row.stats_lootExtracted as number,
      distanceTraveled: row.stats_distanceTraveled as number,
    },
  };
}
