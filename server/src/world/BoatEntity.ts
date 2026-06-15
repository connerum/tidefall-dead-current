import { BALANCE, type ItemStack, getItem, normalizeVec3, scaleVec3, type Vec3 } from "@tidefall/shared";
import { Entity } from "./Entity.js";

// Island [x, z, radius] — radius includes a 5-unit hull allowance so the
// boat hull edge stops at the waterline, not the boat center.
const ISLANDS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 185],
  [-550, -450, 135],
  [520, -380, 155],
  [-480, 520, 165],
  [580, 480, 175],
  [0, -800, 125],
];

function boatHitsLand(x: number, z: number): boolean {
  for (const [ix, iz, ir] of ISLANDS) {
    const dx = x - ix;
    const dz = z - iz;
    if (dx * dx + dz * dz < ir * ir) return true;
  }
  return false;
}

export class BoatEntity extends Entity {
  ownerId: string;
  type: string;
  maxHealth: number;
  health: number;
  throttle = 0;
  steering = 0;
  boosting = false;
  cargo: ItemStack[] = [];
  occupiedBy?: string;
  dockedAt?: string;
  lastUsedAt: number;
  inSafeZone = true;

  constructor(ownerId: string, type: string, position: Vec3) {
    super("boat", position);
    this.ownerId = ownerId;
    this.type = type;
    const cfg = BALANCE.boat[type as keyof typeof BALANCE.boat] as typeof BALANCE.boat.skiff;
    this.maxHealth = cfg?.maxHealth ?? 400;
    this.health = this.maxHealth;
    this.radius = 5; // larger ship hull
    this.height = 2.0;
    this.lastUsedAt = Date.now();
  }

  getConfig() {
    return BALANCE.boat[this.type as keyof typeof BALANCE.boat] as typeof BALANCE.boat.skiff;
  }

  applyDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  repair(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addCargo(item: ItemStack): boolean {
    const def = getItem(item.itemId);
    if (!def) return false;
    if (def.stackable) {
      const existing = this.cargo.find((i) => i.itemId === item.itemId);
      if (existing) {
        existing.count += item.count;
        return true;
      }
    }
    if (this.cargo.length >= BALANCE.inventory.skiffCargoSlots) return false;
    this.cargo.push({ ...item });
    return true;
  }

  tick(dt: number): void {
    const cfg = this.getConfig();
    const targetSpeed = this.boosting ? cfg.boost : cfg.speed;
    const speed = targetSpeed * this.throttle;
    const forward = { x: Math.sin(this.rotation), y: 0, z: Math.cos(this.rotation) };
    this.velocity.x = forward.x * speed;
    this.velocity.z = forward.z * speed;
    const oldX = this.position.x;
    const oldZ = this.position.z;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    // Shore collision — inlined so it cannot be tree-shaken or lost in
    // package resolution. Block when the hull would cross the waterline.
    if (boatHitsLand(this.position.x, this.position.z)) {
      this.position.x = oldX;
      this.position.z = oldZ;
      this.velocity.x = 0;
      this.velocity.z = 0;
    }
    this.rotation += this.steering * cfg.turnSpeed * dt * (this.throttle !== 0 ? 1 : 0.4);
    this.lastUsedAt = Date.now();
  }

  serialize(): import("@tidefall/shared").SerializedBoat {
    return {
      id: this.id,
      ownerId: this.ownerId,
      type: this.type,
      position: this.position,
      rotation: this.rotation,
      health: this.health,
      maxHealth: this.maxHealth,
      velocity: this.velocity,
      occupiedBy: this.occupiedBy,
      inSafeZone: this.inSafeZone,
    };
  }
}
