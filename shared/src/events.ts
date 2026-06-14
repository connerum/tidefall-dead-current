import type { WorldEventDef } from "./types.js";

export const WORLD_EVENTS: Record<string, WorldEventDef> = {
  signal_tower: {
    id: "signal_tower",
    name: "Signal Tower",
    description: "A signal tower has activated. Hold the area to claim a rare cache.",
    locations: ["ironhook_fort", "blackreef_shipyard", "crown_battery"],
    intervalMinMs: 10 * 60 * 1000,
    intervalMaxMs: 15 * 60 * 1000,
    durationMs: 5 * 60 * 1000,
    rewardTableId: "signal_cache",
  },
  ghost_convoy: {
    id: "ghost_convoy",
    name: "Ghost Convoy",
    description: "An AI cargo boat is moving between islands.",
    locations: ["driftwood_cay", "ironhook_fort", "blackreef_shipyard"],
    intervalMinMs: 12 * 60 * 1000,
    intervalMaxMs: 20 * 60 * 1000,
    durationMs: 6 * 60 * 1000,
    rewardTableId: "shipyard_common",
  },
  storm_vault: {
    id: "storm_vault",
    name: "Storm Vault",
    description: "A vault has been exposed by the storm.",
    locations: ["crown_battery", "leviathan_wreck"],
    intervalMinMs: 15 * 60 * 1000,
    intervalMaxMs: 25 * 60 * 1000,
    durationMs: 4 * 60 * 1000,
    rewardTableId: "crown_vault",
  },
  machine_drop: {
    id: "machine_drop",
    name: "Machine Drop",
    description: "A machine core has crashed onto an island.",
    locations: ["blackreef_shipyard", "crown_battery"],
    intervalMinMs: 10 * 60 * 1000,
    intervalMaxMs: 18 * 60 * 1000,
    durationMs: 5 * 60 * 1000,
    rewardTableId: "shipyard_machine",
  },
};

export function getWorldEvent(id: string): WorldEventDef | undefined {
  return WORLD_EVENTS[id];
}
