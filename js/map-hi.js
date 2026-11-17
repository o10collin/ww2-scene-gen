// Detaillierte Europakarte als Textur (Natural Earth 1:50m, js/geo-europe.js) in Mercator-Projektion.
// Gebiete („Regionen“) werden aus heutigen Ländern zusammengesetzt und bei Bedarf mit einem Polygon beschnitten
// (Leinwand-Clip = Schnittmenge). So entstehen historische Grenzen, z. B. das Großdeutsche Reich 1942.
// Eine Region kann als eigene Ebene über der Karte liegen (für Pulsieren/Zusammendrücken), mit Umriss und Glanz.
import * as THREE from 'three';
import { EU_COUNTRIES } from './geo-europe.js';
import { terrainTexture, label, labelFont, glowMat, clamp, pinTexture, haloTexture } from './common.js';

const D2R = Math.PI / 180;
export const mercY = lat => Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2)) / D2R;
const BY_ID = {}; for (const c of EU_COUNTRIES) { BY_ID[c[0]] = c; BY_ID[c[1]] = c; }

// Ringe über die Datumsgrenze stetig machen (Russland/Tschukotka), sonst entsteht ein Band über die ganze Karte
function traceCountry(g, c, px) {
  for (const poly of c[2]) for (const ring of poly) {
    let prev = null, off = 0;
    for (let i = 0; i < ring.length; i += 2) {
      let lon = ring[i] / 50;
      if (prev !== null) { const d = lon + off - prev; if (d > 180) off -= 360; else if (d < -180) off += 360; }
      lon += off; prev = lon;
      const [x, y] = px(lon, ring[i + 1] / 50); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  }
}
function tracePoly(g, pts, px) { pts.forEach(([lon, lat], i) => { const [x, y] = px(lon, lat); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }); g.closePath(); }
// Region füllen: parts = [{ c: 'Länder-ID oder Name', clip?: [[lon, lat], …] }]
function fillRegion(g, parts, px) {
  for (const part of parts) {
    const c = BY_ID[part.c]; if (!c) continue;
    g.save();
    if (part.clip) { g.beginPath(); tracePoly(g, part.clip, px); g.clip(); }
    g.beginPath(); traceCountry(g, c, px); g.fill('evenodd');
    g.restore();
  }
}
function hatchPattern(g, color, k) {
  const S = Math.round(22 * k), c = document.createElement('canvas'); c.width = c.height = S; const h = c.getContext('2d');
  h.strokeStyle = color; h.lineWidth = 2.2 * k; h.beginPath();
  for (let i = -S; i <= S * 2; i += S / 2) { h.moveTo(i, S); h.lineTo(i + S, 0); }
  h.stroke(); return g.createPattern(c, 'repeat');
}
// Umriss einer Maske: Maske in alle Richtungen versetzt (Dilatation), dann das Innere ausstanzen -> Ring
function outlineOf(mask, width, color) {
  const W = mask.width, Hh = mask.height, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
  for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; g.drawImage(mask, Math.cos(an) * width, Math.sin(an) * width); }
  g.globalCompositeOperation = 'destination-out'; g.drawImage(mask, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, W, Hh);
  return c;
}

