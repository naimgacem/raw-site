// RAW 3D studio — procedurally sculpts a mannequin bust, weaves real 3-strand
// braids / twists over its scalp, and models the shop products.
// Driven headlessly by tools/render.mjs and tools/hero-video.mjs.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const deg = THREE.MathUtils.degToRad;
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/* ------------------------------------------------------------------ palette */
export const PAL = {
  abyss: 0x070608, ink: 0x15121c, violet: 0x971ff4, royal: 0x761ac6, deep: 0x3b0a6b,
  bone: 0xede8e0, lilac: 0xcdb8f7, gold: 0xe0b45a,
};

/* ------------------------------------------------------------- bust (SDF) */
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
function sdEll(px, py, pz, cx, cy, cz, rx, ry, rz) {
  const x = (px - cx) / rx, y = (py - cy) / ry, z = (pz - cz) / rz;
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const k1 = Math.sqrt(x * x / (rx * rx) + y * y / (ry * ry) + z * z / (rz * rz));
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
function sdCap(px, py, pz, ax, ay, az, bx, by, bz, r) {
  const pax = px - ax, pay = py - ay, paz = pz - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
}

// Face points to +z. Units: the cranium is ~1.7 wide.
export const CENTER = V(0, 0.1, -0.04);
export function bustSDF(x, y, z) {
  let d = sdEll(x, y, z, 0, 0.1, -0.04, 0.76, 0.86, 0.96); // cranium
  d = smin(d, sdEll(x, y, z, 0, -0.4, 0.2, 0.56, 0.6, 0.7), 0.3); // jaw + face
  d = smin(d, sdEll(x, y, z, 0, -0.2, 0.86, 0.085, 0.17, 0.12), 0.1); // nose
  d = smin(d, sdEll(x, y, z, 0.735, -0.1, 0.02, 0.085, 0.2, 0.13), 0.07); // ears
  d = smin(d, sdEll(x, y, z, -0.735, -0.1, 0.02, 0.085, 0.2, 0.13), 0.07);
  d = smin(d, sdCap(x, y, z, 0, -0.55, -0.1, 0, -1.55, -0.06, 0.34), 0.24); // neck
  let torso = sdEll(x, y, z, 0, -2.45, -0.05, 1.62, 0.92, 0.72);
  torso = Math.max(torso, -(y + 2.9));
  return smin(d, torso, 0.45);
}
const sdf = (p) => bustSDF(p.x, p.y, p.z);
function grad(p, out = V()) {
  const e = 1e-3;
  out.set(
    bustSDF(p.x + e, p.y, p.z) - bustSDF(p.x - e, p.y, p.z),
    bustSDF(p.x, p.y + e, p.z) - bustSDF(p.x, p.y - e, p.z),
    bustSDF(p.x, p.y, p.z + e) - bustSDF(p.x, p.y, p.z - e)
  );
  return out.normalize();
}

let BUST_GEO = null;
export function bustGeometry(res = 150) {
  if (BUST_GEO) return BUST_GEO;
  const S = 2.0, cy = -0.85;
  const mc = new MarchingCubes(res, new THREE.MeshBasicMaterial(), false, false, 1500000);
  mc.isolation = 0;
  const half = res / 2;
  for (let k = 0; k < res; k++) {
    const z = ((k - half) / half) * S;
    for (let j = 0; j < res; j++) {
      const y = ((j - half) / half) * S + cy;
      for (let i = 0; i < res; i++) {
        const x = ((i - half) / half) * S;
        mc.field[i + j * res + k * res * res] = -bustSDF(x, y, z);
      }
    }
  }
  mc.update();
  const n = mc.count;
  const pos = mc.positionArray.slice(0, n * 3);
  const nor = new Float32Array(n * 3);
  const p = V(), g = V();
  for (let i = 0; i < n; i++) {
    p.set(pos[i * 3] * S, pos[i * 3 + 1] * S + cy, pos[i * 3 + 2] * S);
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    grad(p, g);
    nor[i * 3] = g.x; nor[i * 3 + 1] = g.y; nor[i * 3 + 2] = g.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  BUST_GEO = geo;
  return geo;
}

/* -------------------------------------------------------- scalp helpers */
// polar angle measured from the top (+y), azimuth 0 = face (+z), +90° = right ear (+x)
export const dirFrom = (polar, az) => V(Math.sin(polar) * Math.sin(az), Math.cos(polar), Math.sin(polar) * Math.cos(az));
export const hairline = (az) => deg(50 + 68 * Math.pow((1 - Math.cos(az)) / 2, 1.15));

export function surfaceHit(dir) {
  let lo = 0, hi = 0;
  const p = V();
  for (let t = 0.2; t < 3; t += 0.04) {
    p.copy(CENTER).addScaledVector(dir, t);
    if (sdf(p) > 0) { hi = t; break; }
    lo = t;
  }
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    p.copy(CENTER).addScaledVector(dir, m);
    if (sdf(p) > 0) hi = m; else lo = m;
  }
  const point = CENTER.clone().addScaledVector(dir, hi);
  return { point, normal: grad(point) };
}

export function surfaceFrom(origin, dir) {
  let lo = 0, hi = 0;
  const p = V();
  for (let t = 0.0; t < 3; t += 0.03) {
    p.copy(origin).addScaledVector(dir, t);
    if (sdf(p) > 0) { hi = t; break; }
    lo = t;
  }
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    p.copy(origin).addScaledVector(dir, m);
    if (sdf(p) > 0) hi = m; else lo = m;
  }
  const point = origin.clone().addScaledVector(dir, hi);
  return { point, normal: grad(point) };
}

