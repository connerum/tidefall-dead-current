import assert from "node:assert";
import { test } from "node:test";
import { CombatSystem } from "../src/systems/CombatSystem.js";
import { PlayerEntity } from "../src/world/PlayerEntity.js";
import { AIEntity } from "../src/world/AIEntity.js";
import type { FireWeaponMsg } from "@tidefall/shared";

const combat = new CombatSystem();

test("safe zone prevents PvP damage", () => {
  const attacker = new PlayerEntity("a1", "Attacker", { x: 0, y: 0, z: 0 });
  attacker.primaryWeapon = { weaponId: "rust_pistol", ammoInMag: 12, lastFireTime: 0, reloading: false, reloadEndTime: 0, recoilYaw: 0, recoilPitch: 0 };
  attacker.equippedSlot = "primary";
  const target = new PlayerEntity("t1", "Target", { x: 0, y: 0, z: 10 });
  target.health = 100;

  const msg: FireWeaponMsg = {
    weaponId: "rust_pistol",
    origin: { x: 0, y: 1.5, z: 0 },
    direction: { x: 0, y: 0, z: 1 },
    timestamp: Date.now(),
    sequence: 1,
    yaw: 0,
    pitch: 0,
  };

  const players = new Map([["a1", attacker], ["t1", target]]);
  const result = combat.handleFire(attacker, msg, players, new Map(), new Map(), true);
  assert.strictEqual(result?.hit, false);
  assert.strictEqual(target.health, 100);
});

test("AI takes damage outside safe zone", () => {
  const attacker = new PlayerEntity("a1", "Attacker", { x: 0, y: 0, z: 0 });
  attacker.primaryWeapon = { weaponId: "rust_pistol", ammoInMag: 12, lastFireTime: 0, reloading: false, reloadEndTime: 0, recoilYaw: 0, recoilPitch: 0 };
  attacker.equippedSlot = "primary";
  const ai = new AIEntity("scavenger_grunt", { x: 0, y: 0, z: 15 });
  ai.health = 70;

  const msg: FireWeaponMsg = {
    weaponId: "rust_pistol",
    origin: { x: 0, y: 1.5, z: 0 },
    direction: { x: 0, y: 0, z: 1 },
    timestamp: Date.now(),
    sequence: 1,
    yaw: 0,
    pitch: 0,
  };

  const players = new Map([["a1", attacker]]);
  const ais = new Map([[ai.id, ai]]);
  const result = combat.handleFire(attacker, msg, players, ais, new Map(), false);
  assert.strictEqual(result?.hit, true);
  assert.ok(ai.health < 70);
});
