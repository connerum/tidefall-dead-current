import { RECIPES, getItem } from "@tidefall/shared";
import type { NetworkClient } from "../game/NetworkClient.js";

export class CraftingUI {
  private net: NetworkClient;
  private onClose: () => void;
  private root: HTMLElement;

  constructor(net: NetworkClient, onClose: () => void) {
    this.net = net;
    this.onClose = onClose;
    this.root = document.createElement("div");
    this.root.className = "crafting-overlay hidden";
    document.getElementById("ui-root")?.appendChild(this.root);
  }

  toggle(): void {
    this.root.classList.toggle("hidden");
    if (!this.root.classList.contains("hidden")) this.render();
  }

  hide(): void {
    this.root.classList.add("hidden");
  }

  private render(): void {
    const recipes = Object.values(RECIPES).map((r) => {
      const ingredients = r.ingredients.map((ing) => {
        const item = getItem(ing.itemId);
        return `<span>${ing.count} ${item?.name ?? ing.itemId}</span>`;
      }).join(", ");
      return `
        <div class="recipe-card">
          <div class="recipe-name">${r.name}</div>
          <div class="recipe-ingredients">${ingredients}</div>
          ${r.requiredBlueprint ? `<div class="recipe-blueprint">Needs blueprint</div>` : ""}
          <button data-recipe="${r.id}">Craft</button>
        </div>
      `;
    }).join("");

    this.root.innerHTML = `
      <div class="crafting-panel">
        <h2>Crafting Bench</h2>
        <div class="recipe-list">${recipes}</div>
        <button class="close-btn">Close (B)</button>
      </div>
    `;

    this.root.querySelector(".close-btn")?.addEventListener("click", () => this.onClose());
    this.root.querySelectorAll("[data-recipe]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        this.net.send({ type: "craft", recipeId: target.dataset.recipe! });
      });
    });
  }
}
