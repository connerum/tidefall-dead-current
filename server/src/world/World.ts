import {
  BACKPACK_DESPAWN_MS,
  BALANCE,
  clamp,
  distanceVec3,
  getLootTable,
  getWeapon,
  HIT_MULTIPLIER_HEAD,
  HIT_MULTIPLIER_LIMB,
  HIT_MULTIPLIER_TORSO,
  ITEMS,
  lengthVec3,
  LOCATIONS,
  normalizeVec3,
  PLAYER_HEALTH,
  scaleVec3,
  STORM_WALL_RADIUS,
  subVec3,
  type Vec3,
  WORLD_SIZE,
  type WorldSnapshot,
  type SerializedPlayer,
  type SerializedBoat,
  type SerializedAI,
  type SerializedLoot,
} from "@tidefall/shared";
import { AIEntity } from "./AIEntity.js";
import { BoatEntity } from "./BoatEntity.js";
import { LootEntity } from "./LootEntity.js";
import { PlayerEntity } from "./PlayerEntity.js";
import { SafeZoneSystem } from "./SafeZoneSystem.js";
import { InterestManager } from "./InterestManager.js";
import { WorldEventManager } from "./WorldEventManager.js";
import { ContractSystem } from "../systems/ContractSystem.js";
import { rollLootTable } from "../systems/LootSystem.js";

export class World {
  players = new Map<string, PlayerEntity>();
  ais = new Map<string, AIEntity>();
  boats = new Map<string, BoatEntity>();
  loot = new Map<string, LootEntity>();
  safeZone = new SafeZoneSystem();
  interest = new InterestManager();
  events = new WorldEventManager();
  contracts = new ContractSystem();
  tickCount = 0;
  private onBroadcast: (msg: unknown) => void;

  constructor(onBroadcast: (msg: unknown) => void) {
    this.onBroadcast = onBroadcast;
    this.spawnIslandAIAndLoot();
  }

  addPlayer(player: PlayerEntity): void {
    this.players.set(player.playerId, player);
  }

  /** Relay a message to every connected client (used for chat). */
  broadcast(msg: import("@tidefall/shared").ServerMessage): void {
    this.onBroadcast(msg);
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
  }

  spawnIslandAIAndLoot(): void {
    for (const loc of Object.values(LOCATIONS)) {
      if (loc.riskLevel === "safe") continue;
      // Spawn AI
      for (const spawn of loc.aiSpawns) {
        for (let i = 0; i < spawn.count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * loc.radius * 0.7;
          const pos = { x: loc.position.x + Math.sin(angle) * r, y: 0, z: loc.position.z + Math.cos(angle) * r };
          const ai = new AIEntity(spawn.type, pos);
          ai.homePosition = { ...pos };
          this.ais.set(ai.id, ai);
        }
      }
      // Spawn loot containers
      for (const tableRef of loc.lootTables) {
        const table = getLootTable(tableRef.tableId);
        if (!table) continue;
        for (let i = 0; i < tableRef.count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * loc.radius * 0.6;
          const pos = { x: loc.position.x + Math.sin(angle) * r, y: 0.3, z: loc.position.z + Math.cos(angle) * r };
          const items = rollLootTable(table);
          const loot = new LootEntity(pos, items, "container", { despawnMs: BACKPACK_DESPAWN_MS, name: "Loot Cache" });
          this.loot.set(loot.id, loot);
        }
      }
    }
  }

