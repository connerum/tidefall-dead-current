import * as THREE from "three";
import { WORLD_SIZE, STORM_WALL_RADIUS } from "@tidefall/shared";
import { createOcean, updateWater } from "../render/water.js";
import { buildIslands } from "../render/islandBuilder.js";
import { materials } from "../render/materials.js";

/**
 * Builds the persistent Three.js scene: sky, sun, atmosphere, ocean, islands
 * and the surrounding storm wall. Lighting uses a warm directional sun plus a
 * hemisphere fill so the stylised PBR materials read well without expensive
 * dynamic lights everywhere.
 */
export class SceneBuilder {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  water: THREE.Mesh;
  islands: THREE.Group;
  sun: THREE.DirectionalLight;
  private skyMesh: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    const skyColor = new THREE.Color(0x9ec9e0);
    const horizonColor = new THREE.Color(0xdfe9ef);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(horizonColor, 280, 1600);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Sky dome with a vertical gradient (top -> horizon)
    this.skyMesh = this.createSkyDome(skyColor, horizonColor);
    this.scene.add(this.skyMesh);

    // Warm low sun for long shadows and readable silhouettes
    this.sun = new THREE.DirectionalLight(0xffe9c4, 2.0);
    this.sun.position.set(260, 320, 180);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 1200;
    const s = 600;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    const ambient = new THREE.HemisphereLight(0xbcd6ea, 0x4a4438, 0.65);
    this.scene.add(ambient);

    // a soft cool fill from the opposite side so shadowed faces aren't flat
    const fill = new THREE.DirectionalLight(0x9fb6d6, 0.35);
    fill.position.set(-200, 120, -160);
    this.scene.add(fill);

    this.water = createOcean(WORLD_SIZE);
    this.scene.add(this.water);

    this.islands = buildIslands(this.scene);
    this.scene.add(this.islands);

    // Storm wall: layered translucent cylinders read better than a single sphere
    this.scene.add(this.createStormWall());

    window.addEventListener("resize", () => this.onResize());
  }

  private createSkyDome(top: THREE.Color, bottom: THREE.Color): THREE.Mesh {
    const geo = new THREE.SphereGeometry(2500, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: top },
        uBottom: { value: bottom },
        uOffset: { value: 0.15 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop;
        uniform vec3 uBottom;
        uniform float uOffset;
        varying vec3 vDir;
        void main(){
          float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
          float t = smoothstep(uOffset, 0.55, h);
          vec3 col = mix(uBottom, uTop, t);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    return new THREE.Mesh(geo, mat);
  }

  private createStormWall(): THREE.Group {
    const g = new THREE.Group();
    const radius = STORM_WALL_RADIUS + 80;
    const layers = 3;
    for (let i = 0; i < layers; i++) {
      const r = radius + i * 18;
      const geo = new THREE.CylinderGeometry(r, r, 700, 48, 1, true);
      const mat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x2b2540 : 0x3a3550,
        transparent: true,
        opacity: 0.18 + i * 0.06,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 150;
      g.add(mesh);
    }
    // dark cloud cap
    const capGeo = new THREE.CircleGeometry(radius, 48);
    capGeo.rotateX(Math.PI / 2);
    const cap = new THREE.Mesh(
      capGeo,
      new THREE.MeshBasicMaterial({ color: 0x1a1828, transparent: true, opacity: 0.35, depthWrite: false, fog: false })
    );
    cap.position.y = 480;
    g.add(cap);
    return g;
  }

  onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(time: number): void {
    // rough proximity to the storm wall drives the water darkening
    const camPos = this.camera.position;
    const dist = Math.hypot(camPos.x, camPos.z);
    const storm = THREE.MathUtils.clamp((dist - (STORM_WALL_RADIUS - 250)) / 250, 0, 1);
    updateWater(this.water, time, this.camera, storm);

    // keep the sky dome centred on the camera so it never clips at the far plane
    this.skyMesh.position.set(camPos.x, 0, camPos.z);

    // keep the sun target near the player for stable shadows
    this.sun.target.position.set(camPos.x, 0, camPos.z);
    this.sun.position.set(camPos.x + 260, 320, camPos.z + 180);

    this.renderer.render(this.scene, this.camera);
  }
}
