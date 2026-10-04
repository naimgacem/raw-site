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
// Three arms rise from below, plaited tight while they're thick, the plait shrinking with them.
// Near the top they let go and curl like the arms in the RAW logo, suckers on the inside of the curl.
// Rebuilt every frame from smooth functions of the loop phase, so the loop has no seam.
const A = {
  bottom: -4.8, // where the arms enter, below the frame
  split: 0.55, // height where the plait lets go
  r0: 0.36, // radius at the bottom
  seg: 820, // samples per arm
  ring: 52,
  braidShare: 0.68, // share of each arm spent in the plait
};
const RATIO = 0.356; // arm radius ÷ plait width that keeps three strands touching (measured)
const ZRATIO = 0.5625; // over/under depth ÷ width (a flat plait)
const PER_W = 4.25; // repeat length ÷ width
// each free tip: outward direction, how far it curls, length
const TIP = [
  { spread: Math.PI - 0.55, curl: 3.4, len: 2.5 },
  { spread: 0.45, curl: 3.6, len: 2.3 },
  { spread: -1.0, curl: 2.7, len: 3.0 },
];
const radiusAt = (u) => A.r0 * Math.pow(1 - u, 0.72) * 0.97 + 0.004;
const smooth = (x, a, b) => THREE.MathUtils.smoothstep(x, a, b);

const ROT = new THREE.Quaternion();
const rotateAbout = (v, axis, angle) => v.applyQuaternion(ROT.setFromAxisAngle(axis, angle));
const signedAngle = (from, to, axis) => Math.atan2(V().crossVectors(from, to).dot(axis), from.dot(to));

