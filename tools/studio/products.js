// Shop product models: durags, bonnet, edge brush, oil bottle, cuffs.
import {
  THREE, MAT, V, deg, rng, smooth, baseScene, addBust, addStrands, dirFrom, surfaceHit, drape, tube,
  RoundedBoxGeometry, strands,
} from "./studio.js";

/* ------------------------------------------------------------ fabric */
// A shell that follows the scalp: polar from 0 (crown) to edge(az), lifted by offset().
function capGeometry(edge, offset, rings = 120, segs = 220) {
  const pos = [], idx = [];
  for (let i = 0; i <= rings; i++) {
    const f = i / rings;
    for (let j = 0; j < segs; j++) {
      const az = (j / segs) * Math.PI * 2;
      const polar = Math.max(1e-3, f * edge(az));
      const hit = surfaceHit(dirFrom(polar, az));
      const p = hit.point.addScaledVector(hit.normal, offset(f, az, polar));
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = i * segs + j, b = i * segs + ((j + 1) % segs), c = a + segs, d = b + segs;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function loopPoints(edge, offset, n = 360) {
  const pts = [];
  for (let j = 0; j <= n; j++) {
    const az = (j / n) * Math.PI * 2;
    const polar = edge(az);
    const hit = surfaceHit(dirFrom(polar, az));
    pts.push(hit.point.addScaledVector(hit.normal, offset(1, az, polar)));
  }
  return pts;
}

// A cloth ribbon along a path, gently twisting and rippling.
function ribbon(path, width, { twist = 0.5, ripple = 0.025, phase = 0, side0 = V(1, 0, 0) } = {}) {
  const n = path.length, pos = [], idx = [], W = 6;
  const side = side0.clone();
  for (let i = 0; i < n; i++) {
    const t = path[Math.min(i + 1, n - 1)].clone().sub(path[Math.max(i - 1, 0)]).normalize();
    side.sub(t.clone().multiplyScalar(side.dot(t))).normalize();
    const f = i / (n - 1);
    const s = side.clone().applyAxisAngle(t, twist * Math.sin(f * 4.2 + phase));
    const nrm = t.clone().cross(s).normalize();
    const w = width(f);
    for (let k = 0; k <= W; k++) {
      const u = k / W - 0.5;
      const cup = (u * u - 0.08) * w * 0.35 + ripple * Math.sin(f * 18 + u * 3 + phase) * f;
      const p = path[i].clone().addScaledVector(s, u * w).addScaledVector(nrm, cup);
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < W; k++) {
    const a = i * (W + 1) + k, b = a + W + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const DURAG_EDGE = (az) => deg(60 + 66 * Math.pow((1 - Math.cos(az)) / 2, 1.1));

function durag(scene, mat, { tails = true } = {}) {
  const off = (f, az, polar) =>
    0.03 +
    0.011 * Math.sin(az * 13 + 2 * Math.sin(polar * 3)) * smooth(0.25, 1, f) * (0.35 + 0.65 * (1 - Math.cos(az)) / 2) +
    0.004 * Math.sin(az * 31 + polar * 4) * f +
    0.02 * smooth(0.55, 1, f) * Math.pow((1 - Math.cos(az)) / 2, 2);
  scene.add(new THREE.Mesh(capGeometry(DURAG_EDGE, off), mat));
  // centre seam + rolled hem
  const seam = [];
  for (let i = 0; i <= 160; i++) {
    const t = i / 160;
    const az = t < 0.5 ? 0 : Math.PI;
    const polar = t < 0.5 ? (1 - t * 2) * DURAG_EDGE(0) : (t - 0.5) * 2 * DURAG_EDGE(Math.PI);
    const hit = surfaceHit(dirFrom(Math.max(polar, 1e-3), az));
    seam.push(hit.point.addScaledVector(hit.normal, 0.04));
  }
  scene.add(new THREE.Mesh(tube(seam, () => 0.011, 8, false), mat));
  scene.add(new THREE.Mesh(tube(loopPoints(DURAG_EDGE, off), () => 0.02, 10, false), mat));
  if (!tails) return;
  const rand = rng(4);
  for (const sgn of [-1, 1]) {
    const az = Math.PI + sgn * deg(30);
    const hit = surfaceHit(dirFrom(DURAG_EDGE(az) - deg(4), az));
    const start = hit.point.addScaledVector(hit.normal, 0.05);
    const path = drape(start, V(sgn * 0.25, -0.5, -1), 2.25, {
      step: 0.02, clearance: 0.07, pull: 0.035, rand, wobble: 0.04,
      gravity: () => V(sgn * 0.05, -1, -0.28).normalize(),
    });
    scene.add(new THREE.Mesh(ribbon(path, (f) => 0.3 - 0.06 * f, { twist: 0.55, phase: sgn * 1.3, side0: V(Math.cos(az), 0, -Math.sin(az)) }), mat));
  }
}

function bonnet(scene, mat, bandMat) {
  const edge = (az) => deg(52 + 74 * Math.pow((1 - Math.cos(az)) / 2, 1.05));
  const off = (f, az) =>
    0.03 +
    0.2 * Math.pow(Math.sin(f * Math.PI * 0.92), 0.7) * (0.55 + (0.45 * (1 - Math.cos(az))) / 2) +
    0.014 * smooth(0.82, 1, f) * Math.sin(az * 52) +
    0.008 * Math.sin(az * 11 + f * 20);
  scene.add(new THREE.Mesh(capGeometry(edge, off, 140, 260), mat));
  const band = loopPoints(edge, off, 420);
  scene.add(new THREE.Mesh(tube(band, (i) => 0.048 * (1 + 0.16 * Math.sin(i * 0.9)), 12, false), bandMat));
}

/* -------------------------------------------------------- helpers */
function shadowCatcher(scene, y = -0.6, opacity = 0.34) {
  const l = new THREE.DirectionalLight(0xffffff, 0.001);
  l.position.set(-1.2, 6, 1.5);
  l.castShadow = true;
  l.shadow.mapSize.set(2048, 2048);
  l.shadow.radius = 10;
  l.shadow.blurSamples = 24;
  Object.assign(l.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 15 });
  scene.add(l);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity, color: 0x12062a }));
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = y;
  plane.receiveShadow = true;
  scene.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(plane);
}

function textTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* -------------------------------------------------------- objects */
function edgeBrush(scene) {
  const g = new THREE.Group();
  const purple = new THREE.MeshPhysicalMaterial({ color: 0x6a12c9, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0d0b10, roughness: 0.4, clearcoat: 0.6 });
  g.add(new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.16, 0.22, 6, 0.07), purple));
  const pad = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.07, 0.24, 4, 0.03), black);
  pad.position.set(0.78, -0.1, 0);
  g.add(pad);
  const inst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.15, 6), black, 6 * 22);
  const m = new THREE.Matrix4();
  let k = 0;
  for (let i = 0; i < 22; i++) for (let j = 0; j < 6; j++) {
    m.makeTranslation(0.52 + i * 0.025, -0.2, -0.08 + j * 0.032);
    inst.setMatrixAt(k++, m);
  }
  g.add(inst);
  for (let i = 0; i < 16; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.14, 0.12), black);
    tooth.position.set(-1.02 + i * 0.03, -0.13, 0);
    g.add(tooth);
  }
  const label = textTexture(1024, 256, (c, w, h) => {
    c.fillStyle = "#ede8e0";
    c.font = '170px "Caesar Dressing"';
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("RAW", w / 2, h / 2 + 10);
  });
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.14), new THREE.MeshBasicMaterial({ map: label, transparent: true }));
  lp.position.set(-0.2, 0, 0.111);
  g.add(lp);
  scene.add(g);
  return g;
}

