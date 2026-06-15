import type { LocationDefinition } from "./types.js";

export const LOCATIONS: Record<string, LocationDefinition> = {
  haven: {
    id: "haven",
    name: "The Haven",
    position: { x: 0, y: 0, z: 0 },
    radius: 180,
    riskLevel: "safe",
    biome: "harbor",
    description: "Central safe harbor. Craft, bank, and prepare here.",
    aiSpawns: [],
    lootTables: [],
    contractObjectives: ["deliver"],
    hasWorkbench: true,
    hasStash: true,
    docks: [
      { x: 0, y: 0, z: 190 },
      { x: 65, y: 0, z: 182 },
    ],
  },
  driftwood_cay: {
    id: "driftwood_cay",
    name: "Driftwood Cay",
    position: { x: -550, y: 0, z: -450 },
    radius: 130,
    riskLevel: "low",
    biome: "tropical",
    description: "Low-risk starter island with scavengers and basic resources.",
    aiSpawns: [
      { type: "scavenger_grunt", count: 4 },
      { type: "scavenger_rifleman", count: 2 },
    ],
    lootTables: [
      { tableId: "driftwood_common", count: 10 },
    ],
    contractObjectives: ["clear_driftwood"],
    hasWorkbench: false,
    hasStash: false,
    docks: [{ x: -550, y: 0, z: -310 }],
  },
  ironhook_fort: {
    id: "ironhook_fort",
    name: "Ironhook Fort",
    position: { x: 520, y: 0, z: -380 },
    radius: 150,
    riskLevel: "medium",
    biome: "fort",
    description: "Stone fortress with guards, a captain, and a locked vault.",
    aiSpawns: [
      { type: "scavenger_grunt", count: 6 },
      { type: "scavenger_rifleman", count: 5 },
      { type: "armored_captain", count: 1 },
    ],
    lootTables: [
      { tableId: "fort_common", count: 12 },
      { tableId: "fort_vault", count: 1 },
    ],
    contractObjectives: ["weapons_crate"],
    hasWorkbench: true,
    hasStash: false,
    docks: [{ x: 520, y: 0, z: -220 }],
  },
  blackreef_shipyard: {
    id: "blackreef_shipyard",
    name: "Blackreef Shipyard",
    position: { x: -480, y: 0, z: 520 },
    radius: 160,
    riskLevel: "medium",
    biome: "industrial",
    description: "Rusted shipyard with machines, drones, and crafting materials.",
    aiSpawns: [
      { type: "scavenger_grunt", count: 4 },
      { type: "scavenger_rifleman", count: 2 },
      { type: "scout_drone", count: 3 },
      { type: "sentry_turret", count: 2 },
    ],
    lootTables: [
      { tableId: "shipyard_common", count: 12 },
      { tableId: "shipyard_machine", count: 2 },
    ],
    contractObjectives: ["machine_core"],
    hasWorkbench: true,
    hasStash: false,
    docks: [{ x: -480, y: 0, z: 690 }],
  },
  crown_battery: {
    id: "crown_battery",
    name: "Crown Battery",
    position: { x: 580, y: 0, z: 480 },
    radius: 170,
    riskLevel: "high",
    biome: "military",
    description: "High-risk military installation with elite soldiers and automated defenses.",
    aiSpawns: [
      { type: "scavenger_rifleman", count: 5 },
      { type: "sentry_turret", count: 3 },
      { type: "scout_drone", count: 2 },
      { type: "heavy_machine", count: 1 },
    ],
    lootTables: [
      { tableId: "crown_common", count: 14 },
      { tableId: "crown_vault", count: 1 },
    ],
    contractObjectives: ["signal_core"],
    hasWorkbench: true,
    hasStash: false,
    docks: [{ x: 580, y: 0, z: 660 }],
  },
  leviathan_wreck: {
    id: "leviathan_wreck",
    name: "Leviathan Wreck",
    position: { x: 0, y: 0, z: -800 },
    radius: 120,
    riskLevel: "medium",
    biome: "wreck",
    description: "Massive shipwreck dungeon with contraband and ambush routes.",
    aiSpawns: [
      { type: "scavenger_grunt", count: 4 },
      { type: "scavenger_rifleman", count: 3 },
      { type: "armored_captain", count: 1 },
    ],
    lootTables: [
      { tableId: "leviathan_cargo", count: 6 },
    ],
    contractObjectives: ["contraband_package"],
    hasWorkbench: false,
    hasStash: false,
    docks: [
      { x: -130, y: 0, z: -800 },
      { x: 130, y: 0, z: -800 },
    ],
  },
};

export const SEA_LANES: { start: { x: number; z: number }; end: { x: number; z: number }; width: number }[] = [
  { start: { x: 0, z: 0 }, end: { x: -550, z: -450 }, width: 60 },
  { start: { x: 0, z: 0 }, end: { x: 520, z: -380 }, width: 60 },
  { start: { x: 0, z: 0 }, end: { x: -480, z: 520 }, width: 60 },
  { start: { x: 0, z: 0 }, end: { x: 580, z: 480 }, width: 60 },
  { start: { x: 0, z: 0 }, end: { x: 0, z: -800 }, width: 70 },
];

export function getLocation(id: string): LocationDefinition | undefined {
  return LOCATIONS[id];
}
