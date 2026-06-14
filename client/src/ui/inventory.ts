import type { NetworkClient } from "../game/NetworkClient.js";

export class InventoryUI {
  private net: NetworkClient;
  private onClose: () => void;
  private root: HTMLElement;
  private inventory: { backpack: any[]; stash: any[]; equipped: any; slot: string } = { backpack: [], stash: [], equipped: {}, slot: "primary" };
  private loot: { id?: string; items: any[]; name?: string } | null = null;

  constructor(net: NetworkClient, onClose: () => void) {
    this.net = net;
    this.onClose = onClose;
    this.root = document.createElement("div");
    this.root.className = "inventory-overlay hidden";
    document.getElementById("ui-root")?.appendChild(this.root);
  }

  setInventory(inv: { backpack: any[]; stash: any[]; equipped: any; slot: string }): void {
    this.inventory = inv;
    this.render();
  }

  setLoot(loot: { id?: string; items: any[]; name?: string }): void {
    this.loot = loot;
    this.render();
  }

  toggle(): void {
    this.root.classList.toggle("hidden");
    if (!this.root.classList.contains("hidden")) this.render();
  }

  hide(): void {
    this.root.classList.add("hidden");
  }

  private render(): void {
    const backpackItems = this.inventory.backpack.map((item, idx) => this.renderItem(item, idx, "backpack")).join("");
    const stashItems = this.inventory.stash.map((item, idx) => this.renderItem(item, idx, "stash")).join("");
    const lootItems = this.loot?.items.map((item, idx) => this.renderItem(item, idx, "loot")).join("") || "<p>Empty</p>";

    this.root.innerHTML = `
      <div class="inventory-panel">
        <h2>Inventory</h2>
        <div class="inventory-columns">
          <div class="inv-section">
            <h3>Backpack</h3>
            <div class="item-grid">${backpackItems}</div>
          </div>
          <div class="inv-section">
            <h3>Stash</h3>
            <div class="item-grid">${stashItems}</div>
          </div>
          <div class="inv-section">
            <h3>${this.loot?.name || "Loot"}</h3>
            <div class="item-grid">${lootItems}</div>
          </div>
        </div>
        <button class="close-btn">Close (F)</button>
      </div>
    `;

    this.root.querySelector(".close-btn")?.addEventListener("click", () => this.onClose());
    this.root.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const action = target.dataset.action;
        const index = Number(target.dataset.index);
        if (action === "take-loot" && this.loot?.id) {
          this.net.send({ type: "lootTake", lootId: this.loot.id, itemIndex: index, count: 1 });
        }
        if (action === "bank") {
          this.net.send({ type: "bank", itemIndex: index, count: 1 });
        }
        if (action === "withdraw") {
          this.net.send({ type: "withdraw", itemIndex: index, count: 1 });
        }
        if (action === "equip-primary") {
          this.net.send({ type: "equip", slot: "primary", itemIndex: index });
        }
        if (action === "equip-armor") {
          this.net.send({ type: "equip", slot: "armor", itemIndex: index });
        }
      });
    });
  }

  private renderItem(item: any, idx: number, section: string): string {
    if (!item) return "";
    let actions = "";
    if (section === "backpack") {
      actions += `<button data-action="bank" data-index="${idx}">Bank</button>`;
      if (item.itemId.startsWith("rust_") || item.itemId.includes("smg") || item.itemId.includes("rifle") || item.itemId.includes("shotgun")) {
        actions += `<button data-action="equip-primary" data-index="${idx}">Equip</button>`;
      }
      if (item.itemId.includes("armor")) {
        actions += `<button data-action="equip-armor" data-index="${idx}">Equip</button>`;
      }
    } else if (section === "stash") {
      actions += `<button data-action="withdraw" data-index="${idx}">Take</button>`;
    } else if (section === "loot") {
      actions += `<button data-action="take-loot" data-index="${idx}">Take</button>`;
    }
    return `
      <div class="item-card">
        <div class="item-name">${item.itemId}</div>
        <div class="item-count">x${item.count}</div>
        <div class="item-actions">${actions}</div>
      </div>
    `;
  }
}
