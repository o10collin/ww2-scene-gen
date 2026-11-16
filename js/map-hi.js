// Detaillierte Europakarte als Textur (Natural Earth 1:50m, js/geo-europe.js) in Mercator-Projektion.
// Gebiete („Regionen“) werden aus heutigen Ländern zusammengesetzt und bei Bedarf mit einem Polygon beschnitten
// (Leinwand-Clip = Schnittmenge). So entstehen historische Grenzen, z. B. das Großdeutsche Reich 1942.
// Eine Region kann als eigene Ebene über der Karte liegen (für Pulsieren/Zusammendrücken), mit Umriss und Glanz.
import * as THREE from 'three';
import { EU_COUNTRIES } from './geo-europe.js';
import { terrainTexture, label, labelFont, glowMat, clamp } from './common.js';

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
  bbox = [-14, 27, 56, 67], center = [15, 50], scale = .5, texW = 4096,
  sea = '#151c25', land = '#6c7178', borders = 'rgba(225,230,238,.35)', coast = 'rgba(255,255,255,.28)',
  regions = [], graticule = true
} = {}) {
  const g = new THREE.Group();
  const [lon0, lat0, lon1, lat1] = bbox, my0 = mercY(lat0), my1 = mercY(lat1);
  const W = texW, Hh = Math.round(texW * (my1 - my0) / (lon1 - lon0)), k = W / 4096;
  const px = (lon, lat) => [(lon - lon0) / (lon1 - lon0) * W, (my1 - mercY(lat)) / (my1 - my0) * Hh];
  const project = (lon, lat, y = 0) => new THREE.Vector3((lon - center[0]) * scale, y, -(mercY(lat) - mercY(center[1])) * scale);

  const c = document.createElement('canvas'); c.width = W; c.height = Hh; const ctx = c.getContext('2d');
  const tt = terrainTexture().image;
  // Meer: dunkler Verlauf mit Struktur
  const sg = ctx.createLinearGradient(0, 0, 0, Hh); sg.addColorStop(0, sea); sg.addColorStop(1, new THREE.Color(sea).multiplyScalar(.75).getStyle());
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, Hh);
  ctx.save(); ctx.globalAlpha = .22; ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = ctx.createPattern(tt, 'repeat'); ctx.fillRect(0, 0, W, Hh); ctx.restore();
  // Küstenschein im Meer
  ctx.save(); ctx.shadowColor = 'rgba(140,170,200,.22)'; ctx.shadowBlur = 26 * k; ctx.fillStyle = land;
  ctx.beginPath(); for (const cn of EU_COUNTRIES) traceCountry(ctx, cn, px); ctx.fill('nonzero'); ctx.restore();
  // Land mit Schatten nach Südosten und Geländestruktur
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8 * k; ctx.shadowOffsetX = 3 * k; ctx.shadowOffsetY = 4 * k; ctx.fillStyle = land;
  for (const cn of EU_COUNTRIES) { ctx.beginPath(); traceCountry(ctx, cn, px); ctx.fill('evenodd'); }
  ctx.restore();
  ctx.save(); ctx.beginPath(); for (const cn of EU_COUNTRIES) traceCountry(ctx, cn, px); ctx.clip('nonzero');
  ctx.globalAlpha = .4; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = ctx.createPattern(tt, 'repeat'); ctx.fillRect(0, 0, W, Hh); ctx.restore();
  // Regionen, die fest in der Karte stehen (nicht als eigene Ebene)
  for (const r of regions.filter(r => !r.layer)) {
    ctx.save(); ctx.globalAlpha = r.alpha ?? .5; ctx.fillStyle = r.color; fillRegion(ctx, r.parts, px); ctx.restore();
    if (r.hatch) { ctx.save(); ctx.globalAlpha = r.hatchAlpha ?? .5; ctx.fillStyle = hatchPattern(ctx, r.hatch, k); fillRegion(ctx, r.parts, px); ctx.restore(); }
  }
  // Grenzen, Küsten, Gradnetz
  ctx.strokeStyle = borders; ctx.lineWidth = 1.6 * k; ctx.lineJoin = 'round';
  for (const cn of EU_COUNTRIES) { ctx.beginPath(); traceCountry(ctx, cn, px); ctx.stroke(); }
  ctx.strokeStyle = coast; ctx.lineWidth = 2.2 * k; ctx.beginPath(); for (const cn of EU_COUNTRIES) traceCountry(ctx, cn, px); ctx.stroke();
  if (graticule) {
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1.4 * k; ctx.beginPath();
    for (let lon = Math.ceil(lon0 / 10) * 10; lon <= lon1; lon += 10) { const [x] = px(lon, 0); ctx.moveTo(x, 0); ctx.lineTo(x, Hh); }
    for (let lat = Math.ceil(lat0 / 10) * 10; lat <= lat1; lat += 10) { const [, y] = px(0, lat); ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const a = project(lon0, lat0), b = project(lon1, lat1);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(b.x - a.x, a.z - b.z), new THREE.MeshBasicMaterial({ map: tex }));
  plane.rotation.x = -Math.PI / 2; plane.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2); g.add(plane);

  // Regionen als eigene Ebene: Fläche + heller Umriss + weicher Innenschein, auf einen Ausschnitt begrenzt
  const layers = {};
  for (const r of regions.filter(r => r.layer)) {
    const [rl0, rb0, rl1, rb1] = r.layer.bbox, ry0 = mercY(rb0), ry1 = mercY(rb1);
    const LW = Math.round(texW * (rl1 - rl0) / (lon1 - lon0) * (r.layer.res ?? 1.6)), LH = Math.round(LW * (ry1 - ry0) / (rl1 - rl0)), lk = LW / 4096 * (lon1 - lon0) / (rl1 - rl0);
    const lpx = (lon, lat) => [(lon - rl0) / (rl1 - rl0) * LW, (ry1 - mercY(lat)) / (ry1 - ry0) * LH];
    const mask = document.createElement('canvas'); mask.width = LW; mask.height = LH; const mg = mask.getContext('2d');
    mg.fillStyle = '#ffffff'; fillRegion(mg, r.parts, lpx);
    const out = document.createElement('canvas'); out.width = LW; out.height = LH; const og = out.getContext('2d');
    og.globalAlpha = r.alpha ?? .85; og.drawImage(mask, 0, 0); og.globalCompositeOperation = 'source-in'; og.fillStyle = r.color; og.fillRect(0, 0, LW, LH);
    og.globalCompositeOperation = 'source-atop'; og.globalAlpha = .35; og.fillStyle = og.createPattern(tt, 'repeat'); og.fillRect(0, 0, LW, LH);
    og.globalCompositeOperation = 'source-over'; og.globalAlpha = 1;
    // Innenschein am Rand
    const glow = outlineOf(mask, 10 * lk, r.glow || r.color); og.save(); og.globalCompositeOperation = 'source-atop'; og.filter = `blur(${6 * lk}px)`; og.drawImage(glow, 0, 0); og.restore();
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
    // Ländername: Großbuchstaben, gesperrt, Schrift der Bauchbinde
    country(lon, lat, text, size = 1, { color = '#e9edf2', opacity = .85 } = {}) {
      const l = label(text, { size, font: labelFont(52, 500), upper: true, spacing: 10, color, shadow: true });
      l.material.opacity = opacity; l.position.copy(project(lon, lat, .6)); g.add(l); return l;
    },
    // Stadt: weißer Punkt mit dunklem Rand + kleine Beschriftung
    city(lon, lat, text, { size = .55, dot = .13, dx = 0, dz = -.55 } = {}) {
      const v = project(lon, lat, .04);
      const ring = new THREE.Mesh(new THREE.CircleGeometry(dot * 1.45, 24), new THREE.MeshBasicMaterial({ color: '#111418', transparent: true, opacity: .8 }));
      const d = new THREE.Mesh(new THREE.CircleGeometry(dot, 24), glowMat('#ffffff', 1.4));
      ring.rotation.x = d.rotation.x = -Math.PI / 2; ring.position.copy(v); d.position.copy(v).setY(v.y + .005);
      const l = label(text, { size, font: labelFont(52, 500), color: '#f4f1ea' }); l.position.set(v.x + dx, .5, v.z + dz);
      g.add(ring, d, l); return { dot: d, ring, label: l };
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
