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
// Low-Poly-Look: facettierte Flächen, weniger Segmente, Ikosaeder statt Kugeln, kantige Effekte
let lowPoly = true;
export function setLowPoly(on) { lowPoly = !!on; }
export const isLowPoly = () => lowPoly;
const lpSeg = seg => lowPoly ? Math.min(seg, Math.max(5, Math.round(seg * .45))) : seg;
export function mat(color, opts = {}) {
  const M = shading === 'toon' ? THREE.MeshToonMaterial : THREE.MeshLambertMaterial;
  return new M({ color, ...opts });
}
export function mesh(geo, color, opts) {
  if (lowPoly && !geo.userData.smooth && geo.type !== 'BoxGeometry' && geo.type !== 'PlaneGeometry') {   // flache Normalen = sichtbare Facetten (Quader/Flächen sind schon flach)
    if (geo.index) geo = geo.toNonIndexed();
    geo.computeVertexNormals();
    if (!geo.attributes.color) {                                                     // Facetten-Helligkeit für Materialien mit vertexColors (z. B. flache Papierwolken)
      const n = geo.attributes.position.count, c = new Float32Array(n * 3);
      for (let f = 0; f < n; f += 3) { const x = Math.sin((f / 3 + 1) * 12.9898) * 43758.5453, b = .8 + .2 * (x - Math.floor(x)); for (let v = 0; v < 9; v++) c[f * 3 + v] = b; }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    }
  }
  const m = new THREE.Mesh(geo, color instanceof THREE.Material ? color : mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), c, o);
export const cyl = (rt, rb, h, c, seg = 16, o) => mesh(new THREE.CylinderGeometry(rt, rb, h, lpSeg(seg)), c, o);
export const sphere = (r, c, seg = 16, o) => mesh(lowPoly ? new THREE.IcosahedronGeometry(r, seg >= 24 ? 2 : 1) : new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2 | 0)), c, o);
export const cone = (r, h, c, seg = 16, o) => mesh(new THREE.ConeGeometry(r, h, lpSeg(seg)), c, o);
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
for (const names of Object.values(MODEL_GROUPS)) for (const n of names) {
  MODEL_FILES[n] = { url: MX + n + '.glb' + SUF, height: n === 'soldier' ? 1.78 : 1.72, forward: 0 };
  MODEL_FILES[n + '_lp'] = { url: MX.replace(/mixamo\/$/, 'mixamo-lp/') + n + '.glb' + SUF, height: n === 'soldier' ? 1.78 : 1.72, forward: 0, lowPoly: true };   // vereinfachte Fassung (~2000 Dreiecke)
}
export const CLIP_NAMES = ['Standing_Idle_Loop', 'Standing_Idle', 'Walking', 'Running_Fast', 'Jogging', 'Looking_Around', 'Thinking_While_Standing', 'Waving_With_Both_Hands',
  'Rifle_Idle', 'Rifle_Walk_Forward', 'Rifle_Run_Forward', 'Rifle_Walking_Crouched', 'Rifle_Aiming_And_Kneeling', 'Formal_Military_Salute', 'Pointing_Onward_Charge', 'Crouch_Idle',
  'Male_Writing_While_Seated', 'Male_Talking_While_Seated', 'Sitting_And_Talking_To_Another_Person', 'Clap_While_Seated', 'Sitting_Cross_Legged', 'Sitting_On_The_Floor', 'Banging_Fist_On_Table',
  'Rallying_The_Crowd_To_Make_Them_Cheer', 'Super_Excited', 'High_Enthusiasm_Fist_Pump', 'Pumping_A_Fist', 'Yelling_While_Standing_Leaning_Forward', 'Stepping_Forward_And_Yelling_Out', 'Standing_Arguing_With_Another_Person',
  'Lifting_A_Heavy_Object_With_Both_Hands', 'Carrying_A_Box', 'Pushing_Heavy_Object', 'Digging_Hole_With_Shovel',
  'Dying_Falling_Forward', 'Laying_On_The_Ground_Dying', 'Falling_Back_Death', 'Kneeling_Idle', 'Kneeling_In_Prayer', 'Injured_Walking', 'Injured_Standard_Idle', 'Standing_Praying_While_Swaying', 'Crying_And_Rubbing_Eyes'];
