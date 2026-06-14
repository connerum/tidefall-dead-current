import * as THREE from "three";

/**
 * Stylised animated ocean rendered as a single large plane with a custom
 * ShaderMaterial. Waves are displaced on the GPU and the surface mixes a
 * shallow turquoise with a deep blue based on wave height, adds a scrolling
 * ripple detail layer and a sun specular highlight. Far cheaper and far
 * better looking than the old flat-blue material + per-frame CPU vertex loop.
 */

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying float vWave;
  varying vec3 vNormalW;

  // sum-of-sines swell
  float waveHeight(vec2 p) {
    float h = 0.0;
    h += sin(p.x * 0.045 + uTime * 0.9) * 0.45;
    h += sin(p.y * 0.06 - uTime * 0.7) * 0.40;
    h += sin((p.x + p.y) * 0.09 + uTime * 1.3) * 0.18;
    h += sin((p.x - p.y) * 0.13 - uTime * 1.7) * 0.10;
    return h;
  }

  void main() {
    vec3 pos = position;
    float h = waveHeight(pos.xz);
    pos.y += h;
    vWave = h;

    // approximate normal from finite differences of the wave field
    float e = 2.0;
    float hx = waveHeight(pos.xz + vec2(e, 0.0));
    float hz = waveHeight(pos.xz + vec2(0.0, e));
    vec3 n = normalize(vec3((h - hx) / e, 1.0, (h - hz) / e));
    vNormalW = n;

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
  uniform float uStorm;
  varying vec3 vWorldPos;
  varying float vWave;
  varying vec3 vNormalW;

  // cheap hash-based 2D noise for sparkle/ripple detail
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

  void main() {
    vec3 n = normalize(vNormalW);

    // scrolling ripple detail perturbs the normal a touch
    float ripple = vnoise(vWorldPos.xz * 0.6 + uTime * 0.25)
                 + vnoise(vWorldPos.xz * 1.3 - uTime * 0.35) * 0.5;
    n.xz += (ripple - 0.5) * 0.25;
    n = normalize(n);

    // colour: higher wave crests read as shallower / foam-tinted
    float t = clamp(vWave * 0.7 + 0.5, 0.0, 1.0);
    vec3 col = mix(uDeep, uShallow, t);

    // fresnel for that water rim look at grazing angles
    vec3 viewDir = normalize(uCamPos - vWorldPos);
    float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    col = mix(col, vec3(0.55, 0.75, 0.85), fres * 0.5);

    // sun specular
    vec3 h = normalize(uSunDir + viewDir);
    float spec = pow(max(dot(n, h), 0.0), 80.0);
    col += uSunColor * spec * 0.8;

    // foam on the tallest crests
    float foam = smoothstep(0.7, 1.0, vWave + ripple * 0.25);
    col = mix(col, vec3(0.92, 0.96, 1.0), foam * 0.5);

    // darken + desaturate toward the storm wall
    col = mix(col, col * vec3(0.55, 0.5, 0.6), uStorm);

    gl_FragColor = vec4(col, 0.9);
  }
`;

export function createOcean(size: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(size, size, 200, 200);
  geometry.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(0x2fa9c4) },
      uDeep: { value: new THREE.Color(0x0a2a44) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() },
      uSunColor: { value: new THREE.Color(0xfff2d8) },
      uCamPos: { value: new THREE.Vector3() },
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
