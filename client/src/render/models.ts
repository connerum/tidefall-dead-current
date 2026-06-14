import * as THREE from "three";
import { materials } from "./materials.js";

export function createPlayerModel(color = 0x66aaff): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.0, 4, 8), materials.gunmetal);
  body.position.y = 0.85;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), materials.concrete);
  head.position.y = 1.55;
  g.add(head);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.25), materials.canvas);
  pack.position.set(0, 1.1, -0.25);
  g.add(pack);
  return g;
}

export function createScavengerModel(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.9, 4, 8), materials.canvas);
  body.position.y = 0.8;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), materials.scrapPaint);
  head.position.y = 1.45;
  g.add(head);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.6), materials.gunmetal);
  gun.position.set(0.3, 1.0, 0.3);
  g.add(gun);
  return g;
}

export function createDroneModel(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), materials.rustedMetal);
  body.position.y = 0.25;
  g.add(body);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), materials.machineGlow);
  eye.position.set(0, 0.25, 0.18);
  g.add(eye);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.1), materials.gunmetal);
  rotor.position.y = 0.5;
  g.add(rotor);
  return g;
}

export function createTurretModel(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.4, 8), materials.rustedMetal);
  base.position.y = 0.2;
  g.add(base);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.5), materials.scrapPaint);
  head.position.y = 0.55;
  g.add(head);
  const barrels = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), materials.gunmetal);
  barrels.rotation.x = Math.PI / 2;
  barrels.position.set(0, 0.55, 0.35);
  g.add(barrels);
  return g;
}

export function createSkiffModel(): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 4.5), materials.weatheredWood);
  hull.position.y = 0.25;
  g.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.5, 6), materials.weatheredWood);
  mast.position.set(0, 1.8, 0);
  g.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), materials.canvas);
  sail.position.set(0, 2.2, 0.2);
  sail.rotation.y = Math.PI / 2;
  g.add(sail);
  return g;
}

export function createCrateModel(): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), materials.crate);
}

export function createBarrelModel(): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12), materials.rustedMetal);
}

export function createPalmTreeModel(): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 3, 6), materials.weatheredWood);
  trunk.position.y = 1.5;
  g.add(trunk);
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.6, 7), materials.grass);
  leaves.position.y = 3.2;
  g.add(leaves);
  return g;
}

export function createRockCluster(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const r = 0.3 + Math.random() * 0.5;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), materials.rock);
    rock.position.set((Math.random() - 0.5) * 1.5, r * 0.5, (Math.random() - 0.5) * 1.5);
    g.add(rock);
  }
  return g;
}

export function createFortWall(): THREE.Group {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 1), materials.concrete);
  wall.position.y = 1.5;
  g.add(wall);
  const cren = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 1.1), materials.concrete);
  cren.position.set(-3, 3.2, 0);
  g.add(cren);
  const cren2 = cren.clone();
  cren2.position.set(3, 3.2, 0);
  g.add(cren2);
  return g;
}

export function createBunker(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 6), materials.concrete);
  base.position.y = 1.25;
  g.add(base);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.2), materials.rustedMetal);
  door.position.set(0, 0.9, 3.05);
  g.add(door);
  return g;
}

export function createCrashedShipPiece(): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 8), materials.weatheredWood);
  hull.rotation.z = 0.2;
  hull.position.y = 0.8;
  g.add(hull);
  const containers = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 3), materials.rustedMetal);
  containers.position.set(1.5, 1.2, 1);
  g.add(containers);
  return g;
}

export function createWeaponModel(type: string): THREE.Group {
  const g = new THREE.Group();
  const mat = materials.gunmetal;
  if (type.includes("pistol")) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.35), mat);
    g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), mat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.25;
    g.add(barrel);
  } else if (type.includes("rifle") || type.includes("carbine")) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.8), mat);
    g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), mat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.5;
    g.add(barrel);
  } else if (type.includes("smg")) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.5), mat);
    g.add(body);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.12), mat);
    mag.position.set(0, -0.12, 0.1);
    g.add(mag);
  } else if (type.includes("shotgun")) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.7), mat);
    g.add(body);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), mat);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, -0.06, 0.3);
    g.add(pump);
  } else if (type.includes("marksman") || type.includes("bolt")) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 1.0), mat);
    g.add(body);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), mat);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.1, -0.1);
    g.add(scope);
  }
  return g;
}