function slerpDir(a, b, t) {
  const dot = clamp(a.dot(b), -1, 1);
  const om = Math.acos(dot);
  if (om < 1e-5) return a.clone();
  const s = Math.sin(om);
  return a.clone().multiplyScalar(Math.sin((1 - t) * om) / s).addScaledVector(b, Math.sin(t * om) / s).normalize();
}

/* -------------------------------------------------------- tube builder */
// Sweeps a circle along `pts`. radius(i) per point. Parallel-transport frames.
function tube(pts, radius, radial = 8, cap = true) {
  const n = pts.length;
  const T = [], N = [], B = [];
  for (let i = 0; i < n; i++) {
    T[i] = pts[Math.min(i + 1, n - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize();
  }
  const a = Math.abs(T[0].y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  N[0] = a.sub(T[0].clone().multiplyScalar(a.dot(T[0]))).normalize();
  B[0] = T[0].clone().cross(N[0]);
  const axis = V();
  for (let i = 1; i < n; i++) {
    axis.crossVectors(T[i - 1], T[i]);
    const l = axis.length();
    N[i] = N[i - 1].clone();
    if (l > 1e-7) N[i].applyAxisAngle(axis.multiplyScalar(1 / l), Math.acos(clamp(T[i - 1].dot(T[i]), -1, 1)));
    B[i] = T[i].clone().cross(N[i]);
  }
  const verts = (n * (radial + 1) + (cap ? 1 : 0));
  const pos = new Float32Array(verts * 3), nor = new Float32Array(verts * 3), uv = new Float32Array(verts * 2);
  let v = 0;
  const d = V();
  for (let i = 0; i < n; i++) {
    const r = radius(i);
    for (let j = 0; j <= radial; j++) {
      const ang = (j / radial) * Math.PI * 2;
      d.copy(N[i]).multiplyScalar(Math.cos(ang)).addScaledVector(B[i], Math.sin(ang));
      pos[v * 3] = pts[i].x + d.x * r; pos[v * 3 + 1] = pts[i].y + d.y * r; pos[v * 3 + 2] = pts[i].z + d.z * r;
      nor[v * 3] = d.x; nor[v * 3 + 1] = d.y; nor[v * 3 + 2] = d.z;
      uv[v * 2] = i / (n - 1); uv[v * 2 + 1] = j / radial;
      v++;
    }
  }
  const idx = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) {
    const a0 = i * (radial + 1) + j, b0 = a0 + radial + 1;
    idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
  }
  if (cap) {
    const e = pts[n - 1], t = T[n - 1], r = radius(n - 1);
    pos[v * 3] = e.x + t.x * r * 0.9; pos[v * 3 + 1] = e.y + t.y * r * 0.9; pos[v * 3 + 2] = e.z + t.z * r * 0.9;
    nor[v * 3] = t.x; nor[v * 3 + 1] = t.y; nor[v * 3 + 2] = t.z;
    const base = (n - 1) * (radial + 1);
    for (let j = 0; j < radial; j++) idx.push(base + j, v, base + j + 1);
    v++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/* ----------------------------------------------------- braid / twist */
// Given a centre-line with optional "up" vectors (scalp normals), builds the
// strands of a 3-strand plait (or 2-strand twist) around it.
function frames(center, ups) {
  const n = center.length, T = [], N = [], B = [], S = [0];
  for (let i = 0; i < n; i++) {
    T[i] = center[Math.min(i + 1, n - 1)].clone().sub(center[Math.max(i - 1, 0)]).normalize();
    if (i > 0) S[i] = S[i - 1] + center[i].distanceTo(center[i - 1]);
  }
  for (let i = 0; i < n; i++) {
    let up;
    if (ups && ups[i]) up = ups[i].clone();
    else if (i === 0) up = Math.abs(T[0].y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
    else {
      up = N[i - 1].clone();
      const ax = V().crossVectors(T[i - 1], T[i]); const l = ax.length();
      if (l > 1e-7) up.applyAxisAngle(ax.multiplyScalar(1 / l), Math.acos(clamp(T[i - 1].dot(T[i]), -1, 1)));
    }
    N[i] = up.sub(T[i].clone().multiplyScalar(up.dot(T[i]))).normalize();
    B[i] = T[i].clone().cross(N[i]);
  }
  return { T, N, B, S };
}

export function strands(center, ups, o) {
  const { N, B, S } = frames(center, ups);
  const L = S[S.length - 1];
  const k = o.kind === "twist" ? 2 : 3;
  const out = [];
  for (let s = 0; s < k; s++) {
    const pts = [], rad = [];
    for (let i = 0; i < center.length; i++) {
      const taper = (o.taperIn ? 0.45 + 0.55 * smooth(0, o.taperIn, S[i]) : 1) * (o.taperOut ? 1 - 0.45 * smooth(L - o.taperOut, L, S[i]) : 1);
      const bump = o.bumpy ? 1 + o.bumpy * Math.sin(S[i] * 37 + s * 2.1 + (o.seed || 0)) * Math.sin(S[i] * 11.3 + s) : 1;
      const r = o.r * taper * bump;
      const ph = (S[i] / o.pitch) * Math.PI * 2;
      let lat, dep;
      if (k === 3) {
        const a = ph + (s * Math.PI * 2) / 3;
        lat = Math.sin(a) * r * 1.3;
        dep = -Math.sin(2 * a) * r * 0.62;
      } else {
        const a = ph + s * Math.PI;
        lat = Math.cos(a) * r * 0.95;
        dep = Math.sin(a) * r * 0.95;
      }
      pts.push(center[i].clone().addScaledVector(B[i], lat).addScaledVector(N[i], dep));
      rad.push(r);
    }
    out.push({ pts, radius: (i) => rad[i] });
  }
  return out;
}

// Lets a strand fall under gravity while sliding over the bust.
// `pull` is expressed per 0.0056 units of length so thick and thin strands behave alike.
// `hug` keeps the strand lying on the upper scalp instead of lifting off over the crown.
export function drape(p0, d0, length, { step = 0.02, clearance = 0.03, pull = 0.07, wobble = 0, rand = Math.random, sweep = null, gravity = null, hug = 0 } = {}) {
  const pts = [p0.clone()];
  const p = p0.clone(), d = d0.clone().normalize();
  const g = V(0, -1, 0), n = V();
  const k = 1 - Math.pow(1 - pull, step / 0.0056);
  for (let s = 0; s < length; s += step) {
    if (gravity) g.copy(gravity(p));
    d.lerp(g, k);
    if (sweep) d.addScaledVector(sweep, 0.02);
    if (wobble) d.add(V((rand() - 0.5) * wobble, 0, (rand() - 0.5) * wobble));
    d.normalize();
    const np = p.clone().addScaledVector(d, step);
    const dist = sdf(np) - clearance;
    if (dist < 0) np.addScaledVector(grad(np, n), -dist);
    else if (hug && dist < 0.12) { grad(np, n); if (n.y > -0.25) np.addScaledVector(n, -dist * hug); }
    d.subVectors(np, p).normalize();
    p.copy(np);
    pts.push(p.clone());
  }
  return pts;
}

/* -------------------------------------------------------- hairstyles */
// Cornrows from the hairline to the nape. pattern: straight | wave | zigzag
// Each row is a lane at lateral offset x that sweeps from the forehead, over the
// crown, to the nape (angle b around the ear-to-ear axis), narrowing toward the nape.
export function cornrows({ rows = 10, r = 0.022, pattern = "straight", amp = 0.09, freq = 2.5, tail = 0.3, tailOpts = {}, spread = 74, nape = 0.5, colorOf = () => 0 }) {
  const groups = {};
  for (let k = 0; k < rows; k++) {
    const u = rows === 1 ? 0 : (k / (rows - 1)) * 2 - 1;
    const steps = 700, center = [], ups = [];
    const raw = [];
    for (let i = 0; i <= steps; i++) {
      const b = deg(-10 + (i / steps) * 250); // 0 = toward face, 90° = top, 180° = back
      const t = smooth(deg(30), deg(205), b);
      // rows evenly spaced by angle around the head, so the sides get covered too
      const xf = 0.78 * Math.sin(u * deg(spread));
      let x = xf + (u * nape - xf) * t;
      if (pattern !== "straight") {
        const env = Math.sin(Math.PI * clamp((b - deg(30)) / deg(170), 0, 1)) ** 0.7;
        const ph = freq * (b / deg(180));
        const w = pattern === "wave" ? Math.sin(ph * Math.PI * 2) : (2 / Math.PI) * Math.asin(Math.sin(ph * Math.PI * 2));
        x += amp * env * w;
      }
      const origin = V(clamp(x, -0.7, 0.7), CENTER.y, CENTER.z);
      const dir = V(0, Math.sin(b), Math.cos(b));
      const hit = surfaceFrom(origin, dir);
      const rel = hit.point.clone().sub(CENTER);
      const polar = Math.acos(clamp(rel.y / rel.length(), -1, 1));
      const az = Math.atan2(rel.x, rel.z);
      raw.push({ hit, inside: polar < hairline(Math.abs(az)) - deg(3) });
    }
    // keep the longest contiguous run inside the hairline
    let best = [0, -1], s0 = -1;
    raw.forEach((p, i) => {
      if (p.inside && s0 < 0) s0 = i;
      if ((!p.inside || i === raw.length - 1) && s0 >= 0) { const e = p.inside ? i : i - 1; if (e - s0 > best[1] - best[0]) best = [s0, e]; s0 = -1; }
    });
    for (let i = best[0]; i <= best[1]; i++) {
      const { hit } = raw[i];
      center.push(hit.point.clone().addScaledVector(hit.normal, r * 1.45));
      ups.push(hit.normal);
    }
    if (center.length < 10) continue;
    // braid tail hanging from the nape
    if (tail > 0) {
      const last = center[center.length - 1], prev = center[center.length - 8];
      const hang = drape(last, last.clone().sub(prev), tail, { clearance: r * 2.2, pull: 0.12, ...tailOpts });
      for (let i = 1; i < hang.length; i++) { center.push(hang[i]); ups.push(null); }
    }
    const cut = resample(center, ups, r * 0.45);
    (groups.__paths ||= []).push(cut.pts);
    const c = colorOf(k, rows);
    (groups[c] ||= []).push(...strands(cut.pts, cut.ups, { r, pitch: r * 6.2, taperIn: 0.12, taperOut: tail > 0 ? 0.15 : 0.06 }));
  }
  return groups;
}

function resample(pts, ups, spacing) {
  const out = [pts[0].clone()], outUps = [ups[0] ? ups[0].clone() : null];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += pts[i].distanceTo(pts[i - 1]);
    if (acc >= spacing) { out.push(pts[i].clone()); outUps.push(ups[i] ? ups[i].clone() : null); acc = 0; }
  }
  // fill missing ups with transported values handled in frames(): null => transport
  let lastUp = null;
  for (let i = 0; i < outUps.length; i++) { if (outUps[i]) lastUp = outUps[i]; else if (lastUp && i < 2) outUps[i] = lastUp; }
  const firstNull = outUps.findIndex((u) => !u);
  return { pts: out, ups: firstNull < 0 ? outUps : outUps.map((u, i) => (i < firstNull ? u : null)) };
}

// Braids / twists falling from individual parts on the scalp.
export function hanging({ count = 80, r = 0.02, length = 2.4, kind = "plait", pitchK = 6.2, seed = 7, bumpy = 0, colorOf = () => 0, margin = 6, sweepBack = 1.1, lift = 0.0, volume = 0.1 }) {
  const rand = rng(seed);
  const groups = {};
  // fibonacci points over the sphere, keep the ones inside the hairline
  const anchors = [];
  const total = count * 3.2;
  for (let i = 0; i < total; i++) {
    const y = 1 - (i / (total - 1)) * 2;
    const polar = Math.acos(y);
    const az = (i * Math.PI * (3 - Math.sqrt(5))) % (Math.PI * 2);
    if (polar < hairline(az) - deg(margin)) anchors.push({ polar, az });
  }
  anchors.forEach((a, idx) => {
    const hit = surfaceHit(dirFrom(a.polar, a.az));
    const n = hit.normal;
    // comb back & down, lie on the scalp
    const want = V(0, -0.55, -1).normalize();
    const tangent = want.clone().sub(n.clone().multiplyScalar(want.dot(n))).normalize();
    const d0 = tangent.addScaledVector(n, lift).normalize();
    const layer = 1 - a.polar / hairline(a.az); // crown parts lie on top
    const clearance = r * 2.3 + layer * volume;
    const start = hit.point.clone().addScaledVector(n, r * 1.4);
    const L = length * (0.9 + rand() * 0.2);
    // gravity is tilted backwards over the head = hair combed back, then falls straight
    const gravity = (p) => V(0, -1, -(0.12 + sweepBack * smooth(-0.9, 0.4, p.y))).normalize();
    const center = drape(start, d0, L, { step: r * 0.45, clearance, pull: 0.16, wobble: 0.05, rand, gravity, hug: 0.6 });
    const ups = center.map(() => null);
    const cut = { pts: center, ups };
    const c = colorOf(idx, anchors.length, rand);
    (groups[c] ||= []).push(...strands(cut.pts, null, { r, pitch: r * pitchK, kind, taperIn: 0.05, taperOut: 0.12, bumpy, seed: idx }));
    if (groups.__tips) groups.__tips.push(center[center.length - 1]);
    else groups.__tips = [center[center.length - 1]];
    (groups.__paths ||= []).push(center);
  });
  return groups;
}

/* ------------------------------------------------------------- scene */
let renderer, pmrem, env;
export function init(w, h) {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  pmrem = new THREE.PMREMGenerator(renderer);
  env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  return renderer;
}
export function resize(w, h) { renderer.setSize(w, h); }

export function baseScene({ envIntensity = 0.55, rim = 1 } = {}) {
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = envIntensity;
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-3.5, 4.5, -4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9b2ff, 0.7); fill.position.set(4, 1, -3); scene.add(fill);
  const rimL = new THREE.DirectionalLight(PAL.violet, 7 * rim); rimL.position.set(-4.5, 1.5, 3.5); scene.add(rimL);
  const rimR = new THREE.DirectionalLight(0x8a3dff, 6 * rim); rimR.position.set(4.5, 2.5, 2.5); scene.add(rimR);
  const top = new THREE.DirectionalLight(0xffffff, 0.8); top.position.set(0, 6, 0.5); scene.add(top);
  scene.userData.lights = { key, fill, rimL, rimR, top };
  return scene;
}

export const MAT = {
  skin: () => new THREE.MeshPhysicalMaterial({ color: 0x17131d, roughness: 0.34, clearcoat: 0.9, clearcoatRoughness: 0.22 }),
  clay: () => new THREE.MeshPhysicalMaterial({ color: 0xcfc8da, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
  hair: (color = 0xefeaf3) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, sheen: 0.45, sheenColor: new THREE.Color(0xcdb0ff), sheenRoughness: 0.5 }),
  gold: () => new THREE.MeshStandardMaterial({ color: 0xe8bb62, metalness: 1, roughness: 0.22 }),
  satin: (color, sheen = 0xffffff) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.26, sheen: 1, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.28, clearcoat: 0.5, clearcoatRoughness: 0.18, side: THREE.DoubleSide }),
  velvet: (color, sheen) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.35, side: THREE.DoubleSide }),
};

