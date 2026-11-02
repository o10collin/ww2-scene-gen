// Gemeinsame Hilfsfunktionen für alle Szenen.
// Alles ist deterministisch: Zufall nur über rng(seed), Animation nur als Funktion der Zeit t.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

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
  if (!labelsOn) s.visible = false;
  return s;
}

// ---------- Figuren & Fahrzeuge (alle schauen in +X) ----------
// ---------- Figurenmodelle (GLB, animiert) ----------
// ---------- Figurenmodelle: Mixamo-Charaktere (realistische Proportionen) + Mixamo-Animationsbibliothek ----------
// Modelle: Skelett „mixamorig:*“, Armature-Skalierung 0,01. Clips: eigene GLBs ohne Mesh, Knochen ohne Präfix,
// andere Hüft-Einheiten -> beim Laden werden Spurnamen umbenannt und die Hüftposition je Modell skaliert.
const SUF = (typeof window !== 'undefined' && window.MODEL_SUFFIX) || '';
const MX = 'assets/models/mixamo/', AN = 'assets/models/anim/';
export const MODEL_GROUPS = {
  soldier: ['soldier'],
  civil: ['remy', 'joe', 'megan', 'kate', 'suzie', 'louise', 'brian', 'james', 'leonard'],
  suit: ['leonard', 'james', 'brian'],
  worker: ['joe', 'remy', 'brian', 'kate'],
  kimono: ['megan', 'kate', 'suzie', 'joe']
};
MODEL_GROUPS.human = MODEL_GROUPS.civil;
export const MODEL_FILES = {};
for (const names of Object.values(MODEL_GROUPS)) for (const n of names) MODEL_FILES[n] = { url: MX + n + '.glb' + SUF, height: n === 'soldier' ? 1.78 : 1.72, forward: 0 };
export const CLIP_NAMES = ['Standing_Idle_Loop', 'Standing_Idle', 'Walking', 'Running_Fast', 'Jogging', 'Looking_Around', 'Thinking_While_Standing', 'Waving_With_Both_Hands',
  'Rifle_Idle', 'Rifle_Walk_Forward', 'Rifle_Run_Forward', 'Rifle_Walking_Crouched', 'Rifle_Aiming_And_Kneeling', 'Formal_Military_Salute', 'Pointing_Onward_Charge', 'Crouch_Idle',
  'Male_Writing_While_Seated', 'Male_Talking_While_Seated', 'Sitting_And_Talking_To_Another_Person', 'Clap_While_Seated', 'Sitting_Cross_Legged', 'Sitting_On_The_Floor', 'Banging_Fist_On_Table',
  'Rallying_The_Crowd_To_Make_Them_Cheer', 'Super_Excited', 'High_Enthusiasm_Fist_Pump', 'Pumping_A_Fist', 'Yelling_While_Standing_Leaning_Forward', 'Stepping_Forward_And_Yelling_Out', 'Standing_Arguing_With_Another_Person',
  'Lifting_A_Heavy_Object_With_Both_Hands', 'Carrying_A_Box', 'Pushing_Heavy_Object', 'Digging_Hole_With_Shovel',
  'Dying_Falling_Forward', 'Laying_On_The_Ground_Dying', 'Falling_Back_Death', 'Kneeling_Idle', 'Kneeling_In_Prayer', 'Injured_Walking', 'Injured_Standard_Idle', 'Standing_Praying_While_Swaying', 'Crying_And_Rubbing_Eyes'];
const ONESHOT = n => /Dying|Death|Salute|Pointing_Onward|Stepping_Forward/.test(n);
const BROKEN_HIPS = n => n === 'Walking';   // Hüftspur dieses Clips liegt auf Bodenhöhe
const ROLE_CLIPS = {
  soldier: { idle: 'Rifle_Idle', walk: 'Rifle_Walk_Forward', run: 'Rifle_Run_Forward' },
  civil: { idle: 'Standing_Idle_Loop', walk: 'Walking', run: 'Running_Fast' }
};
export const MODELS = {};
export const CLIPS = {};
let CLIP_HIP_Y = null;
let CLIP_HIP_REST = 1;
let figureMode = 'glb';           // 'glb' | 'capsule'
let labelsOn = true;
const FIGURES = new Set();
export function setFigureMode(m) { figureMode = m; }
export function setProportions() { /* nur noch zur Kompatibilität */ }
export function setLabels(on) { labelsOn = on; }

