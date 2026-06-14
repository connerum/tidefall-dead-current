import * as THREE from "three";
import {
  createSandTexture,
  createGrassTexture,
  createRockTexture,
  createWeatheredWoodTexture,
  createRustedMetalTexture,
  createCanvasClothTexture,
  createConcreteTexture,
  createGunmetalTexture,
  createScrapPaintTexture,
  createCrateTexture,
  createWaterNormalTexture,
} from "./textures.js";

function tex(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const materials = {
  sand: new THREE.MeshStandardMaterial({ map: tex(createSandTexture()), roughness: 0.9 }),
  wetSand: new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.6 }),
  grass: new THREE.MeshStandardMaterial({ map: tex(createGrassTexture()), roughness: 0.9 }),
  rock: new THREE.MeshStandardMaterial({ map: tex(createRockTexture()), roughness: 0.85 }),
  weatheredWood: new THREE.MeshStandardMaterial({ map: tex(createWeatheredWoodTexture()), roughness: 0.8 }),
  rustedMetal: new THREE.MeshStandardMaterial({ map: tex(createRustedMetalTexture()), roughness: 0.6, metalness: 0.5 }),
  canvas: new THREE.MeshStandardMaterial({ map: tex(createCanvasClothTexture()), roughness: 0.9, side: THREE.DoubleSide }),
  concrete: new THREE.MeshStandardMaterial({ map: tex(createConcreteTexture()), roughness: 0.9 }),
  gunmetal: new THREE.MeshStandardMaterial({ map: tex(createGunmetalTexture()), roughness: 0.4, metalness: 0.7 }),
  scrapPaint: new THREE.MeshStandardMaterial({ map: tex(createScrapPaintTexture()), roughness: 0.6 }),
  crate: new THREE.MeshStandardMaterial({ map: tex(createCrateTexture()), roughness: 0.8 }),
  water: new THREE.MeshStandardMaterial({
    color: 0x1a6b8a,
    transparent: true,
    opacity: 0.85,
    roughness: 0.1,
    metalness: 0.2,
  }),
  safeZoneGlow: new THREE.MeshBasicMaterial({ color: 0x22aaff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false }),
  machineGlow: new THREE.MeshBasicMaterial({ color: 0x33ccff, transparent: true, opacity: 0.8 }),
  dangerGlow: new THREE.MeshBasicMaterial({ color: 0xff3322, transparent: true, opacity: 0.8 }),
  stormFog: new THREE.MeshBasicMaterial({ color: 0x2a2a35, transparent: true, opacity: 0.5, side: THREE.BackSide }),
};
