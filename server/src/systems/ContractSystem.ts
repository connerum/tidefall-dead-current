import { getContract, type ContractDef, type Faction, type PlayerProfile } from "@tidefall/shared";
import type { PlayerEntity } from "../world/PlayerEntity.js";

export interface ActiveContract {
  contractId: string;
  progress: Record<string, number>;
}

export class ContractSystem {
  activeContracts = new Map<string, ActiveContract>();

  acceptContract(playerId: string, contractId: string): boolean {
    const def = getContract(contractId);
    if (!def) return false;
    this.activeContracts.set(playerId, {
      contractId,
      progress: {},
    });
    return true;
  }

  abandonContract(playerId: string): void {
    this.activeContracts.delete(playerId);
  }

  trackKill(playerId: string, aiType: string, locationId?: string): void {
    const active = this.activeContracts.get(playerId);
    if (!active) return;
    const def = getContract(active.contractId);
    if (!def) return;
    for (let i = 0; i < def.objectives.length; i++) {
      const obj = def.objectives[i];
      if (obj.type !== "kill") continue;
      if (obj.targetId !== aiType) continue;
      if (obj.locationId && obj.locationId !== locationId) continue;
      const key = String(i);
      active.progress[key] = (active.progress[key] ?? 0) + 1;
    }
  }

  trackCollect(playerId: string, itemId: string, locationId?: string): void {
    const active = this.activeContracts.get(playerId);
    if (!active) return;
    const def = getContract(active.contractId);
    if (!def) return;
    for (let i = 0; i < def.objectives.length; i++) {
      const obj = def.objectives[i];
      if (obj.type !== "collect") continue;
      if (obj.targetId !== itemId) continue;
      if (obj.locationId && obj.locationId !== locationId) continue;
      const key = String(i);
      active.progress[key] = (active.progress[key] ?? 0) + 1;
    }
  }

  checkCompletion(player: PlayerEntity, profile: PlayerProfile): { completed: boolean; rewards?: { scrap: number; reputation: { faction: Faction; amount: number }[]; items: { itemId: string; count: number }[] } } {
    const active = this.activeContracts.get(player.playerId);
    if (!active) return { completed: false };
    const def = getContract(active.contractId);
    if (!def) return { completed: false };

    for (let i = 0; i < def.objectives.length; i++) {
      const progress = active.progress[String(i)] ?? 0;
      if (progress < def.objectives[i].count) return { completed: false };
    }

    this.activeContracts.delete(player.playerId);
    profile.scrap += def.rewards.scrap;
    for (const rep of def.rewards.reputation) {
      profile.reputation[rep.faction] += rep.amount;
    }
    profile.statistics.contractsCompleted++;
    return { completed: true, rewards: def.rewards };
  }

  getActive(playerId: string): ActiveContract | undefined {
    return this.activeContracts.get(playerId);
  }
}
