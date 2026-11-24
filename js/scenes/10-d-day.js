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
  id: 'd-day', title: 'D-Day in der Normandie', seed: 20, duration: 9, rev: 4,
  script: 'Im Juni 1944 landen die Westalliierten in der Normandie.',
  caption: { title: 'Landung in der Normandie', sub: '6. Juni 1944' },
  params: {
    crafts: { type: 'number', min: 1, max: 8, step: 1, value: 5, label: 'Higgins-Boote (LCVP)' },
    soldiersPer: { type: 'number', min: 2, max: 12, step: 1, value: 8, label: 'Soldaten je Boot' },
    ships: { type: 'number', min: 0, max: 6, step: 1, value: 4, label: 'Kriegsschiffe vor der Küste' },
    obstacles: { type: 'number', min: 0, max: 60, step: 1, value: 34, label: 'Strandhindernisse' },
    arrive: { type: 'number', min: 1, max: 8, step: .1, value: 2.6, label: 'Ankunft nach (s)' },
    explosions: { type: 'number', min: 0, max: 12, step: 1, value: 6, label: 'Einschläge' },
    planes: { type: 'number', min: 0, max: 8, step: 1, value: 4, label: 'Flugzeuge' },
    skyColor: { type: 'color', value: '#1a2331', label: 'Himmel (Morgengrauen)' },
    waterColor: { type: 'color', value: '#22374a', label: 'Wasser' },
    sandColor: { type: 'color', value: '#a39a84', label: 'Sand' },
    grassColor: { type: 'color', value: '#56604c', label: 'Hang' },
    uniformColor: { type: 'color', value: '#6f7a5a', label: 'Uniform' },
    glow: { type: 'boolean', value: true, label: 'Soldaten leuchten blau' },
        // schräg von hinten über dem Wasser: Boote laufen auf, Rampen fallen, die Soldaten verteilen sich am Strand
    ...H.cameraParams([-36, 9.5, 26], [-25, 7.8, 19], [9, 1.0, -5], 40)
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

    // ---------- Higgins-Boote (LCVP): Sperrholzrumpf mit Bugrampe aus Stahl, Steuerstand mit Panzerschild, zwei
    // MG-Lafetten, Motorabdeckung, Scheuerleisten, dunkler Unterwasseranstrich, Bugwelle und Heckwasser ----------
    const lcvp = (hullNo) => {
      const g = new THREE.Group();
      const hullM = new THREE.MeshLambertMaterial({ color: '#5d6a55', flatShading: true, side: THREE.DoubleSide }), dark = new THREE.MeshLambertMaterial({ color: '#2f3430', flatShading: true });
      const steel = new THREE.MeshLambertMaterial({ color: '#59625a', flatShading: true }), trim = new THREE.MeshLambertMaterial({ color: '#46503f', flatShading: true });
      const add = (geo, x, y, z, m = hullM, parent = g) => { const b = new THREE.Mesh(geo, m); b.position.set(x, y, z); b.castShadow = true; parent.add(b); return b; };
      // Rumpf: U-förmiger Querschnitt (Boden, ausgestellte Bordwände, oben offen) entlang der Länge extrudiert
      const sec = new THREE.Shape([[-1.15, 0], [1.15, 0], [1.6, 2.0], [1.46, 2.0], [1.0, .3], [-1.0, .3], [-1.46, 2.0], [-1.6, 2.0]].map(([z, y]) => new THREE.Vector2(z, y)));
      const hullGeo = new THREE.ExtrudeGeometry(sec, { depth: 9.4, bevelEnabled: false }); hullGeo.translate(0, 0, -4.9); hullGeo.rotateY(Math.PI / 2);
      add(hullGeo, 0, 0, 0);
      add(new THREE.BoxGeometry(9.2, .1, 2.0), 0, .32, 0, dark);                                // Boden des Truppenraums
      for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(.06, .05, 1.9), -2.6 + k * 1.3, .39, 0, trim);   // Bodenleisten
      const stern = add(new THREE.CylinderGeometry(1.6, 1.15, 2.0, 8, 1, false, 0, Math.PI), -4.9, 1.0, 0); stern.rotation.y = Math.PI;   // gerundetes Heck
      const flare = Math.atan2(.45, 2.0);                                                         // Neigung der Bordwand
      for (const sz of [-1, 1]) {
        add(new THREE.BoxGeometry(9.5, .1, .24), -.2, 2.03, sz * 1.53, trim);                    // Schandeck (Bordwandkappe)
        for (const y of [.75, 1.4]) { const rail = add(new THREE.BoxGeometry(9.3, .07, .06), -.2, y, sz * (1.15 + .45 * y / 2 + .03), trim); rail.rotation.x = -sz * flare; }   // Scheuerleisten
        const band = add(new THREE.BoxGeometry(9.4, .34, .03), -.2, .17, sz * (1.15 + .45 * .17 / 2 + .02), dark); band.rotation.x = -sz * flare;   // Unterwasseranstrich
        for (const x of [-1.6, 1.4]) { const cleat = add(new THREE.BoxGeometry(.3, .08, .12), x, 2.11, sz * 1.53, dark); }   // Klampen
      }
      // Rumpfnummer an beiden Seiten
      const numTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const q = c.getContext('2d'); q.fillStyle = '#e8e6dc'; q.font = '700 44px Inter, Arial, sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(hullNo, 128, 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
      for (const sz of [-1, 1]) { const num = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .38), new THREE.MeshLambertMaterial({ map: numTex, transparent: true })); num.position.set(-2.4, 1.1, sz * (1.15 + .45 * 1.1 / 2 + .045)); num.rotation.set(-sz * flare, sz > 0 ? 0 : Math.PI, 0, 'YXZ'); g.add(num); }
      // Heck: Motorabdeckung mit Lüftungsgittern, Auspuff, Steuerstand mit Panzerschild und Rad, Bootsführer
      add(new THREE.BoxGeometry(1.0, .9, 2.1), -4.45, .82, 0, steel);
      for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(.06, .02, 1.6), -4.75 + k * .2, 1.28, 0, dark);
      const ex = add(new THREE.CylinderGeometry(.07, .07, .5, 8), -4.85, 2.15, -.9, dark);
      const shield = add(new THREE.BoxGeometry(.08, .55, .9), -3.35, 2.25, .55, steel);
      add(new THREE.BoxGeometry(.4, .06, .9), -3.55, 2.5, .55, steel);
      const wheel = add(new THREE.TorusGeometry(.16, .025, 6, 14), -3.5, 1.7, .55, dark); wheel.rotation.y = Math.PI / 2;
      // zwei MG auf Pivotlafetten mit Schutzschild an den Heckecken
      for (const sz of [-1, 1]) {
        const ped = add(new THREE.CylinderGeometry(.05, .07, 1.7, 8), -3.9, 1.2, sz * 1.15, dark);
        const gun = new THREE.Group(); gun.position.set(-3.9, 2.12, sz * 1.15); gun.rotation.set(0, sz * .25, .12); g.add(gun);
        add(new THREE.BoxGeometry(.5, .14, .12), 0, 0, 0, dark, gun);
        const brl = add(new THREE.CylinderGeometry(.025, .03, .8, 6), .62, .02, 0, dark, gun); brl.rotation.z = Math.PI / 2;
        add(new THREE.BoxGeometry(.06, .36, .42), .22, .08, 0, steel, gun);
      }
      // Bugrampe: Stahlplatte mit Rippen außen, Scharnierrolle unten, Haltetrossen zu den Bordwänden
      const ramp = new THREE.Group(); ramp.position.set(4.55, .1, 0); g.add(ramp);
      add(new THREE.BoxGeometry(.16, 2.0, 2.6), 0, 1.0, 0, steel, ramp);
      for (const z of [-.85, 0, .85]) add(new THREE.BoxGeometry(.08, 1.9, .09), .11, 1.0, z, dark, ramp);
      for (const y of [.55, 1.45]) add(new THREE.BoxGeometry(.08, .08, 2.5), .11, y, 0, dark, ramp);
      for (let k = 0; k < 7; k++) add(new THREE.BoxGeometry(.05, .04, 2.2), -.1, .25 + k * .26, 0, trim, ramp);   // Trittleisten innen
      const hinge = add(new THREE.CylinderGeometry(.08, .08, 2.7, 10), 0, 0, 0, dark, ramp); hinge.rotation.x = Math.PI / 2;
      const cableM = new THREE.MeshBasicMaterial({ color: '#1d1f1e' }), cables = [];
      for (const sz of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1, 5), cableM); g.add(c); cables.push({ c, sz }); }
      const a = new THREE.Vector3(), b = new THREE.Vector3(), mid = new THREE.Vector3();
      g.userData.setRamp = ang => {                                                               // Rampe klappen, Trossen nachführen
        ramp.rotation.z = ang;
        for (const { c, sz } of cables) {
          a.set(4.55 + Math.sin(-ang) * 1.9, .1 + Math.cos(-ang) * 1.9, sz * 1.2);              // Oberkante der Rampe
          b.set(3.7, 2.05, sz * 1.5);                                                           // Umlenkrolle an der Bordwand
          const len = a.distanceTo(b); mid.addVectors(a, b).multiplyScalar(.5);
          c.position.copy(mid); c.scale.set(1, len, 1); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
        }
      };
      g.userData.setRamp(0);
      // Bugwelle (zwei auslaufende Schaumstreifen), Deckkraft folgt dem Tempo
      // Schaumtextur mit weichen Rändern: quer zur Fahrt ausgeblendet, nach hinten auslaufend, leicht fleckig
      const foamTex = (() => {
        const c = document.createElement('canvas'); c.width = 128; c.height = 64; const q = c.getContext('2d'), img = q.createImageData(128, 64);
        for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
          const u = x / 127, v = y / 63, n = .75 + .25 * Math.sin(x * .9 + Math.sin(y * 1.3) * 3) * Math.sin(y * .7 + x * .21);
          const a = Math.pow(Math.sin(v * Math.PI), 2.2) * Math.pow(1 - u, 1.4) * H.smooth(Math.min(1, u / .14)) * n;   // u = 0: am Boot, u = 1: auslaufend
          const i = (y * 128 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 240; img.data[i + 3] = Math.max(0, Math.min(255, a * 255));
        }
        q.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
      })();
      const foamM = new THREE.MeshBasicMaterial({ color: '#e4eaef', map: foamTex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const wake = new THREE.Group(); g.add(wake);
      // Bugwelle: zwei Streifen, die schräg von den Bugecken nach hinten laufen (dicht am Bug, nach hinten auslaufend)
      for (const sz of [-1, 1]) { const wv = new THREE.Mesh(new THREE.PlaneGeometry(4.6, .8), foamM); wv.rotation.set(-Math.PI / 2, 0, Math.PI + sz * .3); wv.position.set(2.5, .24, sz * 2.05); wake.add(wv); }
      g.userData.setWake = k => { foamM.opacity = .7 * k; wake.visible = k > .01; };
      g.userData.ramp = ramp;
      return g;
    };
    const crafts = [], soldiers = [], laneZ = [];
    const nC = p.crafts;
    for (let i = 0; i < nC; i++) {
      const z = (i - (nC - 1) / 2) * 9 + (r() - .5) * 1.5;
      const craft = lcvp(`PA 26-${11 + i * 3}`); scene.add(craft);
      const wave = i % 2, stopX = shoreX(z) - 7.2, delay = wave * 1.3 + r() * .4;   // zwei Wellen
      const cr = { craft, z, stopX, delay, ph: r() * 6, tArrive: delay + p.arrive };
      crafts.push(cr);
      // Soldaten: knien im Truppenraum (Helme unter der Bordwand), gehen über die Rampe, waten kurz und laufen dann
      // jeder anders (Gewehr-Lauf, Sprint, geduckt) zu einem eigenen Ziel: Deckung hinter einem Hindernis oder an der
      // Kiesbank; einer je Boot wird getroffen. Je Bahn sind die Hinteren nie schneller und halten früher an,
      // damit niemand durch einen anderen läuft.
      const RUN = [['Rifle_Run_Forward', 3.5], ['Run_Natural', 2.4], ['Rifle_Run_Forward', 3.3], ['Rifle_Walking_Crouched', 1.4]];
      const STOP = ['Rifle_Aiming_And_Kneeling', 'Crouch_Idle', 'Kneeling_Idle'];
      const lanes = [[], []];
      for (let k = 0; k < p.soldiersPer; k++) lanes[k % 2].push(k);
      const victimK = 2 + Math.floor(r() * Math.max(1, p.soldiersPer - 2));
      for (const lane of lanes) {
        let vMax = 9, sMax = 27;
        lane.forEach((k, li) => {
          const row = Math.floor(k / 2), col2 = k % 2, sz = z + (col2 ? .62 : -.62);
          laneZ.push(sz);
          let [clip, vr] = RUN[(k * 7 + i * 3) % RUN.length];
          vr = Math.min(vMax, vr * (.92 + r() * .16)); vMax = vr;
          const stopS = Math.min(sMax, li === 0 ? 24.5 + r() * 2 : sMax - 1.6 - r() * 4); sMax = stopS;
          const f = H.figure({ color: p.uniformColor, helmet: '#4d5a3e', glow: p.glow ? H.ROLE.west : null, strength: 1.35, clips: { idle: 'Kneeling_Idle', walk: 'Rifle_Walk_Forward', run: clip }, seed: 80 + i * 13 + k, weapon: true });
          scene.add(f);
          soldiers.push({ f, cr, inX: 3.6 - row * 1.2, sz, tz: sz + (r() - .5) * .5, tExit: cr.tArrive + .55 + row * .7 + col2 * .2, vw: 1.6, vr, stopS,
            stopPose: STOP[(k + i) % STOP.length], ph: r() * 4, die: k === victimK ? 4 + r() * 6 : null });
        });
      }
    }
    // Strandhindernisse auf dem Watt, nicht auf den Laufbahnen
    const hedgehog = () => { const g = new THREE.Group(); for (const [rx, rz] of [[0, .9], [0, -.9], [Math.PI / 2, .9]]) { const b = H.box(.14, 2.1, .14, '#2c2e31'); b.rotation.set(rx, 0, rz); g.add(b); } return g; };
    let placed = 0, tries = 0;
    while (placed < p.obstacles && tries++ < 800) {
      const z = -46 + r() * 92; if (laneZ.some(lz => Math.abs(lz - z) < 1.3) || crafts.some(cr => Math.abs(cr.z - z) < 2.2)) continue;
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
          const x = H.lerp(cr.stopX - 38, cr.stopX, uu), bob = 1 - u;   // aufgelaufen: liegt still
          cr.craft.position.set(x, .05 + Math.sin(t * 2.1 + cr.ph) * .12 * bob, cr.z);
          cr.craft.rotation.z = Math.sin(t * 1.6 + cr.ph) * .03 * bob + (1 - u) * .03; cr.craft.rotation.x = Math.sin(t * 1.3 + cr.ph) * .02 * bob;
          cr.craft.userData.setRamp(-1.45 * H.easeOut(H.span(t, cr.tArrive, cr.tArrive + .6)));   // Rampe klappt nach vorn ab
          cr.craft.userData.setWake(u > 0 && u < 1 ? (1 - u) * H.span(u, 0, .08) : 0);              // Bugwelle nur in Fahrt
          cr.x = x;
        }
        for (const s of soldiers) {
          const c = s.cr.craft, cx = s.cr.x, floorY = c.position.y + .37;
          if (t < s.tExit) {                                                                  // kniet im Boot
            s.f.position.set(cx + s.inX, floorY, s.sz); s.f.rotation.y = 0; s.f.userData.pose('Kneeling_Idle', t + s.ph);
            continue;
          }
          // Wege: A = im Boot bis zur Rampe und die Rampe hinunter, B = waten bis zum nassen Sand, C = Lauf zum Ziel
          const tipX = cx + 6.55, x0 = cx + s.inX, sh = shoreX(s.sz), xWet = Math.max(tipX, sh + 1), xEnd = sh + s.stopS;
          const LA = tipX - x0, LB = xWet - tipX, LC = Math.max(0, xEnd - xWet);
          const dt = t - s.tExit, tA = LA / s.vw, tB = LB / s.vw, tC = LC / s.vr;
          let x, y, z = s.sz;
          if (dt < tA + tB) {
            const d = dt * s.vw; x = x0 + d;
            y = x < cx + 4.55 ? floorY : x < tipX ? H.lerp(floorY, terrainY(tipX, s.sz), (x - cx - 4.55) / 2.0) : terrainY(x, s.sz);
            s.f.userData.walkDist(d, 1);
          } else {
            const dc = Math.min(LC, (dt - tA - tB) * s.vr), dDie = s.die !== null ? s.die : 1e9;
            x = xWet + Math.min(dc, dDie); z = H.lerp(s.sz, s.tz, LC ? Math.min(dc, dDie) / LC : 1); y = terrainY(x, z);
            if (dc >= dDie) { const td = s.tExit + tA + tB + dDie / s.vr; s.f.userData.pose('Dying_Falling_Forward', (t - td) * 1.1); }
            else if (dc >= LC) s.f.userData.pose(s.stopPose, t + s.ph);
            else s.f.userData.walkDist(dc, 1.3);
          }
          s.f.position.set(x, y, z); s.f.rotation.y = 0;
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