  tick(dt: number): void {
    this.tickCount++;
    const now = Date.now();

    // Players
    for (const p of this.players.values()) {
      p.tick(dt);
      p.inSafeZone = this.safeZone.isInSafeZone(p.position);
      p.currentLocationId = this.safeZone.getCurrentLocationId(p.position);

      // Storm damage
      const distFromCenter = distanceVec3(p.position, { x: 0, y: 0, z: 0 });
      if (distFromCenter > STORM_WALL_RADIUS) {
        p.applyDamage(BALANCE.storm.damagePerSec * dt);
        // Push back
        const dir = normalizeVec3(subVec3({ x: 0, y: 0, z: 0 }, p.position));
        p.position.x += dir.x * BALANCE.storm.pushback * dt;
        p.position.z += dir.z * BALANCE.storm.pushback * dt;
      }

      // Bound world
      p.position.x = clamp(p.position.x, -WORLD_SIZE / 2, WORLD_SIZE / 2);
      p.position.z = clamp(p.position.z, -WORLD_SIZE / 2, WORLD_SIZE / 2);

      // Death handling
      if (!p.isAlive && p.respawnAt === 0) {
        p.respawnAt = now + 5000;
        this.dropPlayerBackpack(p);
        this.onBroadcast({
          type: "notification",
          message: `${p.name} died in the Dead Current.`,
          kind: "danger",
        });
      }
      if (!p.isAlive && now >= p.respawnAt) {
        this.respawnPlayerAtHaven(p);
      }
    }

    // Boats
    for (const [boatKey, b] of this.boats.entries()) {
      b.tick(dt);
      b.inSafeZone = this.safeZone.isInSafeZone(b.position);
      const dist = distanceVec3(b.position, { x: 0, y: 0, z: 0 });
      if (dist > STORM_WALL_RADIUS) {
        b.applyDamage(BALANCE.storm.damagePerSec * 2 * dt);
      }
      // Sync the driver to the boat so they actually ride along.
      if (b.occupiedBy) {
        const driver = this.players.get(b.occupiedBy);
        if (driver) {
          driver.position.x = b.position.x;
          driver.position.y = b.position.y;
          driver.position.z = b.position.z;
          driver.yaw = b.rotation; // model faces the boat's heading for other viewers
        }
      }
      if (b.health <= 0) {
        // Drop cargo
        if (b.cargo.length > 0) {
          const loot = new LootEntity(b.position, b.cargo, "container", { name: "Boat Cargo" });
          this.loot.set(loot.id, loot);
        }
        // Kick the driver off so they aren't stranded in a deleted boat.
        if (b.occupiedBy) {
          const driver = this.players.get(b.occupiedBy);
          if (driver) {
            driver.isDrivingBoat = false;
            driver.boatId = undefined;
          }
        }
        this.boats.delete(boatKey);
      }
    }

    // AI
    for (const ai of this.ais.values()) {
      ai.tick(dt);
      if (ai.isDead() && !ai.lootDropped) {
        ai.lootDropped = true;
        // Track kill for players who damaged? Simplified: credit nearest player as killer.
        let nearestPlayer: PlayerEntity | undefined;
        let nearestDist = Infinity;
        for (const p of this.players.values()) {
          if (!p.isAlive) continue;
          const d = distanceVec3(p.position, ai.position);
          if (d < nearestDist) {
            nearestDist = d;
            nearestPlayer = p;
          }
        }
        if (nearestPlayer && nearestDist < 100) {
          nearestPlayer.statistics.aiKills++;
          this.contracts.trackKill(nearestPlayer.playerId, ai.type, this.safeZone.getCurrentLocationId(ai.position));
        }
        // Drop loot
        const table = getLootTable(ai.lootTableId);
        if (table) {
          const items = rollLootTable(table);
          const loot = new LootEntity(ai.position, items, "container", { name: `${ai.type} remains` });
          this.loot.set(loot.id, loot);
        }
      }
      if (ai.isDead() && Date.now() >= ai.respawnAt) {
        this.respawnAI(ai);
        ai.lootDropped = false;
      }
    }

    // Loot despawn
    for (const [id, l] of this.loot.entries()) {
      if (now >= l.despawnAt) {
        this.loot.delete(id);
      }
    }

    // Events
    this.events.tick(
      (msg) => this.onBroadcast({ type: "notification", message: msg, kind: "warning" }),
      (ev) => {
        this.onBroadcast({ type: "notification", message: `Signal Tower claimed near ${LOCATIONS[ev.locationId].name}!`, kind: "success" });
        const table = getLootTable("signal_cache");
        if (table) {
          const items = rollLootTable(table);
          const loot = new LootEntity(ev.position, items, "cache", { name: "Signal Cache" });
          this.loot.set(loot.id, loot);
        }
        this.events.completeEvent();
      }
    );
  }

