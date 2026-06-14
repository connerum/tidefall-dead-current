export const WORLD_SIZE = 2200;
export const WORLD_HALF = WORLD_SIZE / 2;
export const STORM_WALL_RADIUS = 1050;
export const STORM_DAMAGE_PER_SEC = 10;
export const STORM_WARNING_DISTANCE = 100;
export const SAFE_ZONE_RADIUS = 180;
export const TICK_RATE = 20;
export const TICK_MS = 1000 / TICK_RATE;
export const SNAPSHOT_RATE = 20;
export const SNAPSHOT_MS = 1000 / SNAPSHOT_RATE;
export const BACKPACK_SLOTS = 16;
export const SKIFF_CARGO_SLOTS = 24;
export const BACKPACK_DESPAWN_MS = 10 * 60 * 1000;
export const AI_RESPAWN_MS = 5 * 60 * 1000;
export const WORLD_EVENT_INTERVAL_MIN_MS = 10 * 60 * 1000;
export const WORLD_EVENT_INTERVAL_MAX_MS = 15 * 60 * 1000;
export const SIGNAL_TOWER_HOLD_MS = 60 * 1000;

export const PLAYER_HEALTH = 100;
export const PLAYER_WALK_SPEED = 5.2;
export const PLAYER_SPRINT_SPEED = 7.2;
export const PLAYER_CROUCH_SPEED = 2.8;
export const PLAYER_JUMP_VELOCITY = 5.5;
export const PLAYER_HEIGHT = 1.7;
export const PLAYER_RADIUS = 0.4;

export const HIT_MULTIPLIER_HEAD = 4;
export const HIT_MULTIPLIER_TORSO = 1;
export const HIT_MULTIPLIER_LIMB = 0.75;

export const FACTIONS = [
  "freeport",
  "salvagers",
  "wardens",
  "blackflag",
] as const;

export const RARITIES = ["common", "uncommon", "rare", "epic"] as const;
