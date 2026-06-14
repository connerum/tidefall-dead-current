import * as THREE from "three";
import { BALANCE, getWeapon, PLAYER_WALK_SPEED, PLAYER_SPRINT_SPEED, PLAYER_CROUCH_SPEED, type ItemStack, type PlayerInput, type SerializedAI, type SerializedBoat, type SerializedLoot, type SerializedPlayer, type ServerMessage, type WorldSnapshot } from "@tidefall/shared";
import type { NetworkClient } from "./NetworkClient.js";
import { InputController } from "./InputController.js";
import { SceneBuilder } from "./SceneBuilder.js";
import { WeaponViewModel } from "../render/weaponViewModel.js";
import { createMuzzleFlash, createTracer, createHitParticle } from "../render/effects.js";
import { createPlayerModel, createScavengerModel, createDroneModel, createTurretModel, createSkiffModel } from "../render/models.js";
import { AudioManager } from "./AudioManager.js";
import type { Notifications } from "../ui/notifications.js";
import type { HUD } from "../ui/hud.js";
import { InventoryUI } from "../ui/inventory.js";
import { CraftingUI } from "../ui/crafting.js";
import { MapUI } from "../ui/map.js";
import { ChatUI } from "../ui/chat.js";
import { DeathScreen } from "../ui/deathScreen.js";

export class GameClient {
  private net: NetworkClient;
  private input: InputController;
  private scene: SceneBuilder;
  private weaponView: WeaponViewModel;
  private audio = new AudioManager();
  private notifications: Notifications;
  private hud: HUD;
  private inventoryUI: InventoryUI;
  private craftingUI: CraftingUI;
  private mapUI: MapUI;
  private chatUI: ChatUI;
  private deathScreen: DeathScreen;

  private playerId?: string;
  private localPlayer: SerializedPlayer | null = null;
  private entities = {
    players: new Map<string, THREE.Group>(),
    ais: new Map<string, THREE.Group>(),
    boats: new Map<string, THREE.Group>(),
    loot: new Map<string, THREE.Group>(),
  };
  private remoteData: WorldSnapshot | null = null;
  private lastFireTime = 0;
  private fireSequence = 0;
  private ads = false;
  private alive = true;
  private muzzleFlash: THREE.PointLight;
  private effects: THREE.Object3D[] = [];
  private inventoryOpen = false;
  private craftingOpen = false;
  private mapOpen = false;
  private currentLootId?: string;
  private prevFire = false;
  private recoilKick = 0;
  private nearestBoatId?: string;
  private promptText = "";
  // Client-side prediction: the local player is moved instantly using the same
  // movement math as the server, then reconciled when authoritative snapshots
  // arrive. Without this the camera snaps to 20 Hz server positions and feels
  // choppy.
  private predicted = new THREE.Vector3();
  private predictedInit = false;
  private prevTime = 0;
  // Client-side prediction for the boat the local player is driving, so the
  // ride is smooth instead of stuttering toward 20 Hz server snapshots.
  private drivenBoat: { pos: THREE.Vector3; rot: number; init: boolean } = {
    pos: new THREE.Vector3(),
    rot: 0,
    init: false,
  };

  constructor(net: NetworkClient, notifications: Notifications, hud: HUD) {
    this.net = net;
    this.notifications = notifications;
    this.hud = hud;
    const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
    this.input = new InputController(canvas);
    this.scene = new SceneBuilder(canvas);
    this.weaponView = new WeaponViewModel();
    this.scene.camera.add(this.weaponView.root);
    this.scene.scene.add(this.scene.camera);
    this.muzzleFlash = createMuzzleFlash();
    this.scene.camera.add(this.muzzleFlash);
    this.muzzleFlash.position.set(0.2, -0.15, -0.5);

    this.inventoryUI = new InventoryUI(net, () => this.toggleInventory());
    this.craftingUI = new CraftingUI(net, () => this.toggleCrafting());
    this.mapUI = new MapUI();
    this.chatUI = new ChatUI(net);
    this.deathScreen = new DeathScreen();

    this.input.onAction = (action) => this.handleAction(action);
  }

  start(): void {
    this.loop();
  }

  handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "auth":
        this.playerId = msg.playerId;
        break;
      case "snapshot":
        this.remoteData = msg.data as WorldSnapshot;
        break;
      case "profile":
        this.hud.setProfile(msg.data);
        this.craftingUI.setUnlockedBlueprints(((msg.data as { unlockedBlueprints?: string[] })?.unlockedBlueprints) ?? []);
        break;
      case "inventory": {
        const inv = msg.data as { backpack: ItemStack[]; stash: ItemStack[]; equipped: { primary?: string; secondary?: string; armor?: string }; slot: string };
        this.inventoryUI.setInventory(inv);
        this.craftingUI.setBackpack(inv.backpack);
        break;
      }
      case "lootOpen":
        this.currentLootId = (msg as { lootId: string }).lootId;
        this.inventoryUI.setLoot((msg as { data: unknown }).data as { id?: string; items: ItemStack[]; name?: string });
        if (!this.inventoryOpen) this.toggleInventory();
        break;
      case "hitmarker":
        this.hud.showHitmarker(msg.damage, msg.headshot);
        this.audio.playHitmarker();
        break;
      case "death":
        this.alive = false;
        this.deathScreen.show(msg.killer);
        document.exitPointerLock();
        break;
      case "notification":
        this.notifications.show(msg.message, msg.kind);
        this.audio.playNotification();
        break;
      case "craftingResult":
        this.notifications.show(msg.message, msg.success ? "success" : "warning");
        break;
      case "contractUpdate":
        this.hud.setContract(msg.data as { contractId: string; progress: Record<string, number> } | null);
        break;
      case "pong":
        this.hud.setPing(Date.now() - msg.timestamp);
        break;
      case "chat":
        this.chatUI.addMessage(msg.sender, msg.text);
        break;
    }
  }

  private handleAction(action: string): void {
    if (action === "escape") {
      this.inventoryOpen = false;
      this.craftingOpen = false;
      this.mapOpen = false;
      this.inventoryUI.hide();
      this.craftingUI.hide();
      this.mapUI.hide();
      this.chatUI.close();
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }
    if (!this.alive) return;
    if (action === "chat") {
      this.chatUI.toggle();
      return;
    }
    if (action === "interact") {
      this.net.send({ type: "interact" });
      this.audio.playLoot();
    }
    if (action === "inventory") this.toggleInventory();
    if (action === "crafting") this.toggleCrafting();
    if (action === "map") this.toggleMap();
    if (action === "reload") {
      this.net.send({ type: "reload" });
      this.audio.playReload();
    }
    if (action === "boat") {
      if (this.localPlayer?.boatId) {
        this.net.send({ type: "exitBoat" });
      } else if (this.localPlayer?.inSafeZone) {
        // At the Haven: spawn a fresh skiff and board it.
        this.net.send({ type: "spawnBoat" });
      } else if (this.nearestBoatId) {
        this.net.send({ type: "boardBoat", boatId: this.nearestBoatId });
      } else {
        this.notifications.show("No boat nearby. Spawn one at The Haven.", "warning");
      }
    }
    if (action === "slot1") this.net.send({ type: "input", data: { slot: 1 } });
    if (action === "slot2") this.net.send({ type: "input", data: { slot: 2 } });
    if (action === "slot3") this.net.send({ type: "input", data: { slot: 3 } });
    if (action === "grenade") this.net.send({ type: "input", data: { grenade: true } });
    if (action === "debug") this.hud.toggleDebug();
  }

  private anyOverlayOpen(): boolean {
    return this.inventoryOpen || this.craftingOpen || this.mapOpen || this.chatUI.isOpen();
  }

  private toggleInventory(): void {
    // Tab also opens inventory; ignore if another overlay is already open.
    if (this.craftingOpen || this.mapOpen) return;
    this.inventoryOpen = !this.inventoryOpen;
    this.inventoryUI.toggle();
    if (this.inventoryOpen) document.exitPointerLock();
  }

  private toggleCrafting(): void {
    if (this.inventoryOpen || this.mapOpen) return;
    this.craftingOpen = !this.craftingOpen;
    this.craftingUI.toggle();
    if (this.craftingOpen) document.exitPointerLock();
  }

  private toggleMap(): void {
    if (this.inventoryOpen || this.craftingOpen) return;
    this.mapOpen = !this.mapOpen;
    this.mapUI.toggle();
    if (this.mapOpen) document.exitPointerLock();
  }

  private loop(): void {
    requestAnimationFrame(() => this.loop());
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, this.prevTime ? now - this.prevTime : 1 / 60);
    this.prevTime = now;

    this.input.update();
    this.updateLocalPlayer();
    this.applyLocalMovement(dt);
    this.updatePrompt();
    if (this.localPlayer) this.mapUI.setPlayer(this.predicted.x, this.predicted.z, this.input.mouse.x);
    this.sendInput();
    this.updateEntities();
    this.smoothEntities(dt);
    this.applyDrivenBoatMesh();
    this.handleFiring();
    this.updateEffects(now);
    this.updateCamera();
    this.hud.update(this.localPlayer, this.input.locked, this.scene.camera, this.promptText, this.anyOverlayOpen());
    this.scene.render(now);
  }

  /**
   * Predict local horizontal movement using the same formula as the server
   * (PlayerEntity.tick) so the camera responds instantly instead of waiting
   * for the next snapshot. Vertical position follows the server (ground/jump)
   * so we don't have to replicate gravity/ground logic.
   */
  private applyLocalMovement(dt: number): void {
    if (!this.localPlayer || !this.predictedInit) return;
    // While driving a boat, predict the boat locally (constant-velocity) and
    // ride the camera on it. This avoids the stutter you get from chasing
    // 20 Hz server positions.
    if (this.localPlayer.boatId) {
      if (this.alive) this.predictBoat(dt);
      return;
    }
    if (!this.alive || this.anyOverlayOpen()) return;
    const yaw = this.input.mouse.x;
    const forward = (this.input.keys.has("KeyW") ? 1 : 0) - (this.input.keys.has("KeyS") ? 1 : 0);
    const right = (this.input.keys.has("KeyD") ? 1 : 0) - (this.input.keys.has("KeyA") ? 1 : 0);
    const sprinting = this.input.keys.has("ShiftLeft") || this.input.keys.has("ShiftRight");
    const crouching = this.input.keys.has("ControlLeft") || this.input.keys.has("ControlRight");
    const speed = crouching ? PLAYER_CROUCH_SPEED : sprinting ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    let mx = -sin * forward + cos * right;
    let mz = -cos * forward - sin * right;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx = (mx / len) * speed * dt;
      mz = (mz / len) * speed * dt;
      this.predicted.x += mx;
      this.predicted.z += mz;
    }
    // smooth vertical toward the authoritative ground/jump height
    this.predicted.y += (this.localPlayer.position.y - this.predicted.y) * Math.min(1, dt * 12);
  }

  /**
   * Predict the driven boat using the exact same kinematics as the server
   * (BoatEntity.tick) driven by local input, so motion is instant and smooth.
   * Reconciliation happens in updateLocalPlayer when server snapshots arrive.
   */
  private predictBoat(dt: number): void {
    if (!this.drivenBoat.init) return;
    const cfg = BALANCE.boat.skiff;
    const throttle = THREE.MathUtils.clamp(
      (this.input.keys.has("KeyW") ? 1 : 0) - (this.input.keys.has("KeyS") ? 1 : 0),
      -0.5,
      1
    );
    const steer = THREE.MathUtils.clamp(
      -((this.input.keys.has("KeyD") ? 1 : 0) - (this.input.keys.has("KeyA") ? 1 : 0)),
      -1,
      1
    );
    const boost = this.input.keys.has("ShiftLeft") || this.input.keys.has("ShiftRight");
    const speed = (boost ? cfg.boost : cfg.speed) * throttle;
    const rot = this.drivenBoat.rot;
    this.drivenBoat.pos.x += Math.sin(rot) * speed * dt;
    this.drivenBoat.pos.z += Math.cos(rot) * speed * dt;
    this.drivenBoat.rot += steer * cfg.turnSpeed * dt * (throttle !== 0 ? 1 : 0.4);
    this.predicted.copy(this.drivenBoat.pos);
  }

  /** Render the boat we're driving from its predicted state (not the server lerp). */
  private applyDrivenBoatMesh(): void {
    if (!this.localPlayer?.boatId || !this.drivenBoat.init) return;
    const mesh = this.entities.boats.get(this.localPlayer.boatId);
    if (mesh) {
      mesh.position.copy(this.drivenBoat.pos);
      mesh.rotation.y = this.drivenBoat.rot;
    }
  }

  /** Build the on-screen "[E] ..." prompt from whatever is in front of the player. */
  private updatePrompt(): void {
    this.promptText = "";
    this.nearestBoatId = undefined;
    if (!this.remoteData || !this.localPlayer || !this.localPlayer.isAlive || this.anyOverlayOpen()) return;
    if (this.localPlayer.boatId) {
      this.promptText = `[V] Disembark   ·   W/S Throttle   ·   A/D Steer   ·   Shift Boost`;
      return;
    }
    const me = this.predictedInit ? this.predicted : this.localPlayer.position;

    // Nearest loot container within reach.
    let nearestLootDist = 3.2;
    let nearestLootName: string | null = null;
    for (const l of this.remoteData.loot) {
      const dx = l.position.x - me.x;
      const dz = l.position.z - me.z;
      const d = Math.hypot(dx, dz);
      if (d < nearestLootDist) {
        nearestLootDist = d;
        nearestLootName = l.name || (l.type === "backpack" ? "Backpack" : "Loot");
      }
    }
    if (nearestLootName) {
      this.promptText = `[E] Search ${nearestLootName}`;
      return;
    }

    // Nearby boat to board.
    let nearestBoatDist = 9;
    for (const b of this.remoteData.boats) {
      const dx = b.position.x - me.x;
      const dz = b.position.z - me.z;
      const d = Math.hypot(dx, dz);
      if (d < nearestBoatDist && !b.occupiedBy) {
        nearestBoatDist = d;
        this.nearestBoatId = b.id;
      }
    }
    if (this.nearestBoatId) {
      this.promptText = `[V] Board Skiff`;
      return;
    }

    // Haven banking / crafting prompts.
    if (this.localPlayer.inSafeZone && this.localPlayer.currentLocationId === "haven") {
      this.promptText = `[E] Bank & Extract · [B] Craft`;
    }
  }

  private updateLocalPlayer(): void {
    if (!this.remoteData || !this.playerId) return;
    const p = this.remoteData.players.find((x) => x.playerId === this.playerId);
    if (!p) return;
    this.localPlayer = p;
    if (!p.isAlive && this.alive) {
      this.alive = false;
      this.deathScreen.show();
      document.exitPointerLock();
    }
    if (p.isAlive && !this.alive) {
      this.alive = true;
      this.deathScreen.hide();
    }
    if (p.boatId) {
      // Driving: reconcile the local boat prediction with the server boat.
      const boat = this.remoteData.boats.find((b) => b.id === p.boatId);
      if (boat) {
        const bdrift = Math.hypot(boat.position.x - this.drivenBoat.pos.x, boat.position.z - this.drivenBoat.pos.z);
        if (!this.drivenBoat.init || bdrift > 4) {
          this.drivenBoat.pos.set(boat.position.x, boat.position.y, boat.position.z);
          this.drivenBoat.rot = boat.rotation;
        } else {
          // nudge the predicted heading toward the server to stop spin drift
          this.drivenBoat.rot = lerpAngle(this.drivenBoat.rot, boat.rotation, 0.15);
        }
        this.drivenBoat.init = true;
      }
      this.predicted.copy(this.drivenBoat.pos);
      this.predictedInit = true;
      return;
    }

    // No longer driving: drop the boat prediction.
    this.drivenBoat.init = false;

    // Reconcile prediction with the authoritative server position. On first
    // snapshot, when (re)spawning, or when we've drifted past a threshold
    // (server correction), snap directly; otherwise trust the local prediction.
    const drift = Math.hypot(p.position.x - this.predicted.x, p.position.z - this.predicted.z);
    if (!this.predictedInit || !p.isAlive || drift > 2.0) {
      this.predicted.set(p.position.x, p.position.y, p.position.z);
    }
    this.predictedInit = true;
  }

  private sendInput(): void {
    if (!this.playerId) return;
    // When a menu is open, freeze the player so they can't walk blind.
    const blocked = this.anyOverlayOpen();
    const forward = blocked ? 0 : (this.input.keys.has("KeyW") ? 1 : 0) - (this.input.keys.has("KeyS") ? 1 : 0);
    const right = blocked ? 0 : (this.input.keys.has("KeyD") ? 1 : 0) - (this.input.keys.has("KeyA") ? 1 : 0);
    this.net.send({
      type: "input",
      data: {
        forward,
        right,
        yaw: this.input.mouse.x,
        pitch: this.input.mouse.y,
        sprint: !blocked && (this.input.keys.has("ShiftLeft") || this.input.keys.has("ShiftRight")),
        crouch: !blocked && (this.input.keys.has("ControlLeft") || this.input.keys.has("ControlRight")),
        jump: !blocked && this.input.keys.has("Space"),
        fire: !blocked && this.input.firePressed,
        ads: this.ads,
        reload: false,
        interact: false,
        inventory: false,
        map: false,
        slot: 0,
        grenade: false,
      },
    });
  }

  private handleFiring(): void {
    if (!this.alive) return;
    this.ads = this.input.adsPressed;
    const wpn = this.localPlayer?.weapon;
    const w = wpn ? getWeapon(wpn.id) : undefined;
    if (w) this.weaponView.setWeapon(w.id);
    if (!w || !wpn) {
      this.prevFire = this.input.firePressed;
      return;
    }

    const minInterval = 60000 / w.rpm;
    const now = performance.now();
    // Semi/burst weapons only fire on the initial press; autos can hold.
    const isSemi = w.fireMode !== "auto";
    const wantFire = isSemi ? this.input.firePressed && !this.prevFire : this.input.firePressed;
    this.prevFire = this.input.firePressed;

    if (wpn.reloading) return;
    if (wantFire && now - this.lastFireTime > minInterval) {
      this.lastFireTime = now;
      this.fireSequence++;
      const origin = new THREE.Vector3();
      this.scene.camera.getWorldPosition(origin);
      origin.y -= 0.1;
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.scene.camera.quaternion);
      this.net.send({
        type: "fire",
        data: {
          weaponId: w.id,
          origin: { x: origin.x, y: origin.y, z: origin.z },
          direction: { x: dir.x, y: dir.y, z: dir.z },
          timestamp: Date.now(),
          sequence: this.fireSequence,
          yaw: this.input.mouse.x,
          pitch: this.input.mouse.y,
        },
      });
      this.audio.playGunshot(w.id);
      this.muzzleFlash.intensity = 3;
      // Visual recoil kick: larger for heavier weapons, softer while aiming.
      const heavy = w.type === "shotgun" || w.type === "bolt" || w.type === "marksman";
      const kickScale = (this.ads ? 0.6 : 1.0) * (heavy ? 1.6 : 1.0);
      this.recoilKick = Math.min(0.12, this.recoilKick + w.recoilVertical * 6 * kickScale);

      const end = origin.clone().add(dir.multiplyScalar(100));
      const tracer = createTracer(origin, end);
      this.scene.scene.add(tracer);
      this.effects.push({ type: "tracer", obj: tracer, life: 0.08 } as any);
    }
    this.muzzleFlash.intensity *= 0.7;
  }

  private updateCamera(): void {
    if (!this.localPlayer) return;
    // Use the locally predicted position for an instant, jitter-free camera.
    const p = this.predictedInit ? this.predicted : this.localPlayer.position;
    const eyeY = p.y + 1.6;
    this.scene.camera.position.set(p.x, eyeY, p.z);
    this.scene.camera.rotation.order = "YXZ";
    this.scene.camera.rotation.y = this.input.mouse.x;
    // Recover visual recoil kick and apply it as an upward pitch nudge.
    this.recoilKick *= 0.82;
    this.scene.camera.rotation.x = this.input.mouse.y + this.recoilKick;

    const zoom = this.localPlayer.weapon ? getWeapon(this.localPlayer.weapon.id)?.adsZoom ?? 1.1 : 1.1;
    const fov = this.ads ? 75 / zoom : 75;
    this.scene.camera.fov += (fov - this.scene.camera.fov) * 0.15;
    this.scene.camera.updateProjectionMatrix();

    const moving =
      Math.abs((this.input.keys.has("KeyW") ? 1 : 0) - (this.input.keys.has("KeyS") ? 1 : 0)) > 0 ||
      Math.abs((this.input.keys.has("KeyA") ? 1 : 0) - (this.input.keys.has("KeyD") ? 1 : 0)) > 0;
    this.weaponView.update(1 / 60, this.ads, moving, { x: this.recoilKick * 4, y: 0 });
  }

  private updateEntities(): void {
    if (!this.remoteData) return;

    // Other players only — never render our own body in first-person or the
    // camera ends up inside it and fills the whole view.
    const remotePlayers = this.remoteData.players.filter((p) => p.playerId !== this.playerId);
    this.syncMap(this.entities.players, remotePlayers, (p) => {
      const model = createPlayerModel(0x66aaff);
      const tag = makeNameplate(p.name);
      tag.position.y = 2.15;
      model.add(tag);
      return model;
    });

    this.syncMap(this.entities.ais, this.remoteData.ais, (ai) => {
      let model: THREE.Group;
      if (ai.type.includes("drone")) model = createDroneModel();
      else if (ai.type.includes("turret")) model = createTurretModel();
      else model = createScavengerModel();
      return model;
    });

    this.syncMap(this.entities.boats, this.remoteData.boats, () => createSkiffModel());

    this.syncMap(this.entities.loot, this.remoteData.loot, (l) => {
      const g = new THREE.Group();
      if (l.type === "backpack") {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3), new THREE.MeshStandardMaterial({ color: 0x6b4c2e }));
        bag.position.y = 0.25;
        g.add(bag);
      } else {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
        box.position.y = 0.35;
        g.add(box);
      }
      return g;
    });
  }

  private syncMap<T>(map: Map<string, THREE.Group>, data: T[], factory: (d: T) => THREE.Group): void {
    const seen = new Set<string>();
    for (const d of data as any[]) {
      const id = d.id ?? d.playerId ?? d.boatId;
      seen.add(id);
      let obj = map.get(id);
      if (!obj) {
        obj = factory(d);
        this.scene.scene.add(obj);
        map.set(id, obj);
        // brand-new entity: snap it into place so it doesn't fly in from origin
        obj.position.set(d.position.x, d.position.y, d.position.z);
        obj.rotation.y = d.rotation?.yaw ?? d.rotation ?? 0;
      }
      // store the authoritative target; the smoothing pass lerps toward it
      obj.userData.tx = d.position.x;
      obj.userData.ty = d.position.y;
      obj.userData.tz = d.position.z;
      obj.userData.tyaw = d.rotation?.yaw ?? d.rotation ?? obj.rotation.y;
    }
    for (const [id, obj] of map.entries()) {
      if (!seen.has(id)) {
        this.scene.scene.remove(obj);
        map.delete(id);
      }
    }
  }

  /**
   * Smoothly interpolate every remote entity toward its latest authoritative
   * target. The server sends 20 Hz snapshots; snapping straight to them looks
   * choppy, so we lerp each frame for continuous, fluid motion.
   */
  private smoothEntities(dt: number): void {
    // frame-rate-independent lerp factor (~0.3 at 60fps) so entities reach
    // their 20 Hz targets quickly but without hard snapping.
    const a = Math.min(1, dt * 16);
    for (const map of [this.entities.players, this.entities.ais, this.entities.boats, this.entities.loot]) {
      for (const obj of map.values()) {
        const tx = obj.userData.tx as number | undefined;
        if (tx === undefined) continue;
        obj.position.x += (tx - obj.position.x) * a;
        obj.position.y += ((obj.userData.ty as number) - obj.position.y) * a;
        obj.position.z += ((obj.userData.tz as number) - obj.position.z) * a;
        const tyaw = obj.userData.tyaw as number;
        obj.rotation.y = lerpAngle(obj.rotation.y, tyaw, a);
      }
    }
  }

  private updateEffects(dt: number): void {
    // Simple effect cleanup placeholder
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i] as any;
      e.life -= dt;
      if (e.life <= 0) {
        this.scene.scene.remove(e.obj);
        this.effects.splice(i, 1);
      }
    }
  }
}

/** Floating player name tag that always faces the camera. */
function makeNameplate(name: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(6,10,16,0.62)";
  roundRectPath(ctx, 6, 12, 244, 40, 8);
  ctx.fill();
  ctx.fillStyle = "#cfe3ff";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name.slice(0, 16), 128, 33);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.6, 0.65, 1);
  return sprite;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Linear interpolation that always takes the shortest way around the circle. */
function lerpAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  else if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
