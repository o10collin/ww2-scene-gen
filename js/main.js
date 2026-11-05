import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SCENES } from './scenes/index.js';
import { GUI } from './gui.js';
import * as H from './common.js';

const $ = s => document.querySelector(s);
const LS = 'ww2gen.';

// ---------- Globale Einstellungen ----------
const GLOBAL_SCHEMA = {
  preset: { type: 'select', options: ['1920×1080', '3840×2160', '1280×720', '1080×1920', 'Eigene'], value: '1920×1080', label: 'Auflösung', group: 'Bild' },
  width: { type: 'number', min: 320, max: 4096, step: 2, value: 1920, label: 'Breite (Eigene)', group: 'Bild' },
  height: { type: 'number', min: 320, max: 4096, step: 2, value: 1080, label: 'Höhe (Eigene)', group: 'Bild' },
  figures: { type: 'select', options: ['GLB-Modelle (animiert)', 'Kapselfiguren (einfach)'], value: 'GLB-Modelle (animiert)', label: 'Figuren', group: 'Bild' },
  shading: { type: 'select', options: ['lambert', 'toon'], value: 'lambert', label: 'Shading', group: 'Bild' },
  lowPoly: { type: 'boolean', value: true, label: 'Low-Poly-Look (facettiert, kantige Effekte)', group: 'Bild' },
  darken: { type: 'number', min: 0, max: 1, step: .05, value: .55, label: 'Abdunkeln (Himmel/Licht)', group: 'Bild' },
  bloom: { type: 'number', min: 0, max: 3, step: .05, value: .55, label: 'Bloom (Leuchten)', group: 'Bild' },
  bloomThreshold: { type: 'number', min: 0, max: 1, step: .01, value: .8, label: 'Bloom Schwelle', group: 'Bild' },
  bloomRadius: { type: 'number', min: 0, max: 1, step: .05, value: .35, label: 'Bloom Weichheit', group: 'Bild' },
  roleAxis: { type: 'color', value: '#ff2d2d', label: 'Achse / NS (rot)', group: 'Rollenfarben' },
  roleWest: { type: 'color', value: '#2f7cff', label: 'Westalliierte (blau)', group: 'Rollenfarben' },
  roleSoviet: { type: 'color', value: '#ffb020', label: 'Sowjetunion (gelb)', group: 'Rollenfarben' },
  roleCivil: { type: 'color', value: '#cfd6e0', label: 'Zivilisten (weiß)', group: 'Rollenfarben' },
  glowStrength: { type: 'number', min: 1, max: 5, step: .1, value: 1.8, label: 'Leuchtstärke Figuren', group: 'Rollenfarben' },
  shadows: { type: 'boolean', value: true, label: 'Schatten', group: 'Bild' },
  grain: { type: 'number', min: 0, max: .5, step: .01, value: .12, label: 'Filmkorn', group: 'Look' },
  vignette: { type: 'number', min: 0, max: 1, step: .01, value: .6, label: 'Vignette', group: 'Look' },
  letterbox: { type: 'number', min: 0, max: .2, step: .005, value: 0, label: 'Letterbox', group: 'Look' },
  fadeIn: { type: 'number', min: 0, max: 3, step: .1, value: .5, label: 'Einblenden (s)', group: 'Look' },
  fadeOut: { type: 'number', min: 0, max: 3, step: .1, value: .5, label: 'Ausblenden (s)', group: 'Look' },
  textOff: { type: 'boolean', value: false, label: 'ALLE Texte aus (für Nachbearbeitung)', group: 'Text' },
  captions: { type: 'boolean', value: true, label: 'Bauchbinde anzeigen', group: 'Text' },
  captionStyle: { type: 'select', options: ['Serif klein (Simplicissimus)', 'Groß (Sans)'], value: 'Serif klein (Simplicissimus)', label: 'Bauchbinden-Stil', group: 'Text' },
  captionSize: { type: 'number', min: .4, max: 2.5, step: .05, value: 1, label: 'Bauchbinde Größe', group: 'Text' },
  captionFont: { type: 'select', options: ['Cormorant Garamond', 'Inter', 'Georgia', 'Courier New', 'Arial'], value: 'Cormorant Garamond', label: 'Schrift', group: 'Text' },
  captionColor: { type: 'color', value: '#f4f1ea', label: 'Textfarbe', group: 'Text' },
  accent: { type: 'color', value: '#e2b24f', label: 'Akzentfarbe', group: 'Text' },
  captionPos: { type: 'select', options: ['unten links', 'unten mitte', 'oben links'], value: 'unten links', label: 'Position', group: 'Text' },
  captionDelay: { type: 'number', min: 0, max: 5, step: .1, value: .6, label: 'Bauchbinde ab (s)', group: 'Text' },
  subtitles: { type: 'boolean', value: false, label: 'Skripttext als Untertitel', group: 'Text' },
  subtitleSize: { type: 'number', min: .4, max: 2, step: .05, value: 1, label: 'Untertitel Größe', group: 'Text' },
  exportFormat: { type: 'select', options: ['MP4 (H.264, bildgenau)', 'PNG-Sequenz', 'WebM (Echtzeit-Aufnahme)'], value: 'MP4 (H.264, bildgenau)', label: 'Format', group: 'Export' },
  fps: { type: 'select', options: ['24', '25', '30', '50', '60'], value: '30', label: 'Bilder/s', group: 'Export' },
  bitrate: { type: 'number', min: 2, max: 80, step: 1, value: 20, label: 'Bitrate (Mbit/s)', group: 'Export' }
};
const REBUILD_GLOBAL = new Set(['shading', 'lowPoly', 'shadows', 'darken', 'roleAxis', 'roleWest', 'roleSoviet', 'roleCivil', 'glowStrength', 'figures', 'textOff']);
const RESOLUTION_GLOBAL = new Set(['preset', 'width', 'height']);

