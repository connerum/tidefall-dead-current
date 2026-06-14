import * as THREE from "three";

export function createMuzzleFlash(): THREE.PointLight {
  const light = new THREE.PointLight(0xffaa33, 0, 8);
  return light;
}

export function createTracer(): THREE.Group {
  const group = new THREE.Group();

  // Short, thick glowing streak. Viewed end-on it still reads as a bright dot
  // because of the head sphere; from the side it clearly shows the flight path.
  const streakLen = 2.5;
  const streakGeo = new THREE.CylinderGeometry(0.1, 0.1, streakLen, 10, 1, true);
  // Cylinder defaults to Y-up; rotate to lie along +Z and shift pivot to the tail.
  streakGeo.rotateX(Math.PI / 2);
  streakGeo.translate(0, 0, streakLen / 2);
  const streakMat = new THREE.MeshBasicMaterial({
    color: 0xfff0c0,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
  const streak = new THREE.Mesh(streakGeo, streakMat);
  group.add(streak);

  // Bright head that stays visible even when looking straight down the barrel.
  const headGeo = new THREE.SphereGeometry(0.2, 12, 12);
  const headMat = new THREE.MeshBasicMaterial({
    color: 0xffcc44,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    depthTest: false,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.z = streakLen;
  group.add(head);

  return group;
}

export function createHitParticle(position: THREE.Vector3): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.04, 4, 4);
  const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  return mesh;
}