export function addBust(scene, mat = MAT.skin()) {
  const mesh = new THREE.Mesh(bustGeometry(), mat);
  scene.add(mesh);
  return mesh;
}

export function addStrands(scene, groups, palette, radial = 0) {
  for (const key of Object.keys(groups)) {
    if (key.startsWith("__")) continue;
    const geos = groups[key].map((s) => tube(s.pts, s.radius, radial || (s.pts.length > 400 ? 7 : 8), true));
    const merged = mergeGeometries(geos);
    geos.forEach((g) => g.dispose());
    scene.add(new THREE.Mesh(merged, palette[key] || MAT.hair()));
  }
}

export function bead(scene, p, dir, r, mat) {
  const prof = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    prof.push(new THREE.Vector2(r * (1.15 + 0.35 * Math.sin(t * Math.PI)) + (i % 4 === 0 ? r * 0.12 : 0), (t - 0.5) * r * 3.2));
  }
  const g = new THREE.LatheGeometry(prof, 32);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(p);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
  scene.add(m);
  return m;
}

export function camera(w, h, { pos = [-2.6, 1.45, -3.7], look = [0, -0.45, 0], fov = 27 } = {}) {
  const cam = new THREE.PerspectiveCamera(fov, w / h, 0.1, 100);
  cam.position.set(...pos);
  cam.lookAt(...look);
  return cam;
}

export function render(scene, cam) {
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL("image/png");
}

export { THREE, renderer, tube, mergeGeometries, RoundedBoxGeometry, rng, smooth, deg, V };