const LOOK_VERSION = '7';  // bei Änderung der Standard-Optik gespeicherte Globaleinstellungen verwerfen
try { if (localStorage.getItem(LS + 'version') !== LOOK_VERSION) { localStorage.removeItem(LS + 'global'); localStorage.setItem(LS + 'version', LOOK_VERSION); } } catch { /* kein Speicher */ }
const global = {};
for (const [k, s] of Object.entries(GLOBAL_SCHEMA)) global[k] = s.value;
Object.assign(global, load('global'));

function load(key) { try { return JSON.parse(localStorage.getItem(LS + key) || '{}'); } catch { return {}; } }
function save(key, obj) { try { localStorage.setItem(LS + key, JSON.stringify(obj)); } catch { /* Speicher nicht verfügbar */ } }

// ---------- Renderer / Ausgabe ----------
const glCanvas = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(1);
const out = $('#out');
const ctx = out.getContext('2d');
let W = 1920, Hh = 1080;
let vignetteCache = null;
let composer = null, renderPass = null, bloomPass = null;
const noise = [];

function resolution() {
  const p = global.preset;
  if (p === 'Eigene') return [global.width | 0, global.height | 0];
  const [w, h] = p.split('×').map(Number);
  return [w, h];
}
function applyResolution() {
  [W, Hh] = resolution();
  renderer.setSize(W, Hh, false);
  out.width = W; out.height = Hh;
  if (composer) composer.dispose();
  composer = new EffectComposer(renderer);
  composer.setSize(W, Hh);
  renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  bloomPass = new UnrealBloomPass(new THREE.Vector2(W, Hh), global.bloom, .45, global.bloomThreshold);
  composer.addPass(renderPass); composer.addPass(bloomPass); composer.addPass(new OutputPass());
  vignetteCache = null;
  if (active) { active.camera.aspect = W / Hh; active.camera.updateProjectionMatrix(); }
  $('#res').textContent = `${W} × ${Hh}`;
}
function makeNoise() {
  for (let n = 0; n < 6; n++) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const img = g.createImageData(256, 256);
    const r = H.rng(100 + n);
    for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - .5) * 160; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); noise.push(c);
  }
}
makeNoise();

// ---------- Szenenverwaltung ----------
const state = { index: 0, t: 0, playing: true, loop: true, speed: 1, orbit: false, recording: false, exporting: false };
let active = null;
let controls = null;
let rebuildTimer = null;