export async function preloadModels(onProgress) {
  const loader = new GLTFLoader();
  const jobs = [];
  for (const [key, def] of Object.entries(MODEL_FILES)) {
    if (MODELS[key]) continue;
    jobs.push(loader.loadAsync(def.url).then(gltf => {
      const root = gltf.scene;
      root.updateMatrixWorld(true);
      const box3 = new THREE.Box3().setFromObject(root);
      const h = Math.max(.01, box3.max.y - box3.min.y);
      let hips = null;
      root.traverse(o => { if (o.isBone && /Hips$/.test(o.name) && !hips) hips = o; });
      // Knochenpräfix (mixamorig, mixamorig4, …) und Drehung des Hüft-Elternteils im Ruhezustand:
      // Clips liefern die Hüfte in y-up-Konvention, die wir in den Elternraum des Modells umrechnen
      const prefix = hips ? hips.name.replace(/Hips$/, '') : 'mixamorig';
      const preInv = new THREE.Quaternion();
      if (hips && hips.parent) { hips.parent.getWorldQuaternion(preInv); preInv.invert(); }
      const hipLen = hips ? hips.position.length() : 100;
      const bones = new Set(); root.traverse(o => { if (o.isBone) bones.add(o.name); });
      MODELS[key] = { bones, scene: root, clips: gltf.animations, scale: def.height / h, def, minY: box3.min.y, hipLen, prefix, preInv, clipCache: {} };
      onProgress?.(key);
    }).catch(e => console.warn('Modell nicht ladbar', key, e)));
  }
  for (const name of CLIP_NAMES) {
    if (CLIPS[name]) continue;
    jobs.push(loader.loadAsync(AN + name + '.glb' + SUF).then(gltf => {
      const clip = gltf.animations[0]; clip.name = name;
      let hipsNode = null; gltf.scene.traverse(o => { if (/Hips$/.test(o.name) && !hipsNode) hipsNode = o; });
      const hipRest = hipsNode ? hipsNode.position.length() || 1 : 1;   // Ruhehöhe der Hüfte im Clip-Rig
      clip.tracks = clip.tracks.filter(tr => {
        const [bone, prop] = tr.name.split('.');
        if (prop === 'scale') return false;
        if (prop === 'position' && !bone.endsWith('Hips')) return false;
        tr.name = bone.replace(/^mixamorig\d*:?/, '') + '.' + prop;   // Basisname ohne Präfix, Präfix kommt je Modell dazu
        return true;
      });
      clip.userData = { hipRest };
      CLIPS[name] = clip;
    }).catch(e => console.warn('Clip nicht ladbar', name, e)));
  }
  await Promise.all(jobs);
  // Kanonische Hüfthöhe des Clip-Rigs: erster Frame der stehenden Idle-Animation
  const ref = CLIPS['Standing_Idle_Loop'] || Object.values(CLIPS)[0];
  const tr = ref?.tracks.find(t => t.name === 'Hips.position');
  CLIP_HIP_REST = tr ? Math.hypot(tr.values[0], tr.values[1], tr.values[2]) || 1 : 1;
  CLIP_HIP_Y = tr ? [tr.values[0], tr.values[1], tr.values[2]] : null;
  return MODELS;
}
// Clip an Modell anpassen (Hüftposition skalieren), gecacht
function clipFor(M, name) {
  if (M.clipCache[name]) return M.clipCache[name];
  const src = CLIPS[name]; if (!src) return null;
  const clip = src.clone();
  clip.tracks = clip.tracks.filter(tr => M.bones.has(M.prefix + tr.name.split('.')[0]));
  const k = M.hipLen / CLIP_HIP_REST;
  const q = new THREE.Quaternion(), v = new THREE.Vector3();
  for (const tr of clip.tracks) {
    const [bone, prop] = tr.name.split('.');
    tr.name = M.prefix + bone + '.' + prop;
    if (bone !== 'Hips') continue;
    const a = tr.values;
    if (prop === 'position') {
      const n = a.length / 3, times = tr.times;
      if (BROKEN_HIPS(name) && CLIP_HIP_Y) for (let i = 0; i < n; i++) { a[i * 3] = CLIP_HIP_Y[0]; a[i * 3 + 1] = CLIP_HIP_Y[1]; a[i * 3 + 2] = CLIP_HIP_Y[2]; }
      if (!ONESHOT(name) && n > 1) {
        // Wurzelbewegung entfernen: lineare Drift zwischen erstem und letztem Bild abziehen, damit Loops nicht zurückspringen
        const span = times[n - 1] - times[0] || 1;
        const d = [a[(n - 1) * 3] - a[0], a[(n - 1) * 3 + 1] - a[1], a[(n - 1) * 3 + 2] - a[2]];
        for (let i = 0; i < n; i++) { const f = (times[i] - times[0]) / span; a[i * 3] -= d[0] * f; a[i * 3 + 1] -= d[1] * f; a[i * 3 + 2] -= d[2] * f; }
      }
      for (let i = 0; i < a.length; i += 3) { v.set(a[i] * k, a[i + 1] * k, a[i + 2] * k).applyQuaternion(M.preInv); a[i] = v.x; a[i + 1] = v.y; a[i + 2] = v.z; }
    } else if (prop === 'quaternion') {
      for (let i = 0; i < a.length; i += 4) { q.set(a[i], a[i + 1], a[i + 2], a[i + 3]).premultiply(M.preInv); a[i] = q.x; a[i + 1] = q.y; a[i + 2] = q.z; a[i + 3] = q.w; }
    }
  }
  M.clipCache[name] = clip; return clip;
}
let frameId = 0;
export function animateFigures(t) {
  frameId++;
  for (const f of FIGURES) {
    const u = f.userData;
    if (!u.mixer) continue;
    if (u.drivenFrame !== frameId) u.play(u.idleName, t * u.speed + u.offset, 1);
  }
}

