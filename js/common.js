// Gemeinsame Hilfsfunktionen für alle Szenen.
// Alles ist deterministisch: Zufall nur über rng(seed), Animation nur als Funktion der Zeit t.
import * as THREE from 'three';

export const P = {
  ink: '#23262d', paper: '#e9e1cf', night: '#141923', sky: '#a7bfcf', dawn: '#e9a97b', dusk: '#6b5b7b',
  red: '#c6473a', blue: '#3f6fa3', yellow: '#e2b24f', green: '#6c8c5c', grey: '#8b8f98', darkGrey: '#4a4e57',
  sand: '#d8c59c', snow: '#eef1f4', water: '#36627f', brown: '#7b5e45', white: '#f4f1ea', orange: '#e07b3c',
  steel: '#6d7682', skin: '#d9b9a0', olive: '#7a7d5a', black: '#15171c'
};

// Rollenfarben im Stil des Referenzvideos (werden von main.js aus den Globaleinstellungen gesetzt)
export const ROLE = { axis: '#ff2d2d', west: '#2f7cff', soviet: '#ffb020', civil: '#cfd6e0', strength: 1.8 };
export function setRoles(r) { Object.assign(ROLE, r); }

// Leuchtendes Silhouetten-Material: flache Farbe, über 1.0 verstärkt, damit der Bloom nur die Figuren erfasst
export function glowMat(color, strength = ROLE.strength, opts = {}) {
  const c = new THREE.Color(color);
  const m = new THREE.MeshBasicMaterial({ ...opts });
  m.color.setRGB(c.r * strength, c.g * strength, c.b * strength);
  m.toneMapped = false;
  return m;
}

// ---------- Mathe ----------
export function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeIn = t => Math.pow(clamp(t, 0, 1), 3);
export const easeInOut = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);  // Fortschritt 0..1 innerhalb [a,b]
export const pulse = (t, hz = 1) => 0.5 + 0.5 * Math.sin(t * hz * Math.PI * 2);

// ---------- Material / Primitive ----------
let shading = 'toon';
export function setShading(mode) { shading = mode; }
export function mat(color, opts = {}) {
  const M = shading === 'toon' ? THREE.MeshToonMaterial : THREE.MeshLambertMaterial;
  return new M({ color, ...opts });
}
export function mesh(geo, color, opts) {
  const m = new THREE.Mesh(geo, color instanceof THREE.Material ? color : mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), c, o);
export const cyl = (rt, rb, h, c, seg = 16, o) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c, o);
export const sphere = (r, c, seg = 16, o) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2 | 0)), c, o);
export const cone = (r, h, c, seg = 16, o) => mesh(new THREE.ConeGeometry(r, h, seg), c, o);
export function ground(size, color, opts) {
  const m = mesh(new THREE.PlaneGeometry(size, size), color, opts);
  m.rotation.x = -Math.PI / 2; m.castShadow = false;
  return m;
}
export function disc(r, color, seg = 32, opts) {
  const m = mesh(new THREE.CircleGeometry(r, seg), color, opts);
  m.rotation.x = -Math.PI / 2; m.castShadow = false;
  return m;
}

// ---------- Licht / Himmel ----------
export function lights(scene, { sun = [6, 10, 4], intensity = 1.6, hemi = 0.9, skyColor = '#ffffff', groundColor = '#777777', shadowSize = 30, shadows = true, sunColor = '#dfe8f5' } = {}) {
  const h = new THREE.HemisphereLight(skyColor, groundColor, hemi);
  const d = new THREE.DirectionalLight(sunColor, intensity);
  d.position.set(...sun);
  d.castShadow = shadows;
  d.shadow.mapSize.set(2048, 2048);
  d.shadow.camera.left = -shadowSize; d.shadow.camera.right = shadowSize;
  d.shadow.camera.top = shadowSize; d.shadow.camera.bottom = -shadowSize;
  d.shadow.camera.near = 0.5; d.shadow.camera.far = 120;
  d.shadow.bias = -0.0005;
  scene.add(h, d);
  return { hemi: h, sun: d };
}
export function lightPool(scene, { x = 0, z = 0, radius = 8, height = 30, intensity = 160, color = '#e3ecf8', penumbra = .6 } = {}) {
  const sp = new THREE.SpotLight(color, intensity, height * 2.5, Math.atan(radius / height), penumbra, 1.2);
  sp.position.set(x, height, z); sp.target.position.set(x, 0, z); sp.castShadow = false;
  scene.add(sp, sp.target);
  return sp;
}
export function sky(scene, color, fogNear = 30, fogFar = 90) {
  scene.background = new THREE.Color(color);
  scene.fog = new THREE.Fog(color, fogNear, fogFar);
}

