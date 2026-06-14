import assert from "node:assert";
import { test } from "node:test";
import { addItemToInventory, removeItemFromInventory, countItem } from "../src/systems/LootSystem.js";
test("addItemToInventory stacks stackable items", () => {
    const inv = [{ itemId: "scrap", count: 5 }];
    const result = addItemToInventory(inv, { itemId: "scrap", count: 3 }, 16);
    assert.strictEqual(result, true);
    assert.strictEqual(inv[0].count, 8);
});
test("addItemToInventory respects slot limit", () => {
    const inv = Array.from({ length: 16 }, (_, i) => ({ itemId: `item_${i}`, count: 1 }));
    const result = addItemToInventory(inv, { itemId: "scrap", count: 1 }, 16);
    assert.strictEqual(result, false);
});
test("removeItemFromInventory removes correct amount", () => {
    const inv = [{ itemId: "scrap", count: 10 }];
    const removed = removeItemFromInventory(inv, "scrap", 4);
    assert.strictEqual(removed, 4);
    assert.strictEqual(inv[0].count, 6);
});
test("countItem sums stacks", () => {
    const inv = [
        { itemId: "scrap", count: 5 },
        { itemId: "scrap", count: 3 },
        { itemId: "wood", count: 1 },
    ];
    assert.strictEqual(countItem(inv, "scrap"), 8);
});