export function figure({ color = P.grey, head = P.skin, helmet = null, scale = 1, glow = null, strength = ROLE.strength, model = 'auto', pose = null, seed = 0, loopPose = false, clips = null } = {}) {
  const g = new THREE.Group();
  const gm = glow ? glowMat(glow, strength) : null;
  const groupKey = model === 'auto' ? (helmet ? 'soldier' : 'civil') : model;
  const names = MODEL_GROUPS[groupKey] || [groupKey];
  const n = seed || FIGURES.size + 1;
  const key = names[n % names.length];
  const dummyL = new THREE.Object3D(), dummyR = new THREE.Object3D();
  if (figureMode === 'glb' && MODELS[key]) {
    const M = MODELS[key];
    const inst = SkeletonUtils.clone(M.scene);
    inst.traverse(o => {
      if (o.isMesh) { o.material = gm || mat(color); o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; }
    });
    const wrap = new THREE.Group();
    wrap.add(inst);
    inst.scale.setScalar(M.scale); inst.position.y = -M.minY * M.scale;
    wrap.rotation.y = Math.PI / 2 - M.def.forward;   // Modell schaut in +X wie die Kapselfigur
    g.add(wrap);
    const mixer = new THREE.AnimationMixer(inst);
    const actions = {};
    const addClip = (c, nm) => {
      const a = mixer.clipAction(c); a.play(); a.enabled = false; a.setEffectiveWeight(0); actions[nm] = a;
      if (ONESHOT(nm) && !(loopPose && nm === pose)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    };
    for (const c of M.clips) addClip(c, c.name);
    for (const nm of CLIP_NAMES) { const c = clipFor(M, nm); if (c) addClip(c, nm); }
    const rc = clips || ROLE_CLIPS[groupKey === 'soldier' ? 'soldier' : 'civil'];
    g.userData.mixer = mixer; g.userData.actions = actions;
    g.userData.idleName = pose && actions[pose] ? pose : (actions[rc.idle] ? rc.idle : 'Standing_Idle_Loop');
    g.userData.speed = 1; g.userData.offset = (n % 97) * .37;
    g.userData.play = (name, time, weight = 1) => {
      if (!actions[name]) name = g.userData.idleName;
      for (const [nm, a] of Object.entries(actions)) { const on = nm === name; a.enabled = on; a.setEffectiveWeight(on ? weight : 0); }
      mixer.setTime(time);
    };
    g.userData.walk = (t, amp = 1) => {
      g.userData.drivenFrame = frameId + 1;
      g.userData.play(amp > 1.1 ? rc.run : rc.walk, t * (0.9 + amp * .3) + g.userData.offset, 1);
    };
    g.userData.pose = (name, time) => { g.userData.drivenFrame = frameId + 1; g.userData.play(name, time, 1); };
    FIGURES.add(g);
  } else {
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
    g.userData.walk = (t, amp = 1) => {
      const s = Math.sin(t * 8) * .5 * amp;
      legL.rotation.z = s; legR.rotation.z = -s; armL.rotation.z = -s * .8; armR.rotation.z = s * .8;
    };
    g.userData.armL = armL; g.userData.armR = armR;
    g.userData.pose = () => {};
  }
  if (!g.userData.armL) { g.userData.armL = dummyL; g.userData.armR = dummyR; }
  g.scale.setScalar(scale);
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
  const dark = new THREE.Color(color).multiplyScalar(.55);
  const hull = box(length, .9, beam, color); hull.position.y = .45;
  const bow = cone(beam / 2, 1.6, color, 4); bow.rotation.z = -Math.PI / 2; bow.rotation.x = Math.PI / 4; bow.position.set(length / 2 + .8, .45, 0);
  const stripe = box(length * .98, .12, beam + .02, dark); stripe.position.y = .7;
  const deck = box(length * .9, .15, beam * .9, P.darkGrey); deck.position.y = .95;
  const sup = box(length * .3, 1.2, beam * .7, color); sup.position.set(-length * .05, 1.6, 0);
  const sup2 = box(length * .2, .7, beam * .55, color); sup2.position.set(-length * .04, 2.55, 0);
  const bridge = box(length * .12, .5, beam * .6, dark); bridge.position.set(length * .03, 3.1, 0);
  const funnel = cyl(.25, .3, 1.3, P.darkGrey, 10); funnel.position.set(-length * .22, 2.3, 0);
  const funnelTop = cyl(.3, .25, .15, P.black, 10); funnelTop.position.set(-length * .22, 3.0, 0);
  const mast = cyl(.05, .05, 2.6, P.darkGrey, 6); mast.position.set(length * .1, 3.6, 0);
  const yard = box(1.2, .05, .05, P.darkGrey); yard.position.set(length * .1, 4.2, 0); yard.rotation.y = Math.PI / 2;
  const mast2 = cyl(.04, .04, 1.8, P.darkGrey, 6); mast2.position.set(-length * .3, 2.6, 0);
  g.add(hull, bow, stripe, deck, sup, sup2, bridge, funnel, funnelTop, mast, yard, mast2);
  // Rettungsboote und Reling
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) { const lb = mesh(new THREE.CapsuleGeometry(.12, .5, 3, 6), dark); lb.rotation.z = Math.PI / 2; lb.position.set(-length * .15 + i * 1.3, 1.45, side * beam * .45); g.add(lb); }
    const rail = box(length * .88, .03, .03, P.darkGrey); rail.position.set(0, 1.35, side * beam * .44); rail.castShadow = false; g.add(rail);
    for (let i = 0; i < Math.floor(length / 1.2); i++) { const post = cyl(.02, .02, .35, P.darkGrey, 4); post.castShadow = false; post.position.set(-length * .44 + i * 1.2, 1.2, side * beam * .44); g.add(post); }
  }
  for (let i = 0; i < guns; i++) {
    const t = cyl(.4, .45, .4, color, 12); t.position.set(length * .3 - i * .9, 1.2, 0);
    for (const dz of [-.12, .12]) { const b = cyl(.04, .05, 1.3, P.darkGrey, 6); b.rotation.z = -Math.PI / 2; b.position.set(length * .3 - i * .9 + .75, 1.28, dz); g.add(b); }
    g.add(t);
  }
  const aft = cyl(.4, .45, .4, color, 12); aft.position.set(-length * .4, 1.2, 0); g.add(aft);
  const aftB = cyl(.04, .05, 1.2, P.darkGrey, 6); aftB.rotation.z = Math.PI / 2; aftB.position.set(-length * .4 - .7, 1.28, 0); g.add(aftB);
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
export function building(w, h, d, color, { windows = 0, windowColor = P.yellow, lit = true, r = null, roof = true } = {}) {
  const g = new THREE.Group();
  const b = box(w, h, d, color); b.position.y = h / 2; g.add(b);
  const dark = typeof color === 'string' ? new THREE.Color(color).multiplyScalar(.55) : P.darkGrey;
  // Fensterreihen auf allen vier Seiten: dunkle Laibungen, optional beleuchtet
  const rows = Math.max(1, Math.floor(h / 1.25));
  const sides = [[w, 0, d / 2 + .02, 0], [w, 0, -d / 2 - .02, Math.PI], [d, w / 2 + .02, 0, Math.PI / 2], [d, -w / 2 - .02, 0, -Math.PI / 2]];
  const frameGeo = new THREE.PlaneGeometry(.42, .62), paneGeo = new THREE.PlaneGeometry(.3, .5);
  const total = sides.reduce((n, sd) => n + rows * Math.max(1, Math.floor(sd[0] / 1.1)), 0);
  const frames = new THREE.InstancedMesh(frameGeo, mat(dark), total);
  const panes = new THREE.InstancedMesh(paneGeo, new THREE.MeshBasicMaterial({ color: windowColor }), total);
  const o = new THREE.Object3D(); let k = 0; let litCount = 0;
  const rr = r || (() => .5);
  for (const [len, px, pz, ry] of sides) {
    const cols = Math.max(1, Math.floor(len / 1.1));
    for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) {
      const u = -len / 2 + (c + .5) * (len / cols);
      o.position.set(px + (ry === 0 || ry === Math.PI ? u : 0), .85 + row * 1.25, pz + (ry === 0 || ry === Math.PI ? 0 : u));
      o.rotation.set(0, ry, 0); o.updateMatrix();
      frames.setMatrixAt(k, o.matrix);
      const on = lit && windows > 0 && rr() < .5;
      o.scale.setScalar(on ? 1 : .0001); o.updateMatrix(); panes.setMatrixAt(k, o.matrix); o.scale.setScalar(1);
      if (on) litCount++; k++;
    }
  }
  g.add(frames, panes); g.userData.windows = panes;
  if (roof) {
    const par = box(w + .15, .25, d + .15, dark); par.position.y = h + .1; g.add(par);
    const chimney = box(.5, .9, .5, dark); chimney.position.set(w * .3, h + .5, -d * .25); g.add(chimney);
    if (rr() < .5) { const tank = cyl(.4, .4, .7, dark, 10); tank.position.set(-w * .25, h + .45, d * .2); g.add(tank); }
  }
  const door = box(.9, 1.6, .08, dark); door.position.set(w * .1, .8, d / 2 + .04); g.add(door);
  const sill = box(w * .98, .12, .12, dark); sill.position.set(0, .3, d / 2 + .06); g.add(sill);
  return g;
}
export function ruin(w, h, d, color, r = Math.random) {
  const g = new THREE.Group();
  const dark = new THREE.Color(color).multiplyScalar(.5);
  const cols = 3 + Math.floor(r() * 3);
  const heights = [];
  for (let i = 0; i < cols; i++) {
    const cw = w / cols, ch = h * (0.25 + r() * 0.75); heights.push(ch);
    const b = box(cw * .98, ch, d * (0.6 + r() * .4), color);
    b.position.set(-w / 2 + (i + .5) * cw, ch / 2, 0); g.add(b);
    // Fensterhöhlen in der Fassade
    for (let row = 0; row < Math.floor(ch / 1.3); row++) {
      const hole = box(cw * .45, .7, .12, dark); hole.castShadow = false;
      hole.position.set(b.position.x, .9 + row * 1.3, b.geometry.parameters.depth / 2 + .02); g.add(hole);
    }
  }
  // eingestürzte Geschossdecken und Stahlträger
  for (let i = 0; i < 3; i++) {
    const slab = box(w * (.3 + r() * .4), .18, d * .5, dark);
    slab.position.set((r() - .5) * w * .6, .4 + r() * h * .4, d * .3); slab.rotation.set((r() - .5) * .6, r() * .4, (r() - .5) * .5); g.add(slab);
  }
  for (let i = 0; i < 4; i++) {
    const bar = cyl(.03, .03, 1.2 + r() * 1.5, '#2a2a2a', 5); bar.castShadow = false;
    bar.position.set((r() - .5) * w, heights[i % heights.length] + .4, (r() - .5) * d); bar.rotation.set((r() - .5) * 1.2, 0, (r() - .5) * 1.2); g.add(bar);
  }
  // Schutthaufen davor
  for (let i = 0; i < 9; i++) {
    const s = box(.25 + r() * .6, .15 + r() * .35, .25 + r() * .6, i % 3 ? color : dark);
    s.position.set((r() - .5) * w * 1.4, .12, d / 2 + .2 + r() * 1.6); s.rotation.y = r() * 3; g.add(s);
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

// ---------- Requisiten ----------
export function streetLamp(h = 4, { color = P.darkGrey, lit = true, lightColor = '#ffe2b0' } = {}) {
  const g = new THREE.Group();
  const pole = cyl(.06, .08, h, color, 8); pole.position.y = h / 2;
  const arm = box(.8, .06, .06, color); arm.position.set(.35, h - .1, 0);
  const head = box(.35, .18, .25, color); head.position.set(.7, h - .2, 0);
  g.add(pole, arm, head);
  if (lit) {
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(.3, .04, .2), glowMat(lightColor, 1.6)); bulb.position.set(.7, h - .3, 0); g.add(bulb);
    const l = new THREE.PointLight(lightColor, 14, 10, 1.6); l.position.set(.7, h - .4, 0); g.add(l);
  }
  return g;
}
export function fence(length, { posts = 6, wires = 3, height = 2.2, color = P.darkGrey, barbed = true } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i <= posts; i++) {
    const p = cyl(.04, .05, height, color, 6); p.position.set(-length / 2 + i * (length / posts), height / 2, 0); g.add(p);
    if (barbed) { const t = box(.06, .5, .06, color); t.position.set(p.position.x, height + .2, -.15); t.rotation.x = .6; g.add(t); }
  }
  for (let w = 0; w < wires; w++) {
    const wire = cyl(.012, .012, length, '#9aa0a8', 4); wire.rotation.z = Math.PI / 2; wire.castShadow = false;
    wire.position.set(0, height * (.35 + .3 * w / Math.max(1, wires - 1)), 0); g.add(wire);
  }
  if (barbed) { const top = cyl(.012, .012, length, '#9aa0a8', 4); top.rotation.z = Math.PI / 2; top.castShadow = false; top.position.set(0, height + .35, -.3); g.add(top); }
  return g;
}
export function sandbags(r, n = 8, color = '#6f6650') {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const b = mesh(new THREE.CapsuleGeometry(.16, .4, 3, 8), color); b.rotation.z = Math.PI / 2;
    b.position.set((i % 4) * .55 - .8 + (i >= 4 ? .27 : 0), .16 + (i >= 4 ? .3 : 0), 0); b.rotation.y = (r() - .5) * .3; g.add(b);
  }
  return g;
}
export function crate(size = .8, color = P.brown) {
  const g = new THREE.Group();
  const b = box(size, size, size, color); b.position.y = size / 2; g.add(b);
  const dark = new THREE.Color(color).multiplyScalar(.6);
  for (const [x, y, z, rx, rz] of [[0, size / 2, size / 2 + .01, 0, Math.PI / 4], [0, size / 2, -size / 2 - .01, 0, -Math.PI / 4], [size / 2 + .01, size / 2, 0, Math.PI / 4, 0], [-size / 2 - .01, size / 2, 0, -Math.PI / 4, 0]]) {
    const st = box(rz ? size * 1.3 : .06, .06, rx ? size * 1.3 : .06, dark); st.castShadow = false; st.position.set(x, y, z); st.rotation.set(0, 0, rz); if (rx) st.rotation.set(0, rx, 0); g.add(st);
  }
  return g;
}
export function barrel(color = P.darkGrey) {
  const g = new THREE.Group();
  const b = cyl(.32, .32, .9, color, 14); b.position.y = .45; g.add(b);
  for (const y of [.2, .7]) { const ring = mesh(new THREE.TorusGeometry(.33, .025, 6, 18), P.black); ring.rotation.x = Math.PI / 2; ring.position.y = y; ring.castShadow = false; g.add(ring); }
  return g;
}
export function truck(color = P.olive) {
  const g = new THREE.Group();
  const bed = box(2.6, 1.0, 1.5, color); bed.position.set(-.6, 1.1, 0);
  const canvas = mesh(new THREE.CylinderGeometry(.78, .78, 2.5, 10, 1, false, 0, Math.PI), new THREE.Color(color).multiplyScalar(.8)); canvas.rotation.z = Math.PI / 2; canvas.rotation.y = Math.PI / 2; canvas.position.set(-.6, 1.6, 0);
  const cab = box(1.1, .9, 1.4, color); cab.position.set(1.3, 1.1, 0);
  const hood = box(.8, .6, 1.2, color); hood.position.set(2.2, .9, 0);
  g.add(bed, canvas, cab, hood);
  for (const x of [-1.4, -.4, 1.6]) for (const z of [-.75, .75]) { const w = cyl(.38, .38, .3, P.black, 12); w.rotation.x = Math.PI / 2; w.position.set(x, .38, z); g.add(w); }
  return g;
}
export function crater(radius, color = '#2b2f36') {
  const g = new THREE.Group();
  const d = disc(radius, color, 20); d.position.y = .02; g.add(d);
  const rim = mesh(new THREE.TorusGeometry(radius, radius * .18, 6, 20), new THREE.Color(color).multiplyScalar(1.6)); rim.rotation.x = Math.PI / 2; rim.position.y = .05; rim.castShadow = false; g.add(rim);
  return g;
}
export function palm(h = 4) {
  const g = new THREE.Group();
  const trunk = cyl(.1, .16, h, '#5a4634', 7); trunk.position.y = h / 2; trunk.rotation.z = .12; g.add(trunk);
  for (let i = 0; i < 7; i++) { const leaf = box(1.8, .05, .35, P.green); leaf.position.set(.3, h, 0); leaf.rotation.y = i / 7 * Math.PI * 2; leaf.rotation.z = -.5; leaf.position.x += Math.cos(leaf.rotation.y) * .8; leaf.position.z += Math.sin(leaf.rotation.y) * .8; g.add(leaf); }
  return g;
}
export function pagodaHouse(w, d, color = '#b9aa94') {
  const g = new THREE.Group();
  const b = box(w, 1.6, d, color); b.position.y = .8; g.add(b);
  const roof = mesh(new THREE.ConeGeometry(Math.max(w, d) * .85, .9, 4), '#4a4a50'); roof.rotation.y = Math.PI / 4; roof.position.y = 2.05; g.add(roof);
  const roof2 = mesh(new THREE.ConeGeometry(Math.max(w, d) * .55, .5, 4), '#4a4a50'); roof2.rotation.y = Math.PI / 4; roof2.position.y = 2.7; g.add(roof2);
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
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.userData.shared = true;
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

// Detaillierter Feuerball in Phasen: Blitz -> Feuerkugeln mit Flackern und Flammenzungen -> Nachzündungen ->
// Rauchpilz, der weiter aufsteigt, während das Feuer erlischt. Dazu Trümmerbrocken, Funken, Glut, Asche, Druckwellenring.
const tmpV = new THREE.Vector3();
export function fireball(r, { size = 2.5, duration = 3.2, debris = 60, sparks = 120, ring = true } = {}) {
  const g = new THREE.Group();
  const fireEnd = duration * .5;                                   // ab hier nur noch Rauch
  const cFire = new THREE.Color('#ffb347'), cHot = new THREE.Color('#fff2b0'), cDeep = new THREE.Color('#c8471e'), cSmoke = new THREE.Color('#2b2724');
  const fireMat = () => new THREE.MeshLambertMaterial({ color: '#ffb347', emissive: '#ff8a2a', emissiveIntensity: 1 });
  // Feuerkugeln: innerer heller Kern, äußere dunklere Kugeln
  const balls = [];
  for (let i = 0; i < 13; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), fireMat()); m.castShadow = false;
    const a = r() * Math.PI * 2, e = r() * Math.PI, inner = i < 5;
    balls.push({ m, dir: new THREE.Vector3(Math.sin(e) * Math.cos(a), Math.abs(Math.cos(e)) * .9 + .2, Math.sin(e) * Math.sin(a)), k: inner ? .5 + r() * .4 : .35 + r() * .45, reach: inner ? .35 : .7, delay: inner ? r() * .08 : .08 + r() * .2, spin: r() * 4, fl: r() * 6.28, tint: .85 + r() * .15 });
    g.add(m);
  }
  // Flammenzungen: schießen nach oben und erlöschen schnell
  const tongues = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 7), fireMat()); m.castShadow = false;
    tongues.push({ m, dir: new THREE.Vector3((r() - .5) * .8, 1, (r() - .5) * .8).normalize(), delay: .05 + r() * .25, len: 1.6 + r() * 1.4, k: .18 + r() * .18 });
    g.add(m);
  }
  // Nachzündungen: kleine helle Kugeln, die kurz aufblitzen
  const pops = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), glowMat('#fff0c0', 1.5)); m.castShadow = false;
    pops.push({ m, t0: .3 + r() * .9, pos: new THREE.Vector3((r() - .5) * size * 1.0, size * (.3 + r() * .7), (r() - .5) * size * 1.0), k: .07 + r() * .09 });
    g.add(m);
  }
  // Rauchpilz: dunkle Kugeln, die nach oben treiben und sich ausbreiten
  const smokes = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), new THREE.MeshLambertMaterial({ color: '#2a2624', transparent: true, opacity: .45 })); m.castShadow = false;
    const a = r() * 6.283;
    smokes.push({ m, dx: Math.cos(a) * (.3 + r() * .7), dz: Math.sin(a) * (.3 + r() * .7), delay: .15 + r() * .6, k: .18 + r() * .26, rise: .6 + r() * .6, wob: r() * 6.28 });
    g.add(m);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), glowMat('#fff2b0', 2.4)); core.castShadow = false; g.add(core);
  // Trümmerbrocken als kleine rotierende Klötze
  const chunks = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#2a2622' })); m.castShadow = false;
    const a = r() * 6.283, e = .5 + r() * .9, sp = size * (2 + r() * 3);
    chunks.push({ m, v: [Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp], s: size * (.05 + r() * .07), rot: [r() * 8, r() * 8, r() * 8], sp: .7 + r() * .5 });
    g.add(m);
  }
  const mkPoints = (n, color, sz, op) => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(1, n) * 3), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: sz, transparent: true, opacity: op, depthWrite: false }));
    pts.material.toneMapped = false; return pts;
  };
  const nEmb = Math.max(8, debris >> 2), nAsh = Math.max(8, sparks >> 1);
  const deb = mkPoints(debris, '#2a2420', .2, .95), spk = mkPoints(sparks, '#ffd080', .08, 1);
  const emb = mkPoints(nEmb, '#ff7a1a', .26, 1), ash = mkPoints(nAsh, '#8a7a68', .07, .7);
  const dv = [], sv = [], ev = [], av = [];
  for (let i = 0; i < debris; i++) { const a = r() * 6.283, e = .3 + r() * 1.1, sp = size * (2 + r() * 4); dv.push([Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp, r()]); }
  for (let i = 0; i < sparks; i++) { const a = r() * 6.283, e = r() * 1.5, sp = size * (3 + r() * 6); sv.push([Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp, r()]); }
  for (let i = 0; i < nEmb; i++) { const a = r() * 6.283, e = .5 + r() * .9, sp = size * (2.5 + r() * 3); ev.push([Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp, r()]); }
  for (let i = 0; i < nAsh; i++) av.push([(r() - .5) * size * 1.6, r() * size * 1.5, (r() - .5) * size * 1.6, .4 + r() * 1.2]);
  g.add(deb, spk, emb, ash);
  const shock = ring ? new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, side: THREE.DoubleSide, depthWrite: false })) : null;
  if (shock) { shock.rotation.x = -Math.PI / 2; shock.position.y = .05; g.add(shock); }
  const flash = new THREE.PointLight('#ffb060', 0, size * 14, 1.5); g.add(flash);
  const tmpC = new THREE.Color();
  g.visible = false;
  g.userData.at = age => {
    if (age < 0 || age > duration) { g.visible = false; flash.intensity = 0; return; }
    g.visible = true;
    const u = age / duration;
    const flick = 1 + .18 * Math.sin(age * 37) + .12 * Math.sin(age * 59 + 1.3);
    for (const b of balls) {
      const bu = clamp((age - b.delay) / (fireEnd - b.delay), 0, 1);
      const grow = easeOut(bu * 1.4);
      const rad = size * b.k * (.12 + grow * .45) * (1 - bu * bu * .9);
      b.m.scale.set(Math.max(.001, rad), Math.max(.001, rad * (.85 + (b.k - .45) * .5)), Math.max(.001, rad));
      b.m.position.copy(b.dir).multiplyScalar(size * grow * b.reach).add(tmpV.set(0, size * bu * bu * 1.2, 0));
      b.m.rotation.y = b.spin * bu;
      const col = bu < .22 ? tmpC.copy(cHot).lerp(cFire, bu / .22) : tmpC.copy(cFire).lerp(cDeep, Math.pow((bu - .22) / .78, .8));
      b.m.material.color.copy(col).multiplyScalar(.6 * b.tint);
      b.m.material.emissive.copy(col).multiplyScalar((bu < .3 ? 1.3 : Math.max(.15, 1 - bu * 1.1)) * flick * b.tint);
      b.m.visible = bu > 0 && bu < 1;
    }
    for (const tg of tongues) {
      const tu = clamp((age - tg.delay) / .55, 0, 1);
      tg.m.visible = tu > 0 && tu < 1;
      if (tg.m.visible) {
        const s = size * tg.k * (1 - tu * .5);
        tg.m.scale.set(s, s * tg.len * (1 + tu), s);
        tg.m.position.copy(tg.dir).multiplyScalar(size * (.3 + easeOut(tu) * 1.2));
        tg.m.lookAt(tmpV.copy(tg.m.position).add(tg.dir)); tg.m.rotateX(Math.PI / 2);
        tmpC.copy(cHot).lerp(cFire, tu); tg.m.material.color.copy(tmpC).multiplyScalar(.8); tg.m.material.emissive.copy(tmpC).multiplyScalar((1.4 - tu * 1.2) * flick);
      }
    }
    for (const pp of pops) {
      const pu = clamp((age - pp.t0) / .3, 0, 1);
      pp.m.visible = pu > 0 && pu < 1;
      if (pp.m.visible) { pp.m.position.copy(pp.pos); pp.m.scale.setScalar(Math.max(.001, size * pp.k * Math.sin(pu * Math.PI))); }
    }
    for (const sm of smokes) {
      const su = clamp((age - sm.delay) / (duration - sm.delay), 0, 1);
      sm.m.visible = su > 0;
      if (!sm.m.visible) continue;
      const s = size * sm.k * (.3 + easeOut(su) * 1.0);
      sm.m.scale.setScalar(Math.max(.001, s));
      sm.m.position.set(sm.dx * size * (.4 + su * .9) + Math.sin(age * 1.3 + sm.wob) * .12 * size, size * (.4 + su * sm.rise * 1.8), sm.dz * size * (.4 + su * .9));
      sm.m.material.opacity = .45 * Math.min(1, su * 4) * (1 - su * su);
      const warm = Math.max(0, 1 - su * 3);                        // frischer Rauch noch vom Feuer beleuchtet
      sm.m.material.color.copy(cSmoke).lerp(cDeep, warm * .3);
      sm.m.material.emissive.copy(cDeep).multiplyScalar(warm * .3 * flick);
    }
    const cu = clamp(age / .3, 0, 1);
    core.scale.setScalar(Math.max(.001, size * .4 * Math.sin(cu * Math.PI)));
    core.visible = cu < 1;
    for (const c of chunks) {
      const tt = age * c.sp;
      c.m.position.set(c.v[0] * tt, Math.max(c.s, c.v[1] * tt - 9.81 * tt * tt * .5), c.v[2] * tt);
      c.m.rotation.set(c.rot[0] * tt, c.rot[1] * tt, c.rot[2] * tt);
      c.m.scale.setScalar(c.s); c.m.visible = u < .85;
    }
    const pa = deb.geometry.attributes.position.array;
    for (let i = 0; i < debris; i++) { const d = dv[i], tt = age * (.7 + d[3] * .6); pa[i * 3] = d[0] * tt; pa[i * 3 + 1] = Math.max(0, d[1] * tt - 9.81 * tt * tt * .5); pa[i * 3 + 2] = d[2] * tt; }
    deb.geometry.attributes.position.needsUpdate = true; deb.material.opacity = .95 * (1 - u);
    const sa = spk.geometry.attributes.position.array;
    for (let i = 0; i < sparks; i++) { const d = sv[i], tt = Math.min(age, 1.2) * (.6 + d[3] * .7); sa[i * 3] = d[0] * tt; sa[i * 3 + 1] = Math.max(0, d[1] * tt - 9.81 * tt * tt * .35); sa[i * 3 + 2] = d[2] * tt; }
    spk.geometry.attributes.position.needsUpdate = true; spk.material.opacity = Math.max(0, 1 - age / 1.3);
    const ea = emb.geometry.attributes.position.array;
    for (let i = 0; i < nEmb; i++) { const d = ev[i], tt = age * (.8 + d[3] * .5); ea[i * 3] = d[0] * tt; ea[i * 3 + 1] = Math.max(.1, d[1] * tt - 9.81 * tt * tt * .5); ea[i * 3 + 2] = d[2] * tt; }
    emb.geometry.attributes.position.needsUpdate = true; emb.material.opacity = Math.max(0, 1 - u * 1.1) * (.8 + .2 * Math.sin(age * 23)); emb.material.size = .26 * (1 - u * .5);
    const aa = ash.geometry.attributes.position.array;
    for (let i = 0; i < nAsh; i++) { const d = av[i]; aa[i * 3] = d[0] + Math.sin(age * 2 + i) * .3; aa[i * 3 + 1] = d[1] + age * d[3] * 2.5; aa[i * 3 + 2] = d[2] + Math.cos(age * 1.7 + i) * .3; }
    ash.geometry.attributes.position.needsUpdate = true; ash.material.opacity = Math.max(0, .7 - u * .8);
    if (shock) { const su = clamp(age / 1.0, 0, 1); shock.scale.setScalar(.5 + su * size * 4); shock.material.opacity = (1 - su) * .25; shock.visible = su < 1; }
    flash.intensity = size * 60 * Math.max(0, 1 - age * 3) + size * 6 * Math.max(0, 1 - age / fireEnd) * flick;
  };
  return g;
}