// ---------- Beschriftung (Sprite aus Canvas) ----------
export function label(text, { color = '#f4f1ea', size = 1, font = "500 60px 'Cormorant Garamond', Georgia, serif", bg = null, pad = 24, depth = false, spacing = 0, upper = false, shadow = true } = {}) {
  if (upper) text = text.toUpperCase();
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = font;
  try { g.letterSpacing = spacing + 'px'; } catch { /* Safari */ }
  const w = Math.ceil(g.measureText(text).width) + pad * 2 + spacing;
  const h = 96;
  c.width = w; c.height = h;
  g.font = font;
  try { g.letterSpacing = spacing + 'px'; } catch { /* Safari */ }
  if (shadow) { g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 10; }
  if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, w, h, 16); g.fill(); }
  g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: depth }));
  s.scale.set(size * w / h, size, 1);
  s.renderOrder = 10;
  return s;
}

// ---------- Figuren & Fahrzeuge (alle schauen in +X) ----------
export function figure({ color = P.grey, head = P.skin, helmet = null, scale = 1, glow = null, strength = ROLE.strength } = {}) {
  const g = new THREE.Group();
  const gm = glow ? glowMat(glow, strength) : null;
  const bodyMat = gm || color;
  if (gm) { head = gm; helmet = helmet ? gm : null; }
  const legL = cyl(.09, .09, .5, gm || P.darkGrey, 8); legL.position.set(0, .25, -.12);
  const legR = legL.clone(); legR.position.z = .12;
  const body = mesh(new THREE.CapsuleGeometry(.22, .45, 4, 10), bodyMat); body.position.y = .85;
  const hd = sphere(.17, head, 12); hd.position.y = 1.37;
  const armL = cyl(.06, .06, .45, bodyMat, 8); armL.position.set(0, .9, -.3);
  const armR = armL.clone(); armR.position.z = .3;
  g.add(legL, legR, body, hd, armL, armR);
  if (helmet) {
    const h = mesh(new THREE.SphereGeometry(.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), helmet);
    h.position.y = 1.38; g.add(h);
  }
  g.scale.setScalar(scale);
  g.userData.walk = (t, amp = 1) => {
    const s = Math.sin(t * 8) * .5 * amp;
    legL.rotation.z = s; legR.rotation.z = -s; armL.rotation.z = -s * .8; armR.rotation.z = s * .8;
  };
  return g;
}

export function tank(color = P.grey, glow = null) {
  const g = new THREE.Group();
  if (glow) color = glowMat(glow);
  const hull = box(2.6, .7, 1.5, color); hull.position.y = .65;
  const trL = box(2.8, .5, .4, P.black); trL.position.set(0, .3, -.75);
  const trR = trL.clone(); trR.position.z = .75;
  const turret = box(1.3, .5, 1.0, color); turret.position.set(-.1, 1.25, 0);
  const barrel = cyl(.07, .07, 1.8, P.darkGrey, 8); barrel.rotation.z = -Math.PI / 2; barrel.position.set(1.3, 1.3, 0);
  g.add(hull, trL, trR, turret, barrel);
  return g;
}

export function aircraft(color = P.grey, { span: wing = 3.2, length = 2.6, engines = 0, accent = null } = {}) {
  const g = new THREE.Group();
  const fus = cyl(.22, .3, length, color, 10); fus.rotation.z = -Math.PI / 2;
  const nose = cone(.22, .5, accent || color, 10); nose.rotation.z = -Math.PI / 2; nose.position.x = length / 2 + .25;
  const wings = box(.8, .08, wing, color); wings.position.x = .1;
  const tail = box(.45, .08, 1.2, color); tail.position.x = -length / 2 + .2;
  const fin = box(.5, .6, .08, color); fin.position.set(-length / 2 + .2, .35, 0);
  g.add(fus, nose, wings, tail, fin);
  for (let i = 0; i < engines; i++) {
    const side = i % 2 ? 1 : -1, k = 1 + (i >> 1);
    const e = cyl(.14, .14, .7, P.darkGrey, 8); e.rotation.z = -Math.PI / 2;
    e.position.set(.2, -.05, side * k * wing / (2 * ((engines >> 1) + 1)));
    g.add(e);
  }
  if (accent) { const m1 = disc(.22, accent, 16); m1.position.set(.1, .05, wing * .32); const m2 = m1.clone(); m2.position.z = -wing * .32; g.add(m1, m2); }
  return g;
}

