import * as THREE from "three";
import { LOCATIONS, type LocationDefinition, SEA_LANES } from "@tidefall/shared";
import { materials, tilingMaterial } from "./materials.js";
import {
  createPalmTreeModel,
  createRockCluster,
  createFortWall,
  createBunker,
  createCrashedShipPiece,
  createCrateModel,
  createBarrelModel,
} from "./models.js";

export function buildIslands(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  for (const loc of Object.values(LOCATIONS)) {
    const island = buildIsland(loc);
    island.position.set(loc.position.x, loc.position.y, loc.position.z);
    group.add(island);
  }
  // Sea lanes: subtle foam-coloured ribbons between key islands
  for (const lane of SEA_LANES) {
    const len = Math.hypot(lane.end.x - lane.start.x, lane.end.z - lane.start.z);
    const geometry = new THREE.PlaneGeometry(14, len);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x9fe0ff,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const laneMesh = new THREE.Mesh(geometry, material);
    const midX = (lane.start.x + lane.end.x) / 2;
    const midZ = (lane.start.z + lane.end.z) / 2;
    const angle = Math.atan2(lane.end.x - lane.start.x, lane.end.z - lane.start.z);
    laneMesh.position.set(midX, -0.35, midZ);
    laneMesh.rotation.y = angle;
    group.add(laneMesh);
  }
  return group;
}

function setShadow(o: THREE.Object3D, cast = true, receive = true): void {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = cast;
      m.receiveShadow = receive;
    }
  });
}