// Dauerbrand: ruhig flackernde Flammenzungen mit Glutpartikeln (für brennende Schiffe, Ölteppiche, Ruinen)
export function flame(r, { size = 1, tongues = 6, embers = 24 } = {}) {
  const g = new THREE.Group();
  const cHot = new THREE.Color('#ffe9a0'), cFire = new THREE.Color('#ff9a30'), cDeep = new THREE.Color('#c8471e');
  const tg = [];
  for (let i = 0; i < tongues; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 7), new THREE.MeshLambertMaterial({ color: '#ff9a30', emissive: '#ff8a2a', emissiveIntensity: 1.2, transparent: true, opacity: .9 })); m.castShadow = false;
    tg.push({ m, x: (r() - .5) * size * .7, z: (r() - .5) * size * .7, ph: r() * 6.28, sp: 2.2 + r() * 1.6, k: .14 + r() * .18, len: 1.8 + r() * 1.4 });
    g.add(m);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(1, embers) * 3), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ff8a3a', size: .12 * size, transparent: true, opacity: .9, depthWrite: false })); pts.material.toneMapped = false; g.add(pts);
  const ev = []; for (let i = 0; i < embers; i++) ev.push([(r() - .5) * size, (r() - .5) * size, r(), .6 + r() * .8]);
  const tmpC = new THREE.Color();
  g.visible = false;
  g.userData.at = (age, strength = 1) => {
    if (age < 0) { g.visible = false; return; }
    g.visible = true;
    const on = Math.min(1, age / .5) * strength;
    for (const t of tg) {
      const w = .5 + .5 * Math.sin(age * t.sp + t.ph), w2 = Math.sin(age * t.sp * 1.7 + t.ph * 2);
      const s = size * t.k * on * (.7 + .3 * w);
      t.m.scale.set(Math.max(.001, s * .7), Math.max(.001, s * t.len * (.8 + .5 * w)), Math.max(.001, s * .7));
      t.m.position.set(t.x + w2 * .1 * size, s * t.len * .6, t.z + Math.cos(age * t.sp + t.ph) * .08 * size);
      tmpC.copy(cHot).lerp(w > .5 ? cFire : cDeep, .4 + .6 * w);
      t.m.material.color.copy(tmpC).multiplyScalar(.7); t.m.material.emissive.copy(tmpC).multiplyScalar(.8 + .4 * w);
      t.m.material.opacity = .9 * on;
    }
    const pa = geo.attributes.position.array;
    for (let i = 0; i < embers; i++) { const e = ev[i], k = (e[2] + age * e[3] * .35) % 1; pa[i * 3] = e[0] + Math.sin(age * 3 + i) * .15 * size * k; pa[i * 3 + 1] = k * size * 2.2; pa[i * 3 + 2] = e[1] + Math.cos(age * 2.3 + i) * .15 * size * k; }
    geo.attributes.position.needsUpdate = true; pts.material.opacity = .9 * on;
  };
  return g;
}