export function ship(color = P.steel, { length = 8, beam = 1.8, guns = 2 } = {}) {
  const g = new THREE.Group();
  const hull = box(length, .9, beam, color); hull.position.y = .45;
  const bow = cone(beam / 2, 1.6, color, 4); bow.rotation.z = -Math.PI / 2; bow.rotation.x = Math.PI / 4; bow.position.set(length / 2 + .8, .45, 0);
  const deck = box(length * .9, .15, beam * .9, P.darkGrey); deck.position.y = .95;
  const sup = box(length * .3, 1.2, beam * .7, color); sup.position.set(-length * .05, 1.6, 0);
  const bridge = box(length * .15, .6, beam * .5, color); bridge.position.set(-length * .02, 2.5, 0);
  const funnel = cyl(.25, .3, 1.2, P.darkGrey, 10); funnel.position.set(-length * .22, 2.2, 0);
  const mast = cyl(.05, .05, 2.2, P.darkGrey, 6); mast.position.set(length * .1, 3.2, 0);
  g.add(hull, bow, deck, sup, bridge, funnel, mast);
  for (let i = 0; i < guns; i++) {
    const t = cyl(.4, .45, .4, color, 12); t.position.set(length * .3 - i * .9, 1.2, 0);
    const b = cyl(.05, .05, 1.2, P.darkGrey, 6); b.rotation.z = -Math.PI / 2; b.position.set(length * .3 - i * .9 + .7, 1.25, 0);
    g.add(t, b);
  }
  return g;
}

export function landingCraft(color = P.olive) {
  const g = new THREE.Group();
  const floor = box(3.2, .3, 1.6, color); floor.position.y = .15;
  const sideL = box(3.2, .8, .12, color); sideL.position.set(0, .6, -.74);
  const sideR = sideL.clone(); sideR.position.z = .74;
  const back = box(.12, .8, 1.6, color); back.position.set(-1.6, .6, 0);
  const ramp = box(.1, 1.0, 1.5, P.darkGrey); ramp.position.set(1.6, .75, 0);
  g.add(floor, sideL, sideR, back, ramp);
  g.userData.ramp = ramp;
  return g;
}

// ---------- Gebäude / Stadt ----------
export function building(w, h, d, color, { windows = 0, windowColor = P.yellow, lit = true } = {}) {
  const g = new THREE.Group();
  const b = box(w, h, d, color); b.position.y = h / 2; g.add(b);
  if (windows > 0) {
    const geo = new THREE.PlaneGeometry(.35, .5);
    const m = new THREE.MeshBasicMaterial({ color: windowColor });
    const rows = Math.max(1, Math.floor(h / 1.2)), cols = windows;
    const inst = new THREE.InstancedMesh(geo, m, rows * cols);
    const o = new THREE.Object3D(); let k = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      o.position.set(-w / 2 + (c + .5) * (w / cols), .8 + r * 1.2, d / 2 + .01);
      o.updateMatrix(); inst.setMatrixAt(k++, o.matrix);
    }
    inst.visible = lit; g.add(inst); g.userData.windows = inst;
  }
  return g;
}
export function ruin(w, h, d, color, r = Math.random) {
  const g = new THREE.Group();
  const cols = 3 + Math.floor(r() * 3);
  for (let i = 0; i < cols; i++) {
    const cw = w / cols, ch = h * (0.25 + r() * 0.75);
    const b = box(cw * .98, ch, d * (0.6 + r() * .4), color);
    b.position.set(-w / 2 + (i + .5) * cw, ch / 2, 0); g.add(b);
  }
  for (let i = 0; i < 4; i++) {
    const s = box(.3 + r() * .5, .2 + r() * .3, .3 + r() * .5, color);
    s.position.set((r() - .5) * w * 1.4, .15, d / 2 + .3 + r() * 1.2); s.rotation.y = r() * 3; g.add(s);
  }
  return g;
}
export function city(r, { count = 40, area = 40, minH = 2, maxH = 9, colors = [P.grey, P.darkGrey, P.steel], ruined = false, windows = 0, gap = 1.2, exclude = 0 } = {}) {
  const g = new THREE.Group();
  const cols = Math.ceil(Math.sqrt(count));
  const cell = area / cols;
  for (let i = 0; i < count; i++) {
    const cx = (i % cols + .5) * cell - area / 2, cz = (Math.floor(i / cols) + .5) * cell - area / 2;
    if (Math.hypot(cx, cz) < exclude) continue;
    const w = cell - gap - r() * 1.5, d = cell - gap - r() * 1.5, h = minH + r() * (maxH - minH);
    const c = colors[Math.floor(r() * colors.length)];
    const b = ruined ? ruin(w, h, d, c, r) : building(w, h, d, c, { windows });
    b.position.set(cx + (r() - .5) * .8, 0, cz + (r() - .5) * .8);
    g.add(b);
  }
  return g;
}
export function tree(color = P.green, h = 2.2) {
  const g = new THREE.Group();
  const trunk = cyl(.08, .12, h * .3, P.brown, 6); trunk.position.y = h * .15;
  const top = cone(h * .3, h * .7, color, 7); top.position.y = h * .3 + h * .35;
  g.add(trunk, top); return g;
}
export function cloud(r, color = P.white, s = 1) {
  const g = new THREE.Group();
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const b = sphere((.6 + r() * .6) * s, color, 10);
    b.position.set((i - n / 2) * .8 * s, (r() - .5) * .3 * s, (r() - .5) * .5 * s);
    b.castShadow = false; g.add(b);
  }
  return g;
}