function oilBottle(scene) {
  const g = new THREE.Group();
  const prof = [[0, 0], [0.38, 0], [0.43, 0.03], [0.45, 0.12], [0.45, 1.04], [0.43, 1.16], [0.33, 1.27], [0.19, 1.34], [0.16, 1.4], [0.16, 1.47], [0, 1.47]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x4c0fa8, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.3, sheenColor: new THREE.Color(0xb48cff) });
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 96), glass));
  const ribs = [new THREE.Vector2(0, 1.42)];
  for (let i = 0; i <= 40; i++) ribs.push(new THREE.Vector2(0.195 + (i % 2 ? 0.008 : 0), 1.42 + (i / 40) * 0.34));
  ribs.push(new THREE.Vector2(0.17, 1.78), new THREE.Vector2(0, 1.78));
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0c0a0f, roughness: 0.35, clearcoat: 0.8 });
  g.add(new THREE.Mesh(new THREE.LatheGeometry(ribs, 96), black));
  const bulb = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const r = 0.13 * (t < 0.8 ? Math.sin(Math.min(1, t * 2.5) * Math.PI * 0.5) : Math.cos(((t - 0.8) / 0.2) * Math.PI * 0.5));
    bulb.push(new THREE.Vector2(Math.max(r, 0.001), 1.76 + t * 0.48));
  }
  g.add(new THREE.Mesh(new THREE.LatheGeometry(bulb, 64), new THREE.MeshPhysicalMaterial({ color: 0x141118, roughness: 0.65 })));
  const label = textTexture(1600, 640, (c, w, h) => {
    c.fillStyle = "#ede8e0"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#761ac6"; c.fillRect(0, h - 70, w, 70);
    c.fillStyle = "#15121c"; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = '210px "Caesar Dressing"'; c.fillText("RAW", w / 2, 175);
    c.font = '92px "Caesar Dressing"'; c.fillText("CROWN OIL", w / 2, 345);
    c.font = "600 44px Arial"; c.fillStyle = "#4b4556"; c.fillText("SCALP + BRAID ELIXIR  ·  50 ML", w / 2, 460);
  });
  const lab = new THREE.Mesh(
    new THREE.CylinderGeometry(0.455, 0.455, 0.66, 96, 1, true, -Math.PI * 0.55, Math.PI * 1.1),
    new THREE.MeshPhysicalMaterial({ map: label, roughness: 0.55, clearcoat: 0.2 })
  );
  lab.position.y = 0.6;
  g.add(lab);
  scene.add(g);
  return g;
}

