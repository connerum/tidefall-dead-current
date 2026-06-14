import type { ItemStack, PlayerProfile } from "@tidefall/shared";
import type { PlayerEntity } from "../world/PlayerEntity.js";
import { addItemToInventory, countItem, removeItemFromInventory } from "./LootSystem.js";

export class InventorySystem {
  moveToStash(player: PlayerEntity, itemIndex: number, count: number, profile: PlayerProfile): boolean {
    const item = player.backpack[itemIndex];
    if (!item) return false;
    const take = Math.min(item.count, count);
    const taken = { itemId: item.itemId, count: take };
    if (!addItemToInventory(player.stash, taken, 999)) return false;
    removeItemFromInventory(player.backpack, item.itemId, take);
    return true;
  }

  withdrawFromStash(player: PlayerEntity, itemIndex: number, count: number): boolean {
    const item = player.stash[itemIndex];
    if (!item) return false;
    const take = Math.min(item.count, count);
    const taken = { itemId: item.itemId, count: take };
    if (!addItemToInventory(player.backpack, taken, 16)) return false;
    removeItemFromInventory(player.stash, item.itemId, take);
    return true;
  }

  giveTestLoot(player: PlayerEntity): void {
    addItemToInventory(player.backpack, { itemId: "scrap", count: 200 }, 16);
    addItemToInventory(player.backpack, { itemId: "barrel", count: 5 }, 16);
    addItemToInventory(player.backpack, { itemId: "receiver", count: 5 }, 16);
    addItemToInventory(player.backpack, { itemId: "spring", count: 5 }, 16);
    addItemToInventory(player.backpack, { itemId: "wood", count: 10 }, 16);
    addItemToInventory(player.backpack, { itemId: "smg_blueprint", count: 1 }, 16);
    addItemToInventory(player.backpack, { itemId: "scrap_rifle_blueprint", count: 1 }, 16);
  }
}
