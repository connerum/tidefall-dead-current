import * as THREE from "three";
import { WORLD_SIZE, STORM_WALL_RADIUS } from "@tidefall/shared";
import { createOcean, updateWater } from "../render/water.js";
import { buildIslands } from "../render/islandBuilder.js";
import { materials } from "../render/materials.js";

export class SceneBuilder {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  water: THREE.Mesh;
  sun: THREE.DirectionalLight;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0015);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    this.sun.position.set(200, 300, 100);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    this.scene.add(this.sun);

    const ambient = new THREE.HemisphereLight(0x87ceeb, 0x2a2a35, 0.5);
    this.scene.add(ambient);

    this.water = createOcean(WORLD_SIZE);
    this.scene.add(this.water);

    const islands = buildIslands(this.scene);
    this.scene.add(islands);

    // Storm wall
    const stormGeo = new THREE.SphereGeometry(STORM_WALL_RADIUS + 100, 32, 16);
    const storm = new THREE.Mesh(stormGeo, materials.stormFog);
    storm.position.y = -50;
    this.scene.add(storm);

    window.addEventListener("resize", () => this.onResize());
  }

  onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(time: number): void {
    updateWater(this.water, time);
    this.renderer.render(this.scene, this.camera);
  }
}