// Wassersäule: Sprühkuppel am Wasser, klumpige Säule aus Gischtballen, Fontänenstrahlen, Gischtkrone,
// grobe Tropfen und feiner Sprühnebel, hängende Nebelwolke nach dem Zusammenfall, Schaum und Ringwellen
export function waterColumn(r, { height = 9, radius = .9, duration = 2.6, drops = 140 } = {}) {
  const g = new THREE.Group();
  const white = () => new THREE.MeshLambertMaterial({ color: '#d3dfe9', transparent: true, opacity: .88 });
  // Säule aus vielen kleinen, versetzten Gischtballen
  const lumps = [];
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), white()); m.castShadow = false;
    const h = Math.pow(r(), .8), a = r() * 6.283, d = (.1 + r() * 1.2) * (1.2 - h * .7);   // unten breit, oben schmal, unregelmäßig
    lumps.push({ m, h, k: (.38 + r() * .4) * (1.2 - h * .5), dx: Math.cos(a) * d, dz: Math.sin(a) * d, wob: r() * 6.28, len: 1.0 + r() * .6 });
    g.add(m);
  }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(.3, .9, 1, 14, 1, true), new THREE.MeshLambertMaterial({ color: '#d3dfe9', transparent: true, opacity: .7, depthWrite: false })); core.castShadow = false; g.add(core);
  // Fontänenstrahlen, die über die Säule hinausschießen
  const jets = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 6), white()); m.castShadow = false;
    const a = r() * 6.283, spread = .15 + r() * .35;
    jets.push({ m, dir: new THREE.Vector3(Math.cos(a) * spread, 1, Math.sin(a) * spread).normalize(), v: height * (1.1 + r() * .5), delay: .05 + r() * .25, k: .07 + r() * .08, len: 2.5 + r() * 2.5 });
    g.add(m);
  }
  const crown = new THREE.Group();
  for (let i = 0; i < 11; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), white()); b.castShadow = false; b.userData.a = i / 11 * 6.283 + r() * .5; b.userData.k = .5 + r() * .8; b.userData.e = .6 + r() * .9; crown.add(b); }
  g.add(crown);
  // Sprühkuppel am Fuß
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#e8f0f6', transparent: true, opacity: .7 })); dome.castShadow = false; g.add(dome);
  // Nebelwolke, die nach dem Zusammenfall hängen bleibt
  const mists = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshLambertMaterial({ color: '#cfdbe6', transparent: true, opacity: .35 })); m.castShadow = false;
    const a = r() * 6.283; mists.push({ m, dx: Math.cos(a) * (.5 + r()), dz: Math.sin(a) * (.5 + r()), k: .3 + r() * .25, h: .2 + r() * .35 }); g.add(m);
  }
  const mkPts = (n, color, sz, op) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(1, n) * 3), 3)); const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: sz, transparent: true, opacity: op, depthWrite: false })); pts.material.toneMapped = false; g.add(pts); return pts; };
  const coarse = mkPts(drops, '#f4f8ff', .16, .95), fine = mkPts(drops, '#dfe9f2', .06, .6);
  const dv = [], fv = [];
  for (let i = 0; i < drops; i++) { const a = r() * 6.283, sp = radius * (1.5 + r() * 4), up = height * (.9 + r() * .5); dv.push([Math.cos(a) * sp, up, Math.sin(a) * sp, r() * .3]); }
  for (let i = 0; i < drops; i++) { const a = r() * 6.283, sp = radius * (2 + r() * 6), up = height * (1.0 + r() * .7); fv.push([Math.cos(a) * sp, up, Math.sin(a) * sp, r() * .4]); }
  const foam = new THREE.Mesh(new THREE.RingGeometry(.6, 1, 40), new THREE.MeshBasicMaterial({ color: '#dfe8f0', transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.y = .06; g.add(foam);
  const ripples = [];
  for (let i = 0; i < 2; i++) { const rp = new THREE.Mesh(new THREE.RingGeometry(.95, 1, 48), new THREE.MeshBasicMaterial({ color: '#cfdbe6', transparent: true, side: THREE.DoubleSide, depthWrite: false })); rp.rotation.x = -Math.PI / 2; rp.position.y = .04; g.add(rp); ripples.push(rp); }
  g.visible = false;
  g.userData.at = age => {
    if (age < 0 || age > duration) { g.visible = false; return; }
    g.visible = true;
    const u = age / duration;
    const rise = easeOut(clamp(age / .9, 0, 1));                    // Säule schießt hoch
    const fall = clamp((age - .9) / (duration - .9), 0, 1);           // und sinkt zusammen
    const h = height * rise * (1 - fall * .85);
    const fade = 1 - fall * .75;
    core.scale.set(radius * (1 + fall * .5), Math.max(.01, h), radius * (1 + fall * .5)); core.position.y = h / 2; core.visible = h > .1; core.material.opacity = .7 * fade;
    for (const l of lumps) {
      const top = l.h * height * rise;                                 // Ballen erscheinen, sobald die Säule ihre Höhe erreicht
      const vis = top < h + radius && fall < .95;
      l.m.visible = vis; if (!vis) continue;
      const s = radius * l.k * (1 + fall * .3) * Math.min(1, (h - top + radius) / radius);
      l.m.scale.set(Math.max(.01, s), Math.max(.01, s * l.len), Math.max(.01, s));
      l.m.position.set(l.dx * radius * (1 + fall * .6) + Math.sin(age * 4 + l.wob) * .08 * radius, Math.min(top, h), l.dz * radius * (1 + fall * .6) + Math.cos(age * 3 + l.wob) * .08 * radius);
      l.m.material.opacity = .88 * fade;
    }
    for (const j of jets) {
      const tt = Math.max(0, age - j.delay);
      const y = j.v * tt - 9.81 * tt * tt * .5;
      j.m.visible = tt > 0 && y > 0 && age < 1.6;
      if (!j.m.visible) continue;
      j.m.position.set(j.dir.x * j.v * tt, y, j.dir.z * j.v * tt);
      const s = radius * j.k * (1 - tt * .25);
      j.m.scale.set(Math.max(.01, s), Math.max(.01, s * j.len * Math.max(.4, 1 - tt * .5)), Math.max(.01, s));
      j.m.material.opacity = .9 * Math.max(0, 1 - tt * .7);
    }
    const cr = clamp((age - .5) / 1.0, 0, 1);
    crown.position.y = h; crown.visible = cr > 0 && fall < .9;
    for (const b of crown.children) { const k = b.userData.k, s = radius * (.2 + cr * .5) * k * (1 - fall * .6); b.scale.set(Math.max(.01, s), Math.max(.01, s * b.userData.e), Math.max(.01, s)); b.position.set(Math.cos(b.userData.a) * radius * (.3 + cr * 1.1) * k, -cr * radius * .5 - s * .3, Math.sin(b.userData.a) * radius * (.3 + cr * 1.1) * k); b.material.opacity = .92 * fade; }
    const du = clamp(age / .9, 0, 1);
    dome.visible = du < 1; dome.scale.set(radius * (1 + easeOut(du) * 1.8), radius * (.4 + easeOut(du) * .8) * (1 - du), radius * (1 + easeOut(du) * 1.8)); dome.material.opacity = .4 * (1 - du);
    const pa = coarse.geometry.attributes.position.array;
    for (let i = 0; i < drops; i++) { const d = dv[i], tt = Math.max(0, age - .4 - d[3]); pa[i * 3] = d[0] * tt * .6; pa[i * 3 + 1] = Math.max(0, d[1] * tt - 9.81 * tt * tt * .5); pa[i * 3 + 2] = d[2] * tt * .6; }
    coarse.geometry.attributes.position.needsUpdate = true; coarse.material.opacity = age > .4 ? .95 * (1 - u) : 0;
    const fa = fine.geometry.attributes.position.array;
    for (let i = 0; i < drops; i++) { const d = fv[i], tt = Math.max(0, age - .3 - d[3]); fa[i * 3] = d[0] * tt * .5; fa[i * 3 + 1] = Math.max(0, d[1] * tt - 9.81 * tt * tt * .3); fa[i * 3 + 2] = d[2] * tt * .5; }
    fine.geometry.attributes.position.needsUpdate = true; fine.material.opacity = age > .3 ? .6 * (1 - u) : 0;
    const mu = clamp((age - 1.0) / (duration - 1.0), 0, 1);
    for (const m of mists) {
      m.m.visible = mu > 0; if (!m.m.visible) continue;
      const s = radius * m.k * (1 + mu * 1.0); m.m.scale.setScalar(Math.max(.01, s));
      m.m.position.set(m.dx * radius * (1 + mu * 1.2), height * m.h * (1 - mu * .4) + s * .3, m.dz * radius * (1 + mu * 1.2));
      m.m.material.opacity = .18 * Math.sin(mu * Math.PI);
    }
    const fu = clamp(age / 1.6, 0, 1); foam.scale.setScalar(radius * (1 + fu * 2)); foam.material.opacity = (1 - fu) * .22;
    ripples.forEach((rp, i) => { const ru = clamp((age - .3 - i * .5) / 1.8, 0, 1); rp.visible = ru > 0 && ru < 1; rp.scale.setScalar(radius * (1.5 + ru * 3.5)); rp.material.opacity = (1 - ru) * .1; });
  };
  return g;
}

export function smokeColumn(r, { color = P.darkGrey, height = 8, n = 9, width = .8 } = {}) {
  const g = new THREE.Group();
  const puffs = [];
  for (let i = 0; i < n; i++) {
    const p = mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshLambertMaterial({ color, transparent: true, opacity: .7 }));
    p.castShadow = false; p.userData.o = r(); p.userData.dx = (r() - .5) * 2; p.userData.dz = (r() - .5) * 2;
    puffs.push(p); g.add(p);
  }
  g.userData.at = (t, wind = .4) => {
    for (const p of puffs) {
      const u = (p.userData.o + t * .12) % 1;
      p.position.set(p.userData.dx * width * u + wind * u * height * .5, u * height, p.userData.dz * width * u);
      p.scale.setScalar(width * (.4 + u * 1.6));
      p.material.opacity = .7 * (1 - u * u);
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
  FIGURES.clear();
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) { if (m.map && !m.map.userData?.shared) m.map.dispose(); m.dispose(); }
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
