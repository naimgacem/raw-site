// "The Weave" — three of the RAW octopus's arms rise through the violet water of the hero,
// plaited into a three-strand braid, then let go near the top and curl like the arms in the logo.
// Rendered offline, frame by frame:
//   * thin-lens depth of field by accumulation (the camera is jittered across an aperture and
//     every frame is the average of many renders), so the blur is photographic, not a filter;
//   * everything that moves is periodic in the loop phase, so the video loops without a seam.
// Driven by tools/weave-video.mjs.
import * as THREE from "three";

const TAU = Math.PI * 2;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/* ------------------------------------------------------------- the arms */
// Three arms rise from below: plaited tight where they're thick, the plait shrinking with them,
// and near the top they let go and curl like the arms in the RAW logo. Rebuilt every frame.
const A = {
  bottom: -4.8, // where the arms enter, below the frame
  split: 0.55, // height where the plait lets go
  r0: 0.36, // radius at the bottom
  tipLen: 2.6, // length of each free tip
  seg: 760, // samples per arm
  ring: 44,
  braidShare: 0.68, // part of each arm's samples spent in the plait
};
const RATIO = 0.356; // arm radius ÷ plait width that keeps three strands just touching (measured)
const ZRATIO = 0.5625; // over/under depth ÷ width (a flat plait)
const PER_W = 4.25; // repeat length ÷ width

const radiusAt = (u) => A.r0 * Math.pow(1 - u, 0.72) * 0.97 + 0.005;

// skin relief that belongs to the arm (material coordinates), so it never swims
function makeBumps(seed, n, amp) {
  const r = rng(seed);
  const terms = Array.from({ length: n }, (_, i) => [3 + r() * (20 + i * 9), (1 + Math.floor(r() * 3)) * (r() < 0.5 ? -1 : 1), r() * TAU, (amp * (0.4 + 0.6 * r())) / Math.sqrt(i + 1)]);
  return (s, t) => {
    let v = 0;
    for (const [a, b, ph, w] of terms) v += w * Math.sin(a * s + b * t + ph);
    return v;
  };
}

const ROT = new THREE.Quaternion();
function rotateAbout(v, axis, angle) {
  return v.applyQuaternion(ROT.setFromAxisAngle(axis, angle));
}

