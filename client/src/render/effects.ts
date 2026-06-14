import * as THREE from "three";

export function createMuzzleFlash(): THREE.PointLight {
  const light = new THREE.PointLight(0xffaa33, 0, 8);
  return light;
}

export function createTracer(start: THREE.Vector3, end: THREE.Vector3): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();

  // A thin glowing tube is far more visible than a single-pixel GL line.
  const geometry = new THREE.CylinderGeometry(0.02, 0.02, len, 8, 1, true);
  // Cylinder defaults to Y-up; rotate to lie along +Z and shift so the pivot sits at the muzzle.
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 0, len / 2);

  const material = new THREE.MeshBasicMaterial({
    color: 0xffeebb,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
  return mesh;
}

export function createHitParticle(position: THREE.Vector3): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.04, 4, 4);
  const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  return mesh;
}