  dropPlayerBackpack(player: PlayerEntity): void {
    const items = [];
    // Drop carried loot and equipped risky gear
    for (const item of player.backpack) {
      items.push({ ...item });
    }
    player.backpack = [];

    if (player.primaryWeapon) {
      items.push({ itemId: player.primaryWeapon.weaponId, count: 1 });
      player.primaryWeapon = undefined;
    }
    if (player.secondaryWeapon) {
      items.push({ itemId: player.secondaryWeapon.weaponId, count: 1 });
      player.secondaryWeapon = undefined;
    }
    if (player.equippedArmor) {
      items.push({ ...player.equippedArmor });
      player.equippedArmor = undefined;
      player.armor = 0;
    }

    if (items.length > 0) {
      const loot = new LootEntity(player.position, items, "backpack", { ownerId: player.playerId, despawnMs: BACKPACK_DESPAWN_MS, name: `${player.name}'s Backpack` });
      this.loot.set(loot.id, loot);
    }
  }

  respawnPlayerAtHaven(player: PlayerEntity): void {
    const haven = LOCATIONS.haven;
    const angle = Math.random() * Math.PI * 2;
    const r = 20 + Math.random() * 40;
    const pos = { x: haven.position.x + Math.sin(angle) * r, y: 0, z: haven.position.z + Math.cos(angle) * r };
    player.resetAtHaven(pos);
    player.giveStarterGear();
  }

  respawnAI(ai: AIEntity): void {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 30;
    ai.position = {
      x: ai.homePosition.x + Math.sin(angle) * r,
      y: ai.flying ? 4 : 0,
      z: ai.homePosition.z + Math.cos(angle) * r,
    };
    ai.health = ai.maxHealth;
    ai.state = "patrol";
    ai.targetId = undefined;
  }

  getPlayerSnapshot(includeSelf: PlayerEntity): SerializedPlayer {
    return {
      playerId: includeSelf.playerId,
      name: includeSelf.name,
      position: includeSelf.position,
      rotation: { yaw: includeSelf.yaw, pitch: includeSelf.pitch },
      health: includeSelf.health,
      armor: includeSelf.armor,
      isAlive: includeSelf.isAlive,
      currentLocationId: includeSelf.currentLocationId,
      inSafeZone: includeSelf.inSafeZone,
      equippedSlot: includeSelf.equippedSlot,
      boatId: includeSelf.boatId,
    };
  }

  getSnapshotForPlayer(playerId: string): WorldSnapshot {
    const player = this.players.get(playerId);
    if (!player) {
      return {
        tick: this.tickCount,
        time: Date.now(),
        players: [],
        boats: [],
        ais: [],
        loot: [],
        stormCenter: { x: 0, y: 0, z: 0 },
        stormRadius: STORM_WALL_RADIUS,
      };
    }
    const pos = player.position;
    const players = this.interest
      .getVisibleEntities(pos, Array.from(this.players.values()))
      .map((p) => this.getPlayerSnapshot(p));

    // Only the local player learns its own weapon/ammo state.
    const self = players.find((p) => p.playerId === playerId);
    if (self) {
      const w = player.getEquippedWeapon();
      const def = w ? getWeapon(w.weaponId) : undefined;
      if (w && def) {
        self.weapon = {
          id: def.id,
          name: def.name,
          ammoInMag: w.ammoInMag,
          magazineSize: def.magazineSize,
          reserve: player.countAmmo(def.ammoType),
          reloading: w.reloading,
        };
      }
    }

    return {
      tick: this.tickCount,
      time: Date.now(),
      players,
      boats: this.interest.getVisibleEntities(pos, Array.from(this.boats.values())).map((b) => b.serialize()),
      ais: this.interest.getVisibleEntities(pos, Array.from(this.ais.values())).map((a) => a.serialize()),
      loot: this.interest.getVisibleEntities(pos, Array.from(this.loot.values())).map((l) => l.serialize()),
      event: this.events.serialize(),
      stormCenter: { x: 0, y: 0, z: 0 },
      stormRadius: STORM_WALL_RADIUS,
    };
  }

  serializeInventory(player: PlayerEntity): unknown {
    return {
      backpack: player.backpack,
      stash: player.stash,
      equipped: {
        primary: player.primaryWeapon?.weaponId,
        secondary: player.secondaryWeapon?.weaponId,
        armor: player.equippedArmor?.itemId,
      },
      slot: player.equippedSlot,
    };
  }
}
