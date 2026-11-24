import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

// Luftangriff auf eine deutsche Stadt bei Nacht (Stil wie Szene 1): blaugraue Nacht, Bomberverband zieht über die
// Dächer, jede Maschine klinkt eine Reihe Bomben aus, die sichtbar fallen (Flugtempo + Schwerkraft) und genau dort
// einschlagen, wo danach Feuerball, Brand und aufsteigender Rauch stehen. Suchscheinwerfer tasten den Himmel ab,
// Flakwolken platzen in Höhe der Bomber. Kamera niedrig über den Dächern.
export default {
  id: 'bombenkrieg', title: 'Bombenkrieg', seed: 18, duration: 10, rev: 4,
  script: 'Auf Seiten der Alliierten wird daraufhin auch eskaliert. Sie fangen damit an, deutsche Städte und Industrieanlagen zu bombardieren.',
  caption: { title: 'Luftkrieg gegen deutsche Städte', sub: '1943' },
  params: {
    bombers: { type: 'number', min: 1, max: 12, step: 1, value: 6, label: 'Bomber' },
    bombsPer: { type: 'number', min: 1, max: 6, step: 1, value: 3, label: 'Bomben je Bomber' },
    buildings: { type: 'number', min: 10, max: 140, step: 5, value: 90, label: 'Gebäude' },
    searchlights: { type: 'number', min: 0, max: 8, step: 1, value: 4, label: 'Suchscheinwerfer' },
    flak: { type: 'number', min: 0, max: 30, step: 1, value: 10, label: 'Flakwolken' },
    altitude: { type: 'number', min: 10, max: 50, step: 1, value: 25, label: 'Flughöhe Anflug (m)' },
    speed: { type: 'number', min: 5, max: 40, step: .5, value: 21, label: 'Fluggeschwindigkeit (m/s)' },
    litWindows: { type: 'number', min: 0, max: 1, step: .05, value: .2, label: 'Erleuchtete Fenster (Verdunkelung)' },
    skyColor: { type: 'color', value: '#101722', label: 'Nachthimmel' },
    bomberGlow: { type: 'color', value: '#2f7cff', label: 'Bomber (Rollenfarbe)' },
    bombColor: { type: 'color', value: '#ff8a1e', label: 'Bomben (leuchtend wie Szene 1)' },
    ...H.cameraParams([-40, 16, 40], [-28, 14, 32], [2, 9, -12], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 45, 140);
    H.lights(scene, { sun: [-10, 14, 8], intensity: 1.0, hemi: .75, shadows, skyColor: '#9fb3c8', groundColor: '#111', shadowSize: 60 });
    H.lightPool(scene, { x: 0, z: -2, radius: 26, height: 50, intensity: 180 });
    scene.add(H.ground(260, '#1b2029'));
    const city = H.city(r, { count: p.buildings, area: 64, minH: 2.5, maxH: 8, colors: ['#3a414e', '#454d5b', '#323844'], windows: 3 });
    city.position.z = -12; scene.add(city);
    city.traverse(o => { if (o.isInstancedMesh) { o.material = new THREE.MeshBasicMaterial({ color: '#b98e4c' }); o.visible = r() < p.litWindows; } });
    // Kirche als Landmarke
    const church = new THREE.Group();
    const nave = H.box(8, 9, 16, '#3a404b'); nave.position.y = 4.5; const roof = H.mesh(new THREE.CylinderGeometry(0, 5.6, 4, 4), '#2a2f38'); roof.rotation.y = Math.PI / 4; roof.position.y = 11; roof.scale.z = 2.9;
    const tower = H.box(4, 20, 4, '#3a404b'); tower.position.set(0, 10, 10); const spire = H.cone(2.8, 8, '#2a2f38', 4); spire.position.set(0, 24, 10);
    church.add(nave, roof, tower, spire); church.position.set(14, 0, -60); scene.add(church);   // außerhalb des Flugkorridors (z -30 … -2)

    // Bomber im Sturzangriff wie in Szene 1: jede Maschine fliegt eine eigene Bahn (hoher Anflug, steiler Sturz,
    // Abfangen über den Dächern, Hochziehen, Abflug aus dem Bild). Die Nase zeigt stets entlang der Bahn. Die Bomben
    // werden im Sturz ausgeklinkt, übernehmen Tempo und Richtung der Maschine und fallen ballistisch; wo sie
    // aufschlagen, stehen Feuerball, Brand, Feuerschein und Rauch.
    const g = 9.81, V = p.speed;
    const bombers = [], bombs = [];
    const P = (x, y, z) => new THREE.Vector3(x, y, z);
    for (let i = 0; i < p.bombers; i++) {
      const tint = new THREE.Color(p.bomberGlow).offsetHSL((r() - .5) * .04, (r() - .5) * .2, (r() - .5) * .14);
      const four = r() < .5, span = four ? 7.0 + r() * 1.2 : 5.8 + r() * .9;
      const m = H.faceZ(H.aircraft(H.glowMat(tint, 1.45 + r() * .35), { span, length: span * (.66 + r() * .1), engines: four ? 4 : 2 })); scene.add(m);
      // Bahn wie die Sturzkampfflieger in Szene 1: hoher Anflug, steiler Sturz auf das Ziel, Abfangen knapp über den
      // Dächern (höchstes Haus 8 m), dann steil hochziehen und aus dem Bild
      const xT = -24 + r() * 20, z = -30 + (i + .5) * (28 / p.bombers) + (r() - .5) * 2, alt = p.altitude + r() * 4, low = 12.5 + r() * 2.5, lane = (r() - .5) * 2;
      const curve = new THREE.CatmullRomCurve3([P(xT - 58, alt + 4, z - 1 + lane), P(xT - 14, alt, z + lane * .5), P(xT - 4, low + 6, z), P(xT + 6, low, z), P(xT + 60, alt - 2, z - 1 + lane)], false, 'catmullrom', .3);
      const L = curve.getLength(), N = 800;
      // Ausklinken im steilen Teil des Sturzes, kurz bevor die Maschine abfängt
      let uRel = 0; for (let k = 0; k <= N; k++) { const q = curve.getPointAt(k / N); if (q.x > xT - 6 && q.y <= low + 4.5) { uRel = k / N; break; } }
      const tRel = 1.4 + i * (6.6 / Math.max(1, p.bombers - 1 || 1)) + (r() - .5) * .3;   // Zeitpunkt des Ausklinkens
      const b = { m, curve, L, sLow: uRel * L, tRel, roll: (r() - .5) * .3 };
      bombers.push(b);
      for (let k = 0; k < p.bombsPer; k++) {
        const ds = (k - (p.bombsPer - 1) / 2) * 1.4, s0 = b.sLow + ds;                 // kurze Reihe um den Ausklinkpunkt
        const p0 = curve.getPointAt(s0 / L), v0 = curve.getTangentAt(s0 / L).multiplyScalar(V);
        p0.y -= .5;
        const ft = (v0.y + Math.sqrt(v0.y * v0.y + 2 * g * p0.y)) / g;                  // Fallzeit bis zum Boden
        const ix = p0.x + v0.x * ft, iz = p0.z + v0.z * ft;
        const model = H.bomb(1.6, H.glowMat(p.bombColor, 1.25), .2); model.visible = false; scene.add(model);
        const boom = H.fireball(r, { size: 2.6 + r() * 2.2, duration: 2.0 + r() * 1.2, debris: 20 + Math.floor(r() * 25), sparks: 40 + Math.floor(r() * 50), ring: r() < .6, variant: bombs.length % 5 });
        boom.position.set(ix, 0, iz); boom.rotation.y = r() * 6.28; boom.scale.set(1, .85 + r() * .35, 1); scene.add(boom);
        const fire = H.flame(r, { size: 1.8 + r() * .8 }); fire.position.set(ix, 0, iz); fire.visible = false; scene.add(fire);
        const smoke = H.smokeColumn(r, { height: 18, width: 2.2, color: '#4a4542' }); smoke.position.set(ix, 1, iz); smoke.visible = false; scene.add(smoke);
        const glow = new THREE.PointLight('#ff8a3a', 0, 22, 1.6); glow.position.set(ix, 3, iz); scene.add(glow);
        bombs.push({ model, tRel: tRel + ds / V, ft, p0, v0, boom, fire, smoke, glow, ph: r() * 6 });
      }
    }
    // Suchscheinwerfer vom Boden, langsam schwenkend
    const lights = [];
    for (let i = 0; i < p.searchlights; i++) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.2, 2.4, 70, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#dfe8fb', transparent: true, opacity: .065, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      beam.geometry.translate(0, 35, 0);
      beam.position.set(-30 + i * 14 + r() * 6, 0, -40 + r() * 20); scene.add(beam);
      lights.push({ beam, ph: r() * 6, sp: .25 + r() * .3 });
    }
    // Flakwolken in Höhe der Bomber (dunkle Low-Poly-Puffs)
    const flak = [];
    for (let i = 0; i < p.flak; i++) {
      const f = H.explosion({ size: 1.1, color: '#ffb35a', smoke: '#3c3c40', duration: 1.8 });
      f.position.set(-30 + r() * 60, p.altitude - 2 + r() * 6, -24 + r() * 18); scene.add(f);
      flak.push({ f, t0: .5 + r() * 9 });
    }

    return {
      update(t, p) {
        const tg = new THREE.Vector3(), q = new THREE.Vector3();
        for (const b of bombers) {
          const sArc = b.sLow + (t - b.tRel) * p.speed;
          b.m.visible = sArc > 0 && sArc < b.L;
          if (!b.m.visible) continue;
          const u = sArc / b.L;
          b.curve.getPointAt(u, b.m.position); b.curve.getTangentAt(u, tg);
          b.m.lookAt(q.copy(b.m.position).add(tg));                                           // Nase entlang der Bahn
          b.m.rotateZ(b.roll * Math.sin(u * Math.PI));                                         // leichte Querlage in der Kurve
        }
        for (const bm of bombs) {
          const age = t - bm.tRel;
          bm.model.visible = age >= 0 && age < bm.ft;
          if (bm.model.visible) {
            bm.model.position.copy(bm.p0).addScaledVector(bm.v0, age); bm.model.position.y -= .5 * g * age * age;
            bm.model.lookAt(q.copy(bm.model.position).add(tg.set(bm.v0.x, bm.v0.y - g * age, bm.v0.z)));   // Spitze entlang der Flugbahn
          }
          const hit = age - bm.ft;
          bm.boom.userData.at(hit);
          const burn = hit > .4;
          bm.fire.visible = burn; if (burn) { bm.fire.userData.at(t); bm.fire.scale.setScalar(Math.min(1, (hit - .4) * 1.5)); }
          bm.glow.intensity = hit > 0 ? 40 * Math.min(1, hit * 2) * (.8 + .2 * Math.sin(t * 13 + bm.ph)) : 0;
          bm.smoke.visible = hit > .8; if (bm.smoke.visible) { bm.smoke.userData.at(hit - .8, .35); bm.smoke.scale.setScalar(Math.min(1, (hit - .8) * .8)); }
        }
        for (const l of lights) { l.beam.rotation.z = Math.sin(t * l.sp + l.ph) * .45; l.beam.rotation.x = -.15 + Math.cos(t * l.sp * .7 + l.ph) * .3; }
        for (const f of flak) f.f.userData.at(t - f.t0);
      }
    };
  }
};
