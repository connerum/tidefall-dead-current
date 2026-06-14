import * as THREE from "three";

/**
 * Stylised animated ocean. Uses Gerstner waves (sum of directional waves with
 * horizontal displacement) for sharper crests and rounded troughs instead of
 * plain sines, then shades the surface with:
 *  - a deep/shallow colour gradient driven by wave height
 *  - a subsurface light bleed on crests (warm cyan-green glow)
 *  - a strong sun specular plus high-frequency sun glitter
 *  - noise-streaked foam on the tallest crests
 *  - distance haze toward the horizon
 * All work is done on the GPU; the mesh vertices are never touched per frame.
 */

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying float vWave;
  varying vec3 vNormalW;

  // 6 Gerstner waves spanning a wide range of sizes and speeds for richer,
  // more varied ocean motion. Parameters must stay in sync with water.ts.
  const vec2 D1 = normalize(vec2( 1.0,  0.35));
  const vec2 D2 = normalize(vec2(-0.55, 1.0));
  const vec2 D3 = normalize(vec2( 0.35,-1.0));
  const vec2 D4 = normalize(vec2( 1.0,  0.85));
  const vec2 D5 = normalize(vec2(-0.8, -0.5));
  const vec2 D6 = normalize(vec2( 0.6,  1.0));

  // Returns the full positional displacement (dx, dy, dz) at world xz.
  vec3 gerstner(vec2 p, float t, out float crest){
    crest = 0.0;
    vec3 d = vec3(0.0);

    // Amplitudes sum to ~0.43 so crests stay below the island ground plane.
    float w1 = 0.08, A1 = 0.16, Q1 = 0.70, s1 = 0.65;
    float ph1 = w1 * dot(D1, p) + t * s1;
    d.x += Q1 * A1 * D1.x * cos(ph1);
    d.z += Q1 * A1 * D1.y * cos(ph1);
    d.y += A1 * sin(ph1);
    crest += 0.5 + 0.5 * sin(ph1);

    float w2 = 0.14, A2 = 0.12, Q2 = 0.60, s2 = 1.00;
    float ph2 = w2 * dot(D2, p) + t * s2;
    d.x += Q2 * A2 * D2.x * cos(ph2);
    d.z += Q2 * A2 * D2.y * cos(ph2);
    d.y += A2 * sin(ph2);
    crest += 0.5 + 0.5 * sin(ph2);

    float w3 = 0.24, A3 = 0.08, Q3 = 0.50, s3 = 1.50;
    float ph3 = w3 * dot(D3, p) + t * s3;
    d.x += Q3 * A3 * D3.x * cos(ph3);
    d.z += Q3 * A3 * D3.y * cos(ph3);
    d.y += A3 * sin(ph3);

    float w4 = 0.36, A4 = 0.04, Q4 = 0.40, s4 = 2.10;
    float ph4 = w4 * dot(D4, p) + t * s4;
    d.x += Q4 * A4 * D4.x * cos(ph4);
    d.z += Q4 * A4 * D4.y * cos(ph4);
    d.y += A4 * sin(ph4);

    float w5 = 0.50, A5 = 0.02, Q5 = 0.35, s5 = 2.80;
    float ph5 = w5 * dot(D5, p) + t * s5;
    d.x += Q5 * A5 * D5.x * cos(ph5);
    d.z += Q5 * A5 * D5.y * cos(ph5);
    d.y += A5 * sin(ph5);

    float w6 = 0.70, A6 = 0.01, Q6 = 0.30, s6 = 3.50;
    float ph6 = w6 * dot(D6, p) + t * s6;
    d.x += Q6 * A6 * D6.x * cos(ph6);
    d.z += Q6 * A6 * D6.y * cos(ph6);
    d.y += A6 * sin(ph6);

    return d;
  }

  void main(){
    vec2 p = position.xz;
    float c;
    vec3 d = gerstner(p, uTime, c);
    vec3 pos = vec3(p.x + d.x, d.y, p.y + d.z);
    vWave = d.y;

    // normal via finite differences of the displaced surface
    float e = 1.5;
    float c1, c2;
    vec3 dx = gerstner(p + vec2(e, 0.0), uTime, c1) - d;
    vec3 dz = gerstner(p + vec2(0.0, e), uTime, c2) - d;
    // tangents include the step itself
    vec3 tx = vec3(e + dx.x, dx.y, dx.z);
    vec3 tz = vec3(dz.x, dz.y, e + dz.z);
    vNormalW = normalize(cross(tz, tx));

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uCamPos;
  uniform vec3 uHorizon;
  uniform float uStorm;
  varying vec3 vWorldPos;
  varying float vWave;
  varying vec3 vNormalW;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++){ v += a * vnoise(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main(){
    vec3 n = normalize(vNormalW);
    vec3 viewDir = normalize(uCamPos - vWorldPos);

    // fine ripple detail perturbing the normal
    float r = fbm(vWorldPos.xz * 0.7 + uTime * 0.2);
    vec3 rip = vec3(fbm(vWorldPos.xz * 1.8 - uTime * 0.3) - 0.5, 0.0, r - 0.5);
    n = normalize(n + rip * 0.18);

    // base colour from wave height (crests = shallower/brighter)
    float t = clamp(vWave * 0.9 + 0.5, 0.0, 1.0);
    vec3 col = mix(uDeep, uShallow, t);

    // subsurface light bleed: warm cyan glow on the tall crests
    float sss = smoothstep(0.18, 0.42, vWave);
    col += vec3(0.10, 0.32, 0.30) * sss * 0.5;

    // fresnel rim
    float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 4.0);
    col = mix(col, vec3(0.62, 0.78, 0.86), fres * 0.6);

    // sun specular (broad) + glitter (sharp high-freq sparkles)
    vec3 h = normalize(uSunDir + viewDir);
    float spec = pow(max(dot(n, h), 0.0), 120.0);
    float glitter = step(0.92, hash(floor(vWorldPos.xz * 3.0 + uTime * 4.0)));
    col += uSunColor * (spec * 0.9 + glitter * 0.15 * max(dot(n, h), 0.0));

    // foam: streaked noise on the highest crests
    float foamN = fbm(vWorldPos.xz * 1.5 + uTime * 0.4);
    float foam = smoothstep(0.45, 0.8, vWave * 0.7 + foamN * 0.5);
    col = mix(col, vec3(0.94, 0.97, 1.0), foam * 0.6);

    // distance haze toward the horizon
    float dist = length(uCamPos - vWorldPos);
    float haze = smoothstep(400.0, 1400.0, dist);
    col = mix(col, uHorizon, haze * 0.55);

    // storm-wall darkening / desaturation
    col = mix(col, col * vec3(0.55, 0.5, 0.62), uStorm);

    gl_FragColor = vec4(col, 0.92);
  }
`;

export function createOcean(size: number): THREE.Mesh {
  // Higher tessellation so the Gerstner displacement has enough vertices to
  // resolve the wave detail, especially near the camera-sized centre.
  const geometry = new THREE.PlaneGeometry(size, size, 256, 256);
  geometry.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(0x35b6cc) },
      uDeep: { value: new THREE.Color(0x08263e) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() },
      uSunColor: { value: new THREE.Color(0xfff2d8) },
      uCamPos: { value: new THREE.Vector3() },
      uHorizon: { value: new THREE.Color(0xbcd2dc) },
      uStorm: { value: 0.0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.y = -0.5;
  mesh.frustumCulled = false; // it is the whole sea; never cull it
  return mesh;
}

export function updateWater(mesh: THREE.Mesh, time: number, camera?: THREE.Camera, storm = 0): void {
  const mat = mesh.material as THREE.ShaderMaterial;
  const u = mat.uniforms;
  u.uTime.value = time;
  if (camera) u.uCamPos.value.copy(camera.position);
  u.uStorm.value = storm;
}

// Wave parameters must stay in sync with the vertex shader's gerstner().
const WAVES = [
  { D: new THREE.Vector2(1.0, 0.35).normalize(), w: 0.08, A: 0.16, Q: 0.70, s: 0.65 },
  { D: new THREE.Vector2(-0.55, 1.0).normalize(), w: 0.14, A: 0.12, Q: 0.60, s: 1.00 },
  { D: new THREE.Vector2(0.35, -1.0).normalize(), w: 0.24, A: 0.08, Q: 0.50, s: 1.50 },
  { D: new THREE.Vector2(1.0, 0.85).normalize(), w: 0.36, A: 0.04, Q: 0.40, s: 2.10 },
  { D: new THREE.Vector2(-0.8, -0.5).normalize(), w: 0.50, A: 0.02, Q: 0.35, s: 2.80 },
  { D: new THREE.Vector2(0.6, 1.0).normalize(), w: 0.70, A: 0.01, Q: 0.30, s: 3.50 },
];

function gerstnerDisplacement(x: number, z: number, t: number): THREE.Vector3 {
  const d = new THREE.Vector3();
  for (const wave of WAVES) {
    const ph = wave.w * (wave.D.x * x + wave.D.y * z) + t * wave.s;
    const c = Math.cos(ph);
    const s = Math.sin(ph);
    d.x += wave.Q * wave.A * wave.D.x * c;
    d.z += wave.Q * wave.A * wave.D.y * c;
    d.y += wave.A * s;
  }
  return d;
}

/**
 * Sample the same Gerstner waves used by the ocean shader on the CPU so
 * boats can bob and tilt with the surface.
 */
export function getWaveDisplacement(
  x: number,
  z: number,
  time: number
): { y: number; normal: THREE.Vector3 } {
  const d = gerstnerDisplacement(x, z, time);

  // Normal via finite differences — matches the shader exactly.
  const e = 1.5;
  const ddx = gerstnerDisplacement(x + e, z, time).sub(d);
  const ddz = gerstnerDisplacement(x, z + e, time).sub(d);
  const tx = new THREE.Vector3(e + ddx.x, ddx.y, ddx.z);
  const tz = new THREE.Vector3(ddz.x, ddz.y, e + ddz.z);
  const normal = new THREE.Vector3().crossVectors(tz, tx).normalize();

  return { y: d.y, normal };
}
