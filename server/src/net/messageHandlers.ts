import {
  BALANCE,
  distanceVec3,
  getItem,
  getLootTable,
  type ClientMessage,
  type FireWeaponMsg,
  type ServerMessage,
} from "@tidefall/shared";
import type { PlayerEntity } from "../world/PlayerEntity.js";
import type { World } from "../world/World.js";
import { CombatSystem } from "../systems/CombatSystem.js";
import { CraftingSystem } from "../systems/CraftingSystem.js";
import { ContractSystem } from "../systems/ContractSystem.js";
import { BoatSystem } from "../systems/BoatSystem.js";
import { InventorySystem } from "../systems/InventorySystem.js";
import { PersistenceSystem } from "../systems/PersistenceSystem.js";
import { addItemToInventory, removeItemFromInventory } from "../systems/LootSystem.js";
import { loadOrCreateProfile, saveProfile, saveStash } from "../db/playersRepo.js";

const combat = new CombatSystem();
const crafting = new CraftingSystem();
const contracts = new ContractSystem();
const boats = new BoatSystem();
const inventorySystem = new InventorySystem();
const persistence = new PersistenceSystem();

export function handleClientMessage(
  player: PlayerEntity,
  msg: ClientMessage,
  world: World,
  send: (msg: ServerMessage) => void
): void {
  switch (msg.type) {
    case "input": {
      const data = msg.data as Record<string, unknown>;
      player.inputForward = clampNumber(data.forward, -1, 1);
      player.inputRight = clampNumber(data.right, -1, 1);
      player.yaw = Number(data.yaw ?? player.yaw);
      player.pitch = clampNumber(Number(data.pitch ?? player.pitch), -Math.PI / 2, Math.PI / 2);
      player.sprinting = Boolean(data.sprint);
      player.crouching = Boolean(data.crouch);
      player.jumping = Boolean(data.jump);

      if (data.slot !== undefined) {
        const slot = Number(data.slot);
        if (slot === 1) player.equippedSlot = "primary";
        else if (slot === 2) player.equippedSlot = "secondary";
        else if (slot === 3) player.equippedSlot = "throwable";
      }

      if (player.isDrivingBoat && player.boatId) {
        const boat = world.boats.get(player.boatId);
        if (boat) {
          boats.updateControls(player, boat, player.inputForward, -player.inputRight, player.sprinting);
        }
      }
      break;
    }

    case "fire": {
      if (!player.isAlive) break;
      const fireMsg = msg.data as FireWeaponMsg;
      const result = combat.handleFire(
        player,
        fireMsg,
        world.players,
        world.ais,
        world.boats,
        player.inSafeZone
      );
      if (result?.hit) {
        send({ type: "hitmarker", damage: result.damage, headshot: result.headshot });
        if (result.targetId?.startsWith("player_")) {
          const target = world.players.get(result.targetId);
          if (target && !target.isAlive) {
            player.statistics.playerKills++;
            send({ type: "notification", message: `You eliminated ${target.name}`, kind: "success" });
          }
        }
      }
      break;
    }

    case "reload": {
      player.reloadWeapon();
      break;
    }

    case "interact": {
      handleInteract(player, msg.targetId as string | undefined, world, send);
      break;
    }

    case "lootTake": {
      const loot = world.loot.get(msg.lootId);
      if (!loot || distanceVec3(player.position, loot.position) > 4) {
        send({ type: "notification", message: "Too far to loot.", kind: "warning" });
        break;
      }
      if (loot.lootType === "backpack" && player.inSafeZone) {
        send({ type: "notification", message: "Cannot loot backpacks in safe zone.", kind: "warning" });
        break;
      }
      const taken = loot.takeItem(msg.itemIndex, msg.count);
      if (taken) {
        if (!addItemToInventory(player.backpack, taken, 16)) {
          loot.addItem(taken);
          send({ type: "notification", message: "Backpack full.", kind: "warning" });
        } else {
          send({ type: "notification", message: `Looted ${getItem(taken.itemId)?.name ?? taken.itemId} x${taken.count}`, kind: "success" });
          world.contracts.trackCollect(player.playerId, taken.itemId, player.currentLocationId);
        }
      }
      sendInventory(player, world, send);
      break;
    }

    case "equip": {
      if (msg.slot === "primary" || msg.slot === "secondary") {
        player.equipWeaponFromBackpack(msg.itemIndex, msg.slot);
      } else if (msg.slot === "armor") {
        player.equipArmor(msg.itemIndex);
      } else if (msg.slot === "throwable") {
        const item = player.backpack[msg.itemIndex];
        if (item && getItem(item.itemId)?.category === "consumable" && item.itemId === "frag_grenade") {
          player.throwables.push({ itemId: item.itemId, count: 1 });
          removeItemFromInventory(player.backpack, item.itemId, 1);
        }
      }
      sendInventory(player, world, send);
      break;
    }

    case "craft": {
      const profile = loadOrCreateProfile(player.playerId, player.name);
      const result = crafting.craft(player, msg.recipeId, profile);
      saveProfile(profile);
      send({ type: "craftingResult", success: result.success, message: result.message });
      // Keep the client's blueprint knowledge in sync after a successful craft.
      if (result.success) send({ type: "profile", data: profile });
      sendInventory(player, world, send);
      break;
    }

    case "acceptContract": {
      if (contracts.acceptContract(player.playerId, msg.contractId)) {
        send({ type: "contractUpdate", data: contracts.getActive(player.playerId) });
        send({ type: "notification", message: "Contract accepted.", kind: "info" });
      }
      break;
    }

    case "abandonContract": {
      contracts.abandonContract(player.playerId);
      send({ type: "contractUpdate", data: null });
      break;
    }

    case "bank": {
      const profile = loadOrCreateProfile(player.playerId, player.name);
      if (inventorySystem.moveToStash(player, msg.itemIndex, msg.count, profile)) {
        saveProfile(profile);
        saveStash(player.playerId, player.stash);
        sendInventory(player, world, send);
        send({ type: "notification", message: "Item banked.", kind: "success" });
      }
      break;
    }

    case "withdraw": {
      if (inventorySystem.withdrawFromStash(player, msg.itemIndex, msg.count)) {
        saveStash(player.playerId, player.stash);
        sendInventory(player, world, send);
      }
      break;
    }

    case "spawnBoat": {
      if (!player.inSafeZone) {
        send({ type: "notification", message: "Can only spawn boats at The Haven.", kind: "warning" });
        break;
      }
      const boat = boats.spawnBoat(player, world.boats);
      if (boat) {
        boats.boardBoat(player, boat);
        send({ type: "notification", message: "Skiff spawned.", kind: "success" });
      }
      break;
    }

    case "boardBoat": {
      const boat = world.boats.get(msg.boatId);
      if (boat && distanceVec3(player.position, boat.position) < 9) {
        boats.boardBoat(player, boat);
      }
      break;
    }

    case "exitBoat": {
      if (player.boatId) {
        const boat = world.boats.get(player.boatId);
        if (boat) boats.exitBoat(player, boat);
      }
      break;
    }

    case "chat": {
      const text = String(msg.text ?? "").slice(0, 200).trim();
      if (text) {
        world.broadcast({ type: "chat", sender: player.name, text });
      }
      break;
    }

    case "devCommand": {
      handleDevCommand(player, (msg as { command: string }).command, world, send);
      break;
    }
  }
}

