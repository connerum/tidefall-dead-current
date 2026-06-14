import { distanceVec3, getWorldEvent, LOCATIONS, SIGNAL_TOWER_HOLD_MS, type Vec3, WORLD_EVENT_INTERVAL_MAX_MS, WORLD_EVENT_INTERVAL_MIN_MS, type WorldEventDef } from "@tidefall/shared";

export interface ActiveWorldEvent {
  id: string;
  defId: string;
  locationId: string;
  position: Vec3;
  startedAt: number;
  endsAt: number;
  holderId?: string;
  holdStartTime?: number;
  progressMs: number;
  completed: boolean;
  announced: boolean;
}

export class WorldEventManager {
  active?: ActiveWorldEvent;
  private nextEventAt = Date.now() + WORLD_EVENT_INTERVAL_MIN_MS;
  private completedEventIds = new Set<string>();

  tick(onAnnounce: (msg: string) => void, onComplete: (event: ActiveWorldEvent) => void): ActiveWorldEvent | undefined {
    const now = Date.now();

    if (!this.active && now >= this.nextEventAt) {
      this.active = this.spawnEvent();
      if (this.active) {
        const loc = LOCATIONS[this.active.locationId];
        onAnnounce(`Signal Tower active near ${loc.name}.`);
        this.active.announced = true;
      }
    }

    if (this.active) {
      const ev = this.active;
      if (ev.holderId && !ev.completed) {
        ev.progressMs = now - (ev.holdStartTime ?? now);
        if (ev.progressMs >= SIGNAL_TOWER_HOLD_MS) {
          ev.completed = true;
          onComplete(ev);
        }
      }
      if (now >= ev.endsAt && !ev.completed) {
        this.active = undefined;
        this.scheduleNextEvent();
      }
    }

    return this.active;
  }

  private spawnEvent(): ActiveWorldEvent | undefined {
    const def = getWorldEvent("signal_tower");
    if (!def) return undefined;
    const locationId = def.locations[Math.floor(Math.random() * def.locations.length)];
    const loc = LOCATIONS[locationId];
    if (!loc) return undefined;
    const id = `event_${Date.now()}`;
    const now = Date.now();
    return {
      id,
      defId: def.id,
      locationId,
      position: { ...loc.position },
      startedAt: now,
      endsAt: now + def.durationMs,
      progressMs: 0,
      completed: false,
      announced: false,
    };
  }

  private scheduleNextEvent(): void {
    const range = WORLD_EVENT_INTERVAL_MAX_MS - WORLD_EVENT_INTERVAL_MIN_MS;
    this.nextEventAt = Date.now() + WORLD_EVENT_INTERVAL_MIN_MS + Math.random() * range;
  }

  claimArea(playerId: string, position: Vec3): boolean {
    if (!this.active) return false;
    if (distanceVec3(position, this.active.position) > 40) return false;
    if (this.active.completed) return false;
    if (this.active.holderId === playerId) return true;
    this.active.holderId = playerId;
    this.active.holdStartTime = Date.now();
    this.active.progressMs = 0;
    return true;
  }

  resetHold(): void {
    if (!this.active) return;
    this.active.holderId = undefined;
    this.active.holdStartTime = undefined;
    this.active.progressMs = 0;
  }

  completeEvent(): void {
    this.active = undefined;
    this.scheduleNextEvent();
  }

  getRemainingMs(): number {
    if (!this.active) return 0;
    return Math.max(0, this.active.endsAt - Date.now());
  }

  serialize() {
    if (!this.active) return undefined;
    return {
      id: this.active.id,
      defId: this.active.defId,
      active: !this.active.completed,
      locationId: this.active.locationId,
      progress: this.active.progressMs,
      progressMax: SIGNAL_TOWER_HOLD_MS,
      timeRemainingMs: this.getRemainingMs(),
    };
  }
}