const ONESHOT = n => /Dying|Death|Salute|Pointing_Onward|Stepping_Forward/.test(n);
const BROKEN_HIPS = n => n === 'Walking';   // Hüftspur dieses Clips liegt auf Bodenhöhe
// Meter pro Clip-Durchlauf (vor dem Entfernen der Wurzelbewegung gemessen), damit Schritte zur Strecke passen
const LOOP_M = { Rifle_Walk_Forward: 1.94, Rifle_Run_Forward: 2.43, Rifle_Walking_Crouched: 1.21, Injured_Walking: 2.1, Walking: 1.55, Walk_Natural: 1.62, Run_Natural: 1.63, Running_Fast: 2.2, Jogging: 5.09, Pushing_Heavy_Object: 1.21 };
const ROLE_CLIPS = {
  soldier: { idle: 'Rifle_Idle', walk: 'Rifle_Walk_Forward', run: 'Rifle_Run_Forward' },
  civil: { idle: 'Standing_Idle_Loop', walk: 'Walk_Natural', run: 'Run_Natural' }
};
export const MODELS = {};
export const CLIPS = {};
let CLIP_HIP_Y = null;
let CLIP_HIP_Q = null;
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
      if (def.lowPoly) root.traverse(o => {                                           // flache Normalen und Facetten-Helligkeit
        if (!o.isMesh) return;
        let g = o.geometry; if (g.index) g = g.toNonIndexed();
        g.computeVertexNormals();
        const n = g.attributes.position.count, c = new Float32Array(n * 3);
        for (let f = 0; f < n; f += 3) { const x = Math.sin((f / 3 + 1) * 12.9898) * 43758.5453, b = .72 + .28 * (x - Math.floor(x)); for (let v = 0; v < 9; v++) c[f * 3 + v] = b; }
        g.setAttribute('color', new THREE.BufferAttribute(c, 3));
        o.geometry = g;
      });
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
  const tq = ref?.tracks.find(t => t.name === 'Hips.quaternion');
  CLIP_HIP_Q = tq ? new THREE.Quaternion(tq.values[0], tq.values[1], tq.values[2], tq.values[3]) : null;
  // Natürlicher Gang und Lauf aus dem three.js-Soldaten („Walk“, „Run“), auf das Mixamo-Rig der Zivilfiguren umgerechnet.
  // Die Ruheposen beider Skelette unterscheiden sich (Hüfte, Oberschenkel, Wirbelsäule); ein bloßes Kopieren der lokalen
  // Drehungen schnürt deshalb die Taille ein. Stattdessen je Knochen die Weltdrehung relativ zur Ruhepose übertragen:
  // W_ziel = R · (W_soldat · W_soldat_ruhe⁻¹) · R⁻¹ · W_ziel_ruhe, R = 180° um die Hochachse (Soldat blickt entgegengesetzt).
  const SM = MODELS.soldier, TM = MODELS.brian || Object.values(MODELS).find(m => m !== SM && !m.def.lowPoly);
  if (SM && TM) {
    const base = nm => nm.replace(/^mixamorig\d*:?/, '');
    const preQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI).multiply(SM.preInv.clone().invert()), k = CLIP_HIP_REST / SM.hipLen, v = new THREE.Vector3();
    const R = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), Ri = R.clone().invert();
    const sInst = SkeletonUtils.clone(SM.scene); sInst.updateMatrixWorld(true);
    const sBones = {}, sRest = {};
    sInst.traverse(o => { if (o.isBone) { sBones[base(o.name)] = o; sRest[base(o.name)] = o.getWorldQuaternion(new THREE.Quaternion()).invert(); } });
    TM.scene.updateMatrixWorld(true);
    const tBones = []; TM.scene.traverse(o => { if (o.isBone) tBones.push(o); });   // Eltern vor Kindern
    const tRestW = new Map(tBones.map(b => [b, b.getWorldQuaternion(new THREE.Quaternion())]));
    const tHipParentW = tBones[0].parent.getWorldQuaternion(new THREE.Quaternion());
    for (const [src, name] of [['Walk', 'Walk_Natural'], ['Run', 'Run_Natural']]) {
      const c0 = SM.clips.find(c => c.name === src); if (!c0 || CLIPS[name]) continue;
      const mixer = new THREE.AnimationMixer(sInst); mixer.clipAction(c0).play();
      const fps = 30, nf = Math.max(2, Math.round(c0.duration * fps) + 1), times = new Float32Array(nf);
      const out = new Map(tBones.filter(b => sBones[base(b.name)]).map(b => [b, new Float32Array(nf * 4)]));
      const W = new Map(), d = new THREE.Quaternion(), q = new THREE.Quaternion();
      for (let f = 0; f < nf; f++) {
        const t = Math.min(c0.duration, f / fps * (c0.duration / ((nf - 1) / fps))); times[f] = t;
        mixer.setTime(t); sInst.updateMatrixWorld(true);
        for (const b of tBones) {
          const bn = base(b.name), sb = sBones[bn];
          const parentW = W.get(b.parent) || (b.parent === tBones[0].parent ? tHipParentW : b.parent.getWorldQuaternion(new THREE.Quaternion()));
          let w;
          if (sb) { d.copy(sb.getWorldQuaternion(q)).multiply(sRest[bn]); w = R.clone().multiply(d).multiply(Ri).multiply(tRestW.get(b)); }
          else w = parentW.clone().multiply(b.quaternion);
          W.set(b, w);
          const a = out.get(b); if (!a) continue;
          // Hüfte in Clip-Konvention (clipFor stellt preInv voran): Weltdrehung; übrige Knochen lokal zum Elternknochen
          const loc = b === tBones[0] ? w.clone() : parentW.clone().invert().multiply(w);
          if (f > 0) { const p = f * 4 - 4; if (a[p] * loc.x + a[p + 1] * loc.y + a[p + 2] * loc.z + a[p + 3] * loc.w < 0) loc.set(-loc.x, -loc.y, -loc.z, -loc.w); }
          a.set([loc.x, loc.y, loc.z, loc.w], f * 4);
        }
      }
      mixer.stopAllAction(); mixer.uncacheRoot(sInst);
      const tracks = [];
      for (const [b, a] of out) tracks.push(new THREE.QuaternionKeyframeTrack(base(b.name) + '.quaternion', times, a));
      const ph = c0.tracks.find(tr => /Hips\.position$/.test(tr.name));
      if (ph) {
        const a = ph.values.slice();
        for (let i = 0; i < a.length; i += 3) { v.set(a[i], a[i + 1], a[i + 2]).applyQuaternion(preQ).multiplyScalar(k); a[i] = v.x; a[i + 1] = v.y; a[i + 2] = v.z; }
        tracks.push(new THREE.VectorKeyframeTrack('Hips.position', ph.times.slice(), a));
      }
      const c = new THREE.AnimationClip(name, c0.duration, tracks);
      c.userData = { hipRest: CLIP_HIP_REST };
      CLIPS[name] = c;
      if (!CLIP_NAMES.includes(name)) CLIP_NAMES.push(name);
    }
  }
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
      if (BROKEN_HIPS(name) && CLIP_HIP_Q) {                                             // Wurzel des Clips steht schief: auf Referenz-Rig drehen
        const fix = CLIP_HIP_Q.clone().multiply(new THREE.Quaternion(a[0], a[1], a[2], a[3]).invert());
        for (let i = 0; i < a.length; i += 4) { q.set(a[i], a[i + 1], a[i + 2], a[i + 3]).premultiply(fix); a[i] = q.x; a[i + 1] = q.y; a[i + 2] = q.z; a[i + 3] = q.w; }
      }
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
  const key = lowPoly && MODELS[names[n % names.length] + '_lp'] ? names[n % names.length] + '_lp' : names[n % names.length];
  const dummyL = new THREE.Object3D(), dummyR = new THREE.Object3D();
  if (figureMode === 'glb' && MODELS[key]) {
    const M = MODELS[key];
    const inst = SkeletonUtils.clone(M.scene);
    inst.traverse(o => {
      if (o.isMesh) { o.material = gm || mat(color); if (M.def.lowPoly) o.material.vertexColors = true; o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; }
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
      for (const [nm, a] of Object.entries(actions)) { const on = nm === name; a.enabled = on; a.paused = false; a.setEffectiveWeight(on ? weight : 0); }
      mixer.setTime(time);                                                            // Einmal-Clips bleiben am Ende stehen (clampWhenFinished), beim Zurückspulen wieder frei
    };
    g.userData.walk = (t, amp = 1) => {
      g.userData.drivenFrame = frameId + 1;
      g.userData.play(amp > 1.1 ? rc.run : rc.walk, t * (0.9 + amp * .3) + g.userData.offset, 1);
    };
    // Gehen nach zurückgelegter Strecke (Meter in Weltkoordinaten): Schrittfrequenz passt zur Geschwindigkeit, kein Gleiten
    g.userData.walkDist = (dist, amp = 1) => {
      g.userData.drivenFrame = frameId + 1;
      const name = amp > 1.1 ? rc.run : rc.walk, a = actions[name];
      const dur = a ? a.getClip().duration : 1, m = (LOOP_M[name] || 1.8) * scale;
      g.userData.play(name, dist / m * dur + g.userData.offset, 1);
    };
    g.userData.idle = t => { g.userData.drivenFrame = frameId + 1; g.userData.play(g.userData.idleName, t + g.userData.offset, 1); };
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
    g.userData.walkDist = (dist, amp = 1) => g.userData.walk(dist / Math.max(.2, scale) * .8, amp);
    g.userData.idle = () => { legL.rotation.z = legR.rotation.z = armL.rotation.z = armR.rotation.z = 0; };
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

// Kriegsschiff: Rumpf als extrudierte Form mit spitzem Bug, Deck, gestaffelte Aufbauten mit Brücke, 1–2 geneigte
// Schornsteine, Masten, Geschütztürme mit Doppelrohren, Flak-Lafetten, Rettungsboote an Davits, Reling.
// userData: lanes (freie Laufwege auf den Seitendecks), aa (Flak-Positionen), deckY, len, beam
// Low-Poly-Kriegsschiff: Rumpf aus wenigen schrägen Flächen (Spantquerschnitte, spitzer ausfallender Bug, flaches Heck),
// blockige Aufbauten, Brücke als Pyramidenstumpf, sechseckige Schornsteine und Türme, Kantstab-Rohre.
// Gleiche userData wie ship(): lanes, aa, deckY, len, beam
function shipLP(color = P.steel, { length = 8, beam = 1.9, guns = 2, funnels = 1, seed = 1, tint = 1 } = {}) {
  const g = new THREE.Group();
  const base = new THREE.Color(color).multiplyScalar(tint);
  const dark = base.clone().multiplyScalar(.55), deckC = base.clone().multiplyScalar(.78), darker = base.clone().multiplyScalar(.4);
  const L = length, B = beam, H2 = .95, keel = -.3, rr = rng(seed * 131 + 7);
  // Spanten: x, halbe Deckbreite, halbe Kielbreite, Deckhöhe (Sprung zum Bug), Kiel-x-Versatz (ausfallender Steven)
  const st = [[-L * .5, .40, .24, 0], [-L * .3, .5, .31, 0], [L * .18, .5, .30, 0], [L * .38, .32, .13, .06], [L * .56, .015, .01, .2]];
  const pts = st.map(([x, wd, wk, sh], i) => ({
    dl: new THREE.Vector3(x, H2 + sh, -wd * B), dr: new THREE.Vector3(x, H2 + sh, wd * B),
    kr: new THREE.Vector3(i === st.length - 1 ? x - L * .07 : x, keel, wk * B), kl: new THREE.Vector3(i === st.length - 1 ? x - L * .07 : x, keel, -wk * B)
  }));
  const tri = [], push = (a, b, c) => tri.push(a, b, c);
  const quad = (a, b, c, d) => { push(a, b, c); push(a, c, d); };
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    quad(p.dr, q.dr, q.kr, p.kr); quad(p.kl, q.kl, q.dl, p.dl); quad(p.kr, q.kr, q.kl, p.kl); quad(p.dl, q.dl, q.dr, p.dr);
  }
  const s0 = pts[0]; quad(s0.dl, s0.dr, s0.kr, s0.kl);                                  // Heckspiegel
  const pos = new Float32Array(tri.length * 3), col = new Float32Array(tri.length * 3);
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Vector3(), ref = new THREE.Vector3();
  for (let f = 0; f < tri.length; f += 3) {
    let [a, b, d] = [tri[f], tri[f + 1], tri[f + 2]];
    n.crossVectors(e1.subVectors(b, a), e2.subVectors(d, a));
    c.copy(a).add(b).add(d).multiplyScalar(1 / 3); ref.set(c.x * .6, H2 * .35, 0);
    if (n.dot(c.sub(ref)) < 0) [b, d] = [d, b];                                         // Flächen nach außen drehen
    [a, b, d].forEach((v, k) => pos.set([v.x, v.y, v.z], (f + k) * 3));
    const br = .8 + rr() * .2; for (let k = 0; k < 3; k++) col.set([br, br, br], (f + k) * 3);
  }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); hg.setAttribute('color', new THREE.BufferAttribute(col, 3)); hg.computeVertexNormals();
  g.add(mesh(hg, mat(base, { vertexColors: true })));
  const deckY = H2 + .02;
  const vc = { vertexColors: true };
  // Aufbauten
  const sup = box(L * .32, 1.05, B * .62, base); sup.position.set(-L * .03, deckY + .52, 0); g.add(sup);
  const sup2 = box(L * .2, .65, B * .5, base); sup2.position.set(-L * .02, deckY + 1.37, 0); g.add(sup2);
  const bridge = mesh(new THREE.CylinderGeometry(.5, .72, .55, 4), mat(base, vc)); bridge.rotation.y = Math.PI / 4; bridge.scale.set(L * .11 / 1.2, 1, B * .56 / 1.2); bridge.position.set(L * .05, deckY + 1.97, 0); g.add(bridge);
  const win = box(L * .1, .1, B * .5, darker); win.position.set(L * .05, deckY + 2.05, 0); win.castShadow = false; g.add(win);
  const roof = box(L * .06, .25, B * .26, dark); roof.position.set(L * .04, deckY + 2.38, 0); g.add(roof);
  // Schornsteine, sechseckig und geneigt
  for (let i = 0; i < funnels; i++) {
    const x = -L * (.13 + i * .11);
    const f = mesh(new THREE.CylinderGeometry(.22, .3, 1.5, 6), mat(dark, vc)); f.position.set(x, deckY + 1.6, 0); f.rotation.z = .14; g.add(f);
    const cap = mesh(new THREE.CylinderGeometry(.25, .23, .14, 6), mat(P.black, vc)); cap.position.set(x - .2, deckY + 2.38, 0); cap.rotation.z = .14; g.add(cap);
  }
  // Masten als Kantstäbe
  const mast = box(.09, 3.2, .09, darker); mast.position.set(L * .12, deckY + 2.6, 0); g.add(mast);
  const yard = box(.06, .06, 1.5, darker); yard.position.set(L * .12, deckY + 3.6, 0); g.add(yard);
  const top = mesh(new THREE.CylinderGeometry(.16, .12, .22, 5), mat(darker, vc)); top.position.set(L * .12, deckY + 3.2, 0); g.add(top);
  const mast2 = box(.07, 2.2, .07, darker); mast2.position.set(-L * .32, deckY + 1.9, 0); g.add(mast2);
  // Geschütztürme: sechseckig, Rohre als Kantstäbe
  const turret = (x, y, dir, big = 1) => {
    const t = new THREE.Group();
    const body = mesh(new THREE.CylinderGeometry(.42 * big, .48 * big, .34, 6), mat(base, vc)); body.position.y = .17; body.rotation.y = Math.PI / 6; t.add(body);
    for (const dz of [-.13 * big, .13 * big]) { const bar = box(1.35 * big, .08, .08, darker); bar.position.set(dir * (.35 * big + .62 * big), .24, dz); t.add(bar); }
    t.position.set(x, y, 0); g.add(t);
  };
  turret(L * .3, deckY, 1, 1);
  if (guns > 1) { const barb = mesh(new THREE.CylinderGeometry(.5, .55, .35, 6), mat(base, vc)); barb.position.set(L * .19, deckY + .17, 0); g.add(barb); turret(L * .19, deckY + .35, 1, .9); }
  turret(-L * .37, deckY, -1, .9);
  if (guns > 1 && L > 11) { const barb = mesh(new THREE.CylinderGeometry(.45, .5, .3, 6), mat(base, vc)); barb.position.set(-L * .27, deckY + .15, 0); g.add(barb); turret(-L * .27, deckY + .3, -1, .8); }
  // Flak-Lafetten auf den Aufbauten (Positionen wie im detaillierten Modell)
  const aa = [];
  for (const side of [-1, 1]) for (const x of [L * .09, -L * .14]) {
    const m = mesh(new THREE.CylinderGeometry(.12, .14, .22, 5), mat(darker, vc)); m.position.set(x, deckY + 1.16, side * B * .22); g.add(m);
    aa.push(new THREE.Vector3(x, deckY + 1.8, side * B * .22));
  }
  // Rettungsboote als Keile über den Seitendecks
  for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
    const lb = mesh(new THREE.CylinderGeometry(.12, .12, .62, 3), mat(dark, vc)); lb.rotation.z = Math.PI / 2; lb.rotation.x = side > 0 ? Math.PI : 0;
    lb.position.set(-L * .07 - i * L * .11, deckY + 1.15, side * (B * .5 + .06)); g.add(lb);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData = { deckY, len: L, beam: B, aa, lanes: [{ x0: -L * .3, x1: L * .14, z: B * .5 - .2 }, { x0: -L * .3, x1: L * .14, z: -(B * .5 - .2) }] };
  return g;
}