function armPath(k, phase) {
  const a = phase * TAU;
  const N = A.seg, nb = Math.round(N * A.braidShare);
  const pts = [], rad = [];
  const axis = (y) => {
    const g = smooth(y, A.bottom, A.split + 1.5); // the base is anchored, the top sways
    return V(0.18 * g * Math.sin(0.9 * y - a + 0.5), y, 0.12 * g * Math.sin(0.7 * y - a + 2.0));
  };

  // 1) the plait: the twist tightens as the arms thin, so it stays snug to the end
  let p = 0;
  const dy = (A.split - A.bottom) / nb;
  for (let i = 0; i <= nb; i++) {
    const r = radiusAt((i / nb) * A.braidShare);
    const w = r / RATIO;
    if (i > 0) p += (TAU / (PER_W * w)) * dy;
    const pk = p + (TAU * k) / 3;
    pts.push(axis(A.bottom + dy * i).add(V(w * Math.sin(pk), 0, w * ZRATIO * Math.sin(2 * pk))));
    rad.push(r);
  }

  // 2) the free tip: the heading leaves the plait in the plait's own direction, then turns into a curl
  const t = TIP[k];
  const spread = t.spread + 0.18 * Math.sin(a + k * 2.09);
  const out = V(Math.cos(spread), 0, Math.sin(spread));
  const up = V(0, 1, 0);
  const curl = t.curl + 0.85 * Math.sin(a + k * 2.09 + 0.6);
  const lift = 0.35 + 0.15 * Math.sin(a + k);
  const h0 = V().subVectors(pts[nb], pts[nb - 1]).normalize();
  const nt = N - nb, ds = t.len / nt;
  const pos = pts[nb].clone(), head = V(), goal = V();
  for (let i = 1; i <= nt; i++) {
    const v = i / nt;
    const th = lift * Math.sin(Math.min(1, v * 3) * Math.PI * 0.5) + curl * Math.pow(v, 1.7);
    goal.copy(up).multiplyScalar(Math.cos(th)).addScaledVector(out, Math.sin(th));
    head.copy(h0).lerp(goal, smooth(v, 0, 0.2)).normalize();
    pos.addScaledVector(head, ds);
    pts.push(pos.clone());
    rad.push(radiusAt(A.braidShare + (1 - A.braidShare) * v));
  }

  // tangents, then a rotation-minimising frame (double reflection) so the skin never twists by itself
  const T = pts.map((_, i) => V().subVectors(pts[Math.min(i + 1, N)], pts[Math.max(i - 1, 0)]).normalize());
  const R = [V(0, 0, 1).addScaledVector(T[0], -T[0].z).normalize()];
  for (let i = 0; i < N; i++) {
    const v1 = V().subVectors(pts[i + 1], pts[i]);
    const c1 = v1.dot(v1);
    const rL = R[i].clone().addScaledVector(v1, (-2 / c1) * v1.dot(R[i]));
    const tL = T[i].clone().addScaledVector(v1, (-2 / c1) * v1.dot(T[i]));
    const v2 = V().subVectors(T[i + 1], tL);
    const c2 = v2.dot(v2);
    R.push((c2 < 1e-12 ? rL : rL.addScaledVector(v2, (-2 / c2) * v2.dot(rL))).normalize());
  }

  // where the sucker side faces: inward/back inside the plait (arms grip each other, hidden),
  // the inside of the curl on the free tip. Turned smoothly, never snapped.
  const Z = V(0, 0, 1);
  const ang = new Float64Array(N + 1);
  let lastIn = null;
  for (let i = 0; i <= N; i++) {
    const back = Z.clone().addScaledVector(T[i], -T[i].dot(Z)).normalize().negate();
    let ab = signedAngle(R[i], back, T[i]);
    if (i > nb) {
      const kv = V().subVectors(T[Math.min(i + 1, N)], T[i - 1]);
      kv.addScaledVector(T[i], -kv.dot(T[i]));
      if (kv.lengthSq() > 1e-10) {
        lastIn = kv.normalize();
        const front = Z.clone().addScaledVector(T[i], -T[i].dot(Z));
        if (front.lengthSq() > 1e-6) lastIn.addScaledVector(front.normalize(), 0.85).normalize();
      }
      if (lastIn) {
        let at = signedAngle(R[i], lastIn, T[i]);
        at += TAU * Math.round((ab - at) / TAU);
        ab += (at - ab) * smooth((i - nb) / nt, 0.06, 0.4);
      }
    }
    if (i > 0) ab += TAU * Math.round((ang[i - 1] - ab) / TAU); // unwrap
    ang[i] = ab;
  }
  // heavy smoothing: the arm turns gradually, like real muscle
  for (let pass = 0; pass < 3; pass++) {
    const src = ang.slice();
    for (let i = 0; i <= N; i++) {
      let s = 0, c = 0;
      for (let j = -24; j <= 24; j++) {
        const q = Math.min(N, Math.max(0, i + j));
        s += src[q];
        c++;
      }
      ang[i] = s / c;
    }
  }
  const O = R.map((r, i) => rotateAbout(r.clone(), T[i], ang[i]));
  return { pts, T, O, rad, nb };
}

// soft contact: where two arms press together, both flatten against a shared plane
function contactPlanes(paths, k, i) {
  const me = paths[k];
  const C = me.pts[i], Ra = me.rad[i];
  const planes = [];
  if (i > me.nb + 40) return planes;
  for (let b = 0; b < 3; b++) {
    if (b === k) continue;
    const o = paths[b];
    let best = 1e9, bi = -1;
    for (let m = Math.max(0, i - 44); m <= Math.min(o.nb + 40, i + 44); m++) {
      const d = C.distanceToSquared(o.pts[m]);
      if (d < best) { best = d; bi = m; }
    }
    if (bi < 0) continue;
    const Rb = o.rad[bi];
    const d = Math.sqrt(best);
    if (d >= (Ra + Rb) * 1.02 || d < 1e-6) continue;
    const n = V().subVectors(o.pts[bi], C).divideScalar(d);
    planes.push({ n, t0: (d * Ra) / (Ra + Rb), soft: 0.35 * Math.min(Ra, Rb) });
  }
  return planes;
}

const smin0 = (e, s) => {
  // smooth min(e, 0): rounds the edge of the flattened contact patch
  const h = Math.min(1, Math.max(0, 0.5 - (0.5 * e) / s));
  return e * h - s * h * (1 - h);
};

