/*
 * Procedural texture generation.
 *
 * Everything here is generated on a 2D canvas so the game ships with zero
 * external assets. Textures are built from deterministic, seeded multi-octave
 * value noise so they tile cleanly and look like real weathered materials
 * instead of flat single-pass random TV-static (which is what the old
 * implementation produced).
 */

// ---------------------------------------------------------------------------
// Seeded RNG + value noise
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hashed lattice gradient in [0,1] for smooth value noise. */
function hash2(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Tileable value noise. `repeat` is the lattice period so output tiles. */
function valueNoise(x: number, y: number, seed: number, repeat: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const wrap = (v: number) => ((v % repeat) + repeat) % repeat;
  const x0 = wrap(xi);
  const x1 = wrap(xi + 1);
  const y0 = wrap(yi);
  const y1 = wrap(yi + 1);

  const v00 = hash2(x0, y0, seed);
  const v10 = hash2(x1, y0, seed);
  const v01 = hash2(x0, y1, seed);
  const v11 = hash2(x1, y1, seed);

  const u = smoothstep(xf);
  const v = smoothstep(yf);
  const a = v00 + (v10 - v00) * u;
  const b = v01 + (v11 - v01) * u;
  return a + (b - a) * v;
}

/** Fractal Brownian motion (layered noise). Tileable when repeat matches. */
export function fbm(
  x: number,
  y: number,
  octaves: number,
  seed: number,
  repeat: number,
  lacunarity = 2.0,
  gain = 0.5
): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + o * 1013, repeat * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------

export function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixColor(c1: number[], c2: number[], t: number): number[] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function rgb(c: number[]): string {
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
}

/**
 * Convert a height field (0..1) into a tangent-space normal map canvas.
 * Strength controls how pronounced the bumpiness appears.
 */
export function heightToNormalCanvas(height: Float32Array, size: number, strength = 2.0): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hl = at(x - 1, y);
      const hr = at(x + 1, y);
      const hd = at(x, y - 1);
      const hu = at(x, y + 1);
      let nx = (hl - hr) * strength;
      let ny = (hd - hu) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const idx = (y * size + x) * 4;
      img.data[idx] = (nx * 0.5 + 0.5) * 255;
      img.data[idx + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[idx + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

interface GeneratedTexture {
  color: HTMLCanvasElement;
  height: Float32Array;
  size: number;
}

/** Paint a height-driven base with two color stops, then return color+height. */
function buildHeightTexture(
  size: number,
  seed: number,
  opts: {
    scale: number;
    octaves: number;
    low: number[];
    high: number[];
    contrast?: number;
    tile: number;
  }
): GeneratedTexture {
  const { canvas, ctx } = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const height = new Float32Array(size * size);
  const contrast = opts.contrast ?? 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * opts.scale * opts.tile;
      const v = (y / size) * opts.scale * opts.tile;
      let n = fbm(u, v, opts.octaves, seed, opts.tile);
      n = Math.pow(n, 1 / contrast);
      height[y * size + x] = n;
      const c = mixColor(opts.low, opts.high, n);
      const idx = (y * size + x) * 4;
      img.data[idx] = c[0];
      img.data[idx + 1] = c[1];
      img.data[idx + 2] = c[2];
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { color: canvas, height, size };
}

// ---------------------------------------------------------------------------
// Material textures
// ---------------------------------------------------------------------------

export function createSandTexture(size = 512): HTMLCanvasElement {
  const gen = buildHeightTexture(size, 1337, {
    scale: 6,
    octaves: 5,
    low: [196, 176, 130],
    high: [236, 222, 182],
    contrast: 1.3,
    tile: 4,
  });
  const { ctx } = makeCanvas(size);
  ctx.drawImage(gen.color, 0, 0);
  // fine speckles
  const rnd = mulberry32(99);
  for (let i = 0; i < size * size * 0.04; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const dark = rnd() > 0.5;
    ctx.fillStyle = dark ? "rgba(150,128,90,0.25)" : "rgba(255,248,225,0.3)";
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  return gen.color;
}

export function createWetSandTexture(size = 512): HTMLCanvasElement {
  const gen = buildHeightTexture(size, 2042, {
    scale: 5,
    octaves: 4,
    low: [120, 104, 78],
    high: [168, 150, 116],
    contrast: 1.4,
    tile: 4,
  });
  return gen.color;
}

export function createGrassTexture(size = 512): HTMLCanvasElement {
  const gen = buildHeightTexture(size, 7777, {
    scale: 5,
    octaves: 5,
    low: [54, 74, 38],
    high: [104, 132, 64],
    contrast: 1.15,
    tile: 4,
  });
  const { ctx } = makeCanvas(size);
  ctx.drawImage(gen.color, 0, 0);
  const rnd = mulberry32(4242);
  // small blade strokes
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const g = 80 + rnd() * 70;
    ctx.strokeStyle = `rgba(${(g * 0.5) | 0},${g | 0},${(g * 0.45) | 0},0.5)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 5, y + 3 + rnd() * 5);
    ctx.stroke();
  }
  // scattered dirt patches
  for (let i = 0; i < 40; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 8 + rnd() * 26;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(90,72,48,0.35)");
    grd.addColorStop(1, "rgba(90,72,48,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return gen.color;
}

export function createRockTexture(size = 512): HTMLCanvasElement {
  const gen = buildHeightTexture(size, 555, {
    scale: 7,
    octaves: 6,
    low: [70, 66, 60],
    high: [150, 142, 130],
    contrast: 1.5,
    tile: 4,
  });
  const { ctx } = makeCanvas(size);
  ctx.drawImage(gen.color, 0, 0);
  const rnd = mulberry32(303);
  // dark cracks
  for (let i = 0; i < 26; i++) {
    let x = rnd() * size;
    let y = rnd() * size;
    ctx.strokeStyle = "rgba(30,28,26,0.55)";
    ctx.lineWidth = 1 + rnd() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 6 + ((rnd() * 8) | 0);
    for (let s = 0; s < steps; s++) {
      x += (rnd() - 0.5) * 40;
      y += (rnd() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return gen.color;
}

export function createWeatheredWoodTexture(size = 512): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size);
  // plank base
  const planks = 5;
  const ph = size / planks;
  const rnd = mulberry32(88);
  for (let p = 0; p < planks; p++) {
    const base = 90 + rnd() * 24;
    const r = base + 18;
    const g = base;
    const b = base - 28;
    ctx.fillStyle = rgb([r, g, b]);
    ctx.fillRect(0, p * ph, size, ph);
    // grain lines
    for (let i = 0; i < 60; i++) {
      const y = p * ph + rnd() * ph;
      const dark = rnd() > 0.5;
      ctx.strokeStyle = dark ? "rgba(50,36,22,0.28)" : "rgba(170,140,96,0.18)";
      ctx.lineWidth = 0.6 + rnd() * 1.1;
      ctx.beginPath();
      let yy = y;
      ctx.moveTo(0, yy);
      for (let x = 0; x < size; x += 14) {
        yy += (rnd() - 0.5) * 2.2;
        ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // dark gap between planks
    ctx.fillStyle = "rgba(20,14,8,0.85)";
    ctx.fillRect(0, p * ph, size, 2);
  }
  // knots + cracks + nails
  for (let i = 0; i < 18; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 3 + rnd() * 7;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(30,20,10,0.7)");
    grd.addColorStop(1, "rgba(30,20,10,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

export function createRustedMetalTexture(size = 512): HTMLCanvasElement {
  const gen = buildHeightTexture(size, 314, {
    scale: 6,
    octaves: 6,
    low: [44, 42, 44],
    high: [96, 92, 96],
    contrast: 1.4,
    tile: 4,
  });
  const { ctx } = makeCanvas(size);
  ctx.drawImage(gen.color, 0, 0);
  const rnd = mulberry32(7171);
  // orange rust blooms
  for (let i = 0; i < 60; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 6 + rnd() * 34;
    const intensity = 0.3 + rnd() * 0.5;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    const rr = 150 + rnd() * 60;
    grd.addColorStop(0, `rgba(${rr | 0},${(rr * 0.45) | 0},${(rr * 0.18) | 0},${intensity})`);
    grd.addColorStop(0.7, `rgba(${(rr * 0.7) | 0},${(rr * 0.35) | 0},${(rr * 0.12) | 0},${intensity * 0.5})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // scratches revealing bright metal
  ctx.strokeStyle = "rgba(190,188,185,0.25)";
  for (let i = 0; i < 90; i++) {
    ctx.lineWidth = 0.5 + rnd() * 0.8;
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 10 + rnd() * 50;
    const a = rnd() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  // rivets
  for (let i = 0; i < 24; i++) {
    const x = 16 + rnd() * (size - 32);
    const y = 16 + rnd() * (size - 32);
    const grd = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 3);
    grd.addColorStop(0, "rgba(180,178,175,0.8)");
    grd.addColorStop(1, "rgba(30,28,28,0.8)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return gen.color;
}

export function createCanvasClothTexture(size = 512): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = "#c8b896";
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(212);
  // woven crosshatch
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < size; i += 3) {
    ctx.strokeStyle = i % 6 === 0 ? "#6a5a3c" : "#9c8a64";
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // dirt stains
  for (let i = 0; i < 24; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 14 + rnd() * 50;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(70,55,32,0.25)");
    grd.addColorStop(1, "rgba(70,55,32,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

export function createConcreteTexture(size = 512): HTMLCanvasElement {
  const gen = buildHeightTexture(size, 909, {
    scale: 6,
    octaves: 6,
    low: [96, 96, 100],
    high: [168, 166, 164],
    contrast: 1.35,
    tile: 4,
  });
  const { ctx } = makeCanvas(size);
  ctx.drawImage(gen.color, 0, 0);
  const rnd = mulberry32(646);
  // cracks
  for (let i = 0; i < 18; i++) {
    let x = rnd() * size;
    let y = rnd() * size;
    ctx.strokeStyle = "rgba(40,40,44,0.6)";
    ctx.lineWidth = 0.8 + rnd() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 5 + ((rnd() * 8) | 0);
    for (let s = 0; s < steps; s++) {
      x += (rnd() - 0.5) * 48;
      y += (rnd() - 0.5) * 48;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // moss patches
  for (let i = 0; i < 30; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 6 + rnd() * 22;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(64,86,46,0.35)");
    grd.addColorStop(1, "rgba(64,86,46,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // water stains
  for (let i = 0; i < 12; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 20 + rnd() * 60;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(40,46,52,0.25)");
    grd.addColorStop(1, "rgba(40,46,52,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return gen.color;
}

export function createGunmetalTexture(size = 512): HTMLCanvasElement {
  const gen = buildHeightTexture(size, 424, {
    scale: 8,
    octaves: 5,
    low: [42, 44, 48],
    high: [86, 88, 94],
    contrast: 1.6,
    tile: 4,
  });
  const { ctx } = makeCanvas(size);
  ctx.drawImage(gen.color, 0, 0);
  const rnd = mulberry32(58);
  // edge wear / bright scratches
  for (let i = 0; i < 120; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 4 + rnd() * 26;
    const a = rnd() * Math.PI;
    ctx.strokeStyle = `rgba(170,172,176,${0.15 + rnd() * 0.25})`;
    ctx.lineWidth = 0.4 + rnd() * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  // rust near seams
  for (let i = 0; i < 12; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 4 + rnd() * 10;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(120,64,28,0.4)");
    grd.addColorStop(1, "rgba(120,64,28,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return gen.color;
}

export function createScrapPaintTexture(size = 512): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size);
  // painted base with subtle noise
  const gen = buildHeightTexture(size, 1188, {
    scale: 7,
    octaves: 5,
    low: [54, 70, 84],
    high: [78, 96, 112],
    contrast: 1.2,
    tile: 4,
  });
  ctx.drawImage(gen.color, 0, 0);
  const rnd = mulberry32(9000);
  // chipped paint exposing rust
  for (let i = 0; i < 140; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 2 + rnd() * 12;
    const rr = 120 + rnd() * 60;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(${rr | 0},${(rr * 0.45) | 0},${(rr * 0.18) | 0},0.85)`);
    grd.addColorStop(0.7, `rgba(60,58,58,0.5)`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // scuff streaks
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = "rgba(200,200,200,0.12)";
    ctx.lineWidth = 0.5;
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 8 + rnd() * 30;
    const a = rnd() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  return canvas;
}

export function createCrateTexture(size = 512): HTMLCanvasElement {
  const wood = createWeatheredWoodTexture(size);
  const { ctx } = makeCanvas(size);
  ctx.drawImage(wood, 0, 0);
  // metal corner bands
  ctx.fillStyle = "rgba(60,58,60,0.9)";
  ctx.fillRect(0, 0, size, 16);
  ctx.fillRect(0, size - 16, size, 16);
  ctx.fillRect(0, 0, 16, size);
  ctx.fillRect(size - 16, 0, 16, size);
  // stenciled marking
  ctx.fillStyle = "rgba(220,200,120,0.85)";
  ctx.font = "bold 56px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SUPPLY", size / 2, size / 2 + 8);
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "rgba(180,160,90,0.8)";
  ctx.fillText("• TC-7 •", size / 2, size / 2 + 40);
  return ctx.canvas;
}

export function createBarrelTexture(size = 512): HTMLCanvasElement {
  const metal = createRustedMetalTexture(size);
  const { ctx } = makeCanvas(size);
  ctx.drawImage(metal, 0, 0);
  // reinforcing rings
  ctx.fillStyle = "rgba(30,28,28,0.7)";
  ctx.fillRect(0, size * 0.18, size, 10);
  ctx.fillRect(0, size * 0.82, size, 10);
  // hazard band
  for (let x = 0; x < size; x += 24) {
    ctx.fillStyle = (x / 24) % 2 === 0 ? "rgba(220,170,40,0.85)" : "rgba(30,30,30,0.85)";
    ctx.fillRect(x, size * 0.45, 24, 26);
  }
  return ctx.canvas;
}

// ---------------------------------------------------------------------------
// Water + foam
// ---------------------------------------------------------------------------

export function createWaterNormalTexture(size = 512): HTMLCanvasElement {
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 8;
      const v = (y / size) * 8;
      height[y * size + x] = fbm(u, v, 4, 2024, 8);
    }
  }
  return heightToNormalCanvas(height, size, 2.5);
}

export function createFoamTexture(size = 256): HTMLCanvasElement {
  const gen = buildHeightTexture(size, 333, {
    scale: 6,
    octaves: 5,
    low: [255, 255, 255],
    high: [255, 255, 255],
    tile: 4,
  });
  const { ctx } = makeCanvas(size);
  ctx.drawImage(gen.color, 0, 0);
  return gen.color;
}

/** Build a tangent-space normal map from an fbm height field. */
export function createFbmNormalTexture(
  size: number,
  seed: number,
  scale: number,
  octaves: number,
  tile: number,
  strength = 2.0
): HTMLCanvasElement {
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * scale * tile;
      const v = (y / size) * scale * tile;
      height[y * size + x] = fbm(u, v, octaves, seed, tile);
    }
  }
  return heightToNormalCanvas(height, size, strength);
}