function cuff(mat, r = 0.17, h = 0.2) {
  const prof = [];
  const N = 30;
  for (let i = 0; i <= N; i++) prof.push(new THREE.Vector2(r + 0.035 + (Math.floor(i / 3) % 2 ? 0.01 : 0), -h / 2 + (i / N) * h));
  prof.push(new THREE.Vector2(r, h / 2), new THREE.Vector2(r, -h / 2), prof[0].clone());
  return new THREE.Mesh(new THREE.LatheGeometry(prof, 64, 0.25, Math.PI * 2 - 0.5), mat);
}

const hair = () => ({ 0: MAT.hair() });
const CAM = {
  durag: { pos: [-3.9, 1.6, -4.0], look: [0, -0.38, -0.2], fov: 37 },
  bonnet: { pos: [-3.9, 1.8, -4.1], look: [0, -0.28, -0.15], fov: 35 },
};
const withCam = (s, c) => ((s.userData.cam = c), s);

export const PRODUCTS = {
  "durag-royal"() { const s = baseScene({ rim: 0.6 }); addBust(s, MAT.clay()); durag(s, MAT.satin(0x6a14d0, 0xd9b8ff)); return withCam(s, CAM.durag); },
  "durag-obsidian"() { const s = baseScene({ rim: 0.6 }); addBust(s, MAT.clay()); durag(s, MAT.satin(0x0f0d13, 0x9a86c0)); return withCam(s, CAM.durag); },
  "durag-pearl"() { const s = baseScene({ rim: 0.5 }); addBust(s, MAT.skin()); durag(s, MAT.satin(0xe9e3f2, 0xffffff)); return withCam(s, CAM.durag); },
  "durag-velvet"() { const s = baseScene({ rim: 0.6 }); addBust(s, MAT.clay()); durag(s, MAT.velvet(0x2c0a5c, 0xb07cff)); return withCam(s, CAM.durag); },
  bonnet() { const s = baseScene({ rim: 0.6 }); addBust(s, MAT.clay()); bonnet(s, MAT.satin(0x6a14d0, 0xd9b8ff), MAT.satin(0x16121c, 0x9a86c0)); return withCam(s, CAM.bonnet); },
  "edge-brush"() {
    const s = baseScene({ rim: 0.5 });
    const b = edgeBrush(s);
    b.rotation.set(deg(14), deg(-22), deg(16));
    shadowCatcher(s, -0.62);
    return withCam(s, { pos: [0.25, 1.05, 4.4], look: [0, -0.18, 0], fov: 32 });
  },
  "crown-oil"() {
    const s = baseScene({ rim: 0.5 });
    const b = oilBottle(s);
    b.position.y = -1.1;
    b.rotation.y = deg(-14);
    shadowCatcher(s, -1.1);
    return withCam(s, { pos: [0.6, 0.9, 4.0], look: [0, 0.02, 0], fov: 34 });
  },
  cuffs() {
    const s = baseScene({ rim: 0.5 });
    const gold = MAT.gold();
    const violet = new THREE.MeshPhysicalMaterial({ color: 0x7a1fe0, metalness: 0.6, roughness: 0.2, clearcoat: 1 });
    const silver = new THREE.MeshStandardMaterial({ color: 0xd8d4e0, metalness: 1, roughness: 0.18 });
    // a single braid wearing three cuffs
    const path = [];
    for (let i = 0; i <= 300; i++) { const t = i / 300; path.push(V(-1.05 + t * 1.65, 1.0 - t * 1.75 + 0.2 * Math.sin(t * 3), -0.3)); }
    const r = 0.062;
    addStrands(s, { 0: strands(path, null, { r, pitch: r * 6.2, taperIn: 0, taperOut: 0.2 }) }, hair());
    for (const [f, mat] of [[0.32, gold], [0.48, violet], [0.64, gold]]) {
      const i = Math.floor(f * 300);
      const c = cuff(mat, 0.2, 0.2);
      c.position.copy(path[i]);
      c.quaternion.setFromUnitVectors(V(0, 1, 0), path[i + 1].clone().sub(path[i - 1]).normalize());
      s.add(c);
    }
    for (const [x, y, z, mat, rx, ry] of [[0.75, -0.62, 0.55, gold, 80, 10], [1.25, -0.66, 0.0, silver, 90, -30], [0.2, -0.6, 0.9, violet, 85, 40], [1.1, -0.45, 0.85, gold, 15, 0]]) {
      const c = cuff(mat, 0.17, 0.18);
      c.position.set(x, y, z);
      c.rotation.set(deg(rx), deg(ry), 0);
      s.add(c);
    }
    shadowCatcher(s, -0.78);
    return withCam(s, { pos: [0.3, 1.5, 5.0], look: [0.1, 0.02, 0], fov: 34 });
  },
};