export function ship(color = P.steel, { length = 8, beam = 1.9, guns = 2, funnels = 1, seed = 1, tint = 1 } = {}) {
  if (lowPoly) return shipLP(color, { length, beam, guns, funnels, seed, tint });
  const g = new THREE.Group();
  const rr = rng(seed);
  const base = new THREE.Color(color).multiplyScalar(tint);
  const dark = base.clone().multiplyScalar(.55), deckC = base.clone().multiplyScalar(.75), darker = base.clone().multiplyScalar(.4);
  const L = length, B = beam, H2 = .95;
  // Rumpfform (x entlang der Länge, Bug bei +x)
  const outline = (scale = 1) => {
    const sh = new THREE.Shape();
    const b = B * .5 * scale, l = L * .5 * scale;
    sh.moveTo(-l * .97, -b * .55); sh.quadraticCurveTo(-l * 1.02, 0, -l * .97, b * .55);
    sh.lineTo(-l * .9, b); sh.lineTo(l * .3, b); sh.quadraticCurveTo(l * .85, b * .55, l * 1.08, 0);
    sh.quadraticCurveTo(l * .85, -b * .55, l * .3, -b); sh.lineTo(-l * .9, -b); sh.closePath();
    return sh;
  };
  const extrude = (shape, depth, c) => { const m = mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: lowPoly ? 3 : 10 }), c); m.rotation.x = -Math.PI / 2; return m; };
  const hull = extrude(outline(), H2, base); hull.position.y = 0; g.add(hull);
  const stripe = extrude(outline(1.012), .16, dark); stripe.position.y = .3; g.add(stripe);
  const deck = extrude(outline(.965), .06, deckC); deck.position.y = H2; g.add(deck);
  const deckY = H2 + .06;
  // Aufbauten
  const sup = box(L * .32, 1.05, B * .62, base); sup.position.set(-L * .03, deckY + .52, 0); g.add(sup);
  const sup2 = box(L * .2, .65, B * .5, base); sup2.position.set(-L * .02, deckY + 1.37, 0); g.add(sup2);
  const bridge = box(L * .11, .5, B * .56, base); bridge.position.set(L * .05, deckY + 1.95, 0); g.add(bridge);
  const windows = box(L * .11 + .02, .14, B * .56 + .02, darker); windows.position.set(L * .05, deckY + 2.05, 0); windows.castShadow = false; g.add(windows);
  const wing = box(L * .06, .08, B * .9, dark); wing.position.set(L * .07, deckY + 1.7, 0); g.add(wing);
  const roof = box(L * .07, .3, B * .3, dark); roof.position.set(L * .04, deckY + 2.35, 0); g.add(roof);
  const sl = cyl(.1, .1, .2, P.black, 8); sl.rotation.z = Math.PI / 2; sl.position.set(L * .05, deckY + 2.6, 0); g.add(sl);
  // Schornsteine, geneigt
  for (let i = 0; i < funnels; i++) {
    const x = -L * (.13 + i * .11);
    const f = cyl(.22, .28, 1.5, dark, 12); f.position.set(x, deckY + 1.6, 0); f.rotation.z = .14; g.add(f);
    const cap = cyl(.26, .23, .14, P.black, 12); cap.position.set(x - .2, deckY + 2.38, 0); cap.rotation.z = .14; g.add(cap);
  }
  // Masten
  const mast = cyl(.05, .06, 3.2, darker, 6); mast.position.set(L * .12, deckY + 2.6, 0); g.add(mast);
  for (const dz of [-.25, .25]) { const leg = cyl(.03, .03, 2.0, darker, 5); leg.position.set(L * .12 - .25, deckY + 1.8, dz); leg.rotation.z = .12; leg.rotation.x = dz > 0 ? -.12 : .12; g.add(leg); }
  const yard = box(.05, .05, 1.6, darker); yard.position.set(L * .12, deckY + 3.6, 0); g.add(yard);
  const nest = cyl(.18, .14, .25, darker, 8); nest.position.set(L * .12, deckY + 3.2, 0); g.add(nest);
  const mast2 = cyl(.04, .05, 2.2, darker, 6); mast2.position.set(-L * .32, deckY + 1.9, 0); g.add(mast2);
  const yard2 = box(.04, .04, 1.1, darker); yard2.position.set(-L * .32, deckY + 2.7, 0); g.add(yard2);
  // Geschütztürme mit Doppelrohren
  const turret = (x, y, dir, big = 1) => {
    const t = new THREE.Group();
    const body = cyl(.42 * big, .46 * big, .36, base, 14); body.position.y = .18; t.add(body);
    const front = box(.5 * big, .32, .7 * big, base); front.position.set(dir * .25 * big, .17, 0); t.add(front);
    for (const dz of [-.13 * big, .13 * big]) { const bar = cyl(.04, .05, 1.4 * big, darker, 6); bar.rotation.z = -dir * Math.PI / 2; bar.rotation.x = 0; bar.position.set(dir * (.35 * big + .7 * big), .25, dz); bar.rotation.y = 0; bar.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 0); t.add(bar); }
    t.position.set(x, y, 0); g.add(t); return t;
  };
  turret(L * .3, deckY, 1, 1);
  if (guns > 1) { const barb = cyl(.5, .55, .35, base, 14); barb.position.set(L * .19, deckY + .17, 0); g.add(barb); turret(L * .19, deckY + .35, 1, .9); }
  turret(-L * .37, deckY, -1, .9);
  if (guns > 1 && L > 11) { const barb = cyl(.45, .5, .3, base, 14); barb.position.set(-L * .27, deckY + .15, 0); g.add(barb); turret(-L * .27, deckY + .3, -1, .8); }
  // Flak-Lafetten an den Seiten der Aufbauten
  const aa = [];
  for (const side of [-1, 1]) for (const x of [L * .09, -L * .14]) {
    const m = cyl(.12, .14, .22, darker, 8); m.position.set(x, deckY + 1.16, side * B * .22); g.add(m);
    const bar = cyl(.025, .03, .7, P.black, 5); bar.position.set(x, deckY + 1.5, side * B * .22); bar.rotation.z = side * .25; g.add(bar);
    aa.push(new THREE.Vector3(x, deckY + 1.8, side * B * .22));
  }
  // Rettungsboote an Davits (über den Seitendecks)
  for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
    const x = -L * .07 - i * L * .11;
    const lb = mesh(new THREE.CapsuleGeometry(.11, .55, 3, 7), dark); lb.rotation.z = Math.PI / 2; lb.position.set(x, deckY + 1.15, side * (B * .5 + .08)); g.add(lb);
    for (const dx of [-.3, .3]) { const dv = cyl(.02, .02, .55, darker, 4); dv.position.set(x + dx, deckY + 1.2, side * (B * .5 + .02)); dv.rotation.x = side * .5; g.add(dv); }
  }
  // Reling und Deckdetails
  for (const side of [-1, 1]) {
    const rail = box(L * .78, .025, .025, darker); rail.position.set(-L * .09, deckY + .36, side * B * .47); rail.castShadow = false; g.add(rail);
    for (let i = 0; i < Math.floor(L * .78 / 1.1); i++) { const post = cyl(.015, .015, .36, darker, 4); post.castShadow = false; post.position.set(-L * .48 + i * 1.1, deckY + .18, side * B * .47); g.add(post); }
    const bowRail = box(L * .26, .025, .025, darker); bowRail.position.set(L * .55, deckY + .36, side * B * .3); bowRail.rotation.y = -side * .33; bowRail.castShadow = false; g.add(bowRail);
  }
  const capstan = cyl(.12, .14, .22, darker, 8); capstan.position.set(L * .44, deckY + .1, 0); g.add(capstan);
  for (const side of [-1, 1]) { const anchor = box(.12, .25, .08, P.black); anchor.position.set(L * .45, .62, side * B * .34); g.add(anchor); }
  for (let i = 0; i < 3; i++) { const vent = cyl(.08, .1, .5, dark, 8); vent.position.set(-L * (.2 + i * .08), deckY + .25, (i % 2 ? 1 : -1) * B * .28); g.add(vent); const vh = sphere(.11, dark, 8); vh.position.set(vent.position.x, deckY + .52, vent.position.z); g.add(vh); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData = { deckY, len: L, beam: B, aa, lanes: [{ x0: -L * .3, x1: L * .14, z: B * .5 - .2 }, { x0: -L * .3, x1: L * .14, z: -(B * .5 - .2) }] };
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
    const b = new THREE.Mesh(lowPoly ? new THREE.IcosahedronGeometry(r, 1) : new THREE.SphereGeometry(r, 14, 10), new THREE.MeshBasicMaterial({ color: land, map: terrainTexture() }));
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
// Kleine Explosion / Flak-Wolke: Blitz und kurzer Rauchpuff aus Sprites
export function explosionSoft({ color = P.orange, smoke = P.darkGrey, size = 1, duration = 1.6 } = {}) {
  const g = new THREE.Group();
  const r = rng(Math.round(size * 1000 + duration * 77 + EXPLOSION_SEED++));
  const sm = new THREE.Color(smoke), lit = new THREE.Color(color).lerp(sm, .4);
  const flashS = emitter(r, 1, { map: DOT_TEX(), additive: true, colors: [color, color, color], bright: 1.6, fadeIn: .05, fadeOut: .3, grow: .5, renderOrder: 3,
    spawn: () => ({ p: [0, 0, 0], v: [0, 0, 0], delay: 0, life: .18, s0: size * .6, s1: size * 1.8 }) });
  const puff = emitter(r, 16, { map: SMOKE_TEX(), colors: [lit.getStyle(), sm.getStyle(), sm.clone().multiplyScalar(.6).getStyle()], drag: 2.6, gravity: [0, size * .4, 0], grow: .5, opacity: .7, fadeIn: .08, fadeOut: .45, shade: .45, spin: .8, renderOrder: 1,
    spawn: () => ({ p: sph(r, size * .15), v: sph(r, size * (1.5 + r() * 3)), delay: r() * .08, life: duration * (.7 + r() * .3), s0: size * .35, s1: size * 1.5 }) });
  const flash = new THREE.PointLight(color, 0, size * 20);
  g.add(flashS, puff, flash); g.visible = false;
  g.userData.at = age => {
    if (age < 0 || age > duration) { g.visible = false; flash.intensity = 0; return; }
    g.visible = true;
    flashS.userData.set(age); puff.userData.set(age);
    flash.intensity = size * 40 * Math.max(0, 1 - age * 4);
  };
  return g;
}

// ---------------------------------------------------------------------------------------------
// Partikel-Sprites: weiche, prozedural texturierte Billboards, deren Bewegung komplett im Shader
// aus dem Alter berechnet wird (deterministisch, keine CPU-Arbeit pro Bild). Grundlage für
// Feuerball, Wassersäule, Dauerbrand und Rauchsäule.
// ---------------------------------------------------------------------------------------------
const TEX = {};
// Wolkige Puff-Textur: viele überlagerte weiche Flecken mit radialer Maske
function puffTexture(key, seed, { blobs = 48, rMin = .1, rMax = .3, soft = 1.2, gain = 1.7 } = {}) {
  if (TEX[key]) return TEX[key];
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const ctx = c.getContext('2d');
  const rr = rng(seed);
  for (let i = 0; i < blobs; i++) {
    const a = rr() * 6.283, d = Math.sqrt(rr()) * S * .3, x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d, rad = S * (rMin + rr() * (rMax - rMin));
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(255,255,255,${.1 + rr() * .14})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const img = ctx.getImageData(0, 0, S, S), d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, dx = (x - S / 2) / (S / 2), dy = (y - S / 2) / (S / 2);
    const m = Math.max(0, 1 - Math.pow(dx * dx + dy * dy, soft));
    d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.min(255, d[i + 3] * gain * m);
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; TEX[key] = t; return t;
}
// Weicher Punkt (Funken, Tropfen, Blitz)
function dotTexture(key, hard = .25) {
  if (TEX[key]) return TEX[key];
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(hard, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; TEX[key] = t; return t;
}
const SMOKE_TEX = () => puffTexture('smoke', 7, { blobs: 40, rMin: .12, rMax: .32, soft: 1.4, gain: 1.5 });
const FIRE_TEX = () => puffTexture('fire', 11, { blobs: 70, rMin: .06, rMax: .22, soft: 1.0, gain: 2.0 });
const SPRAY_TEX = () => puffTexture('spray', 23, { blobs: 80, rMin: .06, rMax: .24, soft: 1.5, gain: 1.4 });
const DOT_TEX = () => dotTexture('dot', .2);

const VERT = `
attribute vec3 aPos; attribute vec3 aVel; attribute vec4 aLife; attribute vec3 aMisc;
uniform float uAge, uDrag, uLoop, uGrow, uSizeMul, uAspect; uniform vec3 uGravity, uWind;
varying vec2 vUv; varying vec2 vRaw; varying float vU; varying float vSeed;
void main() {
  float t = uLoop > .5 ? mod(uAge + aLife.x, aLife.y) : uAge - aLife.x;
  float u = t / aLife.y;
  float on = step(0., t) * step(u, 1.);
  float k = uDrag > 0. ? (1. - exp(-uDrag * t)) / uDrag : t;
  vec3 p = aPos + aVel * k + .5 * uGravity * t * t + uWind * t;
  float sz = mix(aLife.z, aLife.w, pow(clamp(u, 0., 1.), uGrow)) * on * uSizeMul;
  float rot = aMisc.x + aMisc.y * t;
  vec2 c = position.xy;
  vec2 rc = vec2(c.x * cos(rot) - c.y * sin(rot), c.x * sin(rot) + c.y * cos(rot)) * sz * vec2(1., uAspect);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  mv.xy += rc;
  gl_Position = projectionMatrix * mv;
  vUv = uv; vRaw = c; vU = clamp(u, 0., 1.); vSeed = aMisc.z;
}`;
const FRAG = `
uniform sampler2D uMap; uniform vec3 uColA, uColB, uColC; uniform float uOpacity, uBright, uFadeIn, uFadeOut, uShade, uVar;
varying vec2 vUv; varying vec2 vRaw; varying float vU; varying float vSeed;
void main() {
  float a = texture2D(uMap, vUv).a;
  float fin = smoothstep(0., uFadeIn, vU);
  float fout = 1. - smoothstep(uFadeOut, 1., vU);
  vec3 col = vU < .5 ? mix(uColA, uColB, vU * 2.) : mix(uColB, uColC, (vU - .5) * 2.);
  col *= mix(1. - uShade, 1., vRaw.y + .5);          // oben heller, unten dunkler: Volumen
  col *= 1. - uVar * .5 + uVar * vSeed;
  float alpha = a * fin * fout * uOpacity;
  if (alpha < .004) discard;
  gl_FragColor = vec4(col * uBright, alpha);
}`;
const lin = c => new THREE.Color(c).convertSRGBToLinear();
// Emitter: n Sprites, Startwerte per spawn(i) -> { p:[x,y,z], v:[x,y,z], delay, life, s0, s1 }
export function emitter(r, n, { map, additive = false, loop = false, gravity = [0, 0, 0], drag = 0, grow = .6, colors = ['#fff', '#aaa', '#444'], opacity = 1, bright = 1, fadeIn = .1, fadeOut = .6, shade = 0, variation = .3, spin = 1, aspect = 1, rotate = true, spawn, renderOrder = 0 }) {
  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geo.setAttribute('position', quad.attributes.position); geo.setAttribute('uv', quad.attributes.uv); geo.setIndex(quad.index);
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), life = new Float32Array(n * 4), misc = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const s = spawn(i);
    pos.set(s.p, i * 3); vel.set(s.v, i * 3); life.set([s.delay, s.life, s.s0, s.s1], i * 4);
    misc.set([rotate ? r() * 6.283 : 0, rotate ? (r() - .5) * 2 * spin : 0, r()], i * 3);
  }
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute('aVel', new THREE.InstancedBufferAttribute(vel, 3));
  geo.setAttribute('aLife', new THREE.InstancedBufferAttribute(life, 4));
  geo.setAttribute('aMisc', new THREE.InstancedBufferAttribute(misc, 3));
  geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uAge: { value: -1 }, uDrag: { value: drag }, uLoop: { value: loop ? 1 : 0 }, uGrow: { value: grow }, uSizeMul: { value: 1 }, uAspect: { value: aspect },
      uGravity: { value: new THREE.Vector3(...gravity) }, uWind: { value: new THREE.Vector3() }, uMap: { value: map },
      uColA: { value: lin(colors[0]) }, uColB: { value: lin(colors[1]) }, uColC: { value: lin(colors[2]) },
      uOpacity: { value: opacity }, uBright: { value: bright }, uFadeIn: { value: fadeIn }, uFadeOut: { value: fadeOut }, uShade: { value: shade }, uVar: { value: variation }
    }
  });
  mat.toneMapped = false;
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.castShadow = false; m.renderOrder = renderOrder;
  m.userData.base = opacity;
  m.userData.set = (age, strength = 1) => { mat.uniforms.uAge.value = age; mat.uniforms.uOpacity.value = opacity * strength; mat.uniforms.uSizeMul.value = .6 + .4 * Math.min(1, strength); };
  return m;
}
const sph = (r, len) => { const a = r() * 6.283, c = r() * 2 - 1, s = Math.sqrt(1 - c * c); return [s * Math.cos(a) * len, c * len, s * Math.sin(a) * len]; };

