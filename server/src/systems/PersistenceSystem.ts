import { loadOrCreateProfile, loadStash, saveProfile, saveStash } from "../db/playersRepo.js";
import type { PlayerEntity } from "../world/PlayerEntity.js";

export class PersistenceSystem {
  loadPlayer(playerId: string, name: string, entity: PlayerEntity): void {
    const profile = loadOrCreateProfile(playerId, name);
    entity.stash = loadStash(playerId);
    entity.statistics = { ...profile.statistics };
  }

  savePlayer(entity: PlayerEntity): void {
    const profile = loadOrCreateProfile(entity.playerId, entity.name);
    profile.scrap = entity.statistics.lootExtracted; // Simplified: scrap tracked via extracted
    profile.statistics = { ...entity.statistics };
    saveProfile(profile);
    saveStash(entity.playerId, entity.stash);
  }

  bankAll(entity: PlayerEntity): void {
    for (const item of [...entity.backpack]) {
      entity.stash.push({ ...item });
    }
    entity.backpack = [];
    saveStash(entity.playerId, entity.stash);
  }
}
