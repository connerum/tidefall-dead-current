import { getItem, getLootTable, type ItemStack, type LootTableDef, rollLootRarity } from "@tidefall/shared";

export function rollLootTable(table: LootTableDef): ItemStack[] {
  const rolls = table.rollsMin + Math.floor(Math.random() * (table.rollsMax - table.rollsMin + 1));
  const result: ItemStack[] = [];
  for (let r = 0; r < rolls; r++) {
    const entry = pickWeightedEntry(table.entries);
    if (!entry) continue;
    const count = entry.countMin + Math.floor(Math.random() * (entry.countMax - entry.countMin + 1));
    const existing = result.find((i) => i.itemId === entry.itemId);
    if (existing) {
      existing.count += count;
    } else {
      result.push({ itemId: entry.itemId, count });
    }
  }
  // Rarity bonus roll for rare resources
  if (Math.random() < 0.05) {
    const rarity = rollLootRarity();
    const bonus = rarity === "epic" ? "storm_crystal" : rarity === "rare" ? "rare_alloy" : "military_circuit";
    const existing = result.find((i) => i.itemId === bonus);
    if (existing) existing.count++;
    else result.push({ itemId: bonus, count: 1 });
  }
  return result.filter((i) => i.count > 0);
}

function pickWeightedEntry(entries: LootTableDef["entries"]) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e;
  }
  return entries[entries.length - 1];
}

export function addItemToInventory(inventory: ItemStack[], item: ItemStack, maxSlots: number): boolean {
  const def = getItem(item.itemId);
  if (!def) return false;
  if (def.stackable) {
    const existing = inventory.find((i) => i.itemId === item.itemId);
    if (existing) {
      existing.count += item.count;
      return true;
    }
  }
  if (inventory.length >= maxSlots) return false;
  inventory.push({ ...item });
  return true;
}

export function removeItemFromInventory(inventory: ItemStack[], itemId: string, count: number): number {
  let remaining = count;
  for (let i = inventory.length - 1; i >= 0 && remaining > 0; i--) {
    const item = inventory[i];
    if (item.itemId !== itemId) continue;
    const take = Math.min(item.count, remaining);
    item.count -= take;
    remaining -= take;
    if (item.count <= 0) inventory.splice(i, 1);
  }
  return count - remaining;
}

export function countItem(inventory: ItemStack[], itemId: string): number {
  return inventory.filter((i) => i.itemId === itemId).reduce((s, i) => s + i.count, 0);
}