function paramsFor(def) {
  const p = {};
  for (const [k, s] of Object.entries(sceneSchema(def))) p[k] = s.value;
  Object.assign(p, load('scene.' + def.id));
  return p;
}
function sceneSchema(def) {
  return {
    duration: { type: 'number', min: 1, max: 60, step: .5, value: def.duration, label: 'Dauer (s)', live: true, group: 'Szene' },
    capTitle: { type: 'text', value: def.caption?.title || '', label: 'Bauchbinde Titel', live: true, group: 'Szene' },
    capSub: { type: 'text', value: def.caption?.sub || '', label: 'Bauchbinde Zeile 2', live: true, group: 'Szene' },
    subtitle: { type: 'text', value: def.script, label: 'Untertitel / Skript', live: true, group: 'Szene' },
    ...def.params
  };
}

function loadScene(i, keepTime = false) {
  if (active) { active.api.dispose?.(); H.disposeScene(active.scene); }
  state.index = i;
  const def = SCENES[i];
  const params = active && active.def === def ? active.params : paramsFor(def);
  H.setShading(global.shading);
  H.setLowPoly(global.lowPoly);
  H.setFigureMode(global.figures.startsWith('GLB') ? 'glb' : 'capsule');
  H.setLabels(!global.textOff);
  H.setRoles({ axis: global.roleAxis, west: global.roleWest, soviet: global.roleSoviet, civil: global.roleCivil, strength: global.glowStrength });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(params.fov || 40, W / Hh, .1, 600);
  const api = def.build({ THREE, scene, camera, params, H, rng: H.rng(def.seed || 1), shadows: global.shadows }) || {};
  active = { def, params, scene, camera, api };
  // Abdunkeln: Himmel, Nebel und Umgebungslicht in Richtung Schwarz ziehen (dunkler Simplicissimus-Look)
  if (global.darken > 0) {
    const k = 1 - global.darken;
    if (scene.background?.isColor) scene.background.multiplyScalar(k);
    if (scene.fog) scene.fog.color.multiplyScalar(k);
    scene.traverse(o => { if (o.isHemisphereLight || o.isAmbientLight) o.intensity *= (1 - global.darken * .7); });
  }
  if (controls) controls.dispose();
  controls = new OrbitControls(camera, out);
  controls.enabled = state.orbit;
  controls.target.set(params.lookX, params.lookY, params.lookZ);
  if (!keepTime) state.t = 0;
  document.title = `${String(i + 1).padStart(2, '0')} ${def.title} – WW2 Szenen`;
  $('#script-text').textContent = def.script;
  $('#scene-title').textContent = `${String(i + 1).padStart(2, '0')} · ${def.title}`;
  for (const b of document.querySelectorAll('#scene-list button')) b.classList.toggle('active', +b.dataset.i === i);
  buildSceneGui();
}
function rebuildScene() { loadScene(state.index, true); }
function scheduleRebuild() { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(rebuildScene, 150); }

// ---------- Kamera ----------
const EASE = { linear: t => H.clamp(t, 0, 1), weich: H.easeInOut, rein: H.easeIn, raus: H.easeOut };
const v = new THREE.Vector3();
function placeCamera(t) {
  const p = active.params, cam = active.camera;
  if (active.api.camera) { active.api.camera(t, cam, p); }
  else {
    const u = EASE[p.camEase || 'weich'](t / p.duration);
    cam.position.set(H.lerp(p.camFromX, p.camToX, u), H.lerp(p.camFromY, p.camToY, u), H.lerp(p.camFromZ, p.camToZ, u));
    cam.lookAt(p.lookX, p.lookY, p.lookZ);
  }
  if (p.camShake > 0) {
    v.set(Math.sin(t * 23.1) + Math.sin(t * 7.3), Math.sin(t * 19.7) + Math.cos(t * 5.1), 0).multiplyScalar(p.camShake * .08);
    cam.position.add(v);
  }
  if (cam.fov !== p.fov) { cam.fov = p.fov; cam.updateProjectionMatrix(); }
}

