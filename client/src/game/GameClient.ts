import * as THREE from "three";
import { getWeapon, type PlayerInput, type SerializedAI, type SerializedBoat, type SerializedLoot, type SerializedPlayer, type ServerMessage, type WorldSnapshot } from "@tidefall/shared";
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
        break;
      case "inventory":
        this.inventoryUI.setInventory(msg.data as { backpack: unknown[]; stash: unknown[]; equipped: unknown; slot: string });
        break;
      case "lootOpen":
        this.currentLootId = (msg as { lootId: string }).lootId;
        this.inventoryUI.setLoot((msg as { data: unknown }).data as { id: string; items: unknown[]; name?: string });
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
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }
    if (!this.alive) return;
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
      } else {
        this.net.send({ type: "spawnBoat" });
      }
    }
    if (action === "slot1") this.net.send({ type: "input", data: { slot: 1 } });
    if (action === "slot2") this.net.send({ type: "input", data: { slot: 2 } });
    if (action === "slot3") this.net.send({ type: "input", data: { slot: 3 } });
    if (action === "grenade") this.net.send({ type: "input", data: { grenade: true } });
    if (action === "debug") this.hud.toggleDebug();
  }

  private toggleInventory(): void {
    this.inventoryOpen = !this.inventoryOpen;
    this.inventoryUI.toggle();
    if (this.inventoryOpen) document.exitPointerLock();
  }

  private toggleCrafting(): void {
    this.craftingOpen = !this.craftingOpen;
    this.craftingUI.toggle();
    if (this.craftingOpen) document.exitPointerLock();
  }

  private toggleMap(): void {
    this.mapOpen = !this.mapOpen;
    this.mapUI.toggle();
    if (this.mapOpen) document.exitPointerLock();
  }

  private loop(): void {
    requestAnimationFrame(() => this.loop());
    const time = performance.now() / 1000;

    this.input.update();
    this.updateLocalPlayer();
    this.sendInput();
    this.updateEntities();
    this.handleFiring();
    this.updateEffects(time);
    this.updateCamera();
    this.hud.update(this.localPlayer, this.input.locked, this.scene.camera);
    this.scene.render(time);
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
  }

  private sendInput(): void {
    if (!this.playerId) return;
    const forward = (this.input.keys.has("KeyW") ? 1 : 0) - (this.input.keys.has("KeyS") ? 1 : 0);
    const right = (this.input.keys.has("KeyD") ? 1 : 0) - (this.input.keys.has("KeyA") ? 1 : 0);
    this.net.send({
      type: "input",
      data: {
        forward,
        right,
        yaw: this.input.mouse.x,
        pitch: this.input.mouse.y,
        sprint: this.input.keys.has("ShiftLeft") || this.input.keys.has("ShiftRight"),
        crouch: this.input.keys.has("ControlLeft") || this.input.keys.has("ControlRight"),
        jump: this.input.keys.has("Space"),
        fire: this.input.firePressed,
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
    const weaponId = this.localPlayer?.equippedSlot === "primary" ? "rust_pistol" : undefined; // Will be derived from snapshot later
    const w = weaponId ? getWeapon(weaponId) : undefined;
    if (!w) return;
    const minInterval = 60000 / w.rpm;
    if (this.input.firePressed && performance.now() - this.lastFireTime > minInterval) {
      this.lastFireTime = performance.now();
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

      // Tracer
      const end = origin.clone().add(dir.multiplyScalar(100));
      const tracer = createTracer(origin, end);
      this.scene.scene.add(tracer);
      this.effects.push({ type: "tracer", obj: tracer, life: 0.1 } as any);
    }
    this.muzzleFlash.intensity *= 0.7;
  }

  private updateCamera(): void {
    if (!this.localPlayer) return;
    const p = this.localPlayer.position;
    const eyeY = p.y + 1.6;
    this.scene.camera.position.set(p.x, eyeY, p.z);
    this.scene.camera.rotation.order = "YXZ";
    this.scene.camera.rotation.y = this.input.mouse.x;
    this.scene.camera.rotation.x = this.input.mouse.y;

    const fov = this.ads ? 60 : 75;
    this.scene.camera.fov += (fov - this.scene.camera.fov) * 0.1;
    this.scene.camera.updateProjectionMatrix();

    const moving = Math.abs((this.input.keys.has("KeyW") ? 1 : 0) - (this.input.keys.has("KeyS") ? 1 : 0)) > 0;
    this.weaponView.setWeapon("rust_pistol");
    this.weaponView.update(1 / 60, this.ads, moving, { x: 0, y: 0 });
  }

  private updateEntities(): void {
    if (!this.remoteData) return;

    this.syncMap(this.entities.players, this.remoteData.players, (p) => {
      const model = createPlayerModel(0x66aaff);
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
      }
      obj.position.set(d.position.x, d.position.y, d.position.z);
      obj.rotation.y = d.rotation?.yaw ?? d.rotation ?? 0;
    }
    for (const [id, obj] of map.entries()) {
      if (!seen.has(id)) {
        this.scene.scene.remove(obj);
        map.delete(id);
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
