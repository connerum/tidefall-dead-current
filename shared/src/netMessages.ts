export type ServerMessage =
  | { type: "snapshot"; data: unknown }
  | { type: "auth"; playerId: string }
  | { type: "profile"; data: unknown }
  | { type: "inventory"; data: unknown }
  | { type: "boatCargo"; boatId: string; data: unknown }
  | { type: "lootOpen"; lootId: string; data: unknown }
  | { type: "craftingResult"; success: boolean; message: string }
  | { type: "notification"; message: string; kind: "info" | "success" | "warning" | "danger" }
  | { type: "hitmarker"; damage: number; headshot: boolean }
  | { type: "death"; killer?: string; reason: string }
  | { type: "eventUpdate"; data: unknown }
  | { type: "contractUpdate"; data: unknown }
  | { type: "chat"; sender: string; text: string }
  | { type: "pong"; timestamp: number };

export type ClientMessage =
  | { type: "join"; name: string; playerId?: string }
  | { type: "input"; data: unknown }
  | { type: "fire"; data: unknown }
  | { type: "reload" }
  | { type: "interact"; targetId?: string }
  | { type: "lootTake"; lootId: string; itemIndex: number; count: number }
  | { type: "lootGive"; lootId: string; item: unknown }
  | { type: "equip"; slot: "primary" | "secondary" | "armor" | "throwable"; itemIndex: number }
  | { type: "unequip"; slot: "primary" | "secondary" | "armor" | "throwable" }
  | { type: "craft"; recipeId: string }
  | { type: "acceptContract"; contractId: string }
  | { type: "abandonContract" }
  | { type: "bank"; itemIndex: number; count: number }
  | { type: "withdraw"; itemIndex: number; count: number }
  | { type: "spawnBoat" }
  | { type: "boardBoat"; boatId: string }
  | { type: "exitBoat" }
  | { type: "ping"; timestamp: number }
  | { type: "devCommand"; command: string; args?: unknown };

export function encodeMessage(msg: ServerMessage | ClientMessage): string {
  return JSON.stringify(msg);
}

export function decodeMessage(raw: string): ServerMessage | ClientMessage | null {
  try {
    return JSON.parse(raw) as ServerMessage | ClientMessage;
  } catch {
    return null;
  }
}
