import { RECIPES, WEAPONS, getItem, type ItemStack } from "@tidefall/shared";
import type { NetworkClient } from "../game/NetworkClient.js";

const RARITY_COLOR: Record<string, string> = {
  common: "#9aa6a0",
  uncommon: "#5fd35f",
  rare: "#3f8fff",
  epic: "#b15cff",
};

const CATEGORY_LABEL: Record<string, string> = {
  weapon: "Weapons",
  armor: "Armor",
  consumable: "Consumables",
  tool: "Tools",
};

export class CraftingUI {
  private net: NetworkClient;
  private onClose: () => void;
  private root: HTMLElement;
  private backpack: ItemStack[] = [];
  private unlockedBlueprints = new Set<string>();
  private activeCategory = "weapon";

  constructor(net: NetworkClient, onClose: () => void) {
    this.net = net;
    this.onClose = onClose;
    this.root = document.createElement("div");
    this.root.className = "crafting-overlay hidden";
    document.getElementById("ui-root")?.appendChild(this.root);
  }

  setBackpack(items: ItemStack[]): void {
    this.backpack = items ?? [];
    if (!this.root.classList.contains("hidden")) this.render();
  }

  setUnlockedBlueprints(ids: string[]): void {
    this.unlockedBlueprints = new Set(ids ?? []);
    if (!this.root.classList.contains("hidden")) this.render();
  }

  toggle(): void {
    this.root.classList.toggle("hidden");
    if (!this.root.classList.contains("hidden")) this.render();
  }

  hide(): void {
    this.root.classList.add("hidden");
  }

  private countOwned(itemId: string): number {
    return this.backpack.filter((i) => i.itemId === itemId).reduce((s, i) => s + i.count, 0);
  }

  private render(): void {
    const recipes = Object.values(RECIPES);
    const categories = Array.from(new Set(recipes.map((r) => r.category)));
    const tabs = categories
      .map(
        (c) =>
          `<button class="craft-tab ${c === this.activeCategory ? "active" : ""}" data-cat="${c}">${CATEGORY_LABEL[c] ?? c}</button>`
      )
      .join("");

    const list = recipes
      .filter((r) => r.category === this.activeCategory)
      .map((r) => this.renderRecipe(r))
      .join("");

    this.root.innerHTML = `
      <div class="crafting-panel">
        <div class="panel-header">
          <h2>Crafting Bench</h2>
          <button class="close-btn">Close [B]</button>
        </div>
        <div class="craft-tabs">${tabs}</div>
        <div class="recipe-list">${list}</div>
      </div>
    `;

    this.root.querySelector(".close-btn")?.addEventListener("click", () => this.onClose());
    this.root.querySelectorAll<HTMLElement>(".craft-tab").forEach((el) => {
      el.addEventListener("click", () => {
        this.activeCategory = el.dataset.cat ?? "weapon";
        this.render();
      });
    });
    this.root.querySelectorAll<HTMLElement>("[data-recipe]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (el.hasAttribute("disabled")) return;
        this.net.send({ type: "craft", recipeId: el.dataset.recipe! });
      });
    });
  }

  private renderRecipe(r: (typeof RECIPES)[string]): string {
    const outputDef = getItem(r.outputItemId);
    const outputName = outputDef?.name ?? r.outputItemId;
    const rarity = outputDef?.rarity ?? "common";
    const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.common;
    const w = WEAPONS[r.outputItemId];

    let hasAll = true;
    const ings = r.ingredients
      .map((ing) => {
        const item = getItem(ing.itemId);
        const have = this.countOwned(ing.itemId);
        const ok = have >= ing.count;
        if (!ok) hasAll = false;
        return `<span class="ing ${ok ? "ok" : "missing"}" title="${item?.description ?? ""}">
          ${item?.name ?? ing.itemId}
          <b>${have}/${ing.count}</b>
        </span>`;
      })
      .join("");

    const blueprintLocked = r.requiredBlueprint && !this.unlockedBlueprints.has(r.requiredBlueprint);
    const craftable = hasAll && !blueprintLocked;

    return `
      <div class="recipe-card" style="--rarity:${color}">
        <div class="recipe-head">
          <div class="recipe-name">${outputName}</div>
          ${w ? `<div class="recipe-stats">${w.damage} DMG · ${w.magazineSize} MAG · ${w.rpm} RPM</div>` : ""}
        </div>
        <div class="recipe-output">Crafts ×${r.outputCount}</div>
        ${r.requiredBlueprint ? `<div class="recipe-blueprint ${blueprintLocked ? "locked" : "owned"}">${blueprintLocked ? "Blueprint required" : "Blueprint owned"}</div>` : ""}
        <div class="recipe-ingredients">${ings}</div>
        <button data-recipe="${r.id}" class="craft-btn ${craftable ? "" : "disabled"}" ${craftable ? "" : "disabled"}>
          ${blueprintLocked ? "Locked" : craftable ? "Craft" : "Missing materials"}
        </button>
      </div>
    `;
  }
}