// Feuerball: Blitz, Feuer (additiv, HDR -> Bloom), Flammenzungen, Rauchpilz (erst vom Feuer beleuchtet, dann dunkel),
// Trümmer, Funken, Glut und Druckwellenring
export function fireballSoft(r, { size = 2.5, duration = 3.2, debris = 60, sparks = 120, ring = true } = {}) {
  const g = new THREE.Group();
  const parts = [];
  const add = m => { g.add(m); parts.push(m); return m; };
  add(emitter(r, 1, { map: DOT_TEX(), additive: true, colors: ['#fff0c0', '#ffc060', '#ff8020'], bright: 1.6, fadeIn: .05, fadeOut: .3, grow: .5, renderOrder: 3,
    spawn: () => ({ p: [0, size * .3, 0], v: [0, 0, 0], delay: 0, life: .22, s0: size * 1.2, s1: size * 3.2 }) }));
  add(emitter(r, 28, { map: FIRE_TEX(), additive: true, colors: ['#ffeaa8', '#ff9a30', '#c83a08'], bright: 1.1, drag: 3.2, gravity: [0, size * 1.2, 0], grow: .5, fadeIn: .08, fadeOut: .45, variation: .4, renderOrder: 2,
    spawn: () => { const v = sph(r, size * (1.5 + r() * 3)); v[1] = Math.abs(v[1]) + size * .5; return { p: sph(r, size * .25), v, delay: r() * .12, life: .45 + r() * .5, s0: size * .45, s1: size * 1.15 }; } }));
  add(emitter(r, 22, { map: FIRE_TEX(), additive: true, colors: ['#ffeab0', '#ffa838', '#c84008'], bright: 1.05, drag: 2.4, grow: .8, fadeIn: .1, fadeOut: .4, variation: .4, rotate: false, aspect: 2.0, renderOrder: 2,
    spawn: () => ({ p: sph(r, size * .3), v: [(r() - .5) * size * 2.5, size * (4 + r() * 4), (r() - .5) * size * 2.5], delay: .04 + r() * .3, life: .4 + r() * .4, s0: size * .55, s1: size * .25 }) }));
  add(emitter(r, 36, { map: SMOKE_TEX(), colors: ['#b86a38', '#4a403a', '#1c1a18'], drag: 1.4, gravity: [0, size * .55, 0], grow: .55, opacity: .55, fadeIn: .12, fadeOut: .5, shade: .5, variation: .35, spin: .6, renderOrder: 1,
    spawn: () => { const v = sph(r, size * (.8 + r() * 2.2)); v[1] = Math.abs(v[1]) * .8 + size * 1.2; return { p: sph(r, size * .35), v, delay: .05 + r() * .7, life: Math.max(1.2, duration - .7) * (.6 + r() * .4), s0: size * .45, s1: size * 2.0 }; } }));
  add(emitter(r, debris, { map: DOT_TEX(), colors: ['#2a2420', '#2a2420', '#2a2420'], gravity: [0, -9.81, 0], drag: .25, grow: 1, fadeIn: 0, fadeOut: .85, variation: .2, renderOrder: 2,
    spawn: () => { const v = sph(r, size * (2 + r() * 4.5)); v[1] = Math.abs(v[1]) + size * 1.5; return { p: [0, size * .2, 0], v, delay: r() * .08, life: 1.3 + r() * 1.3, s0: size * (.05 + r() * .07), s1: size * (.05 + r() * .07) }; } }));
  add(emitter(r, sparks, { map: DOT_TEX(), additive: true, colors: ['#fff6d0', '#ffc060', '#ff5a10'], bright: 1.5, gravity: [0, -9.81, 0], drag: .6, grow: 1, fadeIn: 0, fadeOut: .5, renderOrder: 3,
    spawn: () => { const v = sph(r, size * (3 + r() * 7)); v[1] = Math.abs(v[1]) + size; return { p: [0, size * .2, 0], v, delay: r() * .06, life: .5 + r() * .9, s0: size * .07, s1: size * .02 }; } }));
  add(emitter(r, Math.max(8, sparks >> 2), { map: DOT_TEX(), additive: true, colors: ['#ffb060', '#ff7020', '#8a2000'], bright: 1.3, gravity: [0, -1.5, 0], drag: 1.2, grow: 1, fadeIn: .05, fadeOut: .5, renderOrder: 3,
    spawn: () => { const v = sph(r, size * (1 + r() * 3)); v[1] = Math.abs(v[1]) + size * 2; return { p: sph(r, size * .3), v, delay: .1 + r() * .5, life: 1 + r() * 1.6, s0: size * .09, s1: size * .03 }; } }));
  const shock = ring ? new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, side: THREE.DoubleSide, depthWrite: false })) : null;
  if (shock) { shock.rotation.x = -Math.PI / 2; shock.position.y = .05; g.add(shock); }
  const flash = new THREE.PointLight('#ffb060', 0, size * 14, 1.5); g.add(flash);
  g.visible = false;
  g.userData.at = age => {
    if (age < 0 || age > duration) { g.visible = false; flash.intensity = 0; return; }
    g.visible = true;
    for (const m of parts) m.userData.set(age);
    const flick = 1 + .18 * Math.sin(age * 37) + .12 * Math.sin(age * 59 + 1.3);
    if (shock) { const su = clamp(age / 1.0, 0, 1); shock.scale.setScalar(.5 + su * size * 4); shock.material.opacity = (1 - su) * .22; shock.visible = su < 1; }
    flash.intensity = size * 60 * Math.max(0, 1 - age * 3) + size * 7 * Math.max(0, 1 - age / (duration * .45)) * flick;
  };
  return g;
}

