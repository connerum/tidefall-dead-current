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

/**
 * A proper small ship (skiff-class) big enough for several crew on deck:
 * shaped wooden hull with a pointed bow, a walkable deck, railing posts and
 * rope rails, a stern cabin/wheelhouse with windows and a ship's wheel, a
 * main mast with yard, furled + deployed sail, rigging stays, deck cargo and
 * a flag. Bow faces +Z (the server's forward direction).
 */
export function createSkiffModel(): THREE.Group {
  const g = new THREE.Group();
  const hullMat = materials.weatheredWood;
  const darkWood = mat(0x33240f, { roughness: 0.92 });
  const metal = materials.rustedMetal;
  const darkMetal = materials.gunmetal;
  const sailMat = materials.canvas;
  const glass = mat(0x122838, { roughness: 0.2, metalness: 0.6, emissive: 0x0a141c, emissiveIntensity: 0.3 });
  const rope = mat(0x6a5436, { roughness: 0.9 });
  const accent = mat(0x9a3b2e, { roughness: 0.6 });

  const P = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    g.add(mesh);
  };
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt: number, rb: number, h: number, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
  const sph = (r: number) => new THREE.SphereGeometry(r, 10, 8);
  // a thin cylinder stretched between two points (rigging / ropes)
  const line = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, m: THREE.Material, thick = 0.03): void => {
    const a = new THREE.Vector3(ax, ay, az);
    const b = new THREE.Vector3(bx, by, bz);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mesh = new THREE.Mesh(cyl(thick * 0.5, thick * 0.5, len, 5), m);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    g.add(mesh);
  };

  // ---- Hull ----
  P(box(5.4, 1.4, 11), hullMat, 0, -0.7, 0);
  // waterline band (darker)
  P(box(5.5, 0.28, 11.1), darkWood, 0, -0.25, 0);
  // keel
  P(box(0.5, 0.4, 11), darkWood, 0, -1.5, 0);
  // pointed bow (+Z)
  P(new THREE.ConeGeometry(2.75, 4, 4), hullMat, 0, -0.7, 7, Math.PI / 2, Math.PI / 4);
  P(new THREE.ConeGeometry(2.78, 0.6, 4), darkWood, 0, -0.7, 5.2, Math.PI / 2, Math.PI / 4);
  // stern transom
  P(box(5.0, 1.3, 0.3), darkWood, 0, -0.7, -5.6);

  // ---- Deck ----
  P(box(4.8, 0.18, 10), hullMat, 0, 0.06, 0.3);
  P(box(3.4, 0.18, 3.2), hullMat, 0, 0.06, 5.0); // foredeck
  // deck plank lines
  for (let i = -4; i <= 4; i++) P(box(4.6, 0.02, 0.06), darkWood, 0, 0.16, i * 1.1);
  // hatch
  P(box(1.0, 0.08, 1.0), darkWood, 0, 0.2, 2.6);

  // ---- Gunwale + railings ----
  P(box(5.0, 0.35, 0.25), darkWood, 0, 0.3, 5.4); // bow cap
  P(box(5.2, 0.35, 0.25), darkWood, 0, 0.3, -5.55); // stern cap
  P(box(0.25, 0.35, 11), darkWood, 2.55, 0.3, 0); // starboard rail
  P(box(0.25, 0.35, 11), darkWood, -2.55, 0.3, 0); // port rail
  // railing posts + rope rail
  for (let i = -4; i <= 4; i++) {
    const z = i * 1.2;
    P(cyl(0.04, 0.04, 0.9, 6), darkWood, 2.5, 0.75, z);
    P(cyl(0.04, 0.04, 0.9, 6), darkWood, -2.5, 0.75, z);
    if (i < 4) {
      line(2.5, 1.15, z, 2.5, 1.15, z + 1.2, rope, 0.025);
      line(-2.5, 1.15, z, -2.5, 1.15, z + 1.2, rope, 0.025);
    }
  }
  // bow railing arc
  line(2.5, 1.15, 4.8, 1.6, 1.15, 5.6, rope, 0.025);
  line(-2.5, 1.15, 4.8, -1.6, 1.15, 5.6, rope, 0.025);

  // ---- Stern cabin / wheelhouse ----
  P(box(3.6, 1.9, 2.8), hullMat, 0, 1.05, -3.6);
  P(box(4.0, 0.3, 3.2), darkWood, 0, 2.05, -3.6); // roof overhang
  // windows
  P(box(0.06, 0.7, 1.8), glass, 1.81, 1.25, -3.6);
  P(box(0.06, 0.7, 1.8), glass, -1.81, 1.25, -3.6);
  P(box(2.6, 0.7, 0.06), glass, 0, 1.55, -5.02);
  // door
  P(box(1.0, 1.3, 0.08), darkWood, 0, 0.75, -2.21);
  // cabin frame
  P(box(3.8, 0.1, 0.15), darkWood, 0, 0.85, -2.2);

  // ---- Ship's wheel (helm) on the cabin roof ----
  const wheel = new THREE.Group();
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 16), darkMetal));
  wheel.add(new THREE.Mesh(cyl(0.05, 0.05, 0.5, 8), darkMetal));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(cyl(0.025, 0.025, 0.9, 5), darkMetal);
    spoke.rotation.z = a;
    wheel.add(spoke);
    const knob = new THREE.Mesh(sph(0.06), darkWood);
    knob.position.set(Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0);
    wheel.add(knob);
  }
  wheel.position.set(0, 2.5, -3.6);
  wheel.rotation.x = Math.PI / 2;
  g.add(wheel);
  // wheel pedestal
  P(cyl(0.08, 0.1, 0.4, 8), darkWood, 0, 2.25, -3.6);

  // ---- Mast, yard, sail, rigging ----
  const mastX = 0, mastZ = 1.2;
  P(cyl(0.2, 0.24, 7), hullMat, mastX, 3.6, mastZ);
  P(cyl(0.22, 0.22, 0.4, 8), darkWood, mastX, 7.2, mastZ); // mast cap
  // yard (crossbar) + furled sail
  P(cyl(0.07, 0.07, 5, 8), darkMetal, mastX, 6.0, mastZ, 0, 0, Math.PI / 2);
  P(cyl(0.22, 0.22, 4.6, 12), sailMat, mastX, 5.85, mastZ, Math.PI / 2);
  // deployed square sail (billowing slightly via a curved plane)
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.4, 6, 4), sailMat);
  sail.position.set(mastX, 4.3, mastZ);
  // gentle billow
  const sp = sail.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sp.count; i++) {
    const vx = sp.getX(i) / 2.1;
    sp.setZ(i, Math.cos(vx * 1.4) * 0.25);
  }
  sp.needsUpdate = true;
  sail.geometry.computeVertexNormals();
  g.add(sail);
  // rigging stays
  line(mastX, 7.0, mastZ, 0, 0.6, 6.4, rope); // forestay to bow
  line(mastX, 7.0, mastZ, 2.4, 0.6, mastZ, rope); // starboard shroud
  line(mastX, 7.0, mastZ, -2.4, 0.6, mastZ, rope); // port shroud
  line(mastX, 7.0, mastZ, 0, 2.2, -3.6, rope); // backstay to cabin
  // flag
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), accent);
  flag.position.set(mastX + 0.4, 7.3, mastZ);
  g.add(flag);

  // ---- Deck cargo ----
  P(box(1.1, 1.1, 1.1), materials.crate, -1.7, 0.72, -0.4);
  P(box(1.1, 1.1, 1.1), materials.crate, -1.7, 1.82, -0.4);
  P(cyl(0.42, 0.42, 1.1, 12), materials.barrel, 1.7, 0.72, -0.2);
  P(cyl(0.42, 0.42, 1.1, 12), materials.barrel, 1.7, 0.72, 1.0);
  // coils of rope
  P(new THREE.TorusGeometry(0.3, 0.08, 6, 12), rope, 1.7, 0.62, 2.4);

  // ---- Anchor at the bow ----
  P(cyl(0.05, 0.05, 1.4, 6), darkMetal, 0, 0.5, 5.6);
  const anchor = new THREE.Group();
  anchor.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 10), darkMetal));
  anchor.add(new THREE.Mesh(cyl(0.05, 0.05, 0.7, 6), darkMetal));
  anchor.add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), darkMetal));
  anchor.position.set(0, -0.2, 6.2);
  g.add(anchor);

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
  const metal = materials.gunmetal;
  const dark = mat(0x14161a, { roughness: 0.5, metalness: 0.5 });
  const poly = mat(0x22262d, { roughness: 0.6, metalness: 0.15 });
  const wood = materials.weatheredWood;
  const glass = mat(0x0d2a44, { roughness: 0.15, metalness: 0.6, emissive: 0x06121e, emissiveIntensity: 0.4 });

  // helper: add a mesh part to the weapon group (barrel points -Z = forward)
  const P = (
    geo: THREE.BufferGeometry,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0
  ): void => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    g.add(mesh);
  };
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const cyl = (r: number, h: number, seg = 10) => new THREE.CylinderGeometry(r, r, h, seg);
  const torus = (r: number, t: number) => new THREE.TorusGeometry(r, t, 6, 12);

  if (type.includes("pistol")) {
    // slide / frame
    P(box(0.08, 0.12, 0.36), metal, 0, 0.02, 0);
    P(box(0.075, 0.05, 0.34), dark, 0, -0.05, 0.01);
    // barrel bushing + muzzle
    P(cyl(0.03, 0.05), metal, 0, 0.02, -0.19, Math.PI / 2);
    P(cyl(0.022, 0.04), dark, 0, 0.02, -0.22, Math.PI / 2);
    // grip (angled back)
    P(box(0.072, 0.19, 0.1), poly, 0, -0.16, 0.1, 0.28);
    for (let i = 0; i < 5; i++) P(box(0.074, 0.02, 0.1), dark, 0, -0.09 - i * 0.028, 0.12 + i * 0.008);
    // trigger guard + trigger
    P(torus(0.05, 0.012), dark, 0, -0.1, -0.01, Math.PI / 2, Math.PI / 2);
    P(box(0.02, 0.05, 0.015), dark, 0, -0.1, 0.03);
    // sights
    P(box(0.012, 0.03, 0.02), metal, 0, 0.09, -0.16);
    P(box(0.05, 0.022, 0.02), metal, 0, 0.09, 0.12);
    P(box(0.012, 0.018, 0.02), dark, 0, 0.092, 0.12);
    // hammer + ejection port
    P(cyl(0.015, 0.03, 6), dark, 0, 0.05, 0.19, Math.PI / 2);
    P(box(0.03, 0.025, 0.09), dark, 0.045, 0.04, 0.03);
    // rust patches (it's a salvaged pistol)
    P(box(0.05, 0.04, 0.05), mat(0x6a4226, { roughness: 0.9 }), 0, 0.05, -0.05);
  } else if (type.includes("smg")) {
    P(box(0.085, 0.12, 0.36), metal, 0, 0, 0);
    P(box(0.06, 0.03, 0.34), dark, 0, 0.075, -0.02);
    P(cyl(0.017, 0.2), metal, 0, 0.01, -0.24, Math.PI / 2);
    P(cyl(0.03, 0.05), dark, 0, 0.01, -0.32, Math.PI / 2);
    P(box(0.06, 0.06, 0.16), dark, 0, 0.01, -0.2);
    // long stick magazine
    P(box(0.05, 0.26, 0.08), poly, 0, -0.18, 0.0, 0.12);
    P(box(0.052, 0.03, 0.085), dark, 0, -0.31, 0.025);
    // pistol grip
    P(box(0.062, 0.15, 0.08), poly, 0, -0.13, 0.11, 0.3);
    // wire stock
    P(box(0.015, 0.02, 0.16), dark, -0.03, 0.0, 0.22);
    P(box(0.015, 0.02, 0.16), dark, 0.03, 0.0, 0.22);
    P(box(0.07, 0.03, 0.02), dark, 0, 0.0, 0.3);
    P(box(0.07, 0.03, 0.02), dark, 0, -0.05, 0.3);
    // sights
    P(box(0.012, 0.025, 0.02), metal, 0, 0.08, -0.16);
    P(box(0.04, 0.02, 0.02), metal, 0, 0.08, 0.1);
    P(box(0.03, 0.018, 0.08), dark, 0.045, 0.04, 0.02);
  } else if (type.includes("shotgun")) {
    P(box(0.09, 0.12, 0.5), metal, 0, 0, 0);
    // long thick barrel
    P(cyl(0.03, 0.52), metal, 0, 0.03, -0.42, Math.PI / 2);
    P(cyl(0.034, 0.05), dark, 0, 0.03, -0.66, Math.PI / 2);
    // magazine tube under barrel
    P(cyl(0.022, 0.42, 8), dark, 0, -0.04, -0.36, Math.PI / 2);
    // wooden pump / forend
    P(box(0.07, 0.06, 0.2), wood, 0, -0.04, -0.3);
    P(box(0.072, 0.02, 0.2), mat(0x3a2a18, { roughness: 0.9 }), 0, -0.02, -0.3);
    // wooden stock
    P(box(0.08, 0.14, 0.28), wood, 0, -0.03, 0.34);
    P(box(0.08, 0.05, 0.12), mat(0x3a2a18, { roughness: 0.9 }), 0, 0.05, 0.27); // comb
    P(box(0.06, 0.1, 0.06), wood, 0, -0.04, 0.5); // butt
    // grip+guard
    P(torus(0.05, 0.012), dark, 0, -0.1, 0.05, Math.PI / 2, Math.PI / 2);
    P(box(0.02, 0.05, 0.015), dark, 0, -0.1, 0.09);
    // bead sight
    P(new THREE.SphereGeometry(0.012, 8, 6), metal, 0, 0.1, -0.64);
  } else if (type.includes("marksman") || type.includes("bolt")) {
    P(box(0.085, 0.12, 0.6), metal, 0, 0, 0);
    // long barrel
    P(cyl(0.018, 0.52), metal, 0, 0.01, -0.5, Math.PI / 2);
    P(cyl(0.026, 0.06), dark, 0, 0.01, -0.7, Math.PI / 2);
    // scope
    P(cyl(0.036, 0.28), dark, 0, 0.13, -0.02, Math.PI / 2);
    P(cyl(0.038, 0.03), metal, 0, 0.13, -0.16, Math.PI / 2);
    P(cyl(0.038, 0.03), metal, 0, 0.13, 0.12, Math.PI / 2);
    P(cyl(0.03, 0.008), glass, 0, 0.13, -0.17, Math.PI / 2);
    P(box(0.03, 0.06, 0.04), dark, 0, 0.085, -0.08);
    P(box(0.03, 0.06, 0.04), dark, 0, 0.085, 0.06);
    // stock with cheek rest
    P(box(0.08, 0.13, 0.26), wood, 0, -0.02, 0.35);
    P(box(0.05, 0.04, 0.2), mat(0x2a1d10, { roughness: 0.9 }), 0, 0.05, 0.34); // cheek riser
    P(box(0.07, 0.1, 0.05), wood, 0, -0.03, 0.5); // butt pad
    // grip + mag + bolt
    P(box(0.06, 0.15, 0.08), poly, 0, -0.13, 0.16, 0.3);
    P(box(0.05, 0.1, 0.09), poly, 0, -0.1, -0.02);
    P(cyl(0.012, 0.1, 6), metal, 0.05, 0.05, 0.05, 0, 0, 0.4); // bolt handle
    P(torus(0.05, 0.012), dark, 0, -0.1, 0.06, Math.PI / 2, Math.PI / 2);
    P(box(0.02, 0.05, 0.015), dark, 0, -0.1, 0.1);
  } else {
    // default: detailed assault rifle (scrap_rifle / burst carbine)
    P(box(0.09, 0.13, 0.62), metal, 0, 0, 0);
    // picatinny top rail
    P(box(0.04, 0.02, 0.42), dark, 0, 0.08, -0.04);
    for (let i = 0; i < 7; i++) P(box(0.035, 0.022, 0.02), metal, 0, 0.082, -0.2 + i * 0.06);
    // barrel + gas system + muzzle brake
    P(cyl(0.018, 0.42), metal, 0, 0.01, -0.46, Math.PI / 2);
    P(box(0.04, 0.04, 0.05), dark, 0, 0.03, -0.42); // gas block
    P(cyl(0.006, 0.12, 6), metal, 0, 0.045, -0.4, Math.PI / 2); // gas tube
    P(cyl(0.03, 0.08), dark, 0, 0.01, -0.64, Math.PI / 2); // muzzle brake
    for (let i = 0; i < 3; i++) P(box(0.032, 0.02, 0.012), dark, 0, 0.01, -0.6 - i * 0.025);
    // handguard
    P(box(0.07, 0.075, 0.32), poly, 0, 0.01, -0.32);
    for (let i = 0; i < 4; i++) P(box(0.072, 0.02, 0.04), dark, 0, 0.045, -0.42 + i * 0.08);
    // magazine (curved)
    P(box(0.052, 0.24, 0.09), poly, 0, -0.17, 0.02, -0.12);
    P(box(0.054, 0.04, 0.1), dark, 0, -0.28, 0.085, -0.12);
    P(box(0.06, 0.05, 0.1), dark, 0, -0.09, 0.02); // mag well
    // stock
    P(box(0.07, 0.11, 0.08), poly, 0, 0.0, 0.32);
    P(box(0.05, 0.1, 0.16), poly, 0, -0.005, 0.4);
    P(box(0.07, 0.09, 0.03), dark, 0, -0.005, 0.49); // butt plate
    // grip
    P(box(0.06, 0.16, 0.08), poly, 0, -0.13, 0.16, 0.32);
    for (let i = 0; i < 4; i++) P(box(0.062, 0.02, 0.08), dark, 0, -0.07 - i * 0.03, 0.18 + i * 0.01);
    // sights
    P(box(0.012, 0.03, 0.02), metal, 0, 0.085, -0.5);
    P(box(0.05, 0.025, 0.03), metal, 0, 0.085, 0.16);
    P(box(0.012, 0.02, 0.025), dark, 0, 0.087, 0.16);
    // charging handle + ejection port + trigger guard
    P(cyl(0.012, 0.08, 6), metal, 0.05, 0.05, 0.12, 0, 0, 0.4);
    P(box(0.03, 0.025, 0.09), dark, 0.045, 0.04, -0.05);
    P(torus(0.05, 0.012), dark, 0, -0.1, 0.06, Math.PI / 2, Math.PI / 2);
    P(box(0.02, 0.05, 0.015), dark, 0, -0.1, 0.1);
  }
  return g;
}