export function hiMap({
  bbox = [-14, 27, 56, 67], center = [15, 50], scale = .5, texW = 4096, detail = null,
  sea = '#151c25', land = '#6c7178', borders = 'rgba(225,230,238,.35)', coast = 'rgba(255,255,255,.28)',
  regions = [], graticule = true, borderWidth = 1.6, glowBorders = false, font = null, texture = .22, groups = null
} = {}) {
  const gb = groups ? groupBorders(groups) : null;   // historische Grenzen: nur Linien zwischen verschiedenen Gebieten
  const g = new THREE.Group();
  const project = (lon, lat, y = 0) => new THREE.Vector3((lon - center[0]) * scale, y, -(mercY(lat) - mercY(center[1])) * scale);
  const tt = terrainTexture().image;
  // Eine Kachel der Karte: bb = [lon0, lat0, lon1, lat1], W = Texturbreite. Linienbreiten in Weltmaß (k nach Pixel je Grad).
  // detail: zweite, höher aufgelöste Kachel für den Kernbereich über einer gröberen Umgebung -> scharf beim Heranzoomen
  const paint = (bb, W, y) => {
    const [lon0, lat0, lon1, lat1] = bb, my0 = mercY(lat0), my1 = mercY(lat1);
    const Hh = Math.round(W * (my1 - my0) / (lon1 - lon0)), k = W / (lon1 - lon0) / 58.5;
    const px = (lon, lat) => [(lon - lon0) / (lon1 - lon0) * W, (my1 - mercY(lat)) / (my1 - my0) * Hh];
    const c = document.createElement('canvas'); c.width = W; c.height = Hh; const ctx = c.getContext('2d');
    // Meer: dunkler Verlauf mit leichter Struktur
    const sg = ctx.createLinearGradient(0, 0, 0, Hh); sg.addColorStop(0, sea); sg.addColorStop(1, new THREE.Color(sea).multiplyScalar(.8).getStyle());
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, Hh);
    ctx.save(); ctx.globalAlpha = texture * .5; ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = ctx.createPattern(tt, 'repeat'); ctx.fillRect(0, 0, W, Hh); ctx.restore();
    // Land mit leichtem Schatten und Geländestruktur
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 6 * k; ctx.shadowOffsetX = 2 * k; ctx.shadowOffsetY = 3 * k; ctx.fillStyle = land;
    if (gb) { ctx.beginPath(); for (const cn of EU_COUNTRIES) traceCountry(ctx, cn, px); ctx.fill('nonzero'); }
    else for (const cn of EU_COUNTRIES) { ctx.beginPath(); traceCountry(ctx, cn, px); ctx.fill('evenodd'); }
    ctx.restore();
    ctx.save(); ctx.beginPath(); for (const cn of EU_COUNTRIES) traceCountry(ctx, cn, px); ctx.clip('nonzero');
    ctx.globalAlpha = texture; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ctx.createPattern(tt, 'repeat'); ctx.fillRect(0, 0, W, Hh); ctx.restore();
    // Regionen, die fest in der Karte stehen (nicht als eigene Ebene)
    for (const r of regions.filter(r => !r.layer)) {
      ctx.save(); ctx.globalAlpha = r.alpha ?? .5; ctx.fillStyle = r.color; fillRegion(ctx, r.parts, px); ctx.restore();
      if (r.hatch) { ctx.save(); ctx.globalAlpha = r.hatchAlpha ?? .5; ctx.fillStyle = hatchPattern(ctx, r.hatch, k); fillRegion(ctx, r.parts, px); ctx.restore(); }
    }
    // Grenzen und Küsten (optional mit weichem Leuchten)
    ctx.save(); ctx.lineJoin = 'round';
    if (glowBorders) { ctx.shadowColor = borders; ctx.shadowBlur = 7 * k; }
    if (gb) {
      const seg = list => { ctx.beginPath(); for (let i = 0; i < list.length; i += 4) { const [x0, y0] = px(list[i], list[i + 1]), [x1, y1] = px(list[i + 2], list[i + 3]); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); } ctx.stroke(); };
      ctx.lineCap = 'round';
      ctx.strokeStyle = borders; ctx.lineWidth = borderWidth * k; seg(gb.border);
      ctx.strokeStyle = coast; ctx.lineWidth = borderWidth * 1.3 * k; seg(gb.coast);
    } else {
      ctx.strokeStyle = borders; ctx.lineWidth = borderWidth * k;
      for (const cn of EU_COUNTRIES) { ctx.beginPath(); traceCountry(ctx, cn, px); ctx.stroke(); }
      ctx.strokeStyle = coast; ctx.lineWidth = borderWidth * 1.3 * k; ctx.beginPath(); for (const cn of EU_COUNTRIES) traceCountry(ctx, cn, px); ctx.stroke();
    }
    ctx.restore();
    // Unter Regionen mit eigener Ebene die heutigen Grenzen löschen, damit nichts durchscheint
    for (const r of regions.filter(r => r.layer)) {
      ctx.save(); ctx.fillStyle = land; fillRegion(ctx, r.parts, px);
      ctx.globalAlpha = texture; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ctx.createPattern(tt, 'repeat'); fillRegion(ctx, r.parts, px); ctx.restore();
    }
    if (graticule) {
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1.4 * k; ctx.beginPath();
      for (let lon = Math.ceil(lon0 / 10) * 10; lon <= lon1; lon += 10) { const [x] = px(lon, 0); ctx.moveTo(x, 0); ctx.lineTo(x, Hh); }
      for (let lat = Math.ceil(lat0 / 10) * 10; lat <= lat1; lat += 10) { const [, yy] = px(0, lat); ctx.moveTo(0, yy); ctx.lineTo(W, yy); }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
    const a = project(lon0, lat0), b = project(lon1, lat1);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(b.x - a.x, a.z - b.z), new THREE.MeshBasicMaterial({ map: tex }));
    plane.rotation.x = -Math.PI / 2; plane.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2); g.add(plane);
    return W / (lon1 - lon0);
  };
  let pxPerDeg = paint(bbox, texW, 0);
  if (detail) pxPerDeg = paint(detail.bbox, detail.texW, .003);

  // Regionen als eigene Ebene: Fläche + heller Umriss + weicher Innenschein, auf einen Ausschnitt begrenzt
  const layers = {};
  for (const r of regions.filter(r => r.layer)) {
    const [rl0, rb0, rl1, rb1] = r.layer.bbox, ry0 = mercY(rb0), ry1 = mercY(rb1);
    const LW = Math.round(pxPerDeg * (rl1 - rl0) * (r.layer.res ?? 1.4)), LH = Math.round(LW * (ry1 - ry0) / (rl1 - rl0)), lk = LW / (rl1 - rl0) / 58.5;
    const lpx = (lon, lat) => [(lon - rl0) / (rl1 - rl0) * LW, (ry1 - mercY(lat)) / (ry1 - ry0) * LH];
    const mask = document.createElement('canvas'); mask.width = LW; mask.height = LH; const mg = mask.getContext('2d');
    mg.fillStyle = '#ffffff'; fillRegion(mg, r.parts, lpx);
    const out = document.createElement('canvas'); out.width = LW; out.height = LH; const og = out.getContext('2d');
    og.globalAlpha = r.alpha ?? .85; og.drawImage(mask, 0, 0); og.globalCompositeOperation = 'source-in'; og.fillStyle = r.color; og.fillRect(0, 0, LW, LH);
    og.globalCompositeOperation = 'source-atop'; og.globalAlpha = .18; og.fillStyle = og.createPattern(tt, 'repeat'); og.fillRect(0, 0, LW, LH);
    og.globalCompositeOperation = 'source-over'; og.globalAlpha = 1;
    // Innenschein am Rand
    if (r.glow) { const glow = outlineOf(mask, 10 * lk, r.glow); og.save(); og.globalCompositeOperation = 'source-atop'; og.filter = `blur(${6 * lk}px)`; og.drawImage(glow, 0, 0); og.restore(); }
    // kräftiger heller Außenumriss
    og.drawImage(outlineOf(mask, (r.outlineWidth ?? 3.2) * lk, r.outline || '#f1e6dc'), 0, 0);
    const lt = new THREE.CanvasTexture(out); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 8;
    const la = project(rl0, rb0), lb = project(rl1, rb1);
    const pivot = new THREE.Group(); const pv = project(...(r.layer.pivot || [(rl0 + rl1) / 2, (rb0 + rb1) / 2]), .02); pivot.position.copy(pv); g.add(pivot);
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(lb.x - la.x, la.z - lb.z), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false }));
    lm.rotation.x = -Math.PI / 2; lm.position.set((la.x + lb.x) / 2 - pv.x, 0, (la.z + lb.z) / 2 - pv.z); lm.renderOrder = 2; pivot.add(lm);
    pivot.userData.mesh = lm; layers[r.name] = pivot;
  }

  g.userData = {
    project, layers,
    // Ländername: Großbuchstaben, gesperrt (Serifenschrift) oder wie die Globus-Beschriftung in Szene 2 (dunkle Box)
    country(lon, lat, text, size = 1, { color = '#f4f1ea', opacity = .95, box = false } = {}) {
      const l = box ? label(text, { size, font: labelFont(60, 500), color, bg: 'rgba(14,18,26,.72)' })
        : label(text, { size, font: font ? `500 56px ${font}` : labelFont(52, 500), upper: true, spacing: font ? 8 : 10, color, shadow: true });
      l.material.opacity = opacity; l.position.copy(project(lon, lat, .6)); g.add(l); return l;
    },
    // Stadt: weißer Punkt mit dunklem Rand + kleine Beschriftung
    city(lon, lat, text, { size = .55, dot = .13, dx = 0, dz = -.55 } = {}) {
      const v = project(lon, lat, .04);
      const ring = new THREE.Mesh(new THREE.CircleGeometry(dot * 1.45, 24), new THREE.MeshBasicMaterial({ color: '#111418', transparent: true, opacity: .8 }));
      const d = new THREE.Mesh(new THREE.CircleGeometry(dot, 24), glowMat('#ffffff', 1.4));
      ring.rotation.x = d.rotation.x = -Math.PI / 2; ring.position.copy(v); d.position.copy(v).setY(v.y + .005);
      const l = label(text, { size, font: font ? `500 56px ${font}` : labelFont(52, 500), color: '#f4f1ea' }); l.position.set(v.x + dx, .5, v.z + dz);
      g.add(ring, d, l); return { dot: d, ring, label: l };
    },
    // Kartenpunkt wie in Apple Karten (wie auf dem Globus in Szene 2): weißer Ring, farbiger Kern, pulsierender Halo
    pin(lon, lat, color, { size = .5 } = {}) {
      const grp = new THREE.Group(); grp.position.copy(project(lon, lat, .08)); g.add(grp);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color, transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
      const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinTexture(color), transparent: true, depthTest: false, depthWrite: false }));
      halo.renderOrder = 8; dot.renderOrder = 9; grp.add(halo, dot);
      const st = { scale: 1, halo: 0, opacity: 1 };
      const apply = () => { dot.material.opacity = st.opacity; dot.scale.setScalar(size * st.scale); halo.material.opacity = st.opacity * (1 - st.halo) * .8; halo.scale.setScalar(size * st.scale * (1 + st.halo * 2.6)); halo.visible = st.halo > 0; };
      apply(); grp.userData.set = o => { Object.assign(st, o); apply(); };
      return grp;
    },
    // Bogen über der Karte (wie die Bögen auf dem Globus): dünne leuchtende Röhre, ein Kartenpunkt läuft an der Spitze
    // mit und bleibt am Ziel stehen; setProgress(0..1)
    arc(pts, color, { lift = 1.2, radius = .05, head = .45, strength = 2 } = {}) {
      const n = pts.length;
      const v = pts.map(([lon, lat], i) => project(lon, lat, .06 + lift * Math.sin(Math.PI * i / (n - 1))));
      const curve = new THREE.CatmullRomCurve3(v, false, 'catmullrom', .5);
      const geo = new THREE.TubeGeometry(curve, 64, radius, 6, false), total = geo.index.count;
      const m = new THREE.Mesh(geo, glowMat(color, strength)); g.add(m);
      const hd = new THREE.Sprite(new THREE.SpriteMaterial({ map: pinTexture(new THREE.Color(color).getStyle()), transparent: true, depthTest: false, depthWrite: false }));
      hd.scale.setScalar(head); hd.renderOrder = 9; g.add(hd);
      m.userData.setProgress = u => { u = clamp(u, 0, 1); geo.setDrawRange(0, Math.floor(total * u / 6) * 6); m.visible = hd.visible = u > 0; curve.getPoint(u, hd.position); };
      m.userData.head = hd; m.userData.setProgress(0);
      return m;
    },
    // Flacher Kartenpfeil (wie in Geschichtskarten): breites Band, das zur Spitze hin breiter wird, dreieckige
    // Spitze, dunkler Schatten darunter für Kontrast. pts = [[lon, lat], …]; setProgress(0..1) lässt ihn wachsen
    flatArrow(pts, color, { width = .32, head = 1.0, headW = .95, strength = 1.5, opacity = .95 } = {}) {
      const curve = new THREE.CatmullRomCurve3(pts.map(([lon, lat]) => project(lon, lat, .05)), false, 'centripetal');
      const L = curve.getLength(), N = 80, hf = Math.min(.45, head / L);
      const mk = (wScale, y, mat) => {
        const pos = new Float32Array((N + 1) * 6), idx = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N * (1 - hf), c = curve.getPointAt(u), tg = curve.getTangentAt(u);
          const w = width * wScale * (.55 + .45 * u / (1 - hf)) / 2, nx = -tg.z, nz = tg.x, ln = Math.hypot(nx, nz) || 1;
          pos.set([c.x + nx / ln * w, y, c.z + nz / ln * w, c.x - nx / ln * w, y, c.z - nz / ln * w], i * 6);
          if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
        const body = new THREE.Mesh(geo, mat);
        const sh = new THREE.Shape([new THREE.Vector2(-headW * wScale / 2, 0), new THREE.Vector2(headW * wScale / 2, 0), new THREE.Vector2(0, head * (wScale > 1 ? 1.12 : 1))]);
        const hm = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat); hm.rotation.x = -Math.PI / 2;
        const hp = new THREE.Group(); hp.add(hm); hp.position.y = y;
        const grp = new THREE.Group(); grp.add(body, hp); g.add(grp);
        return { body, hp, grp };
      };
      const shadow = mk(1.35, .045, new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: .35 * opacity, depthWrite: false, side: THREE.DoubleSide }));
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }); mat.color.multiplyScalar(strength);
      const main = mk(1, .06, mat);
      shadow.grp.renderOrder = 3; main.body.renderOrder = main.hp.children[0].renderOrder = 4; shadow.body.renderOrder = shadow.hp.children[0].renderOrder = 3;
      const tip = new THREE.Vector3(), tg = new THREE.Vector3();
      const set = u => {
        u = clamp(u, 0, 1);
        for (const part of [shadow, main]) {
          part.grp.visible = u > .01;
          part.body.geometry.setDrawRange(0, Math.floor(N * u) * 6);
          const ub = u * (1 - hf); curve.getPointAt(ub, tip); curve.getTangentAt(ub, tg);
          part.hp.position.set(tip.x, part.hp.position.y, tip.z); part.hp.rotation.y = Math.atan2(tg.x, tg.z) + Math.PI;   // Spitze (Form-y -> Welt -z) in Laufrichtung
        }
      };
      set(0);
      return { setProgress: set, material: mat };
    },
    // Linie (z. B. Frontverlauf) als leuchtende Röhre, setProgress(0..1) zeichnet sie ein
    line(pts, color, { radius = .05, strength = 2 } = {}) {
      const curve = new THREE.CatmullRomCurve3(pts.map(([lon, lat]) => project(lon, lat, .06)), false, 'catmullrom', .2);
      const geo = new THREE.TubeGeometry(curve, pts.length * 12, radius, 5, false);
      const m = new THREE.Mesh(geo, glowMat(color, strength)); const total = geo.index.count;
      m.userData.setProgress = u => { u = clamp(u, 0, 1); geo.setDrawRange(0, Math.floor(total * u / 6) * 6); m.visible = u > 0; };
      g.add(m); return m;
    }
  };
  return g;
}

