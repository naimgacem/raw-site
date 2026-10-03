// Every illustration on the site is defined here. `shoot(name, w, h)` returns a PNG data URL.
import {
  THREE, PAL, MAT, V, deg, rng, smooth, init, resize, renderer, baseScene, addBust, addStrands,
  cornrows, hanging, bead, camera, render, dirFrom, hairline, surfaceHit, drape, tube, mergeGeometries,
  RoundedBoxGeometry, bustSDF,
} from "./studio.js";

const hairPalette = () => ({ 0: MAT.hair(), 1: MAT.hair(0x8f2cf0), 2: MAT.hair(0xb98cff) });
// camera presets
const CAM = {
  scalp: { pos: [-1.9, 2.7, -3.7], look: [0, -0.15, -0.1], fov: 30 },
  long: { pos: [-2.9, 2.0, -5.7], look: [0, -0.62, -0.1], fov: 35 },
  mid: { pos: [-2.5, 2.2, -4.9], look: [0, -0.35, -0.1], fov: 33 },
};
const withCam = (s, c) => ((s.userData.cam = c), s);

/* ================================================================ STYLES */
export const STYLES = {
  cornrows() {
    const s = baseScene();
    addBust(s);
    addStrands(s, cornrows({ rows: 12, r: 0.024, tail: 0.32 }), hairPalette());
    return withCam(s, CAM.scalp);
  },
  freestyle() {
    const s = baseScene();
    addBust(s);
    addStrands(s, cornrows({ rows: 11, r: 0.026, pattern: "wave", amp: 0.1, freq: 2.2, tail: 0.3 }), hairPalette());
    return withCam(s, CAM.scalp);
  },
  art() {
    const s = baseScene();
    addBust(s);
    addStrands(s, cornrows({ rows: 11, r: 0.027, pattern: "zigzag", amp: 0.085, freq: 3, tail: 0.28, colorOf: (k) => (k % 2 ? 1 : 0) }), hairPalette());
    return withCam(s, CAM.scalp);
  },
  knotless() {
    const s = baseScene();
    addBust(s);
    addStrands(s, hanging({ count: 120, r: 0.0125, length: 3.0, seed: 3, volume: 0.09, colorOf: (i, n, rand) => (rand() < 0.12 ? 1 : 0) }), hairPalette());
    return withCam(s, CAM.long);
  },
  box() {
    const s = baseScene();
    addBust(s);
    addStrands(s, hanging({ count: 58, r: 0.024, length: 2.3, seed: 11, volume: 0.12 }), hairPalette());
    return withCam(s, CAM.long);
  },
  twists() {
    const s = baseScene();
    addBust(s);
    addStrands(s, hanging({ count: 84, r: 0.022, length: 1.6, kind: "twist", pitchK: 4.6, seed: 5, volume: 0.1 }), hairPalette());
    return withCam(s, CAM.mid);
  },
  barrel() {
    const s = baseScene();
    addBust(s);
    addStrands(s, hanging({ count: 34, r: 0.034, length: 1.3, kind: "twist", pitchK: 4.2, bumpy: 0.1, seed: 9, volume: 0.1, margin: 8 }), hairPalette());
    return withCam(s, CAM.mid);
  },
  fulani() {
    const s = baseScene();
    addBust(s);
    const g = cornrows({ rows: 7, r: 0.026, tail: 1.7, spread: 64, nape: 0.42, tailOpts: { wobble: 0.05, pull: 0.06 } });
    addStrands(s, g, hairPalette());
    const gold = MAT.gold();
    const rand = rng(21);
    for (const path of g.__paths) {
      const n = path.length;
      for (const f of [0.66, 0.8, 0.93]) {
        if (rand() < 0.25) continue;
        const i = Math.floor(n * (f + (rand() - 0.5) * 0.05));
        bead(s, path[i], path[Math.min(i + 1, n - 1)].clone().sub(path[Math.max(i - 1, 0)]), 0.045, gold);
      }
    }
    return withCam(s, CAM.long);
  },
};

