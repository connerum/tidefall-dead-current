import * as THREE from "three";
import { materials } from "./materials.js";

export function createOcean(size: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(size, size, 64, 64);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, materials.water);
  mesh.position.y = -0.5;
  mesh.receiveShadow = true;
  return mesh;
}

export function updateWater(mesh: THREE.Mesh, time: number): void {
  const pos = mesh.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = Math.sin(x * 0.1 + time) * 0.15 + Math.cos(z * 0.08 + time * 0.7) * 0.15;
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
}
