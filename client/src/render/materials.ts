import * as THREE from "three";
import {
  createSandTexture,
  createWetSandTexture,
  createGrassTexture,
  createRockTexture,
  createWeatheredWoodTexture,
  createRustedMetalTexture,
  createCanvasClothTexture,
  createConcreteTexture,
  createGunmetalTexture,
  createScrapPaintTexture,
  createCrateTexture,
  createBarrelTexture,
  createPalmFrondTexture,
  createFbmNormalTexture,
} from "./textures.js";

function tex(canvas: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat !== 1) t.repeat.set(repeat, repeat);
  return t;
}

function nmap(seed: number, scale: number, octaves: number, strength = 2, repeat = 1): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(createFbmNormalTexture(512, seed, scale, octaves, 4, strength));
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (repeat !== 1) t.repeat.set(repeat, repeat);
  return t;
}

export const materials = {
  sand: new THREE.MeshStandardMaterial({
    map: tex(createSandTexture()),
    normalMap: nmap(1337, 6, 5, 1.6),
    roughness: 0.95,
    metalness: 0.0,
  }),
  wetSand: new THREE.MeshStandardMaterial({
    map: tex(createWetSandTexture()),
    normalMap: nmap(2042, 5, 4, 1.4),
    roughness: 0.45,
    metalness: 0.0,
  }),
  grass: new THREE.MeshStandardMaterial({
    map: tex(createGrassTexture()),
    normalMap: nmap(7777, 5, 5, 1.8),
    roughness: 0.92,
    metalness: 0.0,
  }),
  rock: new THREE.MeshStandardMaterial({
    map: tex(createRockTexture()),
    normalMap: nmap(555, 7, 6, 2.4),
    roughness: 0.88,
    metalness: 0.05,
  }),
  weatheredWood: new THREE.MeshStandardMaterial({
    map: tex(createWeatheredWoodTexture()),
    normalMap: nmap(88, 10, 4, 1.5),
    roughness: 0.82,
    metalness: 0.0,
  }),
  rustedMetal: new THREE.MeshStandardMaterial({
    map: tex(createRustedMetalTexture()),
    normalMap: nmap(314, 6, 6, 2.2),
    roughness: 0.62,
    metalness: 0.55,
  }),
  canvas: new THREE.MeshStandardMaterial({
    map: tex(createCanvasClothTexture()),
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  }),
  concrete: new THREE.MeshStandardMaterial({
    map: tex(createConcreteTexture()),
    normalMap: nmap(909, 6, 6, 1.8),
    roughness: 0.9,
    metalness: 0.05,
  }),
  gunmetal: new THREE.MeshStandardMaterial({
    map: tex(createGunmetalTexture()),
    normalMap: nmap(424, 8, 5, 1.4),
    roughness: 0.38,
    metalness: 0.85,
  }),
  scrapPaint: new THREE.MeshStandardMaterial({
    map: tex(createScrapPaintTexture()),
    normalMap: nmap(1188, 7, 5, 1.6),
    roughness: 0.58,
    metalness: 0.4,
  }),
  crate: new THREE.MeshStandardMaterial({
    map: tex(createCrateTexture()),
    normalMap: nmap(88, 10, 4, 1.3),
    roughness: 0.8,
    metalness: 0.1,
  }),
  barrel: new THREE.MeshStandardMaterial({
    map: tex(createBarrelTexture()),
    normalMap: nmap(314, 6, 6, 1.8),
    roughness: 0.6,
    metalness: 0.55,
  }),
  palmFrond: new THREE.MeshStandardMaterial({
    map: tex(createPalmFrondTexture()),
    normalMap: nmap(71, 9, 4, 1.4),
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
  }),
  water: new THREE.MeshStandardMaterial({
    color: 0x1a6b8a,
    transparent: true,
    opacity: 0.85,
    roughness: 0.1,
    metalness: 0.2,
  }),
  safeZoneGlow: new THREE.MeshBasicMaterial({
    color: 0x33bbff,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  machineGlow: new THREE.MeshBasicMaterial({ color: 0x33ccff, transparent: true, opacity: 0.85 }),
  dangerGlow: new THREE.MeshBasicMaterial({ color: 0xff3322, transparent: true, opacity: 0.85 }),
  stormFog: new THREE.MeshBasicMaterial({
    color: 0x2a2a3a,
    transparent: true,
    opacity: 0.5,
    side: THREE.BackSide,
    depthWrite: false,
  }),
};

/**
 * Clone a base material but with its textures set to repeat `repeat` times,
 * so large terrain pieces keep crisp world-space detail instead of stretching
 * a single tile across the whole mesh.
 */
export function tilingMaterial(base: THREE.MeshStandardMaterial, repeat: number): THREE.MeshStandardMaterial {
  const m = base.clone();
  m.map = base.map?.clone() ?? null;
  m.normalMap = base.normalMap?.clone() ?? null;
  if (m.map) {
    m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
    m.map.repeat.set(repeat, repeat);
    m.map.needsUpdate = true;
  }
  if (m.normalMap) {
    m.normalMap.wrapS = m.normalMap.wrapT = THREE.RepeatWrapping;
    m.normalMap.repeat.set(repeat, repeat);
    m.normalMap.needsUpdate = true;
  }
  return m;
}