// ---------- Pfeile / Karten ----------
export function arrow(length, color, { width = .5, height = .25, glow = 1 } = {}) {
  const g = new THREE.Group();
  if (glow > 0) color = glowMat(color, 1 + glow);
  const shaft = box(1, height, width, color); shaft.position.x = .5;
  const head = mesh(new THREE.ConeGeometry(width, width * 1.4, 4), color); head.rotation.z = -Math.PI / 2; head.rotation.y = Math.PI / 4;
  g.add(shaft, head);
  g.userData.setLength = l => { l = Math.max(.01, l); shaft.scale.x = l; shaft.position.x = l / 2; head.position.x = l + width * .7; };
  g.userData.setLength(length);
  return g;
}

// Grobe Umrisse (lon, lat). Bewusst vereinfacht, Stil "schematische Karte".
export const EUROPE = {
  deutschland: [[6.1, 51.9], [5.9, 51.0], [6.3, 50.3], [6.5, 49.5], [8.2, 48.9], [7.6, 47.6], [9.5, 47.5], [13.0, 47.5], [12.9, 48.5], [13.8, 48.7], [12.2, 50.2], [14.8, 51.0], [15.0, 51.9], [14.3, 53.3], [14.0, 53.9], [12.0, 54.4], [10.9, 54.0], [9.9, 54.8], [8.6, 54.9], [8.5, 53.6], [7.1, 53.6]],
  frankreich: [[-1.8, 43.4], [3.1, 42.4], [7.5, 43.8], [7.1, 45.9], [6.1, 46.4], [7.6, 47.6], [8.2, 48.9], [6.5, 49.5], [4.8, 50.0], [2.5, 51.1], [1.5, 50.9], [-1.2, 49.6], [-1.9, 48.7], [-4.7, 48.4], [-4.3, 47.8], [-1.2, 46.3], [-1.5, 44.5]],
  polen: [[14.3, 53.3], [15.0, 51.9], [14.8, 51.0], [16.5, 50.4], [18.8, 49.6], [22.5, 49.1], [24.0, 50.5], [23.6, 52.5], [23.0, 54.0], [19.5, 54.4], [18.0, 54.8], [16.0, 54.5]],
  italien: [[7.5, 43.8], [7.1, 45.9], [9.0, 46.2], [12.0, 47.0], [13.7, 46.5], [13.6, 45.6], [12.3, 45.4], [12.4, 44.3], [13.6, 43.5], [14.2, 42.4], [15.9, 41.9], [16.9, 41.1], [18.5, 40.2], [17.2, 40.5], [16.5, 39.8], [17.1, 39.0], [16.0, 38.0], [15.6, 38.0], [15.9, 39.5], [14.8, 40.1], [14.2, 40.8], [12.6, 41.5], [11.0, 42.5], [10.2, 43.5], [8.9, 44.4]],
  sizilien: [[12.4, 38.0], [15.6, 38.3], [15.1, 36.7], [12.6, 37.6]],
  britannien: [[-5.7, 50.1], [-3.5, 50.4], [1.4, 51.2], [1.7, 52.7], [0.3, 53.5], [-0.2, 54.5], [-1.6, 55.6], [-2.0, 57.0], [-1.8, 57.7], [-3.0, 58.6], [-5.0, 58.6], [-5.7, 57.3], [-6.2, 56.4], [-4.8, 55.0], [-3.1, 54.9], [-3.3, 53.4], [-4.7, 53.3], [-4.3, 52.3], [-5.3, 51.7], [-3.4, 51.4], [-4.3, 51.2]],
  benelux: [[2.5, 51.1], [4.8, 50.0], [6.5, 49.5], [6.3, 50.3], [5.9, 51.0], [6.1, 51.9], [7.1, 53.4], [5.3, 53.4], [4.6, 52.8], [4.0, 51.9], [3.3, 51.4]],
  daenemark: [[8.6, 54.9], [9.9, 54.8], [10.3, 55.5], [10.8, 56.5], [10.3, 57.6], [8.6, 57.1], [8.1, 56.2], [8.1, 55.5]],
  seeland: [[11.1, 55.2], [12.6, 55.5], [12.3, 56.1], [11.3, 56.0]],
  oesterreich: [[9.5, 47.5], [13.0, 47.5], [12.9, 48.5], [13.8, 48.7], [15.0, 49.0], [16.9, 48.7], [17.1, 48.0], [16.0, 46.7], [13.7, 46.5], [12.0, 47.0], [10.5, 46.9]],
  tschechien: [[12.2, 50.2], [13.8, 48.7], [15.0, 49.0], [16.9, 48.7], [18.8, 49.6], [18.0, 50.0], [16.5, 50.4], [14.8, 51.0]],
  schweiz: [[6.1, 46.4], [7.6, 47.6], [9.5, 47.5], [10.5, 46.9], [9.0, 46.2], [7.1, 45.9]],
  spanien: [[-1.8, 43.4], [3.1, 42.4], [0.5, 40.5], [-0.3, 39.4], [-2.0, 36.8], [-6.0, 36.2], [-7.4, 37.2], [-9.3, 39.0], [-9.0, 43.0], [-7.0, 43.6]],
  balkan: [[17.1, 48.0], [22.1, 48.4], [22.5, 46.0], [23.0, 44.5], [20.0, 43.0], [19.5, 41.5], [13.6, 45.6], [16.0, 46.7]],
  osten: [[24.0, 50.5], [23.6, 52.5], [23.0, 54.0], [21.0, 55.3], [28.0, 56.5], [48.0, 57.5], [48.0, 44.0], [38.0, 43.5], [30.0, 45.0], [27.0, 45.5], [22.1, 48.4], [22.5, 49.1]],
  skandinavien: [[10.8, 57.6], [13.0, 55.4], [16.0, 56.2], [19.0, 60.0], [12.0, 60.0], [5.0, 59.0], [7.0, 58.0]]
};
export const PLACES = { berlin: [13.4, 52.5], stalingrad: [44.5, 48.7], normandie: [-0.8, 49.3], moskau: [37.6, 55.8], london: [-0.1, 51.5], rom: [12.5, 41.9], paris: [2.3, 48.9] };

