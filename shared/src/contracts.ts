import type { ContractDef } from "./types.js";

export const CONTRACTS: Record<string, ContractDef> = {
  recover_weapons_crate: {
    id: "recover_weapons_crate",
    name: "Recover Weapons Crate",
    description: "Open the Ironhook Fort armory and extract a Weapons Crate.",
    faction: "wardens",
    objectives: [
      { type: "collect", targetId: "weapons_crate", count: 1, locationId: "ironhook_fort" },
      { type: "deliver", targetId: "weapons_crate", count: 1, locationId: "haven" },
    ],
    rewards: {
      scrap: 150,
      reputation: [{ faction: "wardens", amount: 15 }],
      items: [{ itemId: "rifle_ammo", count: 30 }],
    },
  },
  salvage_machine_core: {
    id: "salvage_machine_core",
    name: "Salvage Machine Core",
    description: "Destroy a machine unit and extract its core from Blackreef or Crown.",
    faction: "salvagers",
    objectives: [
      { type: "collect", targetId: "machine_core", count: 1, locationId: "blackreef_shipyard" },
      { type: "deliver", targetId: "machine_core", count: 1, locationId: "haven" },
    ],
    rewards: {
      scrap: 250,
      reputation: [{ faction: "salvagers", amount: 20 }],
      items: [{ itemId: "rare_alloy", count: 2 }],
    },
  },
  loot_the_leviathan: {
    id: "loot_the_leviathan",
    name: "Loot the Leviathan",
    description: "Recover a Contraband Package from the Leviathan Wreck.",
    faction: "blackflag",
    objectives: [
      { type: "collect", targetId: "contraband_package", count: 1, locationId: "leviathan_wreck" },
      { type: "deliver", targetId: "contraband_package", count: 1, locationId: "haven" },
    ],
    rewards: {
      scrap: 300,
      reputation: [{ faction: "blackflag", amount: 20 }],
      items: [{ itemId: "scrap", count: 50 }],
    },
  },
  clear_driftwood_camp: {
    id: "clear_driftwood_camp",
    name: "Clear Driftwood Camp",
    description: "Defeat scavengers at Driftwood Cay and collect supplies.",
    faction: "freeport",
    objectives: [
      { type: "kill", targetId: "scavenger_grunt", count: 4, locationId: "driftwood_cay" },
      { type: "collect", targetId: "wood", count: 5, locationId: "driftwood_cay" },
    ],
    rewards: {
      scrap: 80,
      reputation: [{ faction: "freeport", amount: 10 }],
      items: [{ itemId: "light_ammo", count: 30 }],
    },
  },
  steal_rival_cargo: {
    id: "steal_rival_cargo",
    name: "Steal Rival Cargo",
    description: "Extract with cargo taken from another player or enemy boat.",
    faction: "blackflag",
    objectives: [
      { type: "collect", targetId: "contraband_package", count: 1 },
      { type: "deliver", targetId: "contraband_package", count: 1, locationId: "haven" },
    ],
    rewards: {
      scrap: 400,
      reputation: [{ faction: "blackflag", amount: 25 }],
      items: [{ itemId: "rare_alloy", count: 3 }],
    },
  },
  signal_tower_salvage: {
    id: "signal_tower_salvage",
    name: "Signal Tower Salvage",
    description: "Claim a Signal Tower event cache and extract the Signal Core.",
    faction: "salvagers",
    objectives: [
      { type: "collect", targetId: "signal_core", count: 1 },
      { type: "deliver", targetId: "signal_core", count: 1, locationId: "haven" },
    ],
    rewards: {
      scrap: 350,
      reputation: [{ faction: "salvagers", amount: 20 }, { faction: "wardens", amount: 10 }],
      items: [{ itemId: "machine_core", count: 1 }],
    },
  },
};

export function getContract(id: string): ContractDef | undefined {
  return CONTRACTS[id];
}
