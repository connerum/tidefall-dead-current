import * as THREE from "three";
import { materials } from "./materials.js";

/** Enable cast/receive shadows on every mesh in a hierarchy. */
function shadow<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return o;
}

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...opts });
}

/**
 * Stylised third-person humanoid: chunky readable silhouette with a coloured
 * vest (team accent), head with a cap, two arms, two legs, a backpack and a
 * held weapon. Built from simple primitives so it stays cheap to render many
 * of them, but the proportions and colour blocking read clearly at distance.
 */
export function createPlayerModel(accent = 0x4aa3ff): THREE.Group {
  const g = new THREE.Group();
  const skin = mat(0xc79c74, { roughness: 0.85 });
  const cloth = mat(0x3a4250, { roughness: 0.85 });
  const boots = mat(0x22262c, { roughness: 0.7 });
  const vest = mat(accent, { roughness: 0.6, metalness: 0.2 });
  const pack = mat(0x5a4632, { roughness: 0.85 });

  // Hips
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.28), cloth);
  hips.position.y = 0.95;
  g.add(hips);

  // Torso (slightly tapered)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.42, 4, 10), cloth);
  torso.position.y = 1.28;
  g.add(torso);
  // Coloured vest overlay
  const vestM = new THREE.Mesh(new THREE.CapsuleGeometry(0.275, 0.36, 4, 10), vest);
  vestM.position.y = 1.3;
  vestM.scale.set(1.02, 1, 1.02);
  g.add(vestM);
  // Chest plate hint
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.12), mat(0x2a313c, { metalness: 0.3 }));
  plate.position.set(0, 1.36, 0.22);
  g.add(plate);

  // Head + cap
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), skin);
  head.position.y = 1.66;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.168, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(accent, { roughness: 0.6 }));
  cap.position.y = 1.68;
  g.add(cap);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 10), mat(0x22262c));
  brim.position.set(0, 1.64, 0.1);
  brim.rotation.x = -0.1;
  g.add(brim);

  // Arms (upper + fore) — shoulders at z offset, slight outward angle
  const armGeo = new THREE.CapsuleGeometry(0.085, 0.34, 4, 8);
  for (const sx of [-1, 1]) {
    const upper = new THREE.Mesh(armGeo, cloth);
    upper.position.set(sx * 0.3, 1.32, 0);
    upper.rotation.z = sx * 0.12;
    g.add(upper);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.3, 4, 8), skin);
    fore.position.set(sx * 0.36, 1.0, 0.04);
    g.add(fore);
    // hands
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), skin);
    hand.position.set(sx * 0.36, 0.84, 0.06);
    g.add(hand);
  }

  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.11, 0.46, 4, 8);
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, cloth);
    leg.position.set(sx * 0.12, 0.5, 0);
    g.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.28), boots);
    boot.position.set(sx * 0.12, 0.12, 0.04);
    g.add(boot);
  }

  // Backpack
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.22), pack);
  backpack.position.set(0, 1.3, -0.26);
  g.add(backpack);
  const packTop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.2), mat(accent, { roughness: 0.6 }));
  packTop.position.set(0, 1.55, -0.26);
  g.add(packTop);

  // Held weapon (simple rifle) held forward at hip
  const weapon = new THREE.Group();
  const wBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.6), materials.gunmetal);
  const wBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), materials.gunmetal);
  wBarrel.rotation.x = Math.PI / 2;
  wBarrel.position.z = 0.4;
  weapon.add(wBody, wBarrel);
  weapon.position.set(0.34, 1.0, 0.22);
  weapon.rotation.x = -0.05;
  g.add(weapon);

  return shadow(g);
}

/** Enemy scavenger: hunched humanoid in drab cloth + scrap mask. */
export function createScavengerModel(): THREE.Group {
  const g = new THREE.Group();
  const cloth = mat(0x5b5547, { roughness: 0.9 });
  const skin = mat(0xb5895f, { roughness: 0.85 });
  const mask = mat(0x2c3038, { roughness: 0.6, metalness: 0.3 });
  const scrap = mat(0x6a5a3a, { roughness: 0.7 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.4, 4, 10), cloth);
  torso.position.y = 1.18;
  g.add(torso);
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.34), scrap);
  sash.position.set(0.06, 1.2, 0);
  sash.rotation.z = 0.25;
  g.add(sash);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), skin);
  head.position.y = 1.52;
  g.add(head);
  const maskM = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.14), mask);
  maskM.position.set(0, 1.52, 0.1);
  g.add(maskM);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.02), mat(0xff5522, { emissive: 0xff3300, emissiveIntensity: 0.6 }));
  visor.position.set(0, 1.54, 0.17);
  g.add(visor);

  // Arms
  const armGeo = new THREE.CapsuleGeometry(0.08, 0.32, 4, 8);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, cloth);
    arm.position.set(sx * 0.29, 1.12, 0.02);
    arm.rotation.z = sx * 0.18;
    g.add(arm);
  }
  // Legs
  const legGeo = new THREE.CapsuleGeometry(0.1, 0.44, 4, 8);
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, cloth);
    leg.position.set(sx * 0.11, 0.48, 0);
    g.add(leg);
  }
  // Crude weapon
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.5), materials.gunmetal);
  gun.position.set(0.3, 1.0, 0.22);
  g.add(gun);

  return shadow(g);
}

