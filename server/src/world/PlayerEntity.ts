import {
  BALANCE,
  clamp,
  distanceVec3,
  getAllCollisionShapes,
  checkCollisionCircle,
  getItem,
  getWeapon,
  type ItemStack,
  ITEMS,
  lengthVec3,
  normalizeVec3,
  PLAYER_HEALTH,
  PLAYER_SPRINT_SPEED,
  PLAYER_WALK_SPEED,
  PLAYER_CROUCH_SPEED,
  PLAYER_JUMP_VELOCITY,
  scaleVec3,
  type Vec3,
  WEAPONS,
} from "@tidefall/shared";
import { Entity } from "./Entity.js";

export interface WeaponState {
  weaponId: string;
  ammoInMag: number;
  lastFireTime: number;
  reloading: boolean;
  reloadEndTime: number;
  recoilYaw: number;
  recoilPitch: number;
}

export class PlayerEntity extends Entity {
  playerId: string;
  name: string;
  health: number;
  armor: number;
  isAlive = true;
  respawnAt = 0;
  yaw = 0;
  pitch = 0;
  inputForward = 0;
  inputRight = 0;
  sprinting = false;
  crouching = false;
  jumping = false;
  onGround = true;
  currentLocationId?: string;
  inSafeZone = true;

  backpack: ItemStack[] = [];
  stash: ItemStack[] = [];
  equippedSlot: "primary" | "secondary" | "throwable" = "primary";
  equippedArmor?: ItemStack;
  primaryWeapon?: WeaponState;
  secondaryWeapon?: WeaponState;
  throwables: ItemStack[] = [];
  activeHealing?: { itemId: string; total: number; remaining: number; tickHeal: number; endTime: number };
  boatId?: string;
  isDrivingBoat = false;

  statistics = {
    playerKills: 0,
    aiKills: 0,
    deaths: 0,
    contractsCompleted: 0,
    lootExtracted: 0,
    distanceTraveled: 0,
  };

  lastShotSequence = 0;
  pendingShot = false;
  lastShotTime = 0;

  constructor(playerId: string, name: string, position: Vec3) {
    super("player", position);
    this.playerId = playerId;
    this.name = name;
    this.health = PLAYER_HEALTH;
    this.armor = 0;
    this.radius = 0.4;
    this.height = 1.7;
  }

  giveStarterGear(): void {
    this.backpack = [
      { itemId: "rust_pistol", count: 1 },
      { itemId: "light_ammo", count: 60 },
      { itemId: "bandage", count: 3 },
      { itemId: "scrap", count: 20 },
    ];
    this.equipWeaponFromBackpack(0, "primary");
  }

  equipWeaponFromBackpack(index: number, slot: "primary" | "secondary"): boolean {
    const item = this.backpack[index];
    if (!item) return false;
    const def = getItem(item.itemId);
    if (!def || def.category !== "weapon") return false;
    const w = getWeapon(item.itemId);
    if (!w) return false;

    // Move existing equipped weapon back to backpack
    const existing = slot === "primary" ? this.primaryWeapon : this.secondaryWeapon;
    if (existing) {
      this.addToBackpack({ itemId: existing.weaponId, count: 1 });
      if (slot === "primary") this.primaryWeapon = undefined;
      else this.secondaryWeapon = undefined;
    }

    // Remove from backpack
    this.removeFromBackpack(index, 1);

    const ammo = this.countAmmo(w.ammoType);
    const ammoInMag = Math.min(w.magazineSize, ammo);
    this.removeAmmo(w.ammoType, ammoInMag);

    const state: WeaponState = {
      weaponId: w.id,
      ammoInMag,
      lastFireTime: 0,
      reloading: false,
      reloadEndTime: 0,
      recoilYaw: 0,
      recoilPitch: 0,
    };
    if (slot === "primary") this.primaryWeapon = state;
    else this.secondaryWeapon = state;
    return true;
  }

  equipArmor(index: number): boolean {
    const item = this.backpack[index];
    if (!item) return false;
    const def = getItem(item.itemId);
    if (!def || def.category !== "armor") return false;
    if (this.equippedArmor) {
      this.addToBackpack(this.equippedArmor);
    }
    this.equippedArmor = { itemId: item.itemId, count: 1 };
    this.removeFromBackpack(index, 1);
    this.updateArmor();
    return true;
  }

  updateArmor(): void {
    if (!this.equippedArmor) {
      this.armor = 0;
      return;
    }
    const armorMap: Record<string, number> = { basic_armor: 25, medium_armor: 50 };
    this.armor = armorMap[this.equippedArmor.itemId] ?? 0;
  }

  getEquippedWeapon(): WeaponState | undefined {
    return this.equippedSlot === "primary" ? this.primaryWeapon : this.secondaryWeapon;
  }

  countAmmo(ammoType: string): number {
    return this.backpack.filter((i) => i.itemId === ammoType).reduce((s, i) => s + i.count, 0);
  }

  removeAmmo(ammoType: string, count: number): number {
    let remaining = count;
    for (let i = this.backpack.length - 1; i >= 0 && remaining > 0; i--) {
      const item = this.backpack[i];
      if (item.itemId !== ammoType) continue;
      const take = Math.min(item.count, remaining);
      item.count -= take;
      remaining -= take;
      if (item.count <= 0) this.backpack.splice(i, 1);
    }
    return count - remaining;
  }

  addToBackpack(item: ItemStack): boolean {
    const def = getItem(item.itemId);
    if (!def) return false;
    if (def.stackable) {
      const existing = this.backpack.find((i) => i.itemId === item.itemId);
      if (existing) {
        existing.count += item.count;
        return true;
      }
    }
    if (this.backpack.length >= BALANCE.inventory.backpackSlots) return false;
    this.backpack.push({ ...item });
    return true;
  }

