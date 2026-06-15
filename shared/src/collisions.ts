import { LOCATIONS } from "./locations.js";
import type { LocationDefinition } from "./types.js";

export interface CollisionBox {
  cx: number; cy: number; cz: number;
  hw: number; hh: number; hd: number;
  rotY: number;
}

export interface CollisionCylinder {
  cx: number; cy: number; cz: number;
  r: number; h: number;
}

export type CollisionShape = CollisionBox | CollisionCylinder;

export function isCylinder(s: CollisionShape): s is CollisionCylinder {
  return (s as CollisionCylinder).r !== undefined;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate collision shapes for the major solid structures on an island.
 * Positions match the visual meshes in islandBuilder.ts (seeded RNG for
 * deterministic prop placement).
 */
export function getIslandCollisions(loc: LocationDefinition): CollisionShape[] {
  const shapes: CollisionShape[] = [];
  const px = loc.position.x;
  const pz = loc.position.z;
  const r = loc.radius;

  if (loc.biome === "fort") {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      shapes.push({ cx: px + Math.sin(a) * r * 0.78, cy: 1.7, cz: pz + Math.cos(a) * r * 0.78, hw: 4, hh: 1.7, hd: 0.5, rotY: a });
    }
    shapes.push({ cx: px, cy: 3.5, cz: pz, r: 2.0, h: 8 });
  } else if (loc.biome === "military") {
    shapes.push({ cx: px, cy: 1.4, cz: pz, hw: 3, hh: 1.4, hd: 3, rotY: 0 });
    shapes.push({ cx: px, cy: 4, cz: pz, r: 0.15, h: 8 });
  } else if (loc.biome === "industrial") {
    const rng = mulberry32((loc.position.x * 131 + loc.position.z) | 0);
    for (let i = 0; i < 10; i++) {
      const a = rng() * Math.PI * 2;
      const rr = rng() * r * 0.6;
      shapes.push({ cx: px + Math.sin(a) * rr, cy: 0.4, cz: pz + Math.cos(a) * rr, hw: 0.4, hh: 0.4, hd: 0.4, rotY: rng() * Math.PI });
    }
    for (let i = 0; i < 8; i++) {
      const a = rng() * Math.PI * 2;
      const rr = rng() * r * 0.6;
      shapes.push({ cx: px + Math.sin(a) * rr, cy: 0.45, cz: pz + Math.cos(a) * rr, r: 0.3, h: 0.9 });
    }
    shapes.push({ cx: px + r * 0.4, cy: 6, cz: pz, hw: 0.6, hh: 6, hd: 0.6, rotY: 0 });
    shapes.push({ cx: px - r * 0.35, cy: 0.5, cz: pz + r * 0.3, hw: 4, hh: 1, hd: 8, rotY: 0 });
  } else if (loc.biome === "wreck") {
    const rng = mulberry32((loc.position.x * 131 + loc.position.z) | 0);
    shapes.push({ cx: px, cy: 0.9, cz: pz, hw: 1.7, hh: 0.9, hd: 4.5, rotY: 0 });
    for (let i = 0; i < 6; i++) {
      const cx = (rng() - 0.5) * r;
      const cz = (rng() - 0.5) * r;
      const rotY = rng() * Math.PI;
      rng();
      shapes.push({ cx: px + cx, cy: 1.2, cz: pz + cz, hw: 1.2, hh: 1.2, hd: 3, rotY });
    }
  } else if (loc.biome === "tropical") {
    // RNG consumption must match islandBuilder.ts exactly.
    const rng = mulberry32((loc.position.x * 131 + loc.position.z) | 0);
    // Palm tree trunks (18 trees, 3 rng calls each for position)
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rng() * 0.4;
      const rr = r * (0.15 + rng() * 0.65);
      rng(); // skip rotation
      shapes.push({ cx: px + Math.sin(a) * rr, cy: 2.5, cz: pz + Math.cos(a) * rr, r: 0.25, h: 5 });
    }
    // Grass tufts (60, 2 rng calls each — skip, no collision)
    for (let i = 0; i < 60; i++) {
      rng(); rng();
    }
    // Huts (6, 2 rng calls each)
    for (let i = 0; i < 6; i++) {
      const a = rng() * Math.PI * 2;
      const rr = rng() * r * 0.5;
      shapes.push({ cx: px + Math.sin(a) * rr, cy: 0.8, cz: pz + Math.cos(a) * rr, hw: 1.2, hh: 0.8, hd: 1.2, rotY: 0 });
    }
  }

  return shapes;
}

/**
 * Check if a boat at (x, z) would be on land (too far inside an island).
 * Each island has a shore buffer: boats can enter up to that depth past
 * the waterline for docking, but can't drive deep inland.
 * Safe zones (Haven) get a larger buffer so boats can navigate the harbor.
 */
export function isBoatOnLand(x: number, z: number): boolean {
  for (const loc of Object.values(LOCATIONS)) {
    const dx = x - loc.position.x;
    const dz = z - loc.position.z;
    const limit = loc.radius; // boats cannot cross the shoreline at all
    if (dx * dx + dz * dz < limit * limit) return true;
  }
  return false;
}