// Maske eines Gebiets (weiß auf transparent) für einen Ausschnitt bbox = [lon0, lat0, lon1, lat1] in Mercator,
// z. B. als alphaMap für Flächen, die sich per Shader verändern (besetztes Gebiet hinter einer wandernden Front)
export function regionMaskTexture(parts, bbox, W = 2048) {
  const [lon0, lat0, lon1, lat1] = bbox, my0 = mercY(lat0), my1 = mercY(lat1);
  const Hh = Math.round(W * (my1 - my0) / (lon1 - lon0));
  const px = (lon, lat) => [(lon - lon0) / (lon1 - lon0) * W, (my1 - mercY(lat)) / (my1 - my0) * Hh];
  const c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; fillRegion(g, parts, px);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}

// ---------- Historische Grenzen aus Gebietsgruppen ----------
// groups: [[{ c, clip? }, …], …] – jede Gruppe ist ein damaliges Gebiet aus (Teilen) heutiger Länder. Jedes Stück
// heutiger Grenze/Küste wird geprüft: Liegen beide Seiten im selben Gebiet, entfällt die Linie; sonst Grenze bzw. Küste.
// Kanten der Schnittpolygone kommen als neue Grenzen dazu, wo sie zwei verschiedene Gebiete trennen.
// Punkt-in-Ring mit Streifenindex: Kanten je 0,25°-Breitenstreifen vorsortiert (große Ringe wie Russland)
const BANDS = new WeakMap(), BAND = .25;
function ringBands(r) {
  let b = BANDS.get(r); if (b) return b;
  b = new Map();
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const y0 = Math.min(r[i + 1], r[j + 1]) / 50, y1 = Math.max(r[i + 1], r[j + 1]) / 50;
    for (let k = Math.floor(y0 / BAND); k <= Math.floor(y1 / BAND); k++) { let a = b.get(k); if (!a) b.set(k, a = []); a.push(i, j); }
  }
  BANDS.set(r, b); return b;
}
function inRing(r, x, y) {
  const e = ringBands(r).get(Math.floor(y / BAND)); if (!e) return false;
  let c = false;
  for (let n = 0; n < e.length; n += 2) { const i = e[n], j = e[n + 1], xi = r[i] / 50, yi = r[i + 1] / 50, xj = r[j] / 50, yj = r[j + 1] / 50; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
  return c;
}
function inPolyLL(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
const POLY_BB = new Map();
function polyBB(poly) {
  if (POLY_BB.has(poly)) return POLY_BB.get(poly);
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9; const r = poly[0];
  for (let i = 0; i < r.length; i += 2) { a = Math.min(a, r[i] / 50); b = Math.min(b, r[i + 1] / 50); c = Math.max(c, r[i] / 50); d = Math.max(d, r[i + 1] / 50); }
  const bb = [a, b, c, d]; POLY_BB.set(poly, bb); return bb;
}
function inCountry(cn, x, y) {
  for (const poly of cn[2]) {
    const bb = polyBB(poly); if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue;
    let inside = false; for (const ring of poly) if (inRing(ring, x, y)) inside = !inside;
    if (inside) return true;
  }
  return false;
}
const GB_CACHE = new Map();
function groupBorders(groups) {
  const key = JSON.stringify(groups); if (GB_CACHE.has(key)) return GB_CACHE.get(key);
  const T0 = performance.now();
  const partsOf = new Map();
  groups.forEach((grp, gi) => grp.forEach(part => { const cn = BY_ID[part.c]; if (!cn) return; if (!partsOf.has(cn)) partsOf.set(cn, []); partsOf.get(cn).push([gi, part.clip]); }));
  const who = (x, y) => {
    for (const cn of EU_COUNTRIES) if (inCountry(cn, x, y)) {
      for (const [gi, clip] of partsOf.get(cn) || []) if (!clip || inPolyLL(clip, x, y)) return gi;
      return 'c' + cn[0] + cn[1];
    }
    return 'sea';
  };
  const border = [], coast = [], eps = .02;
  const test = (ax, ay, bx, by, keepCoast) => {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy); if (L < 1e-6) return;
    const mx = (ax + bx) / 2, my = (ay + by) / 2, nx = -dy / L * eps, ny = dx / L * eps;
    const a = who(mx + nx, my + ny), b = who(mx - nx, my - ny);
    if (a === b) return;
    if (a === 'sea' || b === 'sea') { if (keepCoast) coast.push(ax, ay, bx, by); } else border.push(ax, ay, bx, by);
  };
  for (const cn of EU_COUNTRIES) for (const poly of cn[2]) for (const ring of poly)
    for (let i = 0; i + 3 < ring.length; i += 2) test(ring[i] / 50, ring[i + 1] / 50, ring[i + 2] / 50, ring[i + 3] / 50, true);
  for (const grp of groups) for (const part of grp) if (part.clip) {
    const P = part.clip;
    for (let i = 0; i < P.length; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / .04));
      for (let k = 0; k < n; k++) test(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, x0 + (x1 - x0) * (k + 1) / n, y0 + (y1 - y0) * (k + 1) / n, false);
    }
  }
  const res = { border, coast }; GB_CACHE.set(key, res);
  if (typeof window !== 'undefined') window.__gbStats = { ms: performance.now() - T0, border: border.length / 4, coast: coast.length / 4 };
  return res;
}
