import { distanceVec3, type Vec3 } from "@tidefall/shared";
import type { Entity } from "./Entity.js";

export class InterestManager {
  private interestRadius = 180;

  getVisibleEntities<T extends Entity>(viewerPos: Vec3, entities: T[]): T[] {
    return entities.filter((e) => distanceVec3(viewerPos, e.position) <= this.interestRadius);
  }

  shouldSendEntity(viewerPos: Vec3, entityPos: Vec3): boolean {
    return distanceVec3(viewerPos, entityPos) <= this.interestRadius;
  }
}