// ---------- Bild zusammensetzen (alles, was im Video landen soll) ----------
function fontFor(sizePx, weight = 700) {
  const f = global.captionFont;
  const fam = f === 'Inter' ? "'Inter', Arial, sans-serif" : f === 'Cormorant Garamond' ? "'Cormorant Garamond', Georgia, serif" : `'${f}', serif`;
  return `${weight} ${sizePx}px ${fam}`;
}
function wrap(text, maxWidth) {
  const words = text.split(' '); const lines = []; let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line); return lines;
}
function composite(t) {
  const p = active.params, dur = p.duration;
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.drawImage(glCanvas, 0, 0, W, Hh);
  const s = Hh / 1080;
  const lb = Hh * global.letterbox;

  if (!global.textOff && global.captions && (p.capTitle || p.capSub)) {
    const a = Math.min(H.span(t, global.captionDelay, global.captionDelay + .5), H.span(dur - t, .2, .8));
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      const big = 64 * s * global.captionSize, small = 24 * s * global.captionSize;
      const m = 80 * s; let x = m, y = Hh - m - lb, align = 'left';
      if (global.captionPos === 'unten mitte') { x = W / 2; align = 'center'; }
      if (global.captionPos === 'oben links') { y = m + lb + big + small * 1.4; }
      ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
      const slide = (1 - H.easeOut(a)) * 20 * s;
      if (global.captionStyle.startsWith('Serif')) {
        // Referenzstil: kleine Serifenschrift, Datum über Ort, dezenter Schatten
        const l1 = 30 * s * global.captionSize, l2 = 22 * s * global.captionSize;
        ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 8 * s;
        ctx.fillStyle = global.captionColor;
        if (p.capSub) { ctx.font = fontFor(l1, 500); ctx.fillText(p.capSub, x, y - l2 * 1.5 + slide); }
        if (p.capTitle) { ctx.font = fontFor(l2, 400); ctx.globalAlpha = a * .85; ctx.fillText(p.capTitle, x, y + slide); }
        ctx.restore();
      } else {
      if (p.capSub) {
        ctx.font = fontFor(small, 600); ctx.fillStyle = global.accent;
        try { ctx.letterSpacing = `${small * .12}px`; } catch { /* Safari */ }
        ctx.fillText(p.capSub.toUpperCase(), x, y - big * 1.05 + slide);
        try { ctx.letterSpacing = '0px'; } catch { /* Safari */ }
      }
      if (p.capTitle) {
        ctx.font = fontFor(big, 700); ctx.fillStyle = global.captionColor;
        ctx.fillText(p.capTitle, x, y + slide);
        if (align === 'left') { ctx.fillStyle = global.accent; ctx.fillRect(x, y + 14 * s, Math.min(ctx.measureText(p.capTitle).width, 220 * s), 5 * s); }
      }
      ctx.restore();
      }
    }
  }
  if (!global.textOff && global.subtitles && p.subtitle) {
    const size = 34 * s * global.subtitleSize;
    ctx.font = fontFor(size, 500);
    const lines = wrap(p.subtitle, W * .7);
    const lh = size * 1.3, y0 = Hh - lb - 60 * s - lines.length * lh;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => {
      const w = ctx.measureText(l).width;
      ctx.fillStyle = 'rgba(10,12,16,.6)'; ctx.fillRect(W / 2 - w / 2 - 16 * s, y0 + i * lh - 4 * s, w + 32 * s, lh);
      ctx.fillStyle = '#ffffff'; ctx.fillText(l, W / 2, y0 + i * lh + 2 * s);
    });
  }
  if (global.vignette > 0) {
    if (!vignetteCache) {
      vignetteCache = ctx.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * .35, W / 2, Hh / 2, Math.hypot(W, Hh) * .6);
      vignetteCache.addColorStop(0, 'rgba(0,0,0,0)'); vignetteCache.addColorStop(1, 'rgba(0,0,0,1)');
    }
    ctx.globalAlpha = global.vignette; ctx.fillStyle = vignetteCache; ctx.fillRect(0, 0, W, Hh); ctx.globalAlpha = 1;
  }
  if (global.grain > 0) {
    const i = Math.floor(t * 24) % noise.length;
    const r = H.rng(Math.floor(t * 24) + 7);
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = global.grain;
    ctx.translate(Math.floor(r() * 256), Math.floor(r() * 256));
    ctx.fillStyle = ctx.createPattern(noise[i], 'repeat'); ctx.fillRect(-256, -256, W + 512, Hh + 512);
    ctx.restore();
  }
  if (lb > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, lb); ctx.fillRect(0, Hh - lb, W, lb); }
  const fade = 1 - Math.min(global.fadeIn ? H.span(t, 0, global.fadeIn) : 1, global.fadeOut ? H.span(dur - t, 0, global.fadeOut) : 1);
  if (fade > 0) { ctx.globalAlpha = fade; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, Hh); ctx.globalAlpha = 1; }
}

