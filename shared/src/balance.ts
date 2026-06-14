export const BALANCE = {
  player: {
    health: 100,
    walkSpeed: 5.2,
    sprintSpeed: 7.2,
    crouchSpeed: 2.8,
    jumpVelocity: 5.5,
    gravity: 18.0,
    height: 1.7,
    radius: 0.4,
    heal: {
      bandage: { total: 25, duration: 5 },
      medKit: { total: 60, duration: 6 },
    },
  },
  hit: {
    head: 4.0,
    torso: 1.0,
    limb: 0.75,
  },
  inventory: {
    backpackSlots: 16,
    skiffCargoSlots: 24,
  },
  loot: {
    rarityWeights: { common: 70, uncommon: 22, rare: 7, epic: 1 },
  },
  ai: {
    respawnDelayMs: 5 * 60 * 1000,
  },
  backpack: {
    despawnMs: 10 * 60 * 1000,
  },
  boat: {
    skiff: {
      maxHealth: 400,
      speed: 10,
      boost: 14,
      turnSpeed: 2.2,
      cargoSlots: 24,
      despawnMs: 10 * 60 * 1000,
    },
  },
  storm: {
    warningDistance: 100,
    damagePerSec: 10,
    pushback: 6,
  },
  safeZone: {
    radius: 180,
  },
  event: {
    intervalMinMs: 10 * 60 * 1000,
    intervalMaxMs: 15 * 60 * 1000,
    signalTowerHoldMs: 60 * 1000,
  },
} as const;

export function rollLootRarity(seed?: number): "common" | "uncommon" | "rare" | "epic" {
  const r = seed !== undefined ? ((seed * 9301 + 49297) % 233280) / 233280 : Math.random();
  const w = BALANCE.loot.rarityWeights;
  const total = w.common + w.uncommon + w.rare + w.epic;
  const v = r * total;
  if (v < w.common) return "common";
  if (v < w.common + w.uncommon) return "uncommon";
  if (v < w.common + w.uncommon + w.rare) return "rare";
  return "epic";
}