  removeFromBackpack(index: number, count: number): ItemStack | null {
    const item = this.backpack[index];
    if (!item) return null;
    const take = Math.min(item.count, count);
    item.count -= take;
    const taken = { itemId: item.itemId, count: take };
    if (item.count <= 0) this.backpack.splice(index, 1);
    return taken;
  }

  reloadWeapon(): boolean {
    const w = this.getEquippedWeapon();
    const def = w ? getWeapon(w.weaponId) : undefined;
    if (!w || !def || w.reloading || w.ammoInMag >= def.magazineSize) return false;
    const need = def.magazineSize - w.ammoInMag;
    const have = this.countAmmo(def.ammoType);
    if (have <= 0) return false;
    w.reloading = true;
    w.reloadEndTime = Date.now() + def.reloadTime * 1000;
    return true;
  }

  finishReload(): void {
    const w = this.getEquippedWeapon();
    const def = w ? getWeapon(w.weaponId) : undefined;
    if (!w || !def) return;
    const need = def.magazineSize - w.ammoInMag;
    const loaded = this.removeAmmo(def.ammoType, need);
    w.ammoInMag += loaded;
    w.reloading = false;
  }

  applyDamage(amount: number): void {
    if (!this.isAlive) return;
    // Armor mitigation: armor absorbs up to 50% of damage depending on armor value
    const mitigation = Math.min(0.5, this.armor / 200);
    const reduced = amount * (1 - mitigation);
    this.health -= reduced;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
    }
  }

  heal(amount: number): void {
    if (!this.isAlive) return;
    this.health = Math.min(PLAYER_HEALTH, this.health + amount);
  }

  startHeal(itemId: string): boolean {
    const item = this.backpack.find((i) => i.itemId === itemId);
    if (!item || item.count <= 0) return false;
    const def = getItem(itemId);
    if (!def || def.category !== "consumable") return false;
    if (itemId === "bandage") {
      item.count--;
      this.activeHealing = {
        itemId,
        total: 25,
        remaining: 25,
        tickHeal: 25 / 5,
        endTime: Date.now() + 5000,
      };
      return true;
    }
    if (itemId === "med_kit") {
      item.count--;
      this.activeHealing = {
        itemId,
        total: 60,
        remaining: 60,
        tickHeal: 60 / 6,
        endTime: Date.now() + 6000,
      };
      return true;
    }
    return false;
  }

  getMovementSpeed(): number {
    if (this.crouching) return PLAYER_CROUCH_SPEED;
    if (this.sprinting) return PLAYER_SPRINT_SPEED;
    return PLAYER_WALK_SPEED;
  }

  tick(dt: number): void {
    if (!this.isAlive) return;

    // While driving a boat the player rides along — their own WASD movement
    // and gravity are disabled (the boat controls throttle/steering, and the
    // world syncs the player's position to the boat each tick).
    if (!this.isDrivingBoat) {
      // Movement
      // The client camera (Three.js, YXZ order) looks down -Z by default, so its
      // horizontal forward at a given yaw is (-sin(yaw), 0, -cos(yaw)) and its
      // right vector is (cos(yaw), 0, -sin(yaw)). Movement must match the camera
      // or WASD feels reversed (forward walking you backward, etc).
      const speed = this.getMovementSpeed();
      const forward = { x: -Math.sin(this.yaw), y: 0, z: -Math.cos(this.yaw) };
      const right = { x: Math.cos(this.yaw), y: 0, z: -Math.sin(this.yaw) };
      let move = { x: 0, y: 0, z: 0 };
      move.x += forward.x * this.inputForward + right.x * this.inputRight;
      move.z += forward.z * this.inputForward + right.z * this.inputRight;
      if (lengthVec3(move) > 0) {
        move = normalizeVec3(move);
        move = scaleVec3(move, speed);
        const oldX = this.position.x;
        const oldZ = this.position.z;
        this.position.x += move.x * dt;
        this.position.z += move.z * dt;
        // Structure collision: try full move, then axis-separated slide.
        const shapes = getAllCollisionShapes();
        if (checkCollisionCircle(this.position.x, this.position.z, shapes, this.radius)) {
          if (!checkCollisionCircle(this.position.x, oldZ, shapes, this.radius)) {
            this.position.z = oldZ;
          } else if (!checkCollisionCircle(oldX, this.position.z, shapes, this.radius)) {
            this.position.x = oldX;
          } else {
            this.position.x = oldX;
            this.position.z = oldZ;
          }
        }
        this.statistics.distanceTraveled += speed * dt;
      }

      // Jump/gravity simplified
      if (this.jumping && this.onGround) {
        this.velocity.y = PLAYER_JUMP_VELOCITY;
        this.onGround = false;
      }
      this.velocity.y -= BALANCE.player.gravity * dt;
      this.position.y += this.velocity.y * dt;
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.velocity.y = 0;
        this.onGround = true;
      }
    }

    // Reload
    if (this.getEquippedWeapon()?.reloading && Date.now() >= this.getEquippedWeapon()!.reloadEndTime) {
      this.finishReload();
    }

    // Healing
    if (this.activeHealing) {
      const heal = this.activeHealing.tickHeal * dt;
      this.activeHealing.remaining -= heal;
      this.heal(heal);
      if (Date.now() >= this.activeHealing.endTime || this.activeHealing.remaining <= 0) {
        this.activeHealing = undefined;
      }
    }
  }

  resetAtHaven(position: Vec3): void {
    this.position = { ...position };
    this.health = PLAYER_HEALTH;
    this.armor = 0;
    this.isAlive = true;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.boatId = undefined;
    this.isDrivingBoat = false;
    this.activeHealing = undefined;
  }
}
