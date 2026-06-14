import {
  BALANCE,
  clamp,
  distanceVec3,
  getWeapon,
  HIT_MULTIPLIER_HEAD,
  HIT_MULTIPLIER_LIMB,
  HIT_MULTIPLIER_TORSO,
  normalizeVec3,
  subVec3,
  type FireWeaponMsg,
  type Vec3,
} from "@tidefall/shared";
import type { AIEntity } from "../world/AIEntity.js";
import type { BoatEntity } from "../world/BoatEntity.js";
import type { PlayerEntity } from "../world/PlayerEntity.js";

interface CombatResult {
  hit: boolean;
  targetId?: string;
  damage: number;
  headshot: boolean;
  limb: boolean;
}

export class CombatSystem {
  handleFire(
    player: PlayerEntity,
    msg: FireWeaponMsg,
    players: Map<string, PlayerEntity>,
    ais: Map<string, AIEntity>,
    boats: Map<string, BoatEntity>,
    isSafeZone: boolean
  ): CombatResult | null {
    const w = player.getEquippedWeapon();
    const def = w ? getWeapon(w.weaponId) : undefined;
    if (!w || !def) return null;

    // Fire rate validation
    const now = Date.now();
    const minInterval = 60000 / def.rpm;
    if (now - w.lastFireTime < minInterval * 0.9) return null;

    // Ammo validation
    if (w.ammoInMag <= 0) return null;

    // Reload check
    if (w.reloading) return null;

    // Sequence validation
    if (msg.sequence <= player.lastShotSequence) return null;
    player.lastShotSequence = msg.sequence;
    w.lastFireTime = now;
    w.ammoInMag--;

    // Validate origin roughly matches player view
    const origin = msg.origin;
    const eyePos = { x: player.position.x, y: player.position.y + player.height * 0.9, z: player.position.z };
    if (distanceVec3(origin, eyePos) > 5) {
      // Allow some tolerance for lag; override with server eye pos
      origin.x = eyePos.x;
      origin.y = eyePos.y;
      origin.z = eyePos.z;
    }

    let dir = normalizeVec3(msg.direction);

    // Apply movement spread
    const isMoving = Math.abs(player.inputForward) > 0.1 || Math.abs(player.inputRight) > 0.1;
    const spread = isMoving ? def.spreadBase + def.spreadMove : def.spreadBase;
    const randomSpread = () => (Math.random() - 0.5) * spread;
    dir = normalizeVec3({ x: dir.x + randomSpread(), y: dir.y + randomSpread(), z: dir.z + randomSpread() });

    // Apply recoil
    w.recoilPitch += def.recoilVertical;
    w.recoilYaw += (Math.random() - 0.5) * def.recoilHorizontal * 2;

    // Find closest intersecting target along ray
    let best: { targetId: string; isAI: boolean; distance: number; point: Vec3 } | null = null;

    for (const [id, p] of players.entries()) {
      if (id === player.playerId || !p.isAlive) continue;
      const t = this.rayIntersectCapsule(origin, dir, p.position, p.height, p.radius);
      if (t !== null && (!best || t < best.distance)) {
        best = { targetId: id, isAI: false, distance: t, point: this.pointOnRay(origin, dir, t) };
      }
    }

    for (const [id, ai] of ais.entries()) {
      if (ai.isDead()) continue;
      const t = this.rayIntersectCapsule(origin, dir, ai.position, ai.height, ai.radius);
      if (t !== null && (!best || t < best.distance)) {
        best = { targetId: id, isAI: true, distance: t, point: this.pointOnRay(origin, dir, t) };
      }
    }

    if (!best) return { hit: false, damage: 0, headshot: false, limb: false };

    // Safe zone PvP prevention
    if (!best.isAI && isSafeZone) {
      return { hit: false, damage: 0, headshot: false, limb: false };
    }

    // Hit zone
    const targetPos = best.isAI ? ais.get(best.targetId)!.position : players.get(best.targetId)!.position;
    const hitHeight = best.point.y - targetPos.y;
    let multiplier = HIT_MULTIPLIER_TORSO;
    let headshot = false;
    let limb = false;
    if (hitHeight > targetPos.y + targetPos.y * 0.7) {
      multiplier = HIT_MULTIPLIER_HEAD;
      headshot = true;
    } else if (hitHeight < targetPos.y + targetPos.y * 0.3) {
      multiplier = HIT_MULTIPLIER_LIMB;
      limb = true;
    }

    // Falloff
    const dist = best.distance;
    let damage = def.damage;
    if (dist > def.damageFalloffStart) {
      const t = clamp((dist - def.damageFalloffStart) / (def.damageFalloffEnd - def.damageFalloffStart), 0, 1);
      damage = damage * (1 - t) + def.minDamage * t;
    }

    damage *= multiplier;

    if (best.isAI) {
      ais.get(best.targetId)!.applyDamage(damage);
    } else {
      players.get(best.targetId)!.applyDamage(damage);
    }

    return { hit: true, targetId: best.targetId, damage: Math.round(damage), headshot, limb };
  }

  private rayIntersectCapsule(origin: Vec3, dir: Vec3, base: Vec3, height: number, radius: number): number | null {
    // Simplified vertical capsule as cylinder + sphere caps. Use bounding cylinder.
    const oc = { x: origin.x - base.x, y: origin.y - (base.y + height / 2), z: origin.z - base.z };
    const a = dir.x * dir.x + dir.z * dir.z;
    const b = 2 * (oc.x * dir.x + oc.z * dir.z);
    const c = oc.x * oc.x + oc.z * oc.z - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const t1 = (-b - Math.sqrt(disc)) / (2 * a);
    const t2 = (-b + Math.sqrt(disc)) / (2 * a);
    const t = t1 >= 0 ? t1 : t2 >= 0 ? t2 : null;
    if (t === null) return null;
    const hitY = origin.y + dir.y * t;
    if (hitY < base.y || hitY > base.y + height) return null;
    return t;
  }

  private pointOnRay(origin: Vec3, dir: Vec3, t: number): Vec3 {
    return { x: origin.x + dir.x * t, y: origin.y + dir.y * t, z: origin.z + dir.z * t };
  }

  aiAttack(ai: AIEntity, target: PlayerEntity, dt: number): void {
    if (ai.isDead() || !target.isAlive) return;
    const dist = distanceVec3(ai.position, target.position);
    if (dist > ai.attackRange) return;

    // Face target
    const dir = normalizeVec3(subVec3(target.position, ai.position));
    ai.rotation = Math.atan2(dir.x, dir.z);

    const fire = ai.fire();
    if (!fire) return;

    // Accuracy roll
    const roll = Math.random();
    if (roll > ai.accuracy) {
      // Miss
      return;
    }

    // Head/body/limb
    const r = Math.random();
    let multiplier = HIT_MULTIPLIER_TORSO;
    if (r < 0.15) multiplier = HIT_MULTIPLIER_HEAD;
    else if (r < 0.35) multiplier = HIT_MULTIPLIER_LIMB;

    const w = ai.weaponId ? getWeapon(ai.weaponId) : undefined;
    const baseDamage = w ? w.damage : 12;
    let damage = baseDamage * multiplier;
    if (dist > (w?.damageFalloffStart ?? 20)) {
      const t = clamp((dist - (w?.damageFalloffStart ?? 20)) / ((w?.damageFalloffEnd ?? 60) - (w?.damageFalloffStart ?? 20)), 0, 1);
      damage = damage * (1 - t) + (w?.minDamage ?? 6) * t;
    }
    target.applyDamage(damage);
  }
}
