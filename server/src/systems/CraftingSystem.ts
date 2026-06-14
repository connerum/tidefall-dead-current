import { getItem, getRecipe, getWeapon, type ItemStack, type PlayerProfile, type RecipeDef } from "@tidefall/shared";
import type { PlayerEntity } from "../world/PlayerEntity.js";
import { addItemToInventory, countItem, removeItemFromInventory } from "./LootSystem.js";

export class CraftingSystem {
  canCraft(player: PlayerEntity, recipe: RecipeDef, profile: PlayerProfile): { ok: boolean; reason?: string } {
    if (recipe.requiredBlueprint && !profile.unlockedBlueprints.includes(recipe.requiredBlueprint)) {
      return { ok: false, reason: "Blueprint not unlocked." };
    }
    for (const ing of recipe.ingredients) {
      const have = countItem(player.backpack, ing.itemId) + countItem(player.stash, ing.itemId);
      if (have < ing.count) {
        const item = getItem(ing.itemId);
        return { ok: false, reason: `Missing ${ing.count} ${item?.name ?? ing.itemId}.` };
      }
    }
    const output = getItem(recipe.outputItemId);
    if (!output) return { ok: false, reason: "Unknown output item." };
    return { ok: true };
  }

  craft(player: PlayerEntity, recipeId: string, profile: PlayerProfile): { success: boolean; message: string } {
    const recipe = getRecipe(recipeId);
    if (!recipe) return { success: false, message: "Recipe not found." };

    const check = this.canCraft(player, recipe, profile);
    if (!check.ok) return { success: false, message: check.reason ?? "Cannot craft." };

    // Consume ingredients from backpack first, then stash
    for (const ing of recipe.ingredients) {
      let need = ing.count;
      const fromBackpack = Math.min(need, countItem(player.backpack, ing.itemId));
      if (fromBackpack > 0) {
        removeItemFromInventory(player.backpack, ing.itemId, fromBackpack);
        need -= fromBackpack;
      }
      if (need > 0) {
        removeItemFromInventory(player.stash, ing.itemId, need);
      }
    }

    // Produce output
    const output: ItemStack = { itemId: recipe.outputItemId, count: recipe.outputCount };
    // If blueprint, unlock it
    if (getItem(recipe.outputItemId)?.category === "blueprint") {
      if (!profile.unlockedBlueprints.includes(recipe.outputItemId)) {
        profile.unlockedBlueprints.push(recipe.outputItemId);
      }
    }

    // Add to backpack or stash if full
    if (!addItemToInventory(player.backpack, output, 16)) {
      addItemToInventory(player.stash, output, 999);
    }

    return { success: true, message: `Crafted ${getItem(recipe.outputItemId)?.name ?? recipe.outputItemId}.` };
  }
}