// Prozedurale Geländetextur (dunkles, entsättigtes Satellitenbild)
let _terrainTex = null;
export function terrainTexture(seed = 7, size = 512) {
  if (_terrainTex) return _terrainTex;
  const r = rng(seed);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  // Wertrauschen in 5 Oktaven
  const oct = [];
  for (let o = 0; o < 5; o++) { const n = 4 << o; const grid = new Float32Array(n * n); for (let i = 0; i < grid.length; i++) grid[i] = r(); oct.push({ n, grid }); }
  const sample = (grid, n, x, y) => {
    const xi = Math.floor(x) % n, yi = Math.floor(y) % n, xf = x - Math.floor(x), yf = y - Math.floor(y);
    const a = grid[yi * n + xi], b = grid[yi * n + (xi + 1) % n], c2 = grid[((yi + 1) % n) * n + xi], d = grid[((yi + 1) % n) * n + (xi + 1) % n];
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return (a * (1 - u) + b * u) * (1 - v) + (c2 * (1 - u) + d * u) * v;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, amp = 1, tot = 0;
    for (const { n, grid } of oct) { v += sample(grid, n, x / size * n, y / size * n) * amp; tot += amp; amp *= .55; }
    v /= tot; v = (0.45 + 0.55 * v) * 255;
    const i = (y * size + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  _terrainTex = t; return t;
}

// Flaches Band entlang eines geschlossenen Polygons (weiße Grenzlinien, in WebGL sind Linien sonst immer 1px)
export function ribbon(points, width, material, y = 0) {
  const pos = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
    const nx = -dz / L * width / 2, nz = dx / L * width / 2;
    pos.push(a.x + nx, y, a.z + nz, b.x + nx, y, b.z + nz, b.x - nx, y, b.z - nz,
             a.x + nx, y, a.z + nz, b.x - nx, y, b.z - nz, a.x - nx, y, a.z - nz);
    // kleines Quadrat an der Ecke, damit keine Lücken entstehen
    const w = width / 2;
    pos.push(a.x - w, y, a.z - w, a.x + w, y, a.z - w, a.x + w, y, a.z + w, a.x - w, y, a.z - w, a.x + w, y, a.z + w, a.x - w, y, a.z + w);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material); m.castShadow = m.receiveShadow = false;
  return m;
}

// Dünner, leicht leuchtender Pfeil entlang einer Kurve (rote Pfeile der Videokarten); userData.setProgress(0..1)
export function curvedArrow(points, color = ROLE.axis, { radius = .07, head = .45, strength = 2.2, lift = .12 } = {}) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points.map(v => v.clone().setY(v.y + lift)));
  const geo = new THREE.TubeGeometry(curve, 48, radius, 6, false);
  const m = glowMat(color, strength);
  const tube = new THREE.Mesh(geo, m); tube.castShadow = false;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 3.2, head, 10), m); cone.castShadow = false;
  g.add(tube, cone);
  const total = geo.index.count, tmp = new THREE.Vector3();
  g.userData.setProgress = u => {
    u = clamp(u, 0, 1);
    geo.setDrawRange(0, Math.floor(total * u));
    curve.getPoint(u, cone.position); curve.getTangent(u, tmp);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp.normalize());
    g.visible = u > .01;
  };
  g.userData.setProgress(1);
  return g;
}