// Dauerbrand: kurze, züngelnde Flammen über einer Glutbasis, Hitzeschein, schwerer dunkler Rauch, Funken (Loop)
export function flameSoft(r, { size = 1, tongues = 6, embers = 24, spread = 1 } = {}) {
  const g = new THREE.Group();
  const parts = [];
  const add = m => { g.add(m); parts.push(m); return m; };
  const sx = size * .5 * spread, sz = size * .35 * spread;
  add(emitter(r, 1, { map: DOT_TEX(), additive: true, loop: true, colors: ['#ff8a30', '#ff7020', '#ff6010'], bright: .16, fadeIn: .3, fadeOut: .5, grow: 1, renderOrder: 1,
    spawn: () => ({ p: [0, size * .4, 0], v: [0, 0, 0], delay: 0, life: 1, s0: size * (1.6 + spread * .6), s1: size * (1.6 + spread * .6) }) }));
  add(emitter(r, tongues * 6, { map: FIRE_TEX(), additive: true, loop: true, colors: ['#fff0b8', '#ffa030', '#c02808'], bright: 1.2, drag: 2.2, grow: .7, fadeIn: .12, fadeOut: .4, variation: .45, rotate: false, aspect: 1.9, renderOrder: 2,
    spawn: () => ({ p: [(r() - .5) * 2 * sx, 0, (r() - .5) * 2 * sz], v: [(r() - .5) * size * .8, size * (1.6 + r() * 2.4), (r() - .5) * size * .8], delay: r() * 3, life: .4 + r() * .45, s0: size * .6, s1: size * .1 }) }));
  add(emitter(r, tongues * 2, { map: FIRE_TEX(), additive: true, loop: true, colors: ['#ffd090', '#ff7a20', '#8a1800'], bright: 1.0, drag: 1.4, grow: .9, fadeIn: .1, fadeOut: .35, variation: .5, rotate: false, aspect: 2.4, renderOrder: 2,
    spawn: () => ({ p: [(r() - .5) * 2 * sx, size * .3, (r() - .5) * 2 * sz], v: [(r() - .5) * size * 1.2, size * (2.5 + r() * 3), (r() - .5) * size * 1.2], delay: r() * 3, life: .5 + r() * .5, s0: size * .4, s1: size * .08 }) }));
  add(emitter(r, tongues * 4, { map: SMOKE_TEX(), loop: true, colors: ['#5a4036', '#2a2624', '#141312'], drag: .5, gravity: [0, size * .35, 0], grow: .55, opacity: .55, fadeIn: .18, fadeOut: .5, shade: .45, spin: .4, renderOrder: 1,
    spawn: () => ({ p: [(r() - .5) * 2 * sx, size * .8, (r() - .5) * 2 * sz], v: [(r() - .5) * size * .8 + size * .4, size * (1.8 + r() * 1.6), (r() - .5) * size * .8], delay: r() * 4, life: 2.6 + r() * 1.6, s0: size * .5, s1: size * 2.8 }) }));
  add(emitter(r, embers, { map: DOT_TEX(), additive: true, loop: true, colors: ['#ffd080', '#ff7020', '#7a2000'], bright: 1.4, drag: .5, gravity: [0, size * .3, 0], grow: 1, fadeIn: .05, fadeOut: .5, renderOrder: 3,
    spawn: () => ({ p: [(r() - .5) * 2 * sx, size * .2, (r() - .5) * 2 * sz], v: [(r() - .5) * size * 1.2, size * (1.5 + r() * 2.5), (r() - .5) * size * 1.2], delay: r() * 3, life: .8 + r() * 1.4, s0: size * .06, s1: size * .02 }) }));
  const light = new THREE.PointLight('#ff8a30', 0, size * 8, 2); light.position.y = size * .7; g.add(light);
  g.visible = false;
  g.userData.at = (age, strength = 1) => {
    if (age < 0) { g.visible = false; light.intensity = 0; return; }
    g.visible = true;
    const on = Math.min(1, age / 1.2) * strength;
    for (const m of parts) m.userData.set(age, on);
    light.intensity = size * 1.4 * on * (1 + .25 * Math.sin(age * 23) + .15 * Math.sin(age * 41));
  };
  return g;
}