// centre line, oral direction and radius of every sample of arm k at loop phase τ
function armPath(k, phase) {
  const a = phase * TAU;
  const N = A.seg;
  const nb = Math.round(N * A.braidShare);
  const pts = [], oral = [], rad = [], tex = [];
  const up = V(0, 1, 0);
  const axis = (y) => {
    const g = THREE.MathUtils.smoothstep(y, A.bottom, A.split + 1.5);
    return V(0.18 * g * Math.sin(0.9 * y - a + 0.5), y, 0.12 * g * Math.sin(0.7 * y - a + 2.0));
  };

  // 1) the plait: phase accumulates faster as the arms thin, so it stays tight to the end
  let p = 0;
  let splitOffset = V();
  for (let i = 0; i <= nb; i++) {
    const u = (i / nb) * A.braidShare;
    const y = A.bottom + (A.split - A.bottom) * (i / nb);
    const r = radiusAt(u);
    const w = r / RATIO;
    if (i > 0) p += (TAU / (PER_W * w)) * ((A.split - A.bottom) / nb);
    const pk = p + (TAU * k) / 3;
    const off = V(w * Math.sin(pk), 0, w * ZRATIO * Math.sin(2 * pk));
    pts.push(axis(y).add(off));
    rad.push(r);
    oral.push(null); // filled below once tangents are known
    if (i === nb) splitOffset = off;
  }

  // 2) the free tip: march along a curl in the plane of "up" and this arm's outward direction
  const base = pts[nb].clone();
  // left-forward, right-forward, and one reaching up and back to the right — each curl faces the camera
  const spread = [Math.PI - 0.55, 0.45, -1.0][k] + 0.18 * Math.sin(a + k * 2.09);
  const out = V(Math.cos(spread), 0, Math.sin(spread));
  const curl = [3.4, 3.6, 2.7][k] + 0.85 * Math.sin(a + k * 2.09 + 0.6);
  const tipLen = [2.5, 2.3, 3.0][k];
  const lift = 0.35 + 0.15 * Math.sin(a + k); // tips lean outward a little before curling
  let h = 0, rr = 0;
  const nt = N - nb;
  const ds = tipLen / nt;
  for (let i = 1; i <= nt; i++) {
    const v = i / nt;
    const th = lift * Math.sin(Math.min(1, v * 3) * Math.PI * 0.5) + curl * Math.pow(v, 1.7);
    h += Math.cos(th) * ds;
    rr += Math.sin(th) * ds;
    const u = A.braidShare + (1 - A.braidShare) * v;
    // the braid offset eases toward the arm's own outward line as it frees itself
    const ease = THREE.MathUtils.smoothstep(v, 0, 0.35);
    const pos = base.clone().addScaledVector(up, h).addScaledVector(out, rr).addScaledVector(splitOffset, -0.35 * ease);
    pts.push(pos);
    rad.push(radiusAt(u));
    // inside of the curl: where the suckers face
    oral.push(V().addScaledVector(up, -Math.sin(th)).addScaledVector(out, Math.cos(th)).normalize());
  }

  // tangents + a continuous oral direction (toward the viewer in the plait, inside the curl at the tip)
  const T = pts.map((_, i) => V().subVectors(pts[Math.min(i + 1, N)], pts[Math.max(i - 1, 0)]).normalize());
  const Z = V(0, 0, 1);
  let len = 0;
  for (let i = 0; i <= N; i++) {
    if (i > 0) len += pts[i].distanceTo(pts[i - 1]) / Math.max(rad[i], 0.05);
    tex.push(len);
    const z = Z.clone().addScaledVector(T[i], -T[i].dot(Z)).normalize();
    const twist = 0.8 * Math.sin(i * 0.011 + k * 2.1);
    rotateAbout(z, T[i], twist);
    if (i <= nb) oral[i] = z;
    else {
      const v = (i - nb) / nt;
      const blend = THREE.MathUtils.smoothstep(v, 0, 0.22);
      const o = oral[i].clone().addScaledVector(T[i], -oral[i].dot(T[i])).normalize();
      oral[i] = z.lerp(o, blend).normalize();
    }
  }
  return { pts, T, oral, rad, tex };
}

function armMesh(k) {
  const N = A.seg, R = A.ring;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((N + 1) * (R + 1) * 3), 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((N + 1) * (R + 1) * 2), 2));
  const idx = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < R; j++) {
      const a = i * (R + 1) + j, b = a + R + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  g.setIndex(idx);
  return { g, big: makeBumps(11 + k * 7, 8, 0.028), fine: makeBumps(91 + k * 13, 12, 0.008) };
}

function updateArm(arm, path) {
  const { g, big, fine } = arm;
  const N = A.seg, R = A.ring;
  const pos = g.attributes.position.array, uv = g.attributes.uv.array;
  const O = V(), Q = V(), dir = V();
  for (let i = 0; i <= N; i++) {
    const C = path.pts[i], T = path.T[i];
    O.copy(path.oral[i]);
    Q.crossVectors(T, O);
    const s = path.tex[i] * 0.12;
    for (let j = 0; j <= R; j++) {
      const th = (j / R) * TAU;
      dir.copy(O).multiplyScalar(Math.cos(th)).addScaledVector(Q, Math.sin(th));
      const oralness = Math.pow(Math.max(0, Math.cos(th)), 3);
      const rr = path.rad[i] * (1 - 0.14 * oralness + big(s, th) + fine(s * 3, th) * (1 - oralness));
      const o = (i * (R + 1) + j) * 3;
      pos[o] = C.x + dir.x * rr; pos[o + 1] = C.y + dir.y * rr; pos[o + 2] = C.z + dir.z * rr;
      const t = (i * (R + 1) + j) * 2;
      uv[t] = path.tex[i] / 9; // skin pattern scales with the arm
      uv[t + 1] = j / R;
    }
  }
  g.attributes.position.needsUpdate = true;
  g.attributes.uv.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
}

