import { getItem, type ItemStack, WEAPONS } from "@tidefall/shared";
import type { NetworkClient } from "../game/NetworkClient.js";

interface InventoryData {
  backpack: ItemStack[];
  stash: ItemStack[];
  equipped: { primary?: string; secondary?: string; armor?: string };
  slot: string;
}

const RARITY_COLOR: Record<string, string> = {
  common: "#9aa6a0",
  uncommon: "#5fd35f",
  rare: "#3f8fff",
  epic: "#b15cff",
};

function rarityClass(r: string | undefined): string {
  return `rarity-${r ?? "common"}`;
}

/** Short text tag for an item category, used as a compact "icon". */
function categoryTag(itemId: string): string {
  if (itemId.includes("ammo") || itemId === "shells") return "AMO";
  const def = getItem(itemId);
  switch (def?.category) {
    case "weapon": return "WPN";
    case "consumable": return "MED";
    case "armor": return "ARM";
    case "component": return "PT";
    case "resource": return "RES";
    case "currency": return "$";
    case "contract": return "!";
    case "blueprint": return "BP";
    default: return "•";
  }
}

export class InventoryUI {
  private net: NetworkClient;
  private onClose: () => void;
  private root: HTMLElement;
  private inventory: InventoryData = { backpack: [], stash: [], equipped: {}, slot: "primary" };
  private loot: { id?: string; items: ItemStack[]; name?: string } | null = null;

  constructor(net: NetworkClient, onClose: () => void) {
    this.net = net;
    this.onClose = onClose;
    this.root = document.createElement("div");
    this.root.className = "inventory-overlay hidden";
    document.getElementById("ui-root")?.appendChild(this.root);
  }

  setInventory(inv: InventoryData): void {
    this.inventory = inv;
    if (!this.root.classList.contains("hidden")) this.render();
  }

  setLoot(loot: { id?: string; items: ItemStack[]; name?: string }): void {
    this.loot = loot;
    if (!this.root.classList.contains("hidden")) this.render();
  }

  toggle(): void {
    this.root.classList.toggle("hidden");
    if (!this.root.classList.contains("hidden")) this.render();
  }

  hide(): void {
    this.root.classList.add("hidden");
  }

  private render(): void {
    const inv = this.inventory;
    const used = inv.backpack.length;
    const cap = 16;
    const capPct = (used / cap) * 100;

    const backpackItems = inv.backpack.length
      ? inv.backpack.map((item, idx) => this.renderItem(item, idx, "backpack")).join("")
      : `<div class="empty-note">Backpack is empty</div>`;
    const stashItems = inv.stash.length
      ? inv.stash.map((item, idx) => this.renderItem(item, idx, "stash")).join("")
      : `<div class="empty-note">Stash is empty</div>`;

    const lootSection = this.loot
      ? `<div class="inv-section">
          <h3>${this.loot.name || "Loot"}</h3>
          <div class="item-grid">${this.loot.items.length ? this.loot.items.map((item, idx) => this.renderItem(item, idx, "loot")).join("") : `<div class="empty-note">Empty</div>`}</div>
        </div>`
      : "";

    const equippedPrimary = this.renderEquipped("Primary", inv.equipped.primary);
    const equippedArmor = this.renderEquipped("Armor", inv.equipped.armor);

    this.root.innerHTML = `
      <div class="inventory-panel">
        <div class="panel-header">
          <h2>Inventory</h2>
          <div class="capacity">
            <div class="capacity-bar"><div class="capacity-fill" style="width:${capPct}%"></div></div>
            <span>${used} / ${cap}</span>
          </div>
          <button class="close-btn">Close [F]</button>
        </div>
        <div class="equip-slots">
          ${equippedPrimary}
          ${equippedArmor}
        </div>
        <div class="inventory-columns">
          <div class="inv-section">
            <h3>Backpack</h3>
            <div class="item-grid">${backpackItems}</div>
          </div>
          <div class="inv-section">
            <h3>Stash <span class="muted">(banked · safe)</span></h3>
            <div class="item-grid">${stashItems}</div>
          </div>
          ${lootSection}
        </div>
      </div>
    `;

    this.root.querySelector(".close-btn")?.addEventListener("click", () => this.onClose());
    this.bindActions();
  }

  private renderEquipped(label: string, itemId: string | undefined): string {
    if (!itemId) {
      return `<div class="equip-slot empty"><span class="equip-label">${label}</span><span class="muted">— empty —</span></div>`;
    }
    const def = getItem(itemId);
    const isWeapon = def?.category === "weapon";
    const w = isWeapon ? WEAPONS[itemId] : undefined;
    return `
      <div class="equip-slot ${rarityClass(def?.rarity)}">
        <span class="equip-label">${label}</span>
        <span class="equip-name">${def?.name ?? itemId}</span>
        ${w ? `<span class="equip-stat">${w.damage} DMG · ${w.magazineSize} MAG · ${w.rpm} RPM</span>` : ""}
      </div>
    `;
  }

  private renderItem(item: ItemStack, idx: number, section: string): string {
    if (!item) return "";
    const def = getItem(item.itemId);
    const name = def?.name ?? item.itemId;
    const desc = def?.description ?? "";
    const rarity = def?.rarity ?? "common";
    const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.common;
    const tag = categoryTag(item.itemId);

    let actions = "";
    if (section === "backpack") {
      const cat = def?.category;
      if (cat === "weapon") actions += `<button data-action="equip-primary" data-index="${idx}">Equip</button>`;
      if (cat === "armor") actions += `<button data-action="equip-armor" data-index="${idx}">Equip</button>`;
      actions += `<button data-action="bank" data-index="${idx}">Bank</button>`;
    } else if (section === "stash") {
      actions += `<button data-action="withdraw" data-index="${idx}">Take</button>`;
    } else if (section === "loot") {
      actions += `<button data-action="take-loot" data-index="${idx}">Take</button>`;
    }

    return `
      <div class="item-card ${rarityClass(rarity)}" style="--rarity:${color}" title="${desc}">
        <div class="item-icon">${tag}</div>
        <div class="item-info">
          <div class="item-name">${name}</div>
          <div class="item-count">×${item.count}</div>
        </div>
        <div class="item-actions">${actions}</div>
      </div>
    `;
  }

  private bindActions(): void {
    this.root.querySelectorAll<HTMLElement>("[data-action]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = el.dataset.action;
        const index = Number(el.dataset.index);
        if (action === "take-loot" && this.loot?.id) {
          this.net.send({ type: "lootTake", lootId: this.loot.id, itemIndex: index, count: 1 });
        } else if (action === "bank") {
          this.net.send({ type: "bank", itemIndex: index, count: 1 });
        } else if (action === "withdraw") {
          this.net.send({ type: "withdraw", itemIndex: index, count: 1 });
        } else if (action === "equip-primary") {
          this.net.send({ type: "equip", slot: "primary", itemIndex: index });
        } else if (action === "equip-armor") {
          this.net.send({ type: "equip", slot: "armor", itemIndex: index });
        }
      });
    });
  }
}