function buildIsland(loc: LocationDefinition): THREE.Group {
  const g = new THREE.Group();
  const radius = loc.radius;
  const surfaceTile = Math.max(4, Math.round(radius / 6));

  // Cliff/base skirt
  const skirtMat =
    loc.biome === "harbor"
      ? tilingMaterial(materials.weatheredWood, surfaceTile)
      : loc.biome === "tropical"
        ? tilingMaterial(materials.rock, surfaceTile)
        : loc.biome === "military"
          ? tilingMaterial(materials.concrete, surfaceTile)
          : tilingMaterial(materials.rock, surfaceTile);
  const baseGeo = new THREE.CylinderGeometry(radius, radius * 0.86, 3, 40);
  const base = new THREE.Mesh(baseGeo, skirtMat);
  base.position.y = -1.5;
  setShadow(base, true, true);
  g.add(base);

  // Top surface
  const topMat =
    loc.biome === "tropical"
      ? tilingMaterial(materials.grass, surfaceTile)
      : loc.biome === "harbor"
        ? tilingMaterial(materials.weatheredWood, surfaceTile)
        : loc.biome === "military"
          ? tilingMaterial(materials.concrete, surfaceTile)
          : tilingMaterial(materials.rock, surfaceTile);
  const topGeo = new THREE.CircleGeometry(radius, 40);
  topGeo.rotateX(-Math.PI / 2);
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0;
  setShadow(top, true, true);
  g.add(top);

  // Beach ring for tropical/harbour islands
  if (loc.biome === "tropical" || loc.biome === "harbor") {
    const beachGeo = new THREE.RingGeometry(radius * 0.82, radius * 1.04, 40);
    beachGeo.rotateX(-Math.PI / 2);
    const beach = new THREE.Mesh(beachGeo, tilingMaterial(materials.sand, surfaceTile));
    beach.position.y = -0.35;
    setShadow(beach, false, true);
    g.add(beach);
  }

  // Props based on biome
  if (loc.biome === "tropical") {
    for (let i = 0; i < 14; i++) {
      const tree = createPalmTreeModel();
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.7;
      tree.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      tree.rotation.y = Math.random() * Math.PI;
      g.add(tree);
    }
    for (let i = 0; i < 6; i++) {
      const hut = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.4), materials.weatheredWood);
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.5;
      hut.position.set(Math.sin(a) * r, 0.8, Math.cos(a) * r);
      setShadow(hut);
      g.add(hut);
      // thatched roof
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.0, 4), materials.canvas);
      roof.position.copy(hut.position);
      roof.position.y = 2.1;
      roof.rotation.y = Math.PI / 4;
      setShadow(roof);
      g.add(roof);
    }
  } else if (loc.biome === "fort") {
    for (let i = 0; i < 8; i++) {
      const wall = createFortWall();
      const a = (i / 8) * Math.PI * 2;
      wall.position.set(Math.sin(a) * radius * 0.78, 0, Math.cos(a) * radius * 0.78);
      wall.lookAt(0, 0, 0);
      g.add(wall);
    }
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 7, 12), materials.concrete);
    tower.position.y = 3.5;
    setShadow(tower);
    g.add(tower);
    const battlement = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 1, 12), materials.concrete);
    battlement.position.y = 7.4;
    setShadow(battlement);
    g.add(battlement);
  } else if (loc.biome === "industrial") {
    for (let i = 0; i < 10; i++) {
      const crate = createCrateModel();
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.6;
      crate.position.set(Math.sin(a) * r, 0.4, Math.cos(a) * r);
      crate.rotation.y = Math.random() * Math.PI;
      g.add(crate);
    }
    for (let i = 0; i < 8; i++) {
      const barrel = createBarrelModel();
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.6;
      barrel.position.set(Math.sin(a) * r, 0.45, Math.cos(a) * r);
      g.add(barrel);
    }
    // tall rusted crane jib
    const crane = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 12, 1.2), materials.rustedMetal);
    mast.position.y = 6;
    const jib = new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, 0.8), materials.rustedMetal);
    jib.position.set(4, 11, 0);
    crane.add(mast, jib);
    crane.position.set(radius * 0.4, 0, 0);
    setShadow(crane);
    g.add(crane);
    // half-sunken hull silhouette
    const hull = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 16), materials.rustedMetal);
    hull.position.set(-radius * 0.35, -0.5, radius * 0.3);
    hull.rotation.z = 0.12;
    hull.rotation.x = 0.06;
    setShadow(hull);
    g.add(hull);
  } else if (loc.biome === "military") {
    const bunker = createBunker();
    g.add(bunker);
    const radarPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8, 8), materials.concrete);
    radarPole.position.y = 4;
    g.add(radarPole);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 0.2, 0.3, 18), materials.rustedMetal);
    dish.position.y = 8;
    g.add(dish);
    for (let i = 0; i < 4; i++) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), materials.dangerGlow);
      const a = (i / 4) * Math.PI * 2;
      light.position.set(Math.sin(a) * radius * 0.7, 0.4, Math.cos(a) * radius * 0.7);
      g.add(light);
    }
  } else if (loc.biome === "wreck") {
    const wreck = createCrashedShipPiece();
    g.add(wreck);
    for (let i = 0; i < 6; i++) {
      const container = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 6), materials.rustedMetal);
      container.position.set((Math.random() - 0.5) * radius, 1.2, (Math.random() - 0.5) * radius);
      container.rotation.y = Math.random() * Math.PI;
      container.rotation.z = (Math.random() - 0.5) * 0.2;
      setShadow(container);
      g.add(container);
    }
  } else if (loc.biome === "harbor") {
    // docks / boardwalk around the haven
    const dock = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.6, 0.4, radius * 1.6), materials.weatheredWood);
    dock.position.y = 0.2;
    setShadow(dock);
    g.add(dock);
  }

  // Rocks around the shore line for every island
  for (let i = 0; i < 10; i++) {
    const rocks = createRockCluster();
    const a = Math.random() * Math.PI * 2;
    const r = radius * 0.85 + Math.random() * 4;
    rocks.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    g.add(rocks);
  }

  // Floating location label
  const label = createLabel(loc.name, loc.riskLevel === "safe" ? 0x33bbff : 0xffaa44);
  label.position.y = Math.min(radius * 0.6 + 8, 40);
  g.add(label);

  return g;
}

function createLabel(text: string, color: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(8,12,18,0.55)";
  roundRect(ctx, 16, 36, 480, 56, 12);
  ctx.fill();
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(20, 5, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
