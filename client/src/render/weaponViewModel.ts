import * as THREE from "three";
import { createWeaponModel } from "./models.js";

export class WeaponViewModel {
  root: THREE.Group;
  model: THREE.Group;
  private currentWeapon = "";
  private adsOffset = new THREE.Vector3(0, -0.15, -0.35);
  private hipOffset = new THREE.Vector3(0.25, -0.25, -0.45);
  private sway = new THREE.Vector3();

  constructor() {
    this.root = new THREE.Group();
    this.model = new THREE.Group();
    this.root.add(this.model);
    this.model.position.copy(this.hipOffset);
  }

  setWeapon(type: string): void {
    if (this.currentWeapon === type) return;
    this.currentWeapon = type;
    this.model.clear();
    const m = createWeaponModel(type);
    this.model.add(m);
  }

  update(dt: number, ads: boolean, moving: boolean, recoil: { x: number; y: number }): void {
    const target = ads ? this.adsOffset : this.hipOffset;
    this.model.position.lerp(target, dt * 10);

    this.sway.x = Math.sin(Date.now() * 0.002) * (moving ? 0.015 : 0.005);
    this.sway.y = Math.cos(Date.now() * 0.0017) * (moving ? 0.01 : 0.003);

    this.model.position.x += this.sway.x + recoil.x;
    this.model.position.y += this.sway.y - recoil.y;
  }

  getMuzzlePosition(camera: THREE.Camera): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.model.getWorldPosition(pos);
    pos.add(new THREE.Vector3(0, 0, 0.6).applyQuaternion(camera.quaternion));
    return pos;
  }
}