window.__studio = { get active() { return active; }, state, renderer, global, loadScene, renderAt, H };
function renderAt(t) {
  active.api.update?.(t, active.params);
  H.animateFigures(t);
  if (state.orbit) controls.update(); else placeCamera(t);
  renderPass.scene = active.scene; renderPass.camera = active.camera;
  bloomPass.strength = global.bloom; bloomPass.threshold = global.bloomThreshold; bloomPass.radius = global.bloomRadius;
  bloomPass.enabled = global.bloom > 0;
  composer.render();
  composite(t);
}

// ---------- Schleife ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (!state.exporting && active) {
    if (state.playing) {
      state.t += dt * (state.recording ? 1 : state.speed);
      const d = active.params.duration;
      if (state.t >= d) {
        if (state.recording) { state.t = d; stopRecording(); }
        else if (state.loop) state.t -= d;
        else { state.t = d; state.playing = false; }
      }
    }
    renderAt(state.t);
    syncTimeline();
  }
  requestAnimationFrame(frame);
}

// ---------- Aufnahme: WebM ----------
let recorder = null, chunks = [], recordResolve = null;
function mime() {
  for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']) if (MediaRecorder.isTypeSupported(m)) return m;
  return '';
}
function fileBase() { return `${String(state.index + 1).padStart(2, '0')}_${active.def.id}`; }
// Speichern: im claude.ai-Artifact über die Downloads-Funktion der Plattform (Bestätigung durch den Betrachter),
// sonst als normaler Browser-Download
const downloadsReady = window.claude && window.claude.use ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
const DL_MSG = { declined: 'Speichern abgelehnt.', rate_limited: 'Es ist schon ein Speichern-Dialog offen, bitte kurz warten.', too_large: 'Datei zu groß für diese Ansicht.', rejected_extension: 'Dateityp wird hier nicht unterstützt.' };
async function download(blob, name) {
  const dl = await downloadsReady;
  if (dl) {
    try { await dl.save({ filename: name, data: blob }); status(`Gespeichert: ${name} (${(blob.size / 1e6).toFixed(1)} MB)`); return true; }
    catch (e) { status(DL_MSG[e && e.code] || ('Speichern nicht möglich: ' + ((e && e.message) || e))); return false; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  status(`Gespeichert: ${name} (${(blob.size / 1e6).toFixed(1)} MB)`);
  return true;
}

// Minimaler ZIP-Schreiber (ohne Kompression, PNGs sind schon komprimiert) für die PNG-Sequenz im Artifact
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipWriter() {
  const parts = [], central = []; let offset = 0;
  const enc = new TextEncoder();
  return {
    async add(name, blob) {
      const data = new Uint8Array(await blob.arrayBuffer()), nm = enc.encode(name), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
      parts.push(h.buffer, nm, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, offset, true);
      central.push(c.buffer, nm);
      offset += 30 + nm.length + data.length;
    },
    blob() {
      const size = central.reduce((a, b) => a + b.byteLength, 0), n = central.length / 2;
      const e = new DataView(new ArrayBuffer(22));
      e.setUint32(0, 0x06054b50, true); e.setUint16(8, n, true); e.setUint16(10, n, true); e.setUint32(12, size, true); e.setUint32(16, offset, true);
      return new Blob([...parts, ...central, e.buffer], { type: 'application/zip' });
    }
  };
}
function recordWebM() {
  return new Promise(resolve => {
    const fps = +global.fps;
    const stream = out.captureStream(fps);
    recorder = new MediaRecorder(stream, { mimeType: mime(), videoBitsPerSecond: global.bitrate * 1e6 });
    chunks = [];
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      stream.getTracks().forEach(tr => tr.stop());
      status('Video wird angeboten …');
      download(blob, fileBase() + (recorder.mimeType.includes('mp4') ? '.mp4' : '.webm')).then(() => resolve());   // meldet Erfolg oder Ablehnung selbst
    };
    recordResolve = resolve;
    state.orbit = false; controls.enabled = false; $('#orbit').checked = false;
    state.t = 0; state.playing = true; state.recording = true;
    recorder.start(250);
    status('Aufnahme läuft … bitte Tab im Vordergrund lassen.');
  });
}
function stopRecording() {
  state.recording = false; state.playing = false;
  if (recorder && recorder.state !== 'inactive') recorder.stop();
}

// ---------- Export: MP4 (H.264), bildgenau ----------
// Jedes Bild wird einzeln gerendert, mit WebCodecs kodiert und mit mp4-muxer in eine MP4 mit korrekter Länge
// und Zeitstempeln verpackt. Läuft unabhängig von der Geschwindigkeit des Rechners, ohne ausgefallene Bilder.
const MP4_MUXER = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm';
async function pickEncoder(w, h, fps, bitrate) {
  const cands = [['avc1.640033', 'avc'], ['avc1.640028', 'avc'], ['avc1.4d0033', 'avc'], ['avc1.42003e', 'avc'], ['vp09.00.41.08', 'vp9']];
  for (const [codec, mux] of cands) {
    const config = { codec, width: w, height: h, bitrate, framerate: fps, latencyMode: 'quality', ...(mux === 'avc' ? { avc: { format: 'avc' } } : {}) };
    try { const r = await VideoEncoder.isConfigSupported(config); if (r.supported) return { config, mux }; } catch { /* nächster Kandidat */ }
  }
  return null;
}
async function exportMP4() {
  if (!window.VideoEncoder) { status('MP4-Export braucht Chrome oder Edge (WebCodecs). Alternativ PNG-Sequenz wählen.'); return; }
  const fps = +global.fps, dur = active.params.duration, n = Math.ceil(dur * fps);
  const w = out.width - (out.width % 2), h = out.height - (out.height % 2);
  const enc = await pickEncoder(w, h, fps, global.bitrate * 1e6);
  if (!enc) { status('Kein passender Video-Encoder in diesem Browser. Alternativ PNG-Sequenz wählen.'); return; }
  let M;
  try { M = await import(MP4_MUXER); } catch (e) { status('MP4-Bibliothek nicht ladbar: ' + e.message); return; }
  const target = new M.ArrayBufferTarget();
  const muxer = new M.Muxer({ target, video: { codec: enc.mux, width: w, height: h, frameRate: fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  let encErr = null;
  const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { encErr = e; } });
  encoder.configure(enc.config);
  state.exporting = true; state.playing = false; state.orbit = false; controls.enabled = false; $('#orbit').checked = false;
  try {
    for (let i = 0; i < n; i++) {
      if (encErr) throw encErr;
      renderAt(i / fps);
      const frame = new VideoFrame(out, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 4) await new Promise(r => setTimeout(r, 1));
      if (i % 5 === 0) { status(`MP4: Bild ${i + 1} / ${n}`); await new Promise(r => setTimeout(r, 0)); }
    }
    await encoder.flush();
    if (encErr) throw encErr;
    muxer.finalize();
    const blob = new Blob([target.buffer], { type: 'video/mp4' });
    status('Video wird angeboten …');
    await download(blob, fileBase() + '.mp4');
  } catch (e) { status('Fehler beim MP4-Export: ' + (e && e.message || e)); }
  try { encoder.close(); } catch { /* schon geschlossen */ }
  state.exporting = false; state.t = 0;
}

// ---------- Aufnahme: PNG-Sequenz ----------
async function exportPNG() {
  // Ordnerauswahl (Chrome/Edge, lokal). Im Artifact ist sie gesperrt: dann als ZIP über die Downloads-Funktion.
  let dir = null, zip = null;
  if (window.showDirectoryPicker && !(await downloadsReady)) {
    try { dir = await window.showDirectoryPicker({ mode: 'readwrite' }); }
    catch (e) { if (e && e.name === 'AbortError') { status('Abgebrochen.'); return; } dir = null; }
  }
  if (!dir) zip = zipWriter();
  const sub = dir ? await dir.getDirectoryHandle(fileBase(), { create: true }) : null;
  const fps = +global.fps, dur = active.params.duration, n = Math.ceil(dur * fps);
  state.exporting = true; state.playing = false; state.orbit = false; controls.enabled = false; $('#orbit').checked = false;
  try {
    for (let i = 0; i < n; i++) {
      renderAt(i / fps);
      const blob = await new Promise(r => out.toBlob(r, 'image/png'));
      const name = `frame_${String(i).padStart(5, '0')}.png`;
      if (sub) { const fh = await sub.getFileHandle(name, { create: true }); const w = await fh.createWritable(); await w.write(blob); await w.close(); }
      else await zip.add(fileBase() + '/' + name, blob);
      status(`PNG-Sequenz: Bild ${i + 1} / ${n}`);
      await new Promise(r => setTimeout(r, 0));
    }
    const ff = `ffmpeg -framerate ${fps} -i frame_%05d.png -c:v libx264 -pix_fmt yuv420p ${fileBase()}.mp4`;
    if (sub) status(`Fertig: ${n} Bilder in Ordner „${fileBase()}“. ${ff}`);
    else { status('ZIP wird angeboten …'); if (await download(zip.blob(), fileBase() + '_png.zip')) status(`Fertig: ${n} Bilder als ${fileBase()}_png.zip. Entpacken, dann: ${ff}`); }
  } catch (e) { status('Fehler: ' + e.message); }
  state.exporting = false; state.t = 0;
}

async function exportCurrent() {
  if (state.recording || state.exporting) return;
  if (global.exportFormat.startsWith('PNG')) await exportPNG();
  else if (global.exportFormat.startsWith('WebM')) await recordWebM();
  else await exportMP4();
}
async function exportAll() {
  if (state.recording || state.exporting) return;
  for (let i = 0; i < SCENES.length; i++) {
    loadScene(i);
    await new Promise(r => setTimeout(r, 400));
    await exportCurrent();
    await new Promise(r => setTimeout(r, 400));
  }
  status('Alle Szenen exportiert.');
}
function status(msg) { $('#status').textContent = msg; }

// ---------- GUI ----------
const sceneGui = new GUI($('#scene-gui'));
const globalGui = new GUI($('#global-gui'));
const cameraRows = [];

function buildSceneGui() {
  sceneGui.clear(); cameraRows.length = 0;
  const schema = sceneSchema(active.def);
  const groups = {};
  for (const [k, s] of Object.entries(schema)) (groups[s.group || 'Szene'] ||= []).push([k, s]);
  const order = ['Szene', ...Object.keys(groups).filter(g => g !== 'Szene' && g !== 'Kamera'), 'Kamera'];
  for (const g of order) {
    if (!groups[g]) continue;
    const f = sceneGui.folder(g, g !== 'Kamera');
    if (g === 'Kamera') {
      const row = document.createElement('label'); row.className = 'row';
      row.innerHTML = '<span class="row-label">Freie Kamera (Maus)</span>';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = 'orbit'; cb.checked = state.orbit;
      cb.onchange = () => { state.orbit = cb.checked; controls.enabled = cb.checked; if (cb.checked) { controls.target.set(active.params.lookX, active.params.lookY, active.params.lookZ); } };
      row.append(cb); f.root.append(row);
      f.button('Kameraposition als Start übernehmen', () => takeCamera('From'));
      f.button('Kameraposition als Ende übernehmen', () => takeCamera('To'));
      f.note('Tipp: Freie Kamera einschalten, mit der Maus drehen/zoomen, dann Position übernehmen. Blickpunkt wird mit übernommen.');
    }
    for (const [k, s] of groups[g]) {
      const row = f.add(active.params, k, s, key => {
        save('scene.' + active.def.id, active.params);
        if (!s.live) scheduleRebuild();
      });
      if (g === 'Kamera') cameraRows.push(row);
    }
  }
  sceneGui.button('Szene auf Standard zurücksetzen', () => {
    localStorage.removeItem(LS + 'scene.' + active.def.id);
    active = null; loadScene(state.index);
  }, 'ghost');
}
function takeCamera(which) {
  const p = active.params, c = active.camera;
  p['cam' + which + 'X'] = +c.position.x.toFixed(2); p['cam' + which + 'Y'] = +c.position.y.toFixed(2); p['cam' + which + 'Z'] = +c.position.z.toFixed(2);
  p.lookX = +controls.target.x.toFixed(2); p.lookY = +controls.target.y.toFixed(2); p.lookZ = +controls.target.z.toFixed(2);
  save('scene.' + active.def.id, p);
  cameraRows.forEach(r => r.sync && r.sync());
}

function buildGlobalGui() {
  globalGui.clear();
  const groups = {};
  for (const [k, s] of Object.entries(GLOBAL_SCHEMA)) (groups[s.group] ||= []).push([k, s]);
  for (const [g, items] of Object.entries(groups)) {
    const f = globalGui.folder(g, g === 'Export');
    for (const [k, s] of items) f.add(global, k, s, key => {
      save('global', global);
      if (RESOLUTION_GLOBAL.has(key)) applyResolution();
      if (REBUILD_GLOBAL.has(key)) scheduleRebuild();
    });
    if (g === 'Export') {
      f.button('Diese Szene exportieren', exportCurrent, 'primary');
      f.button('Alle Szenen nacheinander exportieren', exportAll);
      f.button('Standbild (PNG) speichern', () => out.toBlob(b => download(b, fileBase() + `_${state.t.toFixed(2)}s.png`), 'image/png'));
      f.note('WebM läuft in Echtzeit: Tab sichtbar lassen, nichts verschieben. PNG-Sequenz ist bildgenau (kein Frame-Drop) und wird in einen Ordner geschrieben.');
    }
  }
  const f = globalGui.folder('Einstellungen sichern', false);
  f.button('Alle Einstellungen als JSON exportieren', () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(LS)) data[k] = JSON.parse(localStorage.getItem(k)); }
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'ww2-szenen-einstellungen.json');
  });
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.hidden = true;
  inp.onchange = async () => {
    const data = JSON.parse(await inp.files[0].text());
    for (const [k, vv] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(vv));
    location.reload();
  };
  f.root.append(inp);
  f.button('JSON importieren', () => inp.click());
  f.button('Alles zurücksetzen', () => { for (const k of Object.keys(localStorage)) if (k.startsWith(LS)) localStorage.removeItem(k); location.reload(); }, 'ghost');
}