// Wassersäule: Sprühkuppel, aufschießende Gischtsäule (ballistisch, fällt in sich zusammen), Fontänenstrahlen,
// Tropfen, hängender Sprühnebel, Schaum und Ringwellen
export function waterColumnSoft(r, { height = 9, radius = .9, duration = 2.6, drops = 140 } = {}) {
  const g = new THREE.Group();
  const parts = [];
  const add = m => { g.add(m); parts.push(m); return m; };
  const v0 = Math.sqrt(2 * 9.81 * height);
  const col = ['#e9eff4', '#cdd8e1', '#9cadbc'];
  // Sprühkuppel am Fuß
  add(emitter(r, 40, { map: SPRAY_TEX(), colors: col, gravity: [0, -9.81, 0], drag: .8, grow: .5, opacity: .6, fadeIn: .05, fadeOut: .4, shade: .35, renderOrder: 1,
    spawn: () => { const a = r() * 6.283, sp = radius * (3 + r() * 4); return { p: [Math.cos(a) * radius * .4, .1, Math.sin(a) * radius * .4], v: [Math.cos(a) * sp, 2 + r() * 4, Math.sin(a) * sp], delay: r() * .1, life: .6 + r() * .5, s0: radius * .7, s1: radius * 2.0 }; } }));
  // Säule
  add(emitter(r, 260, { map: SPRAY_TEX(), colors: col, gravity: [0, -9.81 * .85, 0], grow: .45, opacity: .6, fadeIn: .08, fadeOut: .55, shade: .45, variation: .3, rotate: false, aspect: 1.6, renderOrder: 1,
    spawn: () => { const a = r() * 6.283, d = Math.sqrt(r()) * radius * .5, lat = radius * (.2 + r() * 1.3); return { p: [Math.cos(a) * d, .1, Math.sin(a) * d], v: [Math.cos(a) * lat, v0 * (.7 + r() * .45), Math.sin(a) * lat], delay: r() * .35, life: 1.8 + r() * .9, s0: radius * .7, s1: radius * 2.2 }; } }));
  // Fontänenstrahlen über die Säule hinaus
  add(emitter(r, 30, { map: SPRAY_TEX(), colors: col, gravity: [0, -9.81, 0], grow: .5, opacity: .8, fadeIn: .05, fadeOut: .5, shade: .3, rotate: false, aspect: 2.2, renderOrder: 1,
    spawn: () => { const a = r() * 6.283, lat = radius * (.5 + r() * 2); return { p: [0, .2, 0], v: [Math.cos(a) * lat, v0 * (1.1 + r() * .35), Math.sin(a) * lat], delay: .03 + r() * .25, life: 1.6 + r() * .6, s0: radius * .25, s1: radius * .7 }; } }));
  // Tropfen
  add(emitter(r, drops, { map: DOT_TEX(), colors: ['#ffffff', '#e8f0f6', '#cfdbe4'], gravity: [0, -9.81, 0], grow: 1, opacity: .6, fadeIn: 0, fadeOut: .7, renderOrder: 2,
    spawn: () => { const a = r() * 6.283, lat = radius * (1 + r() * 3.5); return { p: [0, .3, 0], v: [Math.cos(a) * lat, v0 * (.75 + r() * .5), Math.sin(a) * lat], delay: r() * .3, life: 2 + r() * .7, s0: .05 + r() * .05, s1: .03 }; } }));
  // Nebel, der nach dem Zusammenfall hängen bleibt
  add(emitter(r, 26, { map: SMOKE_TEX(), colors: ['#dde6ee', '#c6d2dc', '#aebbc7'], drag: 1.5, gravity: [0, -.3, 0], grow: .6, opacity: .22, fadeIn: .3, fadeOut: .5, shade: .3, spin: .4, renderOrder: 0,
    spawn: () => { const a = r() * 6.283, h = height * (.1 + r() * .55); return { p: [Math.cos(a) * radius * .6, h, Math.sin(a) * radius * .6], v: [Math.cos(a) * radius * (1 + r() * 1.5), .5 + r(), Math.sin(a) * radius * (1 + r() * 1.5)], delay: .8 + r() * .8, life: Math.max(1.2, duration - 1.2) * (.7 + r() * .3), s0: radius * 1.2, s1: radius * 3.2 }; } }));
  const foam = new THREE.Mesh(new THREE.RingGeometry(.6, 1, 40), new THREE.MeshBasicMaterial({ color: '#dfe8f0', transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.y = .06; g.add(foam);
  const ripples = [];
  for (let i = 0; i < 2; i++) { const rp = new THREE.Mesh(new THREE.RingGeometry(.95, 1, 48), new THREE.MeshBasicMaterial({ color: '#cfdbe6', transparent: true, side: THREE.DoubleSide, depthWrite: false })); rp.rotation.x = -Math.PI / 2; rp.position.y = .04; g.add(rp); ripples.push(rp); }
  g.visible = false;
  g.userData.at = age => {
    if (age < 0 || age > duration + .5) { g.visible = false; return; }
    g.visible = true;
    for (const m of parts) m.userData.set(age);
    const fu = clamp(age / 1.6, 0, 1); foam.scale.setScalar(radius * (1 + fu * 2)); foam.material.opacity = (1 - fu) * .2;
    ripples.forEach((rp, i) => { const ru = clamp((age - .3 - i * .5) / 1.8, 0, 1); rp.visible = ru > 0 && ru < 1; rp.scale.setScalar(radius * (1.5 + ru * 3.5)); rp.material.opacity = (1 - ru) * .1; });
  };
  return g;
}

// Rauchsäule (fortlaufend): weiche Rauchsprites steigen auf, Wind versetzt sie seitlich
export function smokeColumnSoft(r, { color = P.darkGrey, height = 8, n = 9, width = .8 } = {}) {
  const g = new THREE.Group();
  const life = 3.6;
  const c = new THREE.Color(color);
  const m = emitter(r, n * 4, { map: SMOKE_TEX(), loop: true, colors: [c.clone().multiplyScalar(1.1).getStyle(), c.getStyle(), c.clone().multiplyScalar(.7).getStyle()], drag: .3, grow: .6, opacity: .6, fadeIn: .15, fadeOut: .55, shade: .45, spin: .5, renderOrder: 1,
    spawn: () => ({ p: [(r() - .5) * width * .6, 0, (r() - .5) * width * .6], v: [(r() - .5) * width * .8, height / life * (.9 + r() * .3), (r() - .5) * width * .8], delay: r() * life, life: life * (.85 + r() * .3), s0: width * .6, s1: width * 2.6 }) });
  g.add(m);
  g.userData.at = (t, wind = .4) => { m.userData.set(t); m.material.uniforms.uWind.value.set(wind * height * .5 / life, 0, 0); };
  return g;
}

// ---------------------------------------------------------------------------------------------
// Low-Poly-Effekte: Feuer, Explosionen und Rauch aus unregelmäßig verformten, facettierten Polyedern.
// Jede Facette hat eine eigene Helligkeit (Vertexfarben), dadurch wirken die Formen kantig statt rund.
// Feuer ist ungeschattet und HDR-hell (Bloom), Rauch ist beleuchtet. Alles deterministisch aus dem Alter.
// ---------------------------------------------------------------------------------------------
const LPG = {};
// verformter Polyeder (geteilte Ecken werden gleich verschoben, damit die Form geschlossen bleibt), Facetten-Helligkeit
function lpGeometry(kind, seed, { detail = 0, jitter = .28, shade = [.62, 1] } = {}) {
  const key = kind + seed + '_' + detail;
  if (LPG[key]) return LPG[key];
  const rr = rng(seed * 7919 + detail * 31 + kind.length);
  let g = kind === 'ico' ? new THREE.IcosahedronGeometry(1, detail) : kind === 'tet' ? new THREE.TetrahedronGeometry(1) : kind === 'oct' ? new THREE.OctahedronGeometry(1) : new THREE.ConeGeometry(1, 1, 5, 1);
  if (kind === 'cone') g.translate(0, .5, 0);                                     // Flammenzunge: Basis bei y = 0
  if (g.index) g = g.toNonIndexed();
  const pos = g.attributes.position, off = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = [pos.getX(i), pos.getY(i), pos.getZ(i)].map(v => Math.round(v * 1000)).join(',');
    if (!off.has(k)) off.set(k, 1 + (rr() - .5) * 2 * jitter);
    const s = kind === 'cone' && pos.getY(i) > .99 ? 1 : off.get(k);               // Spitze der Zunge bleibt spitz
    pos.setXYZ(i, pos.getX(i) * s, kind === 'cone' ? pos.getY(i) : pos.getY(i) * s, pos.getZ(i) * s);
  }
  const col = new Float32Array(pos.count * 3);
  for (let f = 0; f < pos.count; f += 3) { const b = shade[0] + rr() * (shade[1] - shade[0]); for (let v = 0; v < 3; v++) col.set([b, b, b], (f + v) * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  LPG[key] = g; return g;
}
const lpFireMat = () => { const m = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#ffffff' }); m.toneMapped = false; return m; };
const lpSmokeMat = c => { const m = new THREE.MeshLambertMaterial({ vertexColors: true, color: c, flatShading: true }); m.userData.base = new THREE.Color(c).multiplyScalar(.32); m.emissive.copy(m.userData.base); return m; };   // Grundhelligkeit, damit Rauch nachts grau bleibt
const lpMesh = (geo, m) => { const x = new THREE.Mesh(geo, m); x.castShadow = false; x.receiveShadow = false; x.frustumCulled = false; return x; };
const _lc = new THREE.Color(), _lc2 = new THREE.Color();
// Farbrampe Feuer: weißgelb -> gelb -> orange -> dunkelrot, HDR-Faktor für Bloom
const FIRE_RAMP = [[0, '#fff4c8', 1.7], [.18, '#ffd24a', 1.35], [.45, '#ff8a1c', 1.12], [.75, '#d4380e', .9], [1, '#7a1a08', .55]];   // moderat, damit die Facetten nicht übersteuern
function fireColor(u, out, gain = 1) {
  u = clamp(u, 0, 1);
  let i = 0; while (i < FIRE_RAMP.length - 2 && u > FIRE_RAMP[i + 1][0]) i++;
  const [a, ca, ga] = FIRE_RAMP[i], [b, cb, gb] = FIRE_RAMP[i + 1], k = (u - a) / (b - a || 1);
  out.set(ca).lerp(_lc2.set(cb), k).multiplyScalar((ga + (gb - ga) * k) * gain); return out;
}
const _v = new THREE.Vector3();

// Kleine Explosion / Flak-Wolke: kurzer Blitz und ein paar kantige Rauchbrocken
export function explosionLP({ color = P.orange, smoke = P.darkGrey, size = 1, duration = 1.6 } = {}) {
  const g = new THREE.Group();
  const r = rng(Math.round(size * 1000 + duration * 77 + EXPLOSION_SEED++));
  const flash = lpMesh(lpGeometry('ico', 1), lpFireMat()); g.add(flash);
  const puffs = [];
  for (let i = 0; i < 6; i++) {
    const m = lpMesh(lpGeometry('ico', 10 + i, { detail: 0 }), lpSmokeMat(smoke)); g.add(m);
    const a = r() * 6.283, e = r() * 1.1;                                              // nur aufwärts: Rauch steigt immer
    puffs.push({ m, d: new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) + .3, Math.sin(a) * Math.cos(e)), k: .35 + r() * .35, rot: [r() * 6, r() * 6, r() * 6] });
  }
  const fc = new THREE.Color(color);
  const light = new THREE.PointLight(color, 0, size * 20); g.add(light);
  g.visible = false;
  g.userData.at = age => {
    if (age < 0 || age > duration) { g.visible = false; light.intensity = 0; return; }
    g.visible = true;
    const u = age / duration, fu = clamp(age / .22, 0, 1);
    flash.visible = fu < 1; flash.scale.setScalar(Math.max(.001, size * .55 * Math.sin(fu * Math.PI))); flash.rotation.set(age * 3, age * 2, 0);
    flash.material.color.copy(fc).lerp(_lc.set('#fff2c0'), .5).multiplyScalar(2.4);
    for (const p of puffs) {
      const s = size * p.k * (.35 + easeOut(u * 1.6) * .9) * (1 - easeIn(clamp((u - .55) / .45, 0, 1)));
      p.m.visible = s > .01; p.m.scale.setScalar(Math.max(.001, s));
      p.m.position.copy(p.d).multiplyScalar(size * .8 * easeOut(u * 1.4)).add(_v.set(0, size * u * .6, 0));
      p.m.rotation.set(p.rot[0] + u, p.rot[1] + u * .7, p.rot[2]);
      p.m.material.emissive.copy(fc).multiplyScalar(Math.max(0, .6 - u * 2)).add(p.m.material.userData.base);
    }
    light.intensity = size * 40 * Math.max(0, 1 - age * 4);
  };
  return g;
}
let EXPLOSION_SEED = 1;

// Feuerball: Blitz, kantige Feuerbrocken (weißgelb -> rot), Flammenzungen, Rauchbrocken, die aufsteigen und
// zusammenschrumpfen, Splitter als Trümmer, Funken und ein flacher Druckwellenring
export function fireballLP(r, { size = 2.5, duration = 3.2, debris = 60, sparks = 120, ring = true } = {}) {
  const g = new THREE.Group();
  const fireEnd = duration * .45;
  const flash = lpMesh(lpGeometry('ico', 2), lpFireMat()); g.add(flash);
  const fire = [];
  for (let i = 0; i < 11; i++) {
    const m = lpMesh(lpGeometry('ico', 20 + i, { jitter: .32, shade: [.5, 1] }), lpFireMat()); g.add(m);
    const a = r() * 6.283, e = r() * 1.3 - .2;
    fire.push({ hue: (r() - .35) * .3, m, d: new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) * .8 + .25, Math.sin(a) * Math.cos(e)), k: .28 + r() * .32, reach: .35 + r() * .55, delay: r() * .12, rot: [r() * 6, r() * 6, r() * 6], spin: (r() - .5) * 3 });
  }
  const tongues = [];
  for (let i = 0; i < 6; i++) {
    const m = lpMesh(lpGeometry('cone', 40 + i, { jitter: .25 }), lpFireMat()); g.add(m);
    tongues.push({ m, d: new THREE.Vector3((r() - .5) * .9, 1, (r() - .5) * .9).normalize(), delay: .03 + r() * .2, len: 1.4 + r() * 1.2, w: .14 + r() * .12, rotY: r() * 6 });
  }
  const smoke = [];
  for (let i = 0; i < 12; i++) {
    const m = lpMesh(lpGeometry('ico', 60 + i, { detail: i % 3 === 0 ? 1 : 0, jitter: .26, shade: [.45, 1] }), lpSmokeMat('#5a5550')); g.add(m);
    const a = r() * 6.283;
    smoke.push({ m, dx: Math.cos(a) * (.2 + r() * .7), dz: Math.sin(a) * (.2 + r() * .7), delay: .12 + r() * .5, k: .2 + r() * .24, rise: .9 + r() * .9, rot: [r() * 6, r() * 6, r() * 6] });
  }
  const shards = [];
  for (let i = 0; i < Math.min(28, Math.round(debris * .4)); i++) {
    const m = lpMesh(lpGeometry('tet', 80 + i, { jitter: .35 }), lpSmokeMat('#2a2624')); g.add(m);
    const a = r() * 6.283, e = .35 + r() * 1.0, sp = size * (2.2 + r() * 3.5);
    shards.push({ m, v: [Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp], s: size * (.04 + r() * .06), spin: [r() * 9, r() * 9, r() * 9], ttl: 1.2 + r() * 1.2 });
  }
  const sparksM = [];
  for (let i = 0; i < Math.min(30, Math.round(sparks * .25)); i++) {
    const m = lpMesh(lpGeometry('oct', 120 + (i % 6)), lpFireMat()); g.add(m);
    const a = r() * 6.283, e = .2 + r() * 1.2, sp = size * (3 + r() * 5);
    sparksM.push({ m, v: [Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp], s: size * (.02 + r() * .025), ttl: .5 + r() * .7, spin: r() * 12 });
  }
  const shock = ring ? new THREE.Mesh(new THREE.RingGeometry(.9, 1, 14), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, side: THREE.DoubleSide, depthWrite: false })) : null;
  if (shock) { shock.rotation.x = -Math.PI / 2; shock.position.y = .05; g.add(shock); }
  const light = new THREE.PointLight('#ffb060', 0, size * 14, 1.5); g.add(light);
  g.visible = false;
  g.userData.at = age => {
    if (age < 0 || age > duration) { g.visible = false; light.intensity = 0; return; }
    g.visible = true;
    const u = age / duration, flick = 1 + .12 * Math.sin(age * 37) + .08 * Math.sin(age * 59 + 1.3);
    const fu = clamp(age / .2, 0, 1);
    flash.visible = fu < 1; flash.scale.setScalar(Math.max(.001, size * .7 * Math.sin(fu * Math.PI))); flash.rotation.set(age * 4, age * 3, 0);
    flash.material.color.set('#fff6dc').multiplyScalar(2.6);
    for (const c of fire) {
      const cu = clamp((age - c.delay) / (fireEnd - c.delay), 0, 1);
      const s = size * c.k * (.35 + easeOut(cu * 1.8) * .8) * (1 - easeIn(clamp((cu - .5) / .5, 0, 1)));
      c.m.visible = cu > 0 && s > .01;
      if (!c.m.visible) continue;
      c.m.scale.set(s, s * (.9 + c.k * .5), s);
      c.m.position.copy(c.d).multiplyScalar(size * c.reach * easeOut(cu * 1.5)).add(_v.set(0, size * cu * cu * 1.1, 0));
      c.m.rotation.set(c.rot[0] + cu * c.spin, c.rot[1] + cu, c.rot[2]);
      fireColor(cu * .95 + c.hue, c.m.material.color, flick);
    }
    for (const t of tongues) {
      const tu = clamp((age - t.delay) / .55, 0, 1);
      t.m.visible = tu > 0 && tu < 1; if (!t.m.visible) continue;
      const L = size * t.len * Math.sin(tu * Math.PI) * (1 - tu * .3), W = size * t.w * (1 - tu * .6);
      t.m.scale.set(Math.max(.001, W), Math.max(.001, L), Math.max(.001, W));
      t.m.position.copy(t.d).multiplyScalar(size * (.2 + tu * .9));
      t.m.quaternion.setFromUnitVectors(_v.set(0, 1, 0), t.d); t.m.rotateY(t.rotY);
      fireColor(.1 + tu * .7, t.m.material.color, flick);
    }
    for (const sm of smoke) {
      const su = clamp((age - sm.delay) / (duration - sm.delay), 0, 1);
      const s = size * sm.k * (.3 + easeOut(su) * 1.1) * (1 - easeIn(clamp((su - .55) / .45, 0, 1)));
      sm.m.visible = su > 0 && s > .01; if (!sm.m.visible) continue;
      sm.m.scale.setScalar(s);
      sm.m.position.set(sm.dx * size * (.35 + su * .8), size * (.45 + su * sm.rise * 1.7), sm.dz * size * (.35 + su * .8));
      sm.m.rotation.set(sm.rot[0] + su * .8, sm.rot[1] + su * .5, sm.rot[2]);
      const warm = Math.max(0, 1 - su * 3.5);                                           // frischer Rauch noch vom Feuer angestrahlt
      sm.m.material.emissive.set('#c2410c').multiplyScalar(warm * .55 * flick).add(sm.m.material.userData.base);
    }
    for (const sh of shards) {
      const tt = Math.min(age, sh.ttl);
      sh.m.visible = age < sh.ttl;
      if (!sh.m.visible) continue;
      sh.m.position.set(sh.v[0] * tt, Math.max(sh.s, sh.v[1] * tt - 9.81 * tt * tt * .5), sh.v[2] * tt);
      sh.m.rotation.set(sh.spin[0] * tt, sh.spin[1] * tt, sh.spin[2] * tt);
      sh.m.scale.setScalar(sh.s);
    }
    for (const sp of sparksM) {
      const tt = age;
      sp.m.visible = tt < sp.ttl; if (!sp.m.visible) continue;
      sp.m.position.set(sp.v[0] * tt, sp.v[1] * tt - 9.81 * tt * tt * .4, sp.v[2] * tt);
      sp.m.scale.setScalar(Math.max(.001, sp.s * (1 - tt / sp.ttl)));
      sp.m.rotation.set(sp.spin * tt, sp.spin * tt * .7, 0);
      fireColor(.1 + tt / sp.ttl * .5, sp.m.material.color, 1.2);
    }
    if (shock) { const su = clamp(age / 1.0, 0, 1); shock.scale.setScalar(.5 + su * size * 4); shock.material.opacity = (1 - su) * .22; shock.visible = su < 1; }
    light.intensity = size * 60 * Math.max(0, 1 - age * 3) + size * 7 * Math.max(0, 1 - age / fireEnd) * flick;
  };
  return g;
}