function armMesh(k) {
  const N = A.seg, R = A.ring;
  const g = new THREE.BufferGeometry();
  const verts = (N + 1) * (R + 1);
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(verts * 2), 2));
  g.setAttribute("aThin", new THREE.BufferAttribute(new Float32Array(verts), 1));
  const idx = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < R; j++) {
      const a = i * (R + 1) + j, b = a + R + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1); // wound so the normals face out
    }
  }
  g.setIndex(idx);
  return { g, k, tex: null };
}

// skin coordinates along each arm, fixed once (scaled by thickness so the pattern shrinks toward the tip)
function restTex(path) {
  const tex = [0];
  for (let i = 1; i < path.pts.length; i++) tex.push(tex[i - 1] + path.pts[i].distanceTo(path.pts[i - 1]) / Math.max(path.rad[i], 0.04));
  return tex;
}

function updateArm(arm, paths) {
  const { g, k } = arm;
  const path = paths[k];
  const N = A.seg, R = A.ring;
  const pos = g.attributes.position.array, uv = g.attributes.uv.array, thin = g.attributes.aThin.array;
  const O = V(), Q = V(), dir = V(), P = V();
  for (let i = 0; i <= N; i++) {
    const C = path.pts[i], T = path.T[i];
    O.copy(path.O[i]);
    Q.crossVectors(T, O);
    const r = path.rad[i] * (1 + 0.022 * Math.sin(arm.tex[i] * 0.21 + k * 1.7)); // slow muscle swell
    const planes = contactPlanes(paths, k, i);
    for (let j = 0; j <= R; j++) {
      const th = (j / R) * TAU;
      dir.copy(O).multiplyScalar(Math.cos(th)).addScaledVector(Q, Math.sin(th));
      const oral = Math.pow(Math.max(0, Math.cos(th)), 2);
      P.copy(C).addScaledVector(dir, r * (1 - 0.1 * oral));
      for (const pl of planes) {
        const e = P.clone().sub(C).dot(pl.n) - pl.t0;
        P.addScaledVector(pl.n, smin0(e, pl.soft) - e);
      }
      const o = (i * (R + 1) + j) * 3;
      pos[o] = P.x; pos[o + 1] = P.y; pos[o + 2] = P.z;
      const t = (i * (R + 1) + j) * 2;
      uv[t] = arm.tex[i] * 0.09;
      uv[t + 1] = j / R;
      thin[i * (R + 1) + j] = smooth(path.rad[i], 0.13, 0.02);
    }
  }
  g.attributes.position.needsUpdate = true;
  g.attributes.uv.needsUpdate = true;
  g.attributes.aThin.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
}

// suckers: two staggered rows down the sucker side, spaced by the arm's thickness. Fixed in arm
// coordinates (fractional sample index), so they ride with the skin.
function suckerSlots(rest) {
  const slots = [];
  rest.forEach((path, k) => {
    let next = path.nb - 30, side = 1;
    let f = next;
    while (f < A.seg - 3) {
      const i = Math.floor(f);
      slots.push({ k, f, side });
      side = -side;
      // half a sucker pitch per slot (rows alternate), pitch ≈ 0.62 × radius of arc length
      const step = (0.43 * path.rad[i]) / path.pts[i + 1].distanceTo(path.pts[i]);
      f += Math.max(step, 0.6);
    }
  });
  return slots;
}

