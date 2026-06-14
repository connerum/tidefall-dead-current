import { distanceVec3, normalizeVec3, subVec3 } from "@tidefall/shared";
import type { AIEntity } from "../world/AIEntity.js";
import type { PlayerEntity } from "../world/PlayerEntity.js";
import type { World } from "../world/World.js";
import { CombatSystem } from "./CombatSystem.js";

export class AISystem {
  private combat = new CombatSystem();

  tick(world: World): void {
    for (const ai of world.ais.values()) {
      if (ai.isDead()) continue;

      let nearest: PlayerEntity | undefined;
      let nearestDist = Infinity;
      for (const p of world.players.values()) {
        if (!p.isAlive) continue;
        const d = distanceVec3(ai.position, p.position);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = p;
        }
      }

      if (!nearest) {
        ai.state = "patrol";
        continue;
      }

      // Detection
      const canSee = nearestDist < ai.detectionRadius;
      const inAttackRange = nearestDist < ai.attackRange;

      if (canSee) {
        ai.targetId = nearest.playerId;
        ai.state = inAttackRange ? "attack" : "alert";
        ai.alertedUntil = Date.now() + 5000;
      } else if (ai.state === "alert" && Date.now() > ai.alertedUntil) {
        ai.state = "patrol";
        ai.targetId = undefined;
      }

      if (ai.state === "attack" && nearest) {
        // Move toward target if not in range
        if (nearestDist > ai.attackRange * 0.6 && ai.speed > 0) {
          ai.moveToward(nearest.position, 1 / 20, ai.speed);
        }
        this.combat.aiAttack(ai, nearest, 1 / 20);
      } else if (ai.state === "alert" && nearest && ai.speed > 0) {
        ai.moveToward(nearest.position, 1 / 20, ai.speed * 0.7);
      }
    }
  }
}
