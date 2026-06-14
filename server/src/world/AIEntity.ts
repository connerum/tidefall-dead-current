import {
  BALANCE,
  distanceVec3,
  getAIType,
  getWeapon,
  normalizeVec3,
  scaleVec3,
  subVec3,
  type Vec3,
} from "@tidefall/shared";
import { Entity } from "./Entity.js";

export type AIState = "idle" | "patrol" | "investigate" | "alert" | "attack" | "cover" | "dead";

export class AIEntity extends Entity {
  type: string;
  health: number;
  maxHealth: number;
  armor: number;
  state: AIState = "patrol";
  targetId?: string;
  homePosition: Vec3;
  patrolTarget?: Vec3;
  lastAttackTime = 0;
  alertedUntil = 0;
  respawnAt = 0;
  lootDropped = false;
  lootTableId: string;
  detectionRadius: number;
  attackRange: number;
  fireRate: number;
  burstSize: number;
  accuracy: number;
  speed: number;
  weaponId?: string;
  flying = false;
  xpValue: number;

  constructor(type: string, position: Vec3) {
    super("ai", position);
    this.type = type;
    this.homePosition = { ...position };
    const def = getAIType(type);
    this.maxHealth = def?.health ?? 100;
    this.health = this.maxHealth;
    this.armor = def?.armor ?? 0;
    this.lootTableId = def?.lootTableId ?? "driftwood_common";
    this.detectionRadius = def?.detectionRadius ?? 25;
    this.attackRange = def?.attackRange ?? 25;
    this.fireRate = def?.fireRate ?? 1;
    this.burstSize = def?.burstSize ?? 1;
    this.accuracy = def?.accuracy ?? 0.5;
    this.speed = def?.speed ?? 3;
    this.weaponId = def?.weaponId;
    this.flying = def?.flying ?? false;
    this.xpValue = def?.xpValue ?? 10;
    this.radius = type === "heavy_machine" ? 1.2 : type === "sentry_turret" ? 0.6 : 0.45;
    this.height = type === "heavy_machine" ? 2.5 : type === "sentry_turret" ? 1.2 : 1.7;
  }

  isDead(): boolean {
    return this.health <= 0;
  }

  applyDamage(amount: number): void {
    if (this.isDead()) return;
    const mitigation = Math.min(0.5, this.armor / 200);
    this.health -= amount * (1 - mitigation);
    if (this.health <= 0) {
      this.health = 0;
      this.state = "dead";
      this.respawnAt = Date.now() + BALANCE.ai.respawnDelayMs;
    }
  }

  tick(dt: number): void {
    if (this.isDead()) return;

    // Simple patrol: wander near home position
    if (this.state === "idle" || this.state === "patrol") {
      if (!this.patrolTarget || distanceVec3(this.position, this.patrolTarget) < 1) {
        this.patrolTarget = {
          x: this.homePosition.x + (Math.random() - 0.5) * 40,
          y: this.homePosition.y,
          z: this.homePosition.z + (Math.random() - 0.5) * 40,
        };
      }
      this.moveToward(this.patrolTarget, dt, this.speed * 0.4);
    }

    // Attack: move toward target and fire
    if (this.state === "attack" && this.targetId) {
      // Movement handled by AISystem which sets target position
    }

    // Alert decay
    if (this.state === "alert" && Date.now() > this.alertedUntil) {
      this.state = "patrol";
      this.targetId = undefined;
    }
  }

  moveToward(target: Vec3, dt: number, speed: number): void {
    const dir = subVec3(target, this.position);
    dir.y = 0;
    const len = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
    if (len < 0.1) return;
    const n = normalizeVec3(dir);
    this.position.x += n.x * speed * dt;
    this.position.z += n.z * speed * dt;
    this.rotation = Math.atan2(n.x, n.z);
  }

  canFire(): boolean {
    return Date.now() - this.lastAttackTime >= this.fireRate * 1000;
  }

  fire(): { damage: number; pellets?: number; headChance: number } | null {
    if (!this.canFire()) return null;
    this.lastAttackTime = Date.now();
    const w = this.weaponId ? getWeapon(this.weaponId) : undefined;
    const damage = w ? w.damage : 12;
    return { damage, pellets: w?.pellets, headChance: this.accuracy * 0.15 };
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      rotation: this.rotation,
      health: this.health,
      maxHealth: this.maxHealth,
      armor: this.armor,
      state: this.state,
      targetId: this.targetId,
    };
  }
}
