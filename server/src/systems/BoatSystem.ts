import { distanceVec3, LOCATIONS } from "@tidefall/shared";
import { BoatEntity } from "../world/BoatEntity.js";
import type { PlayerEntity } from "../world/PlayerEntity.js";

export class BoatSystem {
  spawnBoat(owner: PlayerEntity, boats: Map<string, BoatEntity>): BoatEntity | null {
    // Find nearest dock
    let dock = LOCATIONS.haven.docks[0];
    let bestDist = Infinity;
    for (const d of LOCATIONS.haven.docks) {
      const dist = distanceVec3(owner.position, d);
      if (dist < bestDist) {
        bestDist = dist;
        dock = d;
      }
    }
    if (bestDist > 80) {
      // Allow spawning from nearby open water too
    }
    const boat = new BoatEntity(owner.playerId, "skiff", { x: dock.x, y: 0, z: dock.z });
    boats.set(boat.id, boat);
    return boat;
  }

  boardBoat(player: PlayerEntity, boat: BoatEntity): boolean {
    if (boat.occupiedBy && boat.occupiedBy !== player.playerId) return false;
    boat.occupiedBy = player.playerId;
    player.boatId = boat.id;
    player.isDrivingBoat = true;
    player.position = { ...boat.position };
    return true;
  }

  exitBoat(player: PlayerEntity, boat: BoatEntity): void {
    if (boat.occupiedBy === player.playerId) {
      boat.occupiedBy = undefined;
      boat.throttle = 0;
      boat.steering = 0;
    }
    player.boatId = undefined;
    player.isDrivingBoat = false;
    player.position.x += Math.sin(boat.rotation + Math.PI / 2) * 3;
    player.position.z += Math.cos(boat.rotation + Math.PI / 2) * 3;
  }

  updateControls(player: PlayerEntity, boat: BoatEntity, forward: number, steer: number, boost: boolean): void {
    if (boat.occupiedBy !== player.playerId) return;
    boat.throttle = Math.max(-0.5, Math.min(1, forward));
    boat.steering = Math.max(-1, Math.min(1, steer));
    boat.boosting = boost;
  }
}
