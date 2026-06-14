import * as THREE from "three";
import { LOCATIONS, type LocationDefinition, SEA_LANES } from "@tidefall/shared";
import { materials, tilingMaterial } from "./materials.js";
import { fbm, mulberry32 } from "./textures.js";
import {
  createPalmTreeModel,
  createBroadleafTreeModel,
  createGrassClumpModel,
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

const COL_SAND = new THREE.Color(0xd8c89a);
const COL_GRASS = new THREE.Color(0xffffff);
const COL_ROCK = new THREE.Color(0x9a9488);

/**
 * Build the walkable top surface of an island. Vertices are displaced with
 * layered value noise so the ground has rolling dunes / hills instead of
 * being a flat disc, and per-vertex colours blend sand (shore) -> grass
 * (inland) -> rock (peaks) over the base material so biomes read naturally.
 */
function buildTerrainTop(radius: number, biome: string, tile: number, seed: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 56, 0, Math.PI * 2);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  const natural = biome === "tropical";
  // Keep relief subtle: the authoritative server treats the ground as a flat
  // plane (y=0), so large displacement would make the camera clip into hills
  // or float above valleys. Gentle dunes add life without breaking movement.
  const amp = natural ? 0.6 : biome === "fort" || biome === "wreck" ? 0.4 : 0.3;
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const dist = Math.hypot(x, z) / radius; // 0 centre -> ~1 edge
    const edge = THREE.MathUtils.clamp(dist, 0, 1);
    const relief = natural ? 1.0 - edge * 0.85 : 1.0 - edge * 0.6;
    // multi-scale noise for big dunes + small detail
    const n1 = fbm(x * 0.012, z * 0.012, 4, seed, 9999);
    const n2 = fbm(x * 0.05, z * 0.05, 3, seed + 50, 9999);
    let h = (n1 * 0.75 + n2 * 0.25) * amp * relief;
    if (natural) h += Math.pow(1 - edge, 2) * 0.2; // gentle central mound
    pos.setY(i, h);

    if (natural) {
      // sand near the shore, grass inland, rock on the peaks
      c.copy(COL_GRASS);
      c.lerp(COL_SAND, THREE.MathUtils.smoothstep(edge, 0.6, 0.95));
      c.lerp(COL_ROCK, THREE.MathUtils.smoothstep(h, 0.35, 0.6) * 0.7);
    } else if (biome === "military" || biome === "fort") {
      c.copy(COL_GRASS).lerp(COL_ROCK, n2 * 0.4);
    } else {
      c.copy(COL_GRASS);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const base =
    biome === "tropical"
      ? tilingMaterial(materials.grass, tile)
      : biome === "harbor"
        ? tilingMaterial(materials.weatheredWood, tile)
        : biome === "military"
          ? tilingMaterial(materials.concrete, tile)
          : tilingMaterial(materials.rock, tile);
  base.vertexColors = true;
  base.needsUpdate = true;

  const mesh = new THREE.Mesh(geo, base);
  setShadow(mesh, true, true);
  return mesh;
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

  // Top surface — displaced + colour-blended terrain for natural relief
  const top = buildTerrainTop(radius, loc.biome, surfaceTile, loc.position.x * 7 + loc.position.z * 13);
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
    const rng = mulberry32((loc.position.x * 131 + loc.position.z) | 0);
    const palmCount = 18;
    for (let i = 0; i < palmCount; i++) {
      const tree = createPalmTreeModel(rng);
      const a = (i / palmCount) * Math.PI * 2 + rng() * 0.4;
      const r = radius * (0.15 + rng() * 0.65);
      tree.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      tree.rotation.y = rng() * Math.PI * 2;
      g.add(tree);
    }
    // scattered grass tufts
    for (let i = 0; i < 60; i++) {
      const clump = createGrassClumpModel();
      const a = rng() * Math.PI * 2;
      const r = rng() * radius * 0.8;
      clump.position.set(Math.sin(a) * r, 0.05, Math.cos(a) * r);
      g.add(clump);
    }
    for (let i = 0; i < 6; i++) {
      const hut = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.4), materials.weatheredWood);
      const a = rng() * Math.PI * 2;
      const r = rng() * radius * 0.5;
      hut.position.set(Math.sin(a) * r, 0.8, Math.cos(a) * r);
      setShadow(hut);
      g.add(hut);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.2, 4), materials.canvas);
      roof.position.copy(hut.position);
      roof.position.y = 2.2;
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
