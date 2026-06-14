import * as THREE from "three";
import { LOCATIONS, type LocationDefinition, SEA_LANES } from "@tidefall/shared";
import { materials } from "./materials.js";
import { createPalmTreeModel, createRockCluster, createFortWall, createBunker, createCrashedShipPiece, createCrateModel, createBarrelModel } from "./models.js";

export function buildIslands(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  for (const loc of Object.values(LOCATIONS)) {
    const island = buildIsland(loc);
    island.position.set(loc.position.x, loc.position.y, loc.position.z);
    group.add(island);
  }
  // Sea lanes
  for (const lane of SEA_LANES) {
    const geometry = new THREE.PlaneGeometry(10, Math.hypot(lane.end.x - lane.start.x, lane.end.z - lane.start.z));
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const laneMesh = new THREE.Mesh(geometry, material);
    const midX = (lane.start.x + lane.end.x) / 2;
    const midZ = (lane.start.z + lane.end.z) / 2;
    const angle = Math.atan2(lane.end.x - lane.start.x, lane.end.z - lane.start.z);
    laneMesh.position.set(midX, -0.3, midZ);
    laneMesh.rotation.y = angle;
    group.add(laneMesh);
  }
  return group;
}

function buildIsland(loc: LocationDefinition): THREE.Group {
  const g = new THREE.Group();

  // Base terrain
  const radius = loc.radius;
  const baseGeo = new THREE.CylinderGeometry(radius, radius * 0.9, 1.5, 24);
  const baseMat = loc.biome === "harbor" ? materials.weatheredWood : loc.biome === "tropical" ? materials.sand : loc.biome === "military" ? materials.concrete : materials.rock;
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -0.75;
  g.add(base);

  // Top surface
  const topGeo = new THREE.CircleGeometry(radius, 24);
  topGeo.rotateX(-Math.PI / 2);
  const topMat = loc.biome === "tropical" ? materials.grass : loc.biome === "harbor" ? materials.weatheredWood : materials.concrete;
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0;
  g.add(top);

  // Props based on biome
  if (loc.biome === "tropical") {
    for (let i = 0; i < 12; i++) {
      const tree = createPalmTreeModel();
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.7;
      tree.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      tree.rotation.y = Math.random() * Math.PI;
      g.add(tree);
    }
    for (let i = 0; i < 6; i++) {
      const hut = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 2), materials.weatheredWood);
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.5;
      hut.position.set(Math.sin(a) * r, 0.75, Math.cos(a) * r);
      g.add(hut);
    }
  } else if (loc.biome === "fort") {
    for (let i = 0; i < 6; i++) {
      const wall = createFortWall();
      const a = (i / 6) * Math.PI * 2;
      wall.position.set(Math.sin(a) * radius * 0.75, 0, Math.cos(a) * radius * 0.75);
      wall.lookAt(0, 0, 0);
      g.add(wall);
    }
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 6, 8), materials.concrete);
    tower.position.y = 3;
    g.add(tower);
  } else if (loc.biome === "industrial") {
    for (let i = 0; i < 8; i++) {
      const crate = createCrateModel();
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.6;
      crate.position.set(Math.sin(a) * r, 0.4, Math.cos(a) * r);
      g.add(crate);
    }
    for (let i = 0; i < 6; i++) {
      const barrel = createBarrelModel();
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.6;
      barrel.position.set(Math.sin(a) * r, 0.45, Math.cos(a) * r);
      g.add(barrel);
    }
    const crane = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 1), materials.rustedMetal);
    crane.position.set(radius * 0.4, 5, 0);
    g.add(crane);
  } else if (loc.biome === "military") {
    const bunker = createBunker();
    g.add(bunker);
    const radar = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.1, 0.2, 16), materials.rustedMetal);
    radar.position.y = 7;
    g.add(radar);
    const radarPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 7, 6), materials.concrete);
    radarPole.position.y = 3.5;
    g.add(radarPole);
    for (let i = 0; i < 4; i++) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), materials.dangerGlow);
      const a = (i / 4) * Math.PI * 2;
      light.position.set(Math.sin(a) * radius * 0.7, 0.2, Math.cos(a) * radius * 0.7);
      g.add(light);
    }
  } else if (loc.biome === "wreck") {
    const wreck = createCrashedShipPiece();
    g.add(wreck);
    for (let i = 0; i < 5; i++) {
      const container = new THREE.Mesh(new THREE.BoxGeometry(2, 2.2, 5), materials.rustedMetal);
      container.position.set((Math.random() - 0.5) * radius, 1.1, (Math.random() - 0.5) * radius);
      container.rotation.y = Math.random() * Math.PI;
      g.add(container);
    }
  }

  // Rocks around shore
  for (let i = 0; i < 8; i++) {
    const rocks = createRockCluster();
    const a = Math.random() * Math.PI * 2;
    const r = radius * 0.85 + Math.random() * 3;
    rocks.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    g.add(rocks);
  }

  // Label
  const label = createLabel(loc.name, loc.riskLevel === "safe" ? 0x22aaff : 0xffaa44);
  label.position.y = radius * 0.6;
  g.add(label);

  return g;
}

function createLabel(text: string, color: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, 0, 256, 64);
  ctx.globalAlpha = 1;
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, 128, 40);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  return new THREE.Sprite(mat);
}