// Europakarte im Videostil: dunkles Gelände, flache Länder, weiße Grenzbänder, rote Flächen für Gegner
export function europeMap({ scale = 0.9, land = '#767b82', sea = '#262a2e', highlight = {}, center = [10, 50], outline = '#c9d0d8', outlineWidth = .11, outlineStrength = 1.0, texture = true } = {}) {
  const g = new THREE.Group();
  const project = (lon, lat) => new THREE.Vector3((lon - center[0]) * scale, 0, -(lat - center[1]) * scale * 1.55);
  const countries = {};
  const tex = texture ? terrainTexture() : null;
  const lineMat = glowMat(outline, outlineStrength);
  for (const [name, pts] of Object.entries(EUROPE)) {
    const v3 = pts.map(([lon, lat]) => project(lon, lat));
    const shape = new THREE.Shape(v3.map(v => new THREE.Vector2(v.x, -v.z)));
    const geo = new THREE.ShapeGeometry(shape, 1);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: highlight[name] || land, map: tex }));
    m.rotation.x = -Math.PI / 2; m.position.y = .01; m.receiveShadow = true;
    // Textur in Weltkoordinaten wiederholen
    const uv = geo.attributes.uv, posA = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, posA.getX(i) / 18, posA.getY(i) / 18);
    countries[name] = m; g.add(m);
    if (outline) { const rb = ribbon(v3, outlineWidth, lineMat, .03); g.add(rb); m.userData.outline = rb; }
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(160, 160, 1, 1), new THREE.MeshBasicMaterial({ color: sea, map: tex }));
  water.rotation.x = -Math.PI / 2; water.position.y = -.02; water.receiveShadow = true;
  const wuv = water.geometry.attributes.uv; for (let i = 0; i < wuv.count; i++) wuv.setXY(i, wuv.getX(i) * 9, wuv.getY(i) * 9);
  g.add(water);
  g.userData = { project, countries, depth: .02, lineMat,
    // Stadtmarker: kleiner weißer Punkt + Serifenbeschriftung
    city(lon, lat, text, { size = .9, dot = .14, dx = 0, dz = -.9 } = {}) {
      const v = project(lon, lat);
      const d = new THREE.Mesh(new THREE.CircleGeometry(dot, 16), glowMat('#ffffff', 1.3)); d.rotation.x = -Math.PI / 2; d.position.set(v.x, .05, v.z);
      const l = label(text, { size, font: "500 56px 'Cormorant Garamond', Georgia, serif" }); l.position.set(v.x + dx, .8, v.z + dz);
      g.add(d, l); return { dot: d, label: l };
    },
    // Ländername: Großbuchstaben mit Sperrung
    country(lon, lat, text, size = 1.6) {
      const v = project(lon, lat);
      const l = label(text, { size, font: "500 60px 'Cormorant Garamond', Georgia, serif", upper: true, spacing: 8 }); l.position.set(v.x, 1.2, v.z);
      g.add(l); return l;
    }
  };
  return g;
}

// Globus mit abstrakten Landflecken
export function latLon(lat, lon, R) {
  const phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-R * Math.sin(phi) * Math.cos(theta), R * Math.cos(phi), R * Math.sin(phi) * Math.sin(theta));
}
const LAND = [[45, -100, 1.1], [35, -112, .7], [55, -80, .8], [30, -92, .6], [62, -105, .7], [20, -100, .45], [8, -72, .5], [-8, -58, .9], [-25, -62, .7], [-40, -68, .4], [5, 20, 1.0], [-12, 25, .8], [25, 10, .9], [-28, 24, .5], [50, 20, .8], [55, 45, 1.0], [45, 70, 1.0], [60, 100, 1.1], [45, 105, .9], [65, 130, .9], [25, 80, .55], [30, 105, .7], [22, 100, .4], [36, 138, .3], [-25, 135, .85], [64, -42, .5]];
export function globe(R = 5, { ocean = '#0e1520', land = '#6a6f76', grid = true } = {}) {
  const g = new THREE.Group();
  const s = sphere(R, ocean, 48); s.castShadow = false; g.add(s);
  for (const [lat, lon, k] of LAND) {
    const r = k * R * .32;
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshBasicMaterial({ color: land, map: terrainTexture() }));
    b.position.copy(latLon(lat, lon, R - r * .82)); b.castShadow = false; g.add(b);
  }
  if (grid) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(R * 1.002, 24, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: .12 }));
    g.add(w);
  }
  g.userData.marker = (lat, lon, color, r = .18) => {
    const m = mesh(new THREE.SphereGeometry(r, 12, 8), color); m.castShadow = false;
    m.position.copy(latLon(lat, lon, R)); g.add(m); return m;
  };
  g.userData.arc = (a, b, color, { lift = 1.4, radius = .07 } = {}) => {
    const p0 = latLon(a[0], a[1], R), p2 = latLon(b[0], b[1], R);
    const mid = p0.clone().add(p2).multiplyScalar(.5).normalize().multiplyScalar(R * lift);
    const curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);
    const geo = new THREE.TubeGeometry(curve, 48, radius, 6, false);
    const m = new THREE.Mesh(geo, glowMat(color, 1.8));
    m.userData.total = geo.index.count;
    m.userData.setProgress = u => { geo.setDrawRange(0, Math.floor(m.userData.total * clamp(u, 0, 1))); m.visible = u > 0; };
    m.userData.setProgress(0);
    g.add(m); return m;
  };
  g.userData.R = R;
  return g;
}