function handleInteract(player: PlayerEntity, targetId: string | undefined, world: World, send: (msg: ServerMessage) => void): void {
  let nearest = undefined;
  let nearestDist = 4;
  for (const l of world.loot.values()) {
    const d = distanceVec3(player.position, l.position);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = l;
    }
  }
  if (nearest) {
    send({ type: "lootOpen", lootId: nearest.id, data: nearest.serialize() });
    return;
  }

  if (player.inSafeZone && player.currentLocationId === "haven") {
    persistence.bankAll(player);
    saveStash(player.playerId, player.stash);
    sendInventory(player, world, send);
    send({ type: "notification", message: "All carried loot banked safely.", kind: "success" });
    // Check contract completion after banking
    const profile = loadOrCreateProfile(player.playerId, player.name);
    const completed = world.contracts.checkCompletion(player, profile);
    if (completed.completed) {
      saveProfile(profile);
      send({ type: "contractUpdate", data: null });
      send({ type: "notification", message: "Contract complete!", kind: "success" });
    }
    return;
  }

  if (world.events.active && distanceVec3(player.position, world.events.active.position) < 40) {
    world.events.claimArea(player.playerId, player.position);
    send({ type: "notification", message: "Claiming signal tower area...", kind: "info" });
    return;
  }
}

function handleDevCommand(player: PlayerEntity, command: string, world: World, send: (msg: ServerMessage) => void): void {
  switch (command) {
    case "give":
      inventorySystem.giveTestLoot(player);
      sendInventory(player, world, send);
      send({ type: "notification", message: "Dev loot given.", kind: "success" });
      break;
    case "respawn":
      world.respawnPlayerAtHaven(player);
      break;
    case "tp_driftwood":
      player.position = { x: -550, y: 0, z: -450 };
      break;
    case "tp_fort":
      player.position = { x: 520, y: 0, z: -380 };
      break;
    case "tp_shipyard":
      player.position = { x: -480, y: 0, z: 520 };
      break;
    case "tp_crown":
      player.position = { x: 580, y: 0, z: 480 };
      break;
    case "tp_wreck":
      player.position = { x: 0, y: 0, z: -800 };
      break;
    case "kill_ai": {
      for (const ai of world.ais.values()) {
        if (distanceVec3(player.position, ai.position) < 50) {
          ai.applyDamage(9999);
        }
      }
      break;
    }
  }
}

function sendInventory(player: PlayerEntity, world: World, send: (msg: ServerMessage) => void): void {
  send({ type: "inventory", data: world.serializeInventory(player) });
}

function clampNumber(v: unknown, min: number, max: number): number {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(min, Math.min(max, n));
}