// suckers: fixed places along each arm (in arm coordinates), spaced by the arm's thickness
function suckerSlots() {
  const slots = [];
  for (let k = 0; k < 3; k++) {
    let acc = 0, n = 0;
    for (let i = 1; i <= A.seg; i++) {
      const u = i / A.seg;
      acc += 1 / (A.seg * radiusAt(u) * 0.11); // ~ one sucker per 0.55 radius of arm
      while (acc >= 1) {
        acc -= 1;
        if (u > 0.985) continue;
        slots.push({ k, i, side: n++ % 2 ? 1 : -1 });
      }
    }
  }
  return slots;
}

function suckerGeometry() {
  // a raised cup with a small pit (lathe profile, radius 1, axis +y)
  const prof = [
    [0.0, 0.2], [0.12, 0.2], [0.24, 0.24], [0.34, 0.33], [0.5, 0.38], [0.7, 0.37],
    [0.86, 0.32], [0.97, 0.2], [1.02, 0.04], [1.05, -0.12], [1.2, -0.3],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(prof, 32);
  const col = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < g.attributes.position.count; i++) {
    const x = g.attributes.position.getX(i), z = g.attributes.position.getZ(i);
    const c = THREE.MathUtils.smoothstep(Math.sqrt(x * x + z * z), 0.14, 0.4);
    col[i * 3] = 0.5 + 0.5 * c;
    col[i * 3 + 1] = 0.28 + 0.62 * c;
    col[i * 3 + 2] = 0.42 + 0.5 * c;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

/* ---------------------------------------------------------------- skin */
// tileable mottled skin: dark violet-black with chromatophore speckles and soft blotches
function skinTextures() {
  const w = 1024, h = 256;
  const r = rng(5);
  // tileable: every wave has whole-number frequencies across the texture
  const waves = Array.from({ length: 34 }, (_, i) => {
    const fu = 1 + Math.floor(r() * (6 + i * 1.6)), fv = Math.floor(r() * (3 + i * 0.5)) * (r() < 0.5 ? -1 : 1);
    return [fu, fv, r() * TAU, 1 / (1 + i * 0.35)];
  });
  const height = new Float32Array(w * h);
  let lo = 1e9, hi = -1e9;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (const [fu, fv, ph, a] of waves) v += a * Math.sin(TAU * (fu * x / w + fv * y / h) + ph);
      height[y * w + x] = v;
      lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
  }
  for (let i = 0; i < height.length; i++) height[i] = (height[i] - lo) / (hi - lo);
  const color = document.createElement("canvas");
  color.width = w; color.height = h;
  const cx = color.getContext("2d");
  const img = cx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const t = Math.pow(height[i], 1.4);
    const y = Math.floor(i / w) / h;
    const under = THREE.MathUtils.smoothstep(Math.cos(y * TAU), 0.35, 0.95); // the underside is paler
    img.data[i * 4] = 26 + 70 * t + 120 * under;
    img.data[i * 4 + 1] = 10 + 24 * t + 72 * under;
    img.data[i * 4 + 2] = 38 + 74 * t + 108 * under;
    img.data[i * 4 + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
  // chromatophores: small soft dots, drawn wrapped so the texture still tiles
  for (let k = 0; k < 1400; k++) {
    const x = r() * w, y = r() * h, rad = 1.2 + 2.6 * r() * r();
    const dark = r() < 0.55;
    for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
      const g = cx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
      g.addColorStop(0, dark ? "rgba(10,2,16,0.55)" : "rgba(170,110,210,0.35)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      cx.fillStyle = g;
      cx.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
    }
  }
  const nrm = document.createElement("canvas");
  nrm.width = w; nrm.height = h;
  const nx = nrm.getContext("2d");
  const nimg = nx.createImageData(w, h);
  const H = (x, y) => height[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * 6, dy = (H(x, y + 1) - H(x, y - 1)) * 6;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      nimg.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      nimg.data[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
      nimg.data[i + 2] = (1 / l) * 0.5 * 255 + 127;
      nimg.data[i + 3] = 255;
    }
  }
  nx.putImageData(nimg, 0, 0);
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = new THREE.CanvasTexture(nrm);
  for (const t of [map, normalMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
    t.anisotropy = 8;
  }
  return { map, normalMap };
}

/* ------------------------------------------------------- what the skin reflects */
function waterEnvironment() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        vec3 c = mix(vec3(0.004, 0.002, 0.007), vec3(0.03, 0.012, 0.06), smoothstep(-0.6, 0.4, d.y));
        c += vec3(0.85, 0.75, 1.0) * 2.4 * smoothstep(0.82, 0.97, d.y);          // the surface, far above
        c += vec3(0.45, 0.12, 1.0) * 1.1 * pow(max(dot(d, normalize(vec3(-0.7, 0.3, -0.6))), 0.0), 8.0); // violet glow behind
        c += vec3(0.6, 0.45, 1.0) * 0.5 * pow(max(dot(d, normalize(vec3(0.6, 0.35, 0.7))), 0.0), 16.0); // soft window front-right
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  return env;
}

/* ------------------------------------------------------- the water behind */
const BG_FRAG = /* glsl */ `
uniform float uPhase; uniform vec2 uAspect;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++){ v += a * noise(p); p = m * p; a *= 0.5; } return v; }
void main(){
  vec2 p = (vUv - 0.5) * uAspect;
  float a = uPhase * 6.2831853;
  vec2 drift = vec2(cos(a), sin(a)) * 0.35; // a closed loop through the noise → seamless
  vec3 abyss = vec3(0.012, 0.009, 0.016);
  vec3 deep = vec3(0.16, 0.035, 0.30);
  vec3 col = abyss;
  col += deep * 0.55 * exp(-length((p - vec2(0.18, 0.05)) * vec2(0.9, 0.7)) * 1.6);
  float w1 = fbm(p * 1.4 + drift + 1.5 * fbm(p * 1.9 - drift * 0.7));
  col += vec3(0.20, 0.08, 0.34) * w1 * w1 * 0.55;
  // light from the surface, far above
  float sh = pow(noise(vec2(p.x * 3.0 + p.y * 1.1 + drift.x, 4.0 + drift.y)), 3.0) * smoothstep(-0.4, 0.8, p.y);
  col += vec3(0.45, 0.33, 0.68) * sh * 0.16;
  col *= 0.55 + 0.6 * smoothstep(-0.9, 0.9, p.y);
  gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
}`;

/* ------------------------------------------------------------ snow + bubbles */
const PT_VERT = /* glsl */ `
attribute float aSize; attribute float aAlpha; varying float vAlpha; varying float vBokeh;
uniform float uScale; uniform float uFocus; uniform float uAperture;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  float base = aSize * uScale / dist;
  float coc = 2.0 * uAperture * abs(dist - uFocus) / dist * uScale / uFocus;
  float size = max(base, coc);
  gl_PointSize = size;
  vBokeh = clamp((coc - base) / max(coc, 1.0), 0.0, 1.0);
  vAlpha = aAlpha * min(1.0, 2.5 * (base * base) / (size * size)); }`;
const PT_FRAG = /* glsl */ `
uniform vec3 uColor; varying float vAlpha; varying float vBokeh;
void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c);
  float soft = smoothstep(0.5, 0.12, d);
  float disc = smoothstep(0.5, 0.44, d) * (0.75 + 0.25 * smoothstep(0.25, 0.48, d)); // lens bokeh: flat, slightly brighter rim
  float a = mix(soft, disc, vBokeh);
  gl_FragColor = vec4(uColor * a * vAlpha, 1.0); }`;

/* ------------------------------------------------------------- post */
const QUAD_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const COPY_FRAG = `uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv); }`;
const BRIGHT_FRAG = `uniform sampler2D tSrc; uniform float uScale; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb * uScale; float l = max(max(c.r, c.g), c.b);
  gl_FragColor = vec4(c * smoothstep(0.55, 1.4, l), 1.0); }`;
const BLUR_FRAG = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 s = texture2D(tSrc, vUv).rgb * 0.227;
  s += texture2D(tSrc, vUv + uDir * 1.385).rgb * 0.316; s += texture2D(tSrc, vUv - uDir * 1.385).rgb * 0.316;
  s += texture2D(tSrc, vUv + uDir * 3.231).rgb * 0.070; s += texture2D(tSrc, vUv - uDir * 3.231).rgb * 0.070;
  gl_FragColor = vec4(s, 1.0); }`;
const FINAL_FRAG = /* glsl */ `
uniform sampler2D tAccum; uniform sampler2D tBloom; uniform float uScale; uniform float uSeed; uniform vec2 uRes;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main(){
  vec3 c = texture2D(tAccum, vUv).rgb * uScale;
  c += texture2D(tBloom, vUv).rgb * 0.55;
  c *= 1.15;
  c = aces(c);
  // grade: violet in the shadows, a little lift so the blacks aren't dead
  c = mix(c, c * vec3(1.02, 0.94, 1.12), 0.6);
  c += vec3(0.010, 0.004, 0.018) * (1.0 - c);
  vec2 q = vUv - 0.5;
  c *= 1.0 - 0.55 * pow(length(q * vec2(1.1, 1.0)) * 1.25, 2.4);
  c = pow(c, vec3(1.0 / 2.2));
  c += (hash(vUv * uRes + uSeed) - 0.5) * 0.018;
  gl_FragColor = vec4(c, 1.0);
}`;

/* ---------------------------------------------------------------- state */
let S = null;

export function init(width, height) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07050c, 0.055);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(waterEnvironment(), 0.03).texture;

  const camera = new THREE.PerspectiveCamera(24, width / height, 0.1, 80);

  // the water
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({ uniforms: { uPhase: { value: 0 }, uAspect: { value: new THREE.Vector2(1.6, 1.6) } }, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: BG_FRAG, depthWrite: false, fog: false })
  );
  bg.scale.set(34, 34, 1);
  bg.position.set(0, 0, -16);
  bg.renderOrder = -1;
  scene.add(bg);

  // the arms, right of centre (the section's words sit on the left), leaning back a touch
  const group = new THREE.Group();
  group.position.set(1.05, -0.25, 0);
  group.rotation.set(-0.12, 0, 0.1);
  scene.add(group);

  const { map, normalMap } = skinTextures();
  const skin = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map, normalMap, normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: 0.55, metalness: 0.0, clearcoat: 0.75, clearcoatRoughness: 0.16,
    sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x6a2bb0), envMapIntensity: 1.0,
  });
  const arms = [0, 1, 2].map((k) => {
    const a = armMesh(k);
    group.add(new THREE.Mesh(a.g, skin));
    return a;
  });

  const cupMat = new THREE.MeshPhysicalMaterial({
    color: 0xf0e0ea, vertexColors: true, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 1.0,
  });
  const slots = suckerSlots();
  const cups = new THREE.InstancedMesh(suckerGeometry(), cupMat, slots.length);
  group.add(cups);

  // lights: surface light from above, violet rims behind, a low deep fill
  const key = new THREE.DirectionalLight(0xe8e0ff, 2.4);
  key.position.set(1.5, 7, 4);
  const rimL = new THREE.DirectionalLight(0xa050ff, 3.6);
  rimL.position.set(-5, 2.5, -4);
  const rimR = new THREE.DirectionalLight(0xdcc8ff, 2.6);
  rimR.position.set(5, 4, -3);
  const fill = new THREE.DirectionalLight(0x2a0a55, 0.7);
  fill.position.set(-1, -4, 5);
  const glint = new THREE.PointLight(0xf3e9ff, 6, 9, 2);
  glint.position.set(2.2, 1.2, 4.2);
  scene.add(key, rimL, rimR, fill, glint);

  // marine snow + a few bubbles, wrapping inside a box so they loop
  const snow = particles(900, 3, [12, 10, 9], [0.018, 0.05], 0.55, 0xd8c8ff);
  const bubbles = particles(26, 7, [7, 10, 6], [0.06, 0.14], 0.5, 0xe8dcff);
  scene.add(snow.points, bubbles.points);

  // render targets: one HDR sample, the running sum, and two small ones for bloom
  const hdr = { type: THREE.HalfFloatType, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const rtSample = new THREE.WebGLRenderTarget(width, height, { ...hdr, samples: 4 });
  const rtAccum = new THREE.WebGLRenderTarget(width, height, { ...hdr, depthBuffer: false }); // half float blends everywhere
  const bw = Math.round(width / 4), bh = Math.round(height / 4);
  const rtA = new THREE.WebGLRenderTarget(bw, bh, { ...hdr, depthBuffer: false });
  const rtB = new THREE.WebGLRenderTarget(bw, bh, { ...hdr, depthBuffer: false });

  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quadScene.add(quad);
  const mat = (frag, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra });
  const M = {
    add: mat(COPY_FRAG, { tSrc: { value: null } }, { blending: THREE.AdditiveBlending, transparent: true }),
    bright: mat(BRIGHT_FRAG, { tSrc: { value: null }, uScale: { value: 1 } }),
    blur: mat(BLUR_FRAG, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }),
    final: mat(FINAL_FRAG, { tAccum: { value: null }, tBloom: { value: null }, uScale: { value: 1 }, uSeed: { value: 0 }, uRes: { value: new THREE.Vector2(width, height) } }),
  };

  S = { renderer, scene, camera, bg, group, arms, cups, slots, snow, bubbles, rtSample, rtAccum, rtA, rtB, quad, quadScene, quadCam, M, width, height };
  return { cups: slots.length, vertices: arms.length * (A.seg + 1) * (A.ring + 1) };
}

function particles(n, seed, box, size, alpha, color) {
  const r = rng(seed);
  const base = new Float32Array(n * 3);
  const sz = new Float32Array(n), al = new Float32Array(n), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    base[i * 3] = (r() - 0.5) * box[0];
    base[i * 3 + 1] = (r() - 0.5) * box[1];
    base[i * 3 + 2] = (r() - 0.5) * box[2] - 1.0;
    sz[i] = size[0] + (size[1] - size[0]) * Math.pow(r(), 3);
    al[i] = alpha * (0.35 + 0.65 * r());
    ph[i] = r() * TAU;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
  g.setAttribute("aAlpha", new THREE.BufferAttribute(al, 1));
  const points = new THREE.Points(g, new THREE.ShaderMaterial({
    vertexShader: PT_VERT, fragmentShader: PT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 1 }, uFocus: { value: 10 }, uAperture: { value: 0.15 }, uColor: { value: new THREE.Color(color) } },
  }));
  return { points, base, ph, box };
}

function placeParticles(P, phase, rise) {
  const pos = P.points.geometry.attributes.position;
  const H = P.box[1];
  for (let i = 0; i < pos.count; i++) {
    const a = P.ph[i];
    let y = P.base[i * 3 + 1] + rise * H * phase; // rises a whole number of boxes per loop
    y = ((y + H / 2) % H + H) % H - H / 2;
    pos.setXYZ(i, P.base[i * 3] + 0.12 * Math.sin(phase * TAU + a), y, P.base[i * 3 + 2] + 0.08 * Math.cos(phase * TAU * 2 + a));
  }
  pos.needsUpdate = true;
}

/* ----------------------------------------------------------------- frame */
// phase: 0..1 through the loop. samples: lens positions averaged for the depth of field.
export function frame(phase, { samples = 32, aperture = 0.3, quality = 0.92, seed = 1 } = {}) {
  const { renderer, scene, camera, bg, group, arms, cups, slots, snow, bubbles, rtSample, rtAccum, rtA, rtB, quad, quadScene, quadCam, M, width, height } = S;
  const a = phase * TAU;

  const paths = arms.map((arm, k) => {
    const path = armPath(k, phase);
    updateArm(arm, path);
    return path;
  });
  group.rotation.y = 0.1 * Math.sin(a);

  // suckers ride on the inside of each arm, two staggered rows, pulsing in a slow wave
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), sc = V(), n = V(), pp = V();
  slots.forEach((slot, i) => {
    const P = paths[slot.k];
    const T = P.T[slot.i];
    n.copy(P.oral[slot.i]);
    rotateAbout(n, T, slot.side * 0.42);
    const r = P.rad[slot.i];
    pp.copy(P.pts[slot.i]).addScaledVector(n, r * 0.9);
    q.setFromUnitVectors(up, n);
    sc.setScalar(r * 0.42 * (1 + 0.07 * Math.sin(a * 2 - slot.i * 0.02)));
    m.compose(pp, q, sc);
    cups.setMatrixAt(i, m);
  });
  cups.instanceMatrix.needsUpdate = true;
  cups.computeBoundingSphere();

  placeParticles(snow, phase, 1);
  placeParticles(bubbles, phase, 2);
  bg.material.uniforms.uPhase.value = phase;

  // camera: a slow, closed drift; focus on where the arms let go
  const camPos = V(0.2 + 0.12 * Math.sin(a), 0.35 + 0.08 * Math.sin(a * 2 + 1), 10.5);
  const target = V(0.55, 0.45, 0);
  camera.position.copy(camPos);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  const focus = camPos.distanceTo(V(1.05, A.split + 0.3, 0.3));
  const scaleUniform = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  for (const P of [snow, bubbles]) {
    const u = P.points.material.uniforms;
    u.uScale.value = scaleUniform;
    u.uFocus.value = focus;
    u.uAperture.value = aperture;
  }

  const right = V().setFromMatrixColumn(camera.matrixWorld, 0);
  const upv = V().setFromMatrixColumn(camera.matrixWorld, 1);
  const r = rng(seed * 7919 + Math.floor(phase * 1e6));

  renderer.setRenderTarget(rtAccum);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  for (let i = 0; i < samples; i++) {
    // golden-angle points over the aperture disc, plus a sub-pixel jitter for anti-aliasing
    const rr = Math.sqrt((i + 0.5) / samples) * aperture;
    const th = i * 2.399963 + r() * 0.3;
    const ox = rr * Math.cos(th), oy = rr * Math.sin(th);
    camera.position.copy(camPos).addScaledVector(right, ox).addScaledVector(upv, oy);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const e = camera.projectionMatrix.elements;
    // shear the frustum so the focus plane stays put (thin lens)
    e[8] -= (e[0] * ox) / focus - (r() - 0.5) * 2 / width;
    e[9] -= (e[5] * oy) / focus - (r() - 0.5) * 2 / height;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

    renderer.setRenderTarget(rtSample);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(scene, camera);

    quad.material = M.add;
    M.add.uniforms.tSrc.value = rtSample.texture;
    renderer.setRenderTarget(rtAccum);
    renderer.autoClear = false;
    renderer.render(quadScene, quadCam);
    renderer.autoClear = true;
  }

  // bloom from the averaged image
  quad.material = M.bright;
  M.bright.uniforms.tSrc.value = rtAccum.texture;
  M.bright.uniforms.uScale.value = 1 / samples;
  renderer.setRenderTarget(rtA);
  renderer.render(quadScene, quadCam);
  quad.material = M.blur;
  for (let k = 0; k < 3; k++) {
    M.blur.uniforms.tSrc.value = rtA.texture;
    M.blur.uniforms.uDir.value.set(1.5 / rtA.width, 0);
    renderer.setRenderTarget(rtB);
    renderer.render(quadScene, quadCam);
    M.blur.uniforms.tSrc.value = rtB.texture;
    M.blur.uniforms.uDir.value.set(0, 1.5 / rtA.height);
    renderer.setRenderTarget(rtA);
    renderer.render(quadScene, quadCam);
  }

  quad.material = M.final;
  M.final.uniforms.tAccum.value = rtAccum.texture;
  M.final.uniforms.tBloom.value = rtA.texture;
  M.final.uniforms.uScale.value = 1 / samples;
  M.final.uniforms.uSeed.value = (phase * 977.0) % 61.0;
  renderer.setRenderTarget(null);
  renderer.render(quadScene, quadCam);
  return renderer.domElement.toDataURL("image/jpeg", quality);
}
