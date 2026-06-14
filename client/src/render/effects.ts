import * as THREE from "three";

export function createMuzzleFlash(): THREE.PointLight {
  const light = new THREE.PointLight(0xffaa33, 0, 8);
  return light;
}

export function createTracer(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.6 });
  return new THREE.Line(geometry, material);
}

export function createHitParticle(position: THREE.Vector3): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.04, 4, 4);
  const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  return mesh;
}