// Dauerbrand: kantige Flammenzungen, die in Zyklen hochzüngeln und vergehen, Glutsplitter und kantiger Rauch (Loop)
export function flameLP(r, { size = 1, tongues = 6, embers = 24, spread = 1 } = {}) {
  const g = new THREE.Group();
  const sx = size * .45 * spread, sz = size * .3 * spread;
  const tg = [];
  for (let i = 0; i < tongues * 2; i++) {
    const m = lpMesh(lpGeometry('cone', 200 + i, { jitter: .3 }), lpFireMat()); g.add(m);
    const inner = i % 2 === 0;
    tg.push({ m, x: (r() - .5) * 2 * sx * (inner ? .6 : 1), z: (r() - .5) * 2 * sz * (inner ? .6 : 1), per: .45 + r() * .4, ph: r(), len: (inner ? 1.0 : 1.5) + r() * .8, w: (inner ? .16 : .22) + r() * .1, tilt: (r() - .5) * .35, rotY: r() * 6, inner });
  }
  const base = lpMesh(lpGeometry('ico', 260, { jitter: .2 }), lpFireMat()); g.add(base);
  const em = [];
  for (let i = 0; i < Math.min(14, embers); i++) {
    const m = lpMesh(lpGeometry('tet', 270 + (i % 5)), lpFireMat()); g.add(m);
    em.push({ m, x: (r() - .5) * 2 * sx, z: (r() - .5) * 2 * sz, per: 1 + r() * 1.2, ph: r(), vx: (r() - .5) * size * .8, vz: (r() - .5) * size * .8, up: size * (1.2 + r() * 1.5), s: size * (.03 + r() * .03), spin: r() * 10 });
  }
  const sm = [];
  for (let i = 0; i < Math.max(3, tongues); i++) {
    const m = lpMesh(lpGeometry('ico', 290 + i, { detail: i % 2, jitter: .26, shade: [.45, 1] }), lpSmokeMat('#4a4642')); g.add(m);
    sm.push({ m, x: (r() - .5) * sx, z: (r() - .5) * sz, per: 2.4 + r() * 1.4, ph: r(), k: .4 + r() * .35, drift: (r() - .2) * size * .9, rot: [r() * 6, r() * 6, r() * 6] });
  }
  const light = new THREE.PointLight('#ff8a30', 0, size * 8, 2); light.position.y = size * .7; g.add(light);
  g.visible = false;
  g.userData.at = (age, strength = 1) => {
    if (age < 0) { g.visible = false; light.intensity = 0; return; }
    g.visible = true;
    const on = Math.min(1, age / 1.2) * strength;
    for (const t of tg) {
      const u = ((age / t.per) + t.ph) % 1;
      const L = size * t.len * on * Math.sin(u * Math.PI) ** .7, W = size * t.w * on * (1 - u * .5);
      t.m.visible = L > .01;
      if (!t.m.visible) continue;
      t.m.scale.set(W, L, W);
      t.m.position.set(t.x, size * .05 + u * size * .35 * on, t.z);
      t.m.rotation.set(t.tilt * Math.sin(age * 2 + t.ph * 6), t.rotY + u, t.tilt * .6);
      fireColor((t.inner ? .05 : .3) + u * .5, t.m.material.color, 1);
    }
    base.scale.set(sx * 1.1 * on + .001, size * .12 * on + .001, sz * 1.1 * on + .001); base.position.y = size * .02;
    fireColor(.4, base.material.color, .7);
    for (const e of em) {
      const u = ((age / e.per) + e.ph) % 1;
      e.m.visible = on > .1 && u < .85;
      e.m.position.set(e.x + e.vx * u, size * .2 + e.up * u, e.z + e.vz * u);
      e.m.scale.setScalar(Math.max(.001, e.s * (1 - u) * on));
      e.m.rotation.set(e.spin * u, e.spin * u * .6, 0);
      fireColor(.25 + u * .6, e.m.material.color, 1.3);
    }
    for (const s of sm) {
      const u = ((age / s.per) + s.ph) % 1;
      const k = size * s.k * on * (.35 + u * 1.3) * (1 - easeIn(clamp((u - .6) / .4, 0, 1)));
      s.m.visible = k > .01;
      s.m.scale.setScalar(Math.max(.001, k));
      s.m.position.set(s.x + s.drift * u, size * (.9 + u * 3.2), s.z);
      s.m.rotation.set(s.rot[0] + u, s.rot[1] + u * .6, s.rot[2]);
      s.m.material.emissive.set('#b4380a').multiplyScalar(Math.max(0, .5 - u * 1.4)).add(s.m.material.userData.base);
    }
    light.intensity = size * 1.4 * on * (1 + .25 * Math.sin(age * 23) + .15 * Math.sin(age * 41));
  };
  return g;
}

// Rauchsäule (fortlaufend): kantige Rauchbrocken steigen auf, wachsen, driften mit dem Wind und schrumpfen oben weg
export function smokeColumnLP(r, { color = P.darkGrey, height = 8, n = 9, width = .8 } = {}) {
  const g = new THREE.Group();
  const life = 3.6, puffs = [];
  for (let i = 0; i < n * 2; i++) {
    const m = lpMesh(lpGeometry('ico', 400 + i, { detail: i % 3 === 0 ? 1 : 0, jitter: .26, shade: [.45, 1] }), lpSmokeMat(color)); g.add(m);
    puffs.push({ m, ph: i / (n * 2) + r() * .05, dx: (r() - .5) * width * .6, dz: (r() - .5) * width * .6, k: .5 + r() * .4, rot: [r() * 6, r() * 6, r() * 6], spin: (r() - .5) * 1.2 });
  }
  g.userData.at = (t, wind = .4) => {
    for (const p of puffs) {
      const u = ((t / life) + p.ph) % 1;
      const s = width * p.k * (.4 + u * 1.3) * (1 - easeIn(clamp((u - .65) / .35, 0, 1)));
      p.m.visible = s > .01;
      p.m.scale.setScalar(Math.max(.001, s));
      p.m.position.set(p.dx * (1 + u * 2) + wind * u * height * .5, u * height, p.dz * (1 + u * 2));
      p.m.rotation.set(p.rot[0] + u * p.spin, p.rot[1] + u, p.rot[2]);
    }
  };
  return g;
}

