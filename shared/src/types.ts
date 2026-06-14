import type { Vec3 } from "./math.js";
import type { FACTIONS, RARITIES } from "./constants.js";

export type Faction = (typeof FACTIONS)[number];
export type Rarity = (typeof RARITIES)[number];

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category:
    | "currency"
    | "resource"
    | "component"
    | "consumable"
    | "weapon"
    | "attachment"
    | "armor"
    | "contract"
    | "blueprint";
  rarity: Rarity;
  stackable: boolean;
  maxStack: number;
  slotWeight: number;
  icon?: string;
}

export interface WeaponDef {
  id: string;
  itemId: string;
  name: string;
  type: "pistol" | "smg" | "shotgun" | "rifle" | "marksman" | "bolt";
  damage: number;
  pellets?: number;
  fireMode: "semi" | "auto" | "burst";
  burstCount?: number;
  rpm: number;
  reloadTime: number;
  magazineSize: number;
  ammoType: string;
  spreadBase: number;
  spreadMove: number;
  spreadAds: number;
  recoilVertical: number;
  recoilHorizontal: number;
  recoilRecovery: number;
  damageFalloffStart: number;
  damageFalloffEnd: number;
  minDamage: number;
  effectiveRange: number;
  adsZoom: number;
  audibleRadius: number;
  attachmentSlots: string[];
  projectile?: boolean;
}

export interface AttachmentDef {
  id: string;
  itemId: string;
  name: string;
  slot: string;
  modifiers: Partial<{
    damage: number;
    spreadBase: number;
    spreadMove: number;
    spreadAds: number;
    recoilVertical: number;
    recoilHorizontal: number;
    reloadTime: number;
    magazineSize: number;
    audibleRadius: number;
    adsZoom: number;
    damageFalloffEnd: number;
  }>;
}

export interface ArmorDef {
  id: string;
  itemId: string;
  name: string;
  armor: number;
  slot: "armor";
}

export interface RecipeDef {
  id: string;
  name: string;
  outputItemId: string;
  outputCount: number;
  ingredients: { itemId: string; count: number }[];
  requiredBlueprint?: string;
  craftTimeMs: number;
  category: "weapon" | "attachment" | "armor" | "consumable" | "utility";
}

export interface LootEntry {
  itemId: string;
  countMin: number;
  countMax: number;
  weight: number;
}

export interface LootTableDef {
  id: string;
  entries: LootEntry[];
  rollsMin: number;
  rollsMax: number;
}

export interface AISpawnDefinition {
  type: string;
  count: number;
  spawnPoints?: Vec3[];
}

export interface LocationDefinition {
  id: string;
  name: string;
  position: Vec3;
  radius: number;
  riskLevel: "safe" | "low" | "medium" | "high";
  biome: "harbor" | "tropical" | "fort" | "industrial" | "military" | "wreck";
  description: string;
  aiSpawns: AISpawnDefinition[];
  lootTables: { tableId: string; count: number }[];
  contractObjectives: string[];
  hasWorkbench: boolean;
  hasStash: boolean;
  docks: Vec3[];
}

export interface AITypeDef {
  id: string;
  name: string;
  health: number;
  armor: number;
  speed: number;
  weaponId?: string;
  detectionRadius: number;
  attackRange: number;
  fireRate: number;
  burstSize: number;
  accuracy: number;
  behavior: "grunt" | "rifleman" | "captain" | "drone" | "turret" | "heavy";
  lootTableId: string;
  xpValue: number;
  flying?: boolean;
}

export interface ContractDef {
  id: string;
  name: string;
  description: string;
  faction: Faction;
  objectives: {
    type: "collect" | "kill" | "activate" | "deliver";
    targetId: string;
    count: number;
    locationId?: string;
  }[];
  rewards: {
    scrap: number;
    reputation: { faction: Faction; amount: number }[];
    items: { itemId: string; count: number }[];
  };
}

export interface WorldEventDef {
  id: string;
  name: string;
  description: string;
  locations: string[];
  intervalMinMs: number;
  intervalMaxMs: number;
  durationMs: number;
  rewardTableId: string;
}

export interface ItemStack {
  itemId: string;
  count: number;
  durability?: number;
  attachments?: string[];
  instanceId?: string;
}

export interface Inventory {
  slots: number;
  items: ItemStack[];
}

export interface EquippedLoadout {
  primary?: ItemStack;
  secondary?: ItemStack;
  armor?: ItemStack;
  throwable?: ItemStack;
}

export interface PlayerProfile {
  playerId: string;
  name: string;
  createdAt: number;
  lastSeen: number;
  scrap: number;
  reputation: Record<Faction, number>;
  unlockedBlueprints: string[];
  statistics: {
    playerKills: number;
    aiKills: number;
    deaths: number;
    contractsCompleted: number;
    lootExtracted: number;
    distanceTraveled: number;
  };
}

export interface SerializedPlayer {
  playerId: string;
  name: string;
  position: Vec3;
  rotation: { yaw: number; pitch: number };
  health: number;
  armor: number;
  isAlive: boolean;
  currentLocationId?: string;
  inSafeZone: boolean;
  equippedSlot: "primary" | "secondary" | "throwable";
  boatId?: string;
}

export interface SerializedBoat {
  id: string;
  ownerId: string;
  type: string;
  position: Vec3;
  rotation: number;
  health: number;
  maxHealth: number;
  velocity: Vec3;
  occupiedBy?: string;
  inSafeZone: boolean;
}

export interface SerializedAI {
  id: string;
  type: string;
  position: Vec3;
  rotation: number;
  health: number;
  maxHealth: number;
  armor: number;
  state: string;
  targetId?: string;
}

export interface SerializedLoot {
  id: string;
  position: Vec3;
  items: ItemStack[];
  type: "backpack" | "container" | "crate" | "boss" | "cache";
  ownerId?: string;
  despawnAt?: number;
  name?: string;
}

export interface SerializedWorldEvent {
  id: string;
  defId: string;
  active: boolean;
  locationId: string;
  progress: number;
  progressMax: number;
  timeRemainingMs: number;
}

export interface WorldSnapshot {
  tick: number;
  time: number;
  players: SerializedPlayer[];
  boats: SerializedBoat[];
  ais: SerializedAI[];
  loot: SerializedLoot[];
  event?: SerializedWorldEvent;
  stormCenter: Vec3;
  stormRadius: number;
}

export interface FireWeaponMsg {
  weaponId: string;
  origin: Vec3;
  direction: Vec3;
  timestamp: number;
  sequence: number;
  yaw: number;
  pitch: number;
}

export interface PlayerInput {
  forward: number;
  right: number;
  yaw: number;
  pitch: number;
  sprint: boolean;
  crouch: boolean;
  jump: boolean;
  fire: boolean;
  ads: boolean;
  reload: boolean;
  interact: boolean;
  inventory: boolean;
  map: boolean;
  slot: number;
  grenade: boolean;
}