export function createDroneModel(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), materials.rustedMetal);
  body.position.y = 0.3;
  body.scale.y = 0.7;
  g.add(body);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), mat(0x33ccff, { emissive: 0x33ccff, emissiveIntensity: 0.9 }));
  eye.position.set(0, 0.3, 0.16);
  g.add(eye);
  // four angled rotor arms
  const armMat = materials.gunmetal;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.05), armMat);
    arm.position.set(Math.sin(a) * 0.18, 0.34, Math.cos(a) * 0.18);
    arm.rotation.y = a;
    g.add(arm);
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.01, 10), mat(0x222428));
    rotor.position.set(Math.sin(a) * 0.4, 0.4, Math.cos(a) * 0.4);
    g.add(rotor);
  }
  return shadow(g);
}

export function createTurretModel(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 0.4, 10), materials.rustedMetal);
  base.position.y = 0.2;
  g.add(base);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.5), materials.scrapPaint);
  head.position.y = 0.55;
  g.add(head);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mat(0xff3322, { emissive: 0xff2200, emissiveIntensity: 1 }));
  eye.position.set(0, 0.58, 0.26);
  g.add(eye);
  const barrels = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), materials.gunmetal);
  barrels.rotation.x = Math.PI / 2;
  barrels.position.set(0, 0.55, 0.38);
  g.add(barrels);
  return shadow(g);
}

export function createSkiffModel(): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 4.5), materials.weatheredWood);
  hull.position.y = 0.25;
  g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.6, 4), materials.weatheredWood);
  bow.rotation.x = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 0.25, -2.8);
  g.add(bow);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.8, 6), materials.weatheredWood);
  mast.position.set(0, 2.0, 0.4);
  g.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.4), materials.canvas);
  sail.position.set(0, 2.4, 0.4);
  sail.rotation.y = Math.PI / 2;
  g.add(sail);
  return shadow(g);
}

export function createCrateModel(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), materials.crate);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createBarrelModel(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 14), materials.barrel);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Stylised palm: a gently curved trunk built from tapered segments, crowned
 * with drooping fronds and a few coconuts. Height, lean and frond count vary
 * per call so a grove doesn't look cloned.
 */
export function createPalmTreeModel(rng: () => number = Math.random): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = materials.weatheredWood;
  const leafMat = materials.palmFrond ?? materials.grass;

  const totalHeight = 4.2 + rng() * 2.6;
  const segments = 6;
  const segH = totalHeight / segments;
  const lean = (rng() - 0.5) * 0.6;
  const leanAngle = rng() * Math.PI * 2;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const rTop = 0.16 - t * 0.06;
    const rBot = 0.2 - t * 0.06;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, segH + 0.1, 8), trunkMat);
    cx += Math.sin(leanAngle) * lean * (segH / totalHeight) * (1 - t * 0.4);
    cz += Math.cos(leanAngle) * lean * (segH / totalHeight) * (1 - t * 0.4);
    seg.position.set(cx, segH * (i + 0.5), cz);
    seg.rotation.x = lean * 0.25 * Math.cos(leanAngle);
    seg.rotation.z = -lean * 0.25 * Math.sin(leanAngle);
    g.add(seg);
  }
  const crownY = segH * segments + 0.2;

  // Crown hub
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), trunkMat);
  hub.position.set(cx, crownY, cz);
  g.add(hub);

  // Drooping fronds: elongated, flattened cones angled outward + down.
  const frondCount = 8 + Math.floor(rng() * 3);
  for (let i = 0; i < frondCount; i++) {
    const a = (i / frondCount) * Math.PI * 2 + rng() * 0.3;
    const frond = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 2.6 + rng() * 0.6, 4), leafMat);
    blade.scale.set(1, 1, 0.22); // flatten into a leaf
    blade.rotation.x = Math.PI / 2; // point along +Z
    blade.position.z = 1.1;
    frond.add(blade);
    // shorter midrib spike
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 4), leafMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 2.4;
    frond.add(tip);
    frond.position.set(cx, crownY + 0.1, cz);
    frond.rotation.y = a;
    frond.rotation.z = -1.05 - rng() * 0.2; // droop down toward the tip
    g.add(frond);
  }
  // a couple of upward shorter fronds for fullness
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const up = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.4, 4), leafMat);
    up.scale.set(1, 1, 0.22);
    up.position.set(cx + Math.sin(a) * 0.2, crownY + 0.7, cz + Math.cos(a) * 0.2);
    up.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
    g.add(up);
  }

  // Coconuts
  const cocos = 2 + Math.floor(rng() * 3);
  const cocoMat = mat(0x4a3322, { roughness: 0.9 });
  for (let i = 0; i < cocos; i++) {
    const a = rng() * Math.PI * 2;
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), cocoMat);
    c.position.set(cx + Math.sin(a) * 0.22, crownY - 0.12, cz + Math.cos(a) * 0.22);
    g.add(c);
  }

  return shadow(g);
}

