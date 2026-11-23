import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

// D-Day, Omaha Beach im Morgengrauen (Stil wie Szene 1 und 4): Blick knapp über dem Wasser hinter den
// Landungsbooten auf die Küste. Küste als Höhenfeld: geschwungene Wasserlinie, flaches Watt mit Strandhindernissen
// (Tschechenigel, Holzpfähle), Kiesbank, Uferstreifen, Steilhang mit zwei Taleinschnitten, Bunker oben am Hang.
// Higgins-Boote (LCVP) fahren an, klappen die Bugrampe ab, die Soldaten springen ins flache Wasser und laufen bis
// zur Deckung hinter der Kiesbank (feste Bahnen zwischen den Hindernissen). Kriegsschiffe liegen vor der Küste.
const shoreX = z => 6 + 3.2 * Math.sin(z * .045 + .6) + 1.4 * Math.sin(z * .13 + 2);   // Wasserlinie
const DRAWS = [-30, 24];                                                                  // Taleinschnitte im Steilhang
function terrainY(x, z) {
  const s = x - shoreX(z);
  let y;
  if (s < 0) y = Math.max(-3, s * .055);                                                    // flach abfallender Meeresgrund
  else if (s < 24) y = s * .045;                                                             // Watt / Strand
  else if (s < 28) y = 1.08 + (s - 24) * .3;                                                 // Kiesbank
  else if (s < 34) y = 2.28 + (s - 28) * .03;                                                // Uferstreifen
  else {
    const draw = DRAWS.reduce((m, dz) => Math.max(m, Math.exp(-(((z - dz) / 7) ** 2))), 0);
    const bluff = H.smooth((s - 34) / 18) * 15 * (1 - .75 * draw);
    y = 2.46 + bluff + Math.sin(z * .3 + s * .2) * .6 * H.smooth((s - 34) / 8);
  }
  return y;
}

