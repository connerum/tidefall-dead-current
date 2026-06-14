import { distanceVec3, LOCATIONS, SAFE_ZONE_RADIUS, type Vec3 } from "@tidefall/shared";

export class SafeZoneSystem {
  isInSafeZone(position: Vec3): boolean {
    const haven = LOCATIONS.haven;
    return distanceVec3(position, haven.position) < SAFE_ZONE_RADIUS;
  }

  getCurrentLocationId(position: Vec3): string | undefined {
    for (const loc of Object.values(LOCATIONS)) {
      if (distanceVec3(position, loc.position) < loc.radius) {
        return loc.id;
      }
    }
    return undefined;
  }

  getLocationName(position: Vec3): string {
    return this.getCurrentLocationId(position) ?? "Open Waters";
  }
}