// ---------- Effekte ----------
export function explosion({ color = P.orange, smoke = P.darkGrey, size = 1, duration = 1.6 } = {}) {
  const g = new THREE.Group();
  const core = mesh(new THREE.SphereGeometry(1, 12, 8), glowMat(color, 1.7));
  const ring = mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: smoke, transparent: true, opacity: .5 }));
  const flash = new THREE.PointLight(color, 0, 20);
  core.castShadow = ring.castShadow = false;
  g.add(core, ring, flash); g.visible = false;
  g.userData.at = age => {
    if (age < 0 || age > duration) { g.visible = false; flash.intensity = 0; return; }
    g.visible = true;
    const u = age / duration;
    core.scale.setScalar(size * easeOut(u * 3) * (1 - easeIn(u)) + .001);
    ring.scale.setScalar(size * (.6 + 1.6 * easeOut(u)) + .001);
    ring.material.opacity = .5 * (1 - u);
    ring.position.y = size * u * 1.2;
    flash.intensity = size * 40 * Math.max(0, 1 - u * 4);
  };
  return g;
}

export function smokeColumn(r, { color = P.darkGrey, height = 8, n = 9, width = .8 } = {}) {
  const g = new THREE.Group();
  const puffs = [];
  for (let i = 0; i < n; i++) {
    const p = mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshLambertMaterial({ color, transparent: true, opacity: .85 }));
    p.castShadow = false; p.userData.o = r(); p.userData.dx = (r() - .5) * 2; p.userData.dz = (r() - .5) * 2;
    puffs.push(p); g.add(p);
  }
  g.userData.at = (t, wind = .4) => {
    for (const p of puffs) {
      const u = (p.userData.o + t * .12) % 1;
      p.position.set(p.userData.dx * width * u + wind * u * height * .5, u * height, p.userData.dz * width * u);
      p.scale.setScalar(width * (.4 + u * 1.6));
      p.material.opacity = .85 * (1 - u * u);
    }
  };
  return g;
}

export function particles(r, { count = 800, area = [40, 20, 40], color = '#ffffff', size = .15, opacity = .9 } = {}) {
  const pos = new Float32Array(count * 3);
  const base = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    base[i * 3] = (r() - .5) * area[0]; base[i * 3 + 1] = r() * area[1]; base[i * 3 + 2] = (r() - .5) * area[2];
  }
  pos.set(base);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false });
  const pts = new THREE.Points(geo, m);
  pts.userData.drift = (t, vel = [0, -2, 0], sway = 0) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
      a[i * 3] = ((bx + vel[0] * t + Math.sin(t + by) * sway + area[0] / 2) % area[0] + area[0]) % area[0] - area[0] / 2;
      a[i * 3 + 1] = ((by + vel[1] * t) % area[1] + area[1]) % area[1];
      a[i * 3 + 2] = ((bz + vel[2] * t + area[2] / 2) % area[2] + area[2]) % area[2] - area[2] / 2;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

export function flag(colors = [P.red], { w = 1.6, h = 1.0, pole = 3 } = {}) {
  const g = new THREE.Group();
  const p = cyl(.04, .04, pole, P.darkGrey, 6); p.position.y = pole / 2; g.add(p);
  const n = colors.length;
  for (let i = 0; i < n; i++) {
    const s = mesh(new THREE.BoxGeometry(w, h / n, .04), colors[i]);
    s.position.set(w / 2 + .05, pole - (i + .5) * h / n, 0);
    g.add(s);
  }
  return g;
}

