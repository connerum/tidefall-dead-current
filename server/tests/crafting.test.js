import assert from "node:assert";
import { test } from "node:test";
import { CraftingSystem } from "../src/systems/CraftingSystem.js";
import { PlayerEntity } from "../src/world/PlayerEntity.js";
const profile = {
    playerId: "test",
    name: "Test",
    createdAt: 0,
    lastSeen: 0,
    scrap: 0,
    reputation: { freeport: 0, salvagers: 0, wardens: 0, blackflag: 0 },
    unlockedBlueprints: [],
    statistics: { playerKills: 0, aiKills: 0, deaths: 0, contractsCompleted: 0, lootExtracted: 0, distanceTraveled: 0 },
};
const crafting = new CraftingSystem();
test("craft Rust Pistol with ingredients", () => {
    const player = new PlayerEntity("p1", "Test", { x: 0, y: 0, z: 0 });
    player.backpack = [
        { itemId: "scrap", count: 20 },
        { itemId: "barrel", count: 1 },
        { itemId: "receiver", count: 1 },
    ];
    const result = crafting.craft(player, "rust_pistol", profile);
    assert.strictEqual(result.success, true);
    assert.ok(player.backpack.some((i) => i.itemId === "rust_pistol"));
});
test("craft fails without blueprint", () => {
    const player = new PlayerEntity("p2", "Test", { x: 0, y: 0, z: 0 });
    player.backpack = [
        { itemId: "scrap", count: 100 },
        { itemId: "receiver", count: 2 },
        { itemId: "spring", count: 2 },
        { itemId: "magazine", count: 1 },
        { itemId: "grip", count: 1 },
    ];
    const result = crafting.craft(player, "compact_smg", profile);
    assert.strictEqual(result.success, false);
});
test("craft succeeds with blueprint", () => {
    const player = new PlayerEntity("p3", "Test", { x: 0, y: 0, z: 0 });
    player.backpack = [
        { itemId: "scrap", count: 100 },
        { itemId: "receiver", count: 2 },
        { itemId: "spring", count: 2 },
        { itemId: "magazine", count: 1 },
        { itemId: "grip", count: 1 },
    ];
    const p = { ...profile, unlockedBlueprints: ["smg_blueprint"] };
    const result = crafting.craft(player, "compact_smg", p);
    assert.strictEqual(result.success, true);
});