// Low-Poly-Wassersäule: kantige Gischtbrocken schießen hoch und fallen zurück, Gischtstreifen, Tropfensplitter,
// flacher Schaumring und Ringwellen
const lpWaterMat = () => { const m = new THREE.MeshLambertMaterial({ vertexColors: true, color: '#e3ebf2', flatShading: true, transparent: true }); m.emissive.set('#9fb0c0').multiplyScalar(.45); return m; };
export function waterColumnLP(r, { height = 9, radius = .9, duration = 2.6, drops = 140 } = {}) {
  const g = new THREE.Group();
  const v0 = Math.sqrt(2 * 9.81 * height);
  const chunks = [];
  for (let i = 0; i < 20; i++) {
    const m = lpMesh(lpGeometry('ico', 500 + i, { jitter: .3, shade: [.6, 1] }), lpWaterMat()); g.add(m);
    const a = r() * 6.283, lat = radius * (.15 + r() * 1.0), up = v0 * (.55 + r() * .55);
    chunks.push({ m, v: [Math.cos(a) * lat, up, Math.sin(a) * lat], delay: r() * .25, k: .35 + r() * .35, rot: [r() * 6, r() * 6, r() * 6], spin: (r() - .5) * 4 });
  }
  const base = [];
  for (let i = 0; i < 8; i++) {
    const m = lpMesh(lpGeometry('ico', 540 + i, { jitter: .3, shade: [.6, 1] }), lpWaterMat()); g.add(m);
    const a = i / 8 * 6.283 + r() * .4;
    base.push({ m, d: [Math.cos(a), Math.sin(a)], k: .45 + r() * .3, rot: r() * 6 });
  }
  const streaks = [];
  for (let i = 0; i < 7; i++) {
    const m = lpMesh(lpGeometry('cone', 560 + i, { jitter: .2 }), lpWaterMat()); g.add(m);
    const a = r() * 6.283, sp = .2 + r() * .4;
    streaks.push({ m, dir: new THREE.Vector3(Math.cos(a) * sp, 1, Math.sin(a) * sp).normalize(), v: v0 * (1.05 + r() * .3), delay: .02 + r() * .2, w: .06 + r() * .05 });
  }
  const dropsM = [];
  for (let i = 0; i < Math.min(30, Math.round(drops * .2)); i++) {
    const m = lpMesh(lpGeometry('oct', 580 + (i % 6)), lpWaterMat()); g.add(m);
    const a = r() * 6.283, lat = radius * (1 + r() * 3), up = v0 * (.6 + r() * .55);
    dropsM.push({ m, v: [Math.cos(a) * lat, up, Math.sin(a) * lat], delay: .1 + r() * .35, s: .05 + r() * .06 });
  }
  const foam = new THREE.Mesh(new THREE.RingGeometry(.6, 1, 12), new THREE.MeshBasicMaterial({ color: '#dfe8f0', transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.y = .06; g.add(foam);
  const ripples = [];
  for (let i = 0; i < 2; i++) { const rp = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 16), new THREE.MeshBasicMaterial({ color: '#cfdbe6', transparent: true, side: THREE.DoubleSide, depthWrite: false })); rp.rotation.x = -Math.PI / 2; rp.position.y = .04; g.add(rp); ripples.push(rp); }
  const qUp = new THREE.Vector3(0, 1, 0), dv = new THREE.Vector3();
  g.visible = false;
  g.userData.at = age => {
    if (age < 0 || age > duration + .5) { g.visible = false; return; }
    g.visible = true;
    const fade = 1 - clamp((age - duration * .7) / (duration * .3 + .5), 0, 1);
    for (const c of chunks) {
      const tt = Math.max(0, age - c.delay), y = c.v[1] * tt - 9.81 * .85 * tt * tt * .5;
      c.m.visible = tt > 0 && y > -.2 && fade > 0;
      if (!c.m.visible) continue;
      const s = radius * c.k * (.5 + Math.min(1.2, tt * 1.1)) * Math.min(1, fade * 1.5);
      c.m.scale.set(s, s * 1.35, s);
      c.m.position.set(c.v[0] * tt, Math.max(0, y), c.v[2] * tt);
      c.m.rotation.set(c.rot[0] + tt * c.spin, c.rot[1] + tt, c.rot[2]);
      c.m.material.opacity = Math.min(1, fade * 1.4);
    }
    const bu = clamp(age / 1.0, 0, 1);
    for (const b of base) {
      b.m.visible = bu < 1;
      if (!b.m.visible) continue;
      const s = radius * b.k * Math.sin(bu * Math.PI) * 1.2;
      b.m.scale.set(Math.max(.001, s * 1.3), Math.max(.001, s * .7), Math.max(.001, s * 1.3));
      b.m.position.set(b.d[0] * radius * (.4 + easeOut(bu) * 1.8), s * .3, b.d[1] * radius * (.4 + easeOut(bu) * 1.8));
      b.m.rotation.y = b.rot + bu;
    }
    for (const st of streaks) {
      const tt = Math.max(0, age - st.delay), y = st.v * tt * st.dir.y - 9.81 * tt * tt * .5;
      st.m.visible = tt > 0 && y > 0 && tt < 1.4;
      if (!st.m.visible) continue;
      dv.set(st.dir.x * st.v, st.dir.y * st.v - 9.81 * tt, st.dir.z * st.v).normalize();
      st.m.quaternion.setFromUnitVectors(qUp, dv);
      const L = radius * (1.6 + tt * 1.5) * (1 - tt / 1.4), W = radius * st.w * 2;
      st.m.scale.set(Math.max(.001, W), Math.max(.001, L), Math.max(.001, W));
      st.m.position.set(st.dir.x * st.v * tt, y, st.dir.z * st.v * tt);
    }
    for (const d of dropsM) {
      const tt = Math.max(0, age - d.delay), y = d.v[1] * tt - 9.81 * tt * tt * .5;
      d.m.visible = tt > 0 && y > 0;
      if (!d.m.visible) continue;
      d.m.position.set(d.v[0] * tt * .6, y, d.v[2] * tt * .6); d.m.scale.setScalar(d.s); d.m.rotation.set(tt * 6, tt * 4, 0);
    }
    const fu = clamp(age / 1.6, 0, 1); foam.scale.setScalar(radius * (1 + fu * 2)); foam.material.opacity = (1 - fu) * .25;
    ripples.forEach((rp, i) => { const ru = clamp((age - .3 - i * .5) / 1.8, 0, 1); rp.visible = ru > 0 && ru < 1; rp.scale.setScalar(radius * (1.5 + ru * 3.5)); rp.material.opacity = (1 - ru) * .12; });
  };
  return g;
}

// Effekt-Dispatcher: Low-Poly-Look an -> kantige Varianten, aus -> weiche Partikel
export const explosion = o => lowPoly ? explosionLP(o) : explosionSoft(o);
export const fireball = (r, o) => lowPoly ? fireballLP(r, o) : fireballSoft(r, o);
export const flame = (r, o) => lowPoly ? flameLP(r, o) : flameSoft(r, o);
export const smokeColumn = (r, o) => lowPoly ? smokeColumnLP(r, o) : smokeColumnSoft(r, o);
export const waterColumn = (r, o) => lowPoly ? waterColumnLP(r, o) : waterColumnSoft(r, o);

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
  FIGURES.clear(); EXPLOSION_SEED = 1;
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
// Umgebungsverlauf (Himmel oben, Horizont, dunkel unten) als Equirect-Textur für Spiegelungen
const ENV = {};
export function envGradient(top = '#1a2230', horizon = '#4a5a6c', bottom = '#05070a') {
  const key = top + horizon + bottom; if (ENV[key]) return ENV[key];
  const W = 64, Hh = 32, data = new Uint8Array(W * Hh * 4);
  const ct = new THREE.Color(top), ch = new THREE.Color(horizon), cb = new THREE.Color(bottom), c = new THREE.Color();
  for (let y = 0; y < Hh; y++) {
    const v = y / (Hh - 1);                       // 0 = oben, 1 = unten
    if (v < .5) c.copy(ct).lerp(ch, Math.pow(v * 2, 1.6)); else c.copy(ch).lerp(cb, Math.pow((v - .5) * 2, .5));
    for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; data[i] = c.r * 255; data[i + 1] = c.g * 255; data[i + 2] = c.b * 255; data[i + 3] = 255; }
  }
  const t = new THREE.DataTexture(data, W, Hh); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  ENV[key] = t; return t;
}
// Wasserfläche: mehrere Wellenlagen, Normalen pro Bild, glänzendes Material mit Himmelsspiegelung. userData.at(t)
export function wavePlane(w, h, seg = 48, color = P.water, { amp = .12, opts = {}, roughness = .58, env = null } = {}) {
  const n = lowPoly ? Math.min(Math.max(seg, 20), 46) : Math.max(seg, 96);
  if (lowPoly) amp *= 1.7;                                                           // gröbere Wellen, damit die Facetten lesbar sind
  const geo = new THREE.PlaneGeometry(w, h, n, n);
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: .05, envMap: env || envGradient(), envMapIntensity: 1.2, flatShading: lowPoly, ...opts });
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true; m.castShadow = false;
  m.rotation.x = -Math.PI / 2;
  const pos = geo.attributes.position;
  const base = Float32Array.from(pos.array);
  m.userData.at = t => {
    const a = pos.array;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      a[i * 3 + 2] = amp * (Math.sin(x * .5 + t * 1.6) + .6 * Math.sin(y * .35 + t * 1.1) + .35 * Math.sin((x + y) * .9 + t * 2.3)
        + .25 * Math.sin(x * 1.7 - y * .8 + t * 3.1) + .15 * Math.sin(x * 3.1 + y * 2.3 - t * 4.2) + .1 * Math.sin(-x * 2.2 + y * 4.1 + t * 5.0));
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  return m;
}

// Fliegerbombe, Spitze zeigt nach +Z (mit lookAt entlang der Flugbahn ausrichten)
export function bomb(length = 1.1, color = '#23262b', rad = .16) {
  const m = color instanceof THREE.Material ? color : mat(color);
  const g = new THREE.Group();
  const body = cyl(rad, rad, length * .6, m, 10); body.rotation.x = Math.PI / 2; g.add(body);
  const nose = cone(rad, length * .3, m, 10); nose.rotation.x = Math.PI / 2; nose.position.z = length * .45; g.add(nose);
  const tail = cyl(rad * .55, rad, length * .25, m, 10); tail.rotation.x = Math.PI / 2; tail.position.z = -length * .42; g.add(tail);
  for (let i = 0; i < 4; i++) { const f = box(.02, rad * 2.3, rad * 1.6, m); f.position.z = -length * .45; f.rotation.z = i * Math.PI / 2; g.add(f); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; } });
  return g;
}

// Leuchtender Punkt-Sprite (Mündungsblitz, Glühen), additiv, HDR für Bloom
export function glowSprite(color = '#ffd080', size = 1, opacity = 1) {
  const m = new THREE.SpriteMaterial({ map: DOT_TEX(), color: new THREE.Color(color).multiplyScalar(2.5), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  m.toneMapped = false;
  const sp = new THREE.Sprite(m); sp.scale.setScalar(size); return sp;
}
// Leuchtspurgeschoss: heller Kopf, verblassender Schweif (entlang +Z)
export function tracerShot(color = '#ffd27a', length = 2.6) {
  const g = new THREE.Group();
  const head = mesh(new THREE.BoxGeometry(.11, .11, length * .22), glowMat('#fff2c8', 3.0)); head.position.z = length * .39; head.castShadow = false;
  const tail = mesh(new THREE.BoxGeometry(.07, .07, length * .78), glowMat(color, 1.5)); tail.position.z = -length * .11; tail.castShadow = false;
  const tailMat = tail.material; tailMat.transparent = true; tailMat.opacity = .7;
  g.add(head, tail); return g;
}

// Rauch- und Feuerfahne entlang eines Pfads: Partikel i startet bei path(i/n) zur Zeit (i/n)*duration. userData.at(age)
export function trail(r, path, { duration = 1.6, n = 60, size = .5, fire = true } = {}) {
  const g = new THREE.Group();
  const parts = [];
  const pt = new THREE.Vector3();
  const smoke = emitter(r, n, { map: SMOKE_TEX(), colors: ['#6a5a50', '#3a3532', '#1a1816'], drag: 1.5, gravity: [0, .6, 0], grow: .5, opacity: .6, fadeIn: .1, fadeOut: .5, shade: .45, spin: .6, renderOrder: 1,
    spawn: i => { path(i / n, pt); return { p: [pt.x + (r() - .5) * size * .4, pt.y + (r() - .5) * size * .4, pt.z + (r() - .5) * size * .4], v: [(r() - .5) * size, size * (.5 + r()), (r() - .5) * size], delay: (i / n) * duration, life: 1.2 + r() * 1.0, s0: size * .5, s1: size * 2.4 }; } });
  g.add(smoke); parts.push(smoke);
  if (fire) {
    const fl = emitter(r, n >> 1, { map: FIRE_TEX(), additive: true, colors: ['#ffe6a0', '#ff8a28', '#b02408'], bright: 1.1, drag: 2, grow: .8, fadeIn: .05, fadeOut: .4, renderOrder: 2,
      spawn: i => { path(i / (n >> 1), pt); return { p: [pt.x, pt.y, pt.z], v: [(r() - .5) * size, size * (.5 + r()), (r() - .5) * size], delay: (i / (n >> 1)) * duration, life: .25 + r() * .3, s0: size * .9, s1: size * .3 }; } });
    g.add(fl); parts.push(fl);
  }
  g.visible = false;
  g.userData.at = age => { if (age < 0 || age > duration + 3) { g.visible = false; return; } g.visible = true; for (const m of parts) m.userData.set(age); };
  return g;
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