function suckerGeometry() {
  // octopus sucker: a short cylinder with a broad, slightly domed rim and a small central opening
  const prof = [
    [0.0, 0.02], [0.08, 0.02], [0.13, 0.1], [0.19, 0.18], [0.3, 0.225], [0.55, 0.245],
    [0.75, 0.235], [0.9, 0.2], [0.98, 0.12], [1.0, 0.0], [0.99, -0.14], [1.08, -0.26], [1.25, -0.34],
  ].reverse().map(([x, y]) => new THREE.Vector2(x, y)); // base → rim → opening, so normals face out
  const g = new THREE.LatheGeometry(prof, 36);
  const col = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < g.attributes.position.count; i++) {
    const x = g.attributes.position.getX(i), y = g.attributes.position.getY(i), z = g.attributes.position.getZ(i);
    const rr = Math.sqrt(x * x + z * z);
    const rim = smooth(rr, 0.1, 0.32); // dark opening → pale rim
    const base = smooth(-y, 0.0, 0.3); // the foot takes the skin's colour
    col[i * 3] = (0.42 + 0.58 * rim) * (1 - 0.35 * base);
    col[i * 3 + 1] = (0.22 + 0.62 * rim) * (1 - 0.35 * base);
    col[i * 3 + 2] = (0.36 + 0.56 * rim) * (1 - 0.3 * base);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

/* ---------------------------------------------------------------- skin */
// Tileable along the arm (x) and around it (y; y≈0 and y≈1 are the sucker side).
// Mottled plum on top, pale on the underside, fine creases running across the arm, a few pigment dots.
function skinTextures() {
  const w = 1024, h = 512;
  const r = rng(5);
  // periodic smooth noise from a handful of waves with whole-number frequencies (tiles, no lattice)
  const field = (count, maxU, maxV, seed) => {
    const rr = rng(seed);
    const waves = Array.from({ length: count }, (_, i) => [1 + Math.floor(rr() * maxU), Math.floor(rr() * (maxV * 2 + 1)) - maxV, rr() * TAU, 1 / (1 + i * 0.3)]);
    return (x, y) => {
      let v = 0;
      for (const [fu, fv, ph, a] of waves) v += a * Math.sin(TAU * (fu * x + fv * y) + ph);
      return v;
    };
  };
  const mottle = field(16, 7, 3, 21);
  const warp = field(6, 4, 2, 33);
  const env = field(5, 5, 1, 44);
  const height = new Float32Array(w * h);
  const shade = new Float32Array(w * h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = px / w, y = py / h;
      // creases: rings around the arm, bent a little and fading in and out so they never read as stripes
      const bend = 0.012 * warp(x, y);
      const fade = 0.5 + 0.5 * Math.tanh(1.5 * env(x, y));
      const c1 = Math.sin(TAU * (19 * (x + bend) + 0.15 * Math.sin(TAU * y)));
      const c2 = Math.sin(TAU * (31 * (x + bend * 1.6) + 0.3) + 1.7);
      const crease = (Math.pow(Math.abs(c1), 6) * 0.7 + Math.pow(Math.abs(c2), 8) * 0.4) * fade;
      height[py * w + px] = -crease;
      shade[py * w + px] = crease;
    }
  }
  const color = document.createElement("canvas");
  color.width = w; color.height = h;
  const cx = color.getContext("2d");
  const img = cx.createImageData(w, h);
  for (let py = 0; py < h; py++) {
    const y = py / h;
    const under = smooth(Math.cos(y * TAU), 0.2, 0.9); // the sucker side is pale
    for (let px = 0; px < w; px++) {
      const x = px / w;
      const m = 0.5 + 0.26 * mottle(x, y);
      const warm = Math.max(0, 0.12 * warp(x * 2, y));
      const i = (py * w + px) * 4;
      // top: deep plum-violet, mottled. underside: pale lilac-pink.
      let R = 20 + 48 * m + 60 * warm, G = 7 + 14 * m + 6 * warm, B = 28 + 50 * m + 10 * warm;
      R += (168 - R) * under; G += (126 - G) * under; B += (178 - B) * under;
      const groove = 1 - 0.14 * shade[py * w + px];
      img.data[i] = R * groove;
      img.data[i + 1] = G * groove;
      img.data[i + 2] = B * groove;
      img.data[i + 3] = 255;
    }
  }
  cx.putImageData(img, 0, 0);
  // chromatophores: tiny soft dots on the top side only, drawn wrapped so the texture still tiles
  for (let n = 0; n < 2600; n++) {
    const x = r() * w, y = r() * h;
    if (Math.cos((y / h) * TAU) > 0.15) continue;
    const rad = 0.8 + 1.8 * r() * r();
    const dark = r() < 0.7;
    for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
      const g = cx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
      g.addColorStop(0, dark ? "rgba(14,3,20,0.5)" : "rgba(150,70,170,0.35)");
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
      const dx = (H(x + 1, y) - H(x - 1, y)) * 1.1, dy = (H(x, y + 1) - H(x, y - 1)) * 1.1;
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
    color: 0xffffff, map, normalMap, normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.6, metalness: 0.0, specularIntensity: 0.5, clearcoat: 0.65, clearcoatRoughness: 0.3,
    sheen: 0.12, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x7a3ab8), envMapIntensity: 0.4,
  });
  // thin flesh lets light through: a soft glow at the edges that grows as the arm thins
  skin.onBeforeCompile = (sh) => {
    sh.uniforms.uTrans = { value: new THREE.Color(0.5, 0.1, 0.42) };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aThin;\nvarying float vThin;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvThin = aThin;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uTrans;\nvarying float vThin;")
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n{ float f = pow(1.0 - saturate(dot(normal, geometryViewDir)), 2.2); totalEmissiveRadiance += uTrans * f * (0.06 + 0.75 * vThin) * diffuseColor.rgb * 2.4; }");
  };
  skin.customProgramCacheKey = () => "weave-skin-v2";
  // the rest pose fixes the skin coordinates and where the suckers sit
  const rest = [0, 1, 2].map((k) => armPath(k, 0));
  const arms = [0, 1, 2].map((k) => {
    const a = armMesh(k);
    a.tex = restTex(rest[k]);
    group.add(new THREE.Mesh(a.g, skin));
    return a;
  });

  const cupMat = new THREE.MeshPhysicalMaterial({
    color: 0xf1e3ee, vertexColors: true, roughness: 0.46, clearcoat: 0.45, clearcoatRoughness: 0.25,
    sheen: 0.4, sheenColor: new THREE.Color(0xe8c8ff), envMapIntensity: 0.8,
  });
  const slots = suckerSlots(rest);
  const cups = new THREE.InstancedMesh(suckerGeometry(), cupMat, slots.length);
  group.add(cups);

  // lights: surface light from above, violet rims behind, a low deep fill
  const key = new THREE.DirectionalLight(0xece6ff, 2.3);
  key.position.set(1.5, 7, 4);
  const rimL = new THREE.DirectionalLight(0x9a5cff, 3.0);
  rimL.position.set(-5, 2.5, -4);
  const rimR = new THREE.DirectionalLight(0xdcccff, 2.2);
  rimR.position.set(5, 4, -3);
  const fill = new THREE.DirectionalLight(0x2a0a55, 0.7);
  fill.position.set(-1, -4, 5);
  const glint = new THREE.PointLight(0xf3e9ff, 2.5, 9, 2);
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

  const paths = arms.map((_, k) => armPath(k, phase));
  arms.forEach((arm) => updateArm(arm, paths));
  group.rotation.y = 0.1 * Math.sin(a);

  // suckers ride on the sucker side in two staggered rows; any tucked inside a neighbouring arm hide
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), sc = V();
  const C = V(), T = V(), O = V(), n = V(), Sp = V();
  slots.forEach((slot, idx) => {
    const P = paths[slot.k];
    const i = Math.floor(slot.f), t = slot.f - i;
    C.lerpVectors(P.pts[i], P.pts[i + 1], t);
    T.lerpVectors(P.T[i], P.T[i + 1], t).normalize();
    O.lerpVectors(P.O[i], P.O[i + 1], t);
    O.addScaledVector(T, -O.dot(T)).normalize();
    const r = P.rad[i] + (P.rad[i + 1] - P.rad[i]) * t;
    n.copy(O);
    rotateAbout(n, T, slot.side * 0.36);
    Sp.copy(C).addScaledVector(n, r * 0.915);
    // tucked against a neighbouring arm? shrink away smoothly (no popping between frames)
    let clear = 1;
    for (let b = 0; b < 3; b++) {
      if (b === slot.k || i > paths[b].nb + 60) continue;
      for (let j = Math.max(0, i - 50); j <= Math.min(A.seg, i + 50); j += 2) {
        clear = Math.min(clear, smooth(Sp.distanceTo(paths[b].pts[j]) / paths[b].rad[j], 1.0, 1.3));
      }
    }
    const size = r * 0.3 * clear * (1 + 0.04 * Math.sin(a * 2 - slot.f * 0.02));
    q.setFromUnitVectors(up, n);
    sc.setScalar(Math.max(size, 1e-5)); // zero-size instances simply vanish
    m.compose(Sp.addScaledVector(n, -size * 0.05), q, sc);
    cups.setMatrixAt(idx, m);
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
