import { BACKPACK_DESPAWN_MS, type ItemStack, type Vec3 } from "@tidefall/shared";
import { Entity } from "./Entity.js";

export class LootEntity extends Entity {
  items: ItemStack[];
  lootType: "backpack" | "container" | "crate" | "boss" | "cache";
  ownerId?: string;
  despawnAt: number;
  name?: string;
  openedBy = new Set<string>();

  constructor(position: Vec3, items: ItemStack[], type: LootEntity["lootType"], options?: { ownerId?: string; despawnMs?: number; name?: string }) {
    super("loot", position);
    this.items = items.map((i) => ({ ...i }));
    this.lootType = type;
    this.ownerId = options?.ownerId;
    this.despawnAt = Date.now() + (options?.despawnMs ?? BACKPACK_DESPAWN_MS);
    this.name = options?.name;
    this.radius = 0.8;
    this.height = 0.8;
  }

  tick(): void {}

  addItem(item: ItemStack): void {
    const existing = this.items.find((i) => i.itemId === item.itemId);
    if (existing) {
      existing.count += item.count;
    } else {
      this.items.push({ ...item });
    }
  }

  takeItem(index: number, count: number): ItemStack | null {
    const item = this.items[index];
    if (!item) return null;
    const take = Math.min(item.count, count);
    item.count -= take;
    const taken = { itemId: item.itemId, count: take };
    if (item.count <= 0) this.items.splice(index, 1);
    return taken;
  }

  serialize(): import("@tidefall/shared").SerializedLoot {
    return {
      id: this.id,
      position: this.position,
      items: this.items,
      type: this.lootType,
      ownerId: this.ownerId,
      despawnAt: this.despawnAt,
      name: this.name,
    };
  }
}