/* ================================================================ driver */
let ready = false;
export async function shoot(name, w = 1024, h = 1024, opts = {}) {
  if (!ready) { init(w, h); ready = true; } else resize(w, h);
  await document.fonts.load('64px "Caesar Dressing"');
  const def = STYLES[name] || PRODUCTS[name] || SPECIAL[name];
  if (!def) throw new Error("unknown scene " + name);
  const scene = def(opts);
  const cam = scene.userData.camera || camera(w, h, scene.userData.cam || {});
  cam.aspect = w / h; cam.updateProjectionMatrix();
  return render(scene, cam);
}

export { PRODUCTS } from "./products.js";
import { PRODUCTS } from "./products.js";
/* ============================================================ SPECIAL */
function backdrop(w, h, cx = 0.5, cy = 0.4) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "#070608"; g.fillRect(0, 0, w, h);
  const r = g.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, Math.max(w, h) * 0.62);
  r.addColorStop(0, "rgba(118,26,198,0.55)"); r.addColorStop(0.45, "rgba(59,10,107,0.32)"); r.addColorStop(1, "rgba(7,6,8,0)");
  g.fillStyle = r; g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function dust(scene, n = 260, seed = 2) {
  const rand = rng(seed), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (rand() - 0.5) * 7; pos[i * 3 + 1] = (rand() - 0.5) * 6 - 0.3; pos[i * 3 + 2] = (rand() - 0.5) * 7; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcdb8f7, size: 0.018, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(pts);
  return pts;
}

export const SPECIAL = {
  // macro close-up of the art pattern for the full-bleed banner
  banner() {
    const s = baseScene({ rim: 1.2 });
    s.background = backdrop(600, 800, 0.5, 0.3);
    addBust(s);
    addStrands(s, cornrows({ rows: 11, r: 0.027, pattern: "zigzag", amp: 0.085, freq: 3, tail: 0.5, colorOf: (k) => (k % 2 ? 1 : 0) }), hairPalette(), 14);
    return withCam(s, { pos: [-1.15, 1.6, -2.4], look: [0, 0.05, -0.35], fov: 40 });
  },
};

/* ------------------------------------------------------- hero video loop */
let hero = null;
export async function heroFrame(i, n, w = 1080, h = 1920) {
  if (!ready) { init(w, h); ready = true; }
  if (!hero) {
    resize(w, h);
    const s = baseScene({ rim: 1.25, envIntensity: 0.45 });
    s.background = backdrop(540, 960, 0.5, 0.36);
    s.fog = new THREE.Fog(0x070608, 6, 14);
    addBust(s);
    addStrands(s, cornrows({ rows: 11, r: 0.027, pattern: "zigzag", amp: 0.085, freq: 3, tail: 0.45, colorOf: (k) => (k % 2 ? 1 : 0) }), hairPalette(), 10);
    const d = dust(s);
    const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
    hero = { s, cam, d };
  }
  const { s, cam, d } = hero;
  const t = i / n, TAU = Math.PI * 2;
  const az = Math.PI + deg(40) * Math.sin(TAU * t);          // swing around the back of the head
  const el = 0.95 + 0.25 * Math.sin(TAU * t * 2 + 1);
  const R = 6.1;
  cam.position.set(Math.sin(az) * R, el + 0.35, Math.cos(az) * R);
  cam.lookAt(0, -0.25, -0.05);
  const L = s.userData.lights;
  L.rimL.position.set(Math.sin(TAU * t) * 5, 2 + Math.cos(TAU * t), 3.5);
  L.rimR.position.set(-Math.sin(TAU * t + 2) * 5, 2.5, 2.5);
  d.rotation.y = TAU * t * 0.25;
  d.position.y = 0.15 * Math.sin(TAU * t);
  renderer.render(s, cam);
  return renderer.domElement.toDataURL("image/jpeg", 0.92);
}
export const list = () => ({ styles: Object.keys(STYLES), products: Object.keys(PRODUCTS), special: Object.keys(SPECIAL) });