export function table(w = 4, d = 1.4, h = .8, color = P.brown) {
  const g = new THREE.Group();
  const top = box(w, .08, d, color); top.position.y = h;
  g.add(top);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const l = box(.1, h, .1, color); l.position.set(x * (w / 2 - .15), h / 2, z * (d / 2 - .15)); g.add(l);
  }
  return g;
}

export function paper(w = .6, h = .8) {
  const m = mesh(new THREE.BoxGeometry(w, .01, h), P.white); m.castShadow = false;
  const lines = new THREE.Group();
  for (let i = 0; i < 6; i++) { const l = box(w * .7, .012, .03, P.darkGrey); l.castShadow = false; l.position.set(-w * .05, .01, -h * .3 + i * h * .1); lines.add(l); }
  m.add(lines); m.userData.lines = lines.children;
  return m;
}

// Kamera-Parameter, die jede Szene bekommt
export function cameraParams(from, to, look, fov = 40) {
  return {
    fov: { type: 'number', min: 15, max: 90, step: 1, value: fov, label: 'Brennweite (FOV)', group: 'Kamera', live: true },
    camFromX: { type: 'number', min: -60, max: 60, step: .1, value: from[0], label: 'Start X', group: 'Kamera', live: true },
    camFromY: { type: 'number', min: -10, max: 60, step: .1, value: from[1], label: 'Start Y', group: 'Kamera', live: true },
    camFromZ: { type: 'number', min: -60, max: 60, step: .1, value: from[2], label: 'Start Z', group: 'Kamera', live: true },
    camToX: { type: 'number', min: -60, max: 60, step: .1, value: to[0], label: 'Ende X', group: 'Kamera', live: true },
    camToY: { type: 'number', min: -10, max: 60, step: .1, value: to[1], label: 'Ende Y', group: 'Kamera', live: true },
    camToZ: { type: 'number', min: -60, max: 60, step: .1, value: to[2], label: 'Ende Z', group: 'Kamera', live: true },
    lookX: { type: 'number', min: -60, max: 60, step: .1, value: look[0], label: 'Blickpunkt X', group: 'Kamera', live: true },
    lookY: { type: 'number', min: -10, max: 60, step: .1, value: look[1], label: 'Blickpunkt Y', group: 'Kamera', live: true },
    lookZ: { type: 'number', min: -60, max: 60, step: .1, value: look[2], label: 'Blickpunkt Z', group: 'Kamera', live: true },
    camEase: { type: 'select', options: ['linear', 'weich', 'rein', 'raus'], value: 'weich', label: 'Kamerafahrt', group: 'Kamera', live: true },
    camShake: { type: 'number', min: 0, max: 1, step: .01, value: 0, label: 'Wackeln', group: 'Kamera', live: true }
  };
}

export function disposeScene(scene) {
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); }
    }
  });
}

// Modell (schaut in +X) so einpacken, dass Object3D.lookAt() funktioniert (schaut dann in +Z der Hülle)
export function faceZ(model) {
  const g = new THREE.Group();
  model.rotation.y = -Math.PI / 2;
  g.add(model);
  return g;
}

// Wasserfläche mit Wellen: userData.at(t)
export function wavePlane(w, h, seg = 48, color = P.water, { amp = .12, opts = {} } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, seg, seg);
  const m = mesh(geo, color, opts);
  m.rotation.x = -Math.PI / 2; m.castShadow = false;
  const pos = geo.attributes.position;
  const base = Float32Array.from(pos.array);
  m.userData.at = t => {
    const a = pos.array;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      a[i * 3 + 2] = amp * (Math.sin(x * .5 + t * 1.6) + .6 * Math.sin(y * .35 + t * 1.1) + .3 * Math.sin((x + y) * .9 + t * 2.3));
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  return m;
}

// Unterschrift: Füller fährt zeilenweise über ein Blatt, Zeilen erscheinen nach und nach
export function signing(paperMesh, penColor = P.black) {
  const pen = cyl(.015, .025, .5, penColor, 8);
  pen.rotation.z = -.6; pen.rotation.x = .3; pen.castShadow = false;
  paperMesh.add(pen);
  const lines = paperMesh.userData.lines;
  return {
    pen,
    at(u) {  // u 0..1
      const n = lines.length, k = u * n;
      lines.forEach((l, i) => { l.visible = i < k; l.scale.x = i < Math.floor(k) ? 1 : (i === Math.floor(k) ? Math.max(.01, k - i) : .01); });
      const li = Math.min(n - 1, Math.floor(k)), f = k - li;
      const w = lines[0].geometry.parameters.width;
      pen.position.set(-w / 2 + f * w - .05, .25, lines[li].position.z);
      pen.visible = u > 0 && u < 1.02;
    }
  };
}