function buildSceneList() {
  const ul = $('#scene-list');
  SCENES.forEach((s, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button'; b.dataset.i = i;
    b.innerHTML = `<span class="num">${String(i + 1).padStart(2, '0')}</span><span class="t">${s.title}</span><span class="d">${s.duration}s</span>`;
    b.onclick = () => loadScene(i);
    li.append(b); ul.append(li);
  });
}

// ---------- Zeitleiste ----------
const tl = $('#timeline'), tTime = $('#time');
function syncTimeline() {
  const d = active.params.duration;
  if (document.activeElement !== tl) tl.value = (state.t / d * 1000) | 0;
  tTime.textContent = `${state.t.toFixed(2)} / ${d.toFixed(1)} s`;
  $('#play').textContent = state.playing ? '❚❚' : '▶';
}
tl.oninput = () => { state.t = tl.value / 1000 * active.params.duration; state.playing = false; };
$('#play').onclick = () => { if (state.t >= active.params.duration) state.t = 0; state.playing = !state.playing; };
$('#stop').onclick = () => { state.playing = false; state.t = 0; };
$('#loop').onchange = e => state.loop = e.target.checked;
$('#speed').onchange = e => state.speed = +e.target.value;
$('#prev').onclick = () => loadScene((state.index + SCENES.length - 1) % SCENES.length);
$('#next').onclick = () => loadScene((state.index + 1) % SCENES.length);
$('#frame-back').onclick = () => { state.playing = false; state.t = Math.max(0, state.t - 1 / +global.fps); };
$('#frame-fwd').onclick = () => { state.playing = false; state.t = Math.min(active.params.duration, state.t + 1 / +global.fps); };
window.addEventListener('keydown', e => {
  if (e.target.matches('input, select, textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); $('#play').click(); }
  if (e.code === 'ArrowLeft') $('#frame-back').click();
  if (e.code === 'ArrowRight') $('#frame-fwd').click();
  if (e.code === 'PageUp') $('#prev').click();
  if (e.code === 'PageDown') $('#next').click();
});
$('#toggle-left').onclick = () => document.body.classList.toggle('hide-left');
$('#toggle-right').onclick = () => document.body.classList.toggle('hide-right');

// ---------- Start ----------
document.fonts?.load('700 64px Inter').catch(() => {});
document.fonts?.load("500 30px 'Cormorant Garamond'").catch(() => {});
buildSceneList();
buildGlobalGui();
applyResolution();
status('Lade Figurenmodelle …');
H.preloadModels(k => status(`Modell geladen: ${k}`)).then(() => {
  status('Bereit.');
  const startIndex = Math.min(SCENES.length - 1, +(location.hash.slice(1)) - 1 || 0);
  loadScene(startIndex >= 0 ? startIndex : 0);
  requestAnimationFrame(frame);
});