export default {
  id: 'd-day', title: 'D-Day in der Normandie', seed: 20, duration: 9, rev: 2,
  script: 'Im Juni 1944 landen die Westalliierten in der Normandie.',
  caption: { title: 'Landung in der Normandie', sub: '6. Juni 1944' },
  params: {
    crafts: { type: 'number', min: 1, max: 8, step: 1, value: 5, label: 'Higgins-Boote (LCVP)' },
    soldiersPer: { type: 'number', min: 2, max: 12, step: 1, value: 8, label: 'Soldaten je Boot' },
    ships: { type: 'number', min: 0, max: 6, step: 1, value: 4, label: 'Kriegsschiffe vor der Küste' },
    obstacles: { type: 'number', min: 0, max: 60, step: 1, value: 34, label: 'Strandhindernisse' },
    arrive: { type: 'number', min: 1, max: 8, step: .1, value: 3.4, label: 'Ankunft nach (s)' },
    explosions: { type: 'number', min: 0, max: 12, step: 1, value: 6, label: 'Einschläge' },
    planes: { type: 'number', min: 0, max: 8, step: 1, value: 4, label: 'Flugzeuge' },
    skyColor: { type: 'color', value: '#1a2331', label: 'Himmel (Morgengrauen)' },
    waterColor: { type: 'color', value: '#22374a', label: 'Wasser' },
    sandColor: { type: 'color', value: '#a39a84', label: 'Sand' },
    grassColor: { type: 'color', value: '#56604c', label: 'Hang' },
    uniformColor: { type: 'color', value: '#6f7a5a', label: 'Uniform' },
    glow: { type: 'boolean', value: true, label: 'Soldaten leuchten blau' },
    ...H.cameraParams([-40, 8, 9], [-21, 6.2, 5], [14, 1.4, 0], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 50, 170);
    H.lights(scene, { sun: [-14, 12, 10], intensity: 1.25, hemi: .95, shadows, skyColor: '#a9bccf', groundColor: '#14181e', shadowSize: 70 });
    H.lightPool(scene, { x: 10, z: 0, radius: 34, height: 60, intensity: 240 });

    // ---------- Küste als Low-Poly-Höhenfeld mit Farben je Facette ----------
    const geo = new THREE.PlaneGeometry(200, 190, 120, 110); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + 40, z = pos.getZ(i); pos.setX(i, x); pos.setY(i, terrainY(x, z) + (r() - .5) * .08); }
    const land = geo.toNonIndexed(); land.computeVertexNormals();
    const lp = land.attributes.position, col = new Float32Array(lp.count * 3), c = new THREE.Color();
    const sand = new THREE.Color(p.sandColor), wet = sand.clone().multiplyScalar(.7), shingle = new THREE.Color('#6b6d70'), grass = new THREE.Color(p.grassColor), rock = new THREE.Color('#5b5f62');
    for (let f = 0; f < lp.count; f += 3) {
      const x = (lp.getX(f) + lp.getX(f + 1) + lp.getX(f + 2)) / 3, z = (lp.getZ(f) + lp.getZ(f + 1) + lp.getZ(f + 2)) / 3, y = (lp.getY(f) + lp.getY(f + 1) + lp.getY(f + 2)) / 3;
      const s = x - shoreX(z);
      if (s < 3) c.copy(wet); else if (s < 24) c.copy(sand).lerp(wet, H.smooth((10 - s) / 8) * .6); else if (s < 28.5) c.copy(shingle); else if (s < 34) c.copy(sand).lerp(grass, .5);
      else c.copy(grass).lerp(rock, H.smooth((y - 6) / 14) * .35 * (1 + Math.sin(x * 3.1 + z * 2.3)));
      c.multiplyScalar(.86 + .14 * Math.abs(Math.sin(f * 12.9898) * 43758.5453 % 1));
      for (let v = 0; v < 3; v++) col.set([c.r, c.g, c.b], (f + v) * 3);
    }
    land.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const ground = new THREE.Mesh(land, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    ground.receiveShadow = true; scene.add(ground);
    const water = H.wavePlane(220, 220, 90, p.waterColor, { amp: .07, env: H.envGradient(p.skyColor, '#5c6e80', '#06080c') });
    water.position.set(-60, .15, 0); scene.add(water);
    // Brandungssaum entlang der Wasserlinie
    const foamPts = []; for (let z = -95; z <= 95; z += 2) foamPts.push(new THREE.Vector3(shoreX(z) + .4, .2, z));
    const foam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(foamPts), 120, .18, 4), new THREE.MeshBasicMaterial({ color: '#c9d3dc', transparent: true, opacity: .55 }));
    foam.scale.y = .3; scene.add(foam);

    // ---------- Higgins-Boote (LCVP): Rumpf mit Bugrampe, Steuerstand, MG-Lafetten ----------
    const lcvp = () => {
      const g = new THREE.Group(), hullM = new THREE.MeshLambertMaterial({ color: '#5d6a55', flatShading: true, side: THREE.DoubleSide }), dark = new THREE.MeshLambertMaterial({ color: '#2f3430', flatShading: true });
      const add = (geo, x, y, z, m = hullM) => { const b = new THREE.Mesh(geo, m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; };
      // Rumpf: Querschnitt mit ausgestellten Bordwänden und offenem Truppenraum, entlang der Länge extrudiert
      const sec = new THREE.Shape([[-1.15, 0], [1.15, 0], [1.6, 1.6], [-1.6, 1.6]].map(([z, y]) => new THREE.Vector2(z, y)));
      sec.holes.push(new THREE.Path([[-1.0, .3], [-1.44, 1.58], [1.44, 1.58], [1.0, .3]].map(([z, y]) => new THREE.Vector2(z, y))));
      const hullGeo = new THREE.ExtrudeGeometry(sec, { depth: 9.4, bevelEnabled: false }); hullGeo.translate(0, 0, -4.9); hullGeo.rotateY(Math.PI / 2);
      add(hullGeo, 0, 0, 0);
      add(new THREE.BoxGeometry(9.2, .1, 2.0), 0, .32, 0, dark);                               // Boden des Truppenraums
      const stern = add(new THREE.CylinderGeometry(1.6, 1.15, 1.6, 8, 1, false, 0, Math.PI), -4.9, .8, 0); stern.rotation.y = Math.PI;   // gerundetes Heck
      add(new THREE.BoxGeometry(1.5, .55, 2.6), -4.0, 1.85, 0);                                 // Steuerstand
      for (const z of [-1, 1]) { const mg = add(new THREE.BoxGeometry(.7, .09, .09), -3.4, 2.25, z * 1.1, dark); mg.rotation.z = .3; }   // MG
      const ramp = new THREE.Group(); ramp.position.set(4.55, .1, 0); g.add(ramp);
      const rp = new THREE.Mesh(new THREE.BoxGeometry(.16, 1.65, 2.6), hullM); rp.position.set(0, .82, 0); rp.castShadow = true; ramp.add(rp);
      g.userData.ramp = ramp;
      return g;
    };
    const crafts = [], soldiers = [], laneZ = [];
    const nC = p.crafts;
    for (let i = 0; i < nC; i++) {
      const z = (i - (nC - 1) / 2) * 9 + (r() - .5) * 1.5;
      const craft = lcvp(); scene.add(craft);
      const wave = i % 2, stopX = shoreX(z) - 2.6, delay = wave * 1.3 + r() * .4;   // zwei Wellen
      const cr = { craft, z, stopX, delay, ph: r() * 6, tArrive: delay + p.arrive };
      crafts.push(cr);
      for (let k = 0; k < p.soldiersPer; k++) {
        const col2 = k % 2, row = Math.floor(k / 2);
        const sz = z + (col2 ? .55 : -.55);                                                   // zwei Bahnen je Boot
        laneZ.push(sz);
        const clip = k % 3 === 2 ? 'Jogging' : 'Rifle_Run_Forward';
        const f = H.figure({ color: p.uniformColor, helmet: '#4d5a3e', glow: p.glow ? H.ROLE.west : null, strength: 1.35, clips: { idle: 'Crouch_Idle', walk: clip, run: clip }, seed: 80 + i * 13 + k, weapon: true });
        scene.add(f);
        soldiers.push({ f, cr, inX: 3.4 - row * 1.15, sz, tExit: cr.tArrive + .7 + row * .45 + col2 * .15, v: 3.0 + (k % 3) * .25, stopS: 25.2 + (k % 3) * .4 });
      }
    }
    // Strandhindernisse auf dem Watt, nicht auf den Laufbahnen
    const hedgehog = () => { const g = new THREE.Group(); for (const [rx, rz] of [[0, .9], [0, -.9], [Math.PI / 2, .9]]) { const b = H.box(.14, 2.1, .14, '#2c2e31'); b.rotation.set(rx, 0, rz); g.add(b); } return g; };
    let placed = 0, tries = 0;
    while (placed < p.obstacles && tries++ < 800) {
      const z = -46 + r() * 92; if (laneZ.some(lz => Math.abs(lz - z) < 1.1) || crafts.some(cr => Math.abs(cr.z - z) < 2.2)) continue;
      const x = shoreX(z) + 3 + r() * 15;
      const o = r() < .7 ? hedgehog() : H.cyl(.09, .11, 2.4, '#4a3d30', 5);
      o.position.set(x, terrainY(x, z) + (o.isMesh ? .9 : .65), z); o.rotation.y = r() * 3; if (o.isMesh) o.rotation.z = -.35; scene.add(o); placed++;
    }
    // Bunker oben an den Taleinschnitten, MG-Feuer als kurze Leuchtspuren
    const bunkers = [];
    for (const [k, dz] of DRAWS.entries()) {
      const x = shoreX(dz + 6) + 42, z = dz + 6 + k * 2, y = terrainY(x, z);
      const b = new THREE.Group();
      const body = H.box(6, 2.6, 5, '#4d5156'); body.position.y = 1.3; const slit = H.box(.2, .35, 3.6, P.black); slit.position.set(-3.02, 1.7, 0);
      const top = H.box(6.6, .5, 5.6, '#43474c'); top.position.y = 2.75; b.add(body, slit, top);
      b.position.set(x, y - .5, z); scene.add(b);
      const tracer = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 2.2, 4).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(2.6) })); scene.add(tracer);
      bunkers.push({ from: new THREE.Vector3(x - 3.1, y + 1.2, z), tracer, ph: k * .37 });
    }
    // Einschläge: Wassersäulen zwischen den Booten, Sandfontänen am Strand
    const booms = [];
    for (let i = 0; i < p.explosions; i++) {
      const onBeach = i % 2 === 1, z = -30 + r() * 60;
      const x = onBeach ? shoreX(z) + 6 + r() * 14 : shoreX(z) - 5 - r() * 12;
      const b = onBeach ? H.explosion({ size: 1.8, color: '#e3c39a', smoke: '#8f8468', duration: 1.4 }) : H.waterColumn(r, { height: 7 + r() * 4, radius: .8, duration: 2.4 });
      b.position.set(x, onBeach ? terrainY(x, z) + .3 : .2, z); scene.add(b); booms.push({ b, t0: .6 + i * 1.2 + r() * .5 });
    }
    // Kriegsschiffe und Flugzeuge
    for (let i = 0; i < p.ships; i++) {
      const sh = H.ship(P.steel, { length: 16 + r() * 8, beam: 3, guns: i % 2 ? 1 : 2, funnels: 1 + (i % 2), seed: 300 + i, tint: .8 + r() * .3 });
      sh.scale.setScalar(1.4); sh.position.set(-95 - r() * 25, .2, -60 + i * (120 / Math.max(1, p.ships)) + r() * 10); sh.rotation.y = Math.PI / 2 + (r() - .5) * .3; scene.add(sh);
    }
    const planes = [];
    for (let i = 0; i < p.planes; i++) {
      const m = H.faceZ(H.aircraft(H.glowMat(H.ROLE.west, 1.5), { span: 3.4 + r(), length: 2.8 })); scene.add(m);
      planes.push({ m, y: 26 + r() * 6, z: -40 + i * 20 + r() * 4, x0: -20 - i * 14 - r() * 6, v: 16 + r() * 4 });
    }

    return {
      update(t, p) {
        water.userData.at(t);
        for (const cr of crafts) {
          const u = H.span(t, cr.delay - .8, cr.tArrive), uu = 1 - (1 - u) * (1 - u);
          const x = H.lerp(cr.stopX - 38, cr.stopX, uu), bob = (1 - u * .8);
          cr.craft.position.set(x, .05 + Math.sin(t * 2.1 + cr.ph) * .12 * bob, cr.z);
          cr.craft.rotation.z = Math.sin(t * 1.6 + cr.ph) * .03 * bob + (1 - u) * .03; cr.craft.rotation.x = Math.sin(t * 1.3 + cr.ph) * .02 * bob;
          cr.craft.userData.ramp.rotation.z = -1.45 * H.easeOut(H.span(t, cr.tArrive, cr.tArrive + .6));   // Rampe klappt nach vorn ab
          cr.x = x;
        }
        for (const s of soldiers) {
          const cx = s.cr.x;
          if (t < s.tExit) {                                                                  // geduckt im Boot
            s.f.position.set(cx + s.inX, s.cr.craft.position.y + .35, s.sz); s.f.rotation.y = 0;
            s.f.userData.idle(t);
          } else {                                                                            // über die Rampe an Land, Lauf bis zur Kiesbank
            const x0 = cx + s.inX, d = Math.min((t - s.tExit) * s.v, shoreX(s.sz) + s.stopS - x0), x = x0 + d;
            s.f.position.set(x, Math.max(terrainY(x, s.sz), s.cr.craft.position.y + .35 - d * .25), s.sz); s.f.rotation.y = 0;
            if (x >= shoreX(s.sz) + s.stopS - .05) s.f.userData.pose('Crouch_Idle', t); else s.f.userData.walkDist(d, 1.3);
          }
        }
        for (const bk of bunkers) {                                                           // MG feuert in kurzen Stößen auf den Strand
          const k = (t * 3 + bk.ph) % 1, on = k < .5 && t > 1.5;
          bk.tracer.visible = on;
          if (on) { const to = new THREE.Vector3(shoreX(bk.from.z) + 14, 1, bk.from.z + Math.sin(t * 1.7 + bk.ph) * 10); bk.tracer.position.lerpVectors(bk.from, to, k * 2); bk.tracer.lookAt(to); bk.tracer.rotateY(Math.PI / 2); }
        }
        for (const b of booms) b.b.userData.at(t - b.t0);
        for (const pl of planes) pl.m.position.set(pl.x0 + t * pl.v, pl.y, pl.z);
      }
    };
  }
};