/** Simple broadleaf/bush tree for foliage variety on non-tropical islands. */
export function createBroadleafTreeModel(rng: () => number = Math.random): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.6 + rng(), 7), materials.weatheredWood);
  trunk.position.y = 1.3;
  g.add(trunk);
  const leafMat = mat(0x3f6b34, { roughness: 0.9 });
  const clusters = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < clusters; i++) {
    const r = 0.9 + rng() * 0.5;
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafMat);
    blob.position.set((rng() - 0.5) * 1.0, 2.4 + rng() * 0.8, (rng() - 0.5) * 1.0);
    g.add(blob);
  }
  return shadow(g);
}

/** Small ground grass tuft, drawn as a few crossed blades. */
export function createGrassClumpModel(): THREE.Group {
  const g = new THREE.Group();
  const bladeMat = mat(0x4f7a35, { roughness: 0.95, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5 + Math.random() * 0.3, 3), bladeMat);
    blade.position.set((Math.random() - 0.5) * 0.4, 0.25, (Math.random() - 0.5) * 0.4);
    blade.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.5);
    g.add(blade);
  }
  g.scale.setScalar(0.8 + Math.random() * 0.6);
  return g;
}

export function createRockCluster(): THREE.Group {
  const g = new THREE.Group();
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const r = 0.3 + Math.random() * 0.7;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), materials.rock);
    rock.position.set((Math.random() - 0.5) * 1.8, r * 0.45, (Math.random() - 0.5) * 1.8);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = 0.7 + Math.random() * 0.4;
    g.add(rock);
  }
  return shadow(g);
}

export function createFortWall(): THREE.Group {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 3.4, 1), materials.concrete);
  wall.position.y = 1.7;
  g.add(wall);
  for (const dx of [-3, -1, 1, 3]) {
    const cren = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1.1), materials.concrete);
    cren.position.set(dx, 3.5, 0);
    g.add(cren);
  }
  return shadow(g);
}

export function createBunker(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 2.8, 6), materials.concrete);
  base.position.y = 1.4;
  g.add(base);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.4, 6.4), materials.concrete);
  roof.position.y = 3.0;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.2), materials.rustedMetal);
  door.position.set(0, 0.9, 3.05);
  g.add(door);
  return shadow(g);
}

export function createCrashedShipPiece(): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 9), materials.rustedMetal);
  hull.rotation.z = 0.18;
  hull.position.y = 0.9;
  g.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 8), materials.weatheredWood);
  deck.rotation.z = 0.18;
  deck.position.y = 1.9;
  g.add(deck);
  const containers = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 3.2), materials.rustedMetal);
  containers.position.set(1.5, 1.4, 1);
  g.add(containers);
  return shadow(g);
}

export function createWeaponModel(type: string): THREE.Group {
  const g = new THREE.Group();
  const m = materials.gunmetal;
  if (type.includes("pistol")) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.35), m);
    g.add(body);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.08), m);
    grip.position.set(0, -0.12, -0.08);
    grip.rotation.x = 0.25;
    g.add(grip);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), m);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.25;
    g.add(barrel);
  } else if (type.includes("rifle") || type.includes("carbine")) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.8), m);
    g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), m);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.5;
    g.add(barrel);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.1), m);
    mag.position.set(0, -0.15, 0.05);
    g.add(mag);
  } else if (type.includes("smg")) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.5), m);
    g.add(body);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.12), m);
    mag.position.set(0, -0.12, 0.1);
    g.add(mag);
  } else if (type.includes("shotgun")) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.7), m);
    g.add(body);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), m);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, -0.06, 0.3);
    g.add(pump);
  } else if (type.includes("marksman") || type.includes("bolt")) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 1.0), m);
    g.add(body);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), m);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.1, -0.1);
    g.add(scope);
  }
  return g;
}