let cachedShapes: CollisionShape[] | null = null;

export function getAllCollisionShapes(): CollisionShape[] {
  if (cachedShapes) return cachedShapes;
  cachedShapes = [];
  for (const loc of Object.values(LOCATIONS)) {
    cachedShapes.push(...getIslandCollisions(loc));
  }
  return cachedShapes;
}

/**
 * Check if a circle at (px, pz) with the given radius collides with any shape.
 * XZ-plane only (height ignored) — suitable for player movement.
 */
export function checkCollisionCircle(
  px: number,
  pz: number,
  shapes: CollisionShape[],
  radius: number
): boolean {
  for (const s of shapes) {
    if (isCylinder(s)) {
      const dx = px - s.cx;
      const dz = pz - s.cz;
      const rr = s.r + radius;
      if (dx * dx + dz * dz < rr * rr) return true;
    } else {
      const dx = px - s.cx;
      const dz = pz - s.cz;
      const cos = Math.cos(-s.rotY);
      const sin = Math.sin(-s.rotY);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      const clx = Math.max(-s.hw, Math.min(s.hw, lx));
      const clz = Math.max(-s.hd, Math.min(s.hd, lz));
      const ddx = lx - clx;
      const ddz = lz - clz;
      if (ddx * ddx + ddz * ddz < radius * radius) return true;
    }
  }
  return false;
}

export interface RayHit {
  x: number; y: number; z: number;
  nx: number; ny: number; nz: number;
  dist: number;
}

/**
 * Raycast against collision shapes and the ground plane.
 * The ground plane is at y = GROUND_Y which approximates the average
 * displaced-terrain height so decals land on (not inside) the surface.
 * Returns the nearest hit point with surface normal, or null.
 */
const GROUND_Y = 0.15;

export function raycastEnvironment(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  shapes: CollisionShape[],
  maxDist: number
): RayHit | null {
  let best: RayHit | null = null;

  // Ground plane
  if (dy < -0.001) {
    const t = (GROUND_Y - oy) / dy;
    if (t > 0 && t < maxDist) {
      best = { x: ox + dx * t, y: GROUND_Y, z: oz + dz * t, nx: 0, ny: 1, nz: 0, dist: t };
    }
  }

  for (const s of shapes) {
    if (isCylinder(s)) {
      const rx = ox - s.cx;
      const rz = oz - s.cz;
      const a = dx * dx + dz * dz;
      if (a < 1e-10) continue;
      const b = 2 * (rx * dx + rz * dz);
      const c = rx * rx + rz * rz - s.r * s.r;
      const disc = b * b - 4 * a * c;
      if (disc < 0) continue;
      const sq = Math.sqrt(disc);
      for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) {
        if (t <= 0 || t >= maxDist) continue;
        if (best && t >= best.dist) continue;
        const hy = oy + dy * t;
        if (hy < s.cy - s.h / 2 || hy > s.cy + s.h / 2) continue;
        const hx = ox + dx * t;
        const hz = oz + dz * t;
        best = { x: hx, y: hy, z: hz, nx: (hx - s.cx) / s.r, ny: 0, nz: (hz - s.cz) / s.r, dist: t };
      }
    } else {
      const cos = Math.cos(-s.rotY);
      const sin = Math.sin(-s.rotY);
      const lrx = (ox - s.cx) * cos - (oz - s.cz) * sin;
      const lrz = (ox - s.cx) * sin + (oz - s.cz) * cos;
      const lry = oy - s.cy;
      const ldx = dx * cos - dz * sin;
      const ldz = dx * sin + dz * cos;

      let tmin = 0;
      let tmax = maxDist;

      const slab = (p: number, d: number, e: number): boolean => {
        if (Math.abs(d) < 1e-8) return Math.abs(p) <= e;
        const t1 = (-e - p) / d;
        const t2 = (e - p) / d;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));
        return tmin <= tmax;
      };

      if (!slab(lrx, ldx, s.hw)) continue;
      if (!slab(lry, dy, s.hh)) continue;
      if (!slab(lrz, ldz, s.hd)) continue;

      const t = tmin;
      if (t <= 0 || (best && t >= best.dist)) continue;

      const hx = ox + dx * t;
      const hy = oy + dy * t;
      const hz = oz + dz * t;
      const lhx = (hx - s.cx) * cos - (hz - s.cz) * sin;
      const lhy = hy - s.cy;
      const lhz = (hx - s.cx) * sin + (hz - s.cz) * cos;
      const ex = s.hw - Math.abs(lhx);
      const ey = s.hh - Math.abs(lhy);
      const ez = s.hd - Math.abs(lhz);
      let lnx = 0, lny = 0, lnz = 0;
      if (ex <= ey && ex <= ez) lnx = Math.sign(lhx) || 1;
      else if (ey <= ez) lny = Math.sign(lhy) || 1;
      else lnz = Math.sign(lhz) || 1;
      const wnx = lnx * cos + lnz * sin;
      const wnz = -lnx * sin + lnz * cos;
      best = { x: hx, y: hy, z: hz, nx: wnx, ny: lny, nz: wnz, dist: t };
    }
  }

  return best;
}
