import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

// Luftangriff auf eine deutsche Stadt bei Nacht (Stil wie Szene 1): blaugraue Nacht, Bomberverband zieht über die
// Dächer, jede Maschine klinkt eine Reihe Bomben aus, die sichtbar fallen (Flugtempo + Schwerkraft) und genau dort
// einschlagen, wo danach Feuerball, Brand und aufsteigender Rauch stehen. Suchscheinwerfer tasten den Himmel ab,
// Flakwolken platzen in Höhe der Bomber. Kamera niedrig über den Dächern.
export default {
  id: 'bombenkrieg', title: 'Bombenkrieg', seed: 18, duration: 10, rev: 2,
  script: 'Auf Seiten der Alliierten wird daraufhin auch eskaliert. Sie fangen damit an, deutsche Städte und Industrieanlagen zu bombardieren.',
  caption: { title: 'Luftkrieg gegen deutsche Städte', sub: '1943' },
  params: {
    bombers: { type: 'number', min: 1, max: 12, step: 1, value: 6, label: 'Bomber' },
    bombsPer: { type: 'number', min: 1, max: 6, step: 1, value: 3, label: 'Bomben je Bomber' },
    buildings: { type: 'number', min: 10, max: 140, step: 5, value: 90, label: 'Gebäude' },
    searchlights: { type: 'number', min: 0, max: 8, step: 1, value: 4, label: 'Suchscheinwerfer' },
    flak: { type: 'number', min: 0, max: 30, step: 1, value: 10, label: 'Flakwolken' },
    altitude: { type: 'number', min: 10, max: 40, step: 1, value: 19, label: 'Flughöhe (m)' },
    speed: { type: 'number', min: 3, max: 20, step: .5, value: 10, label: 'Fluggeschwindigkeit (m/s)' },
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
    church.add(nave, roof, tower, spire); church.position.set(12, 0, -24); scene.add(church);

    // Bomberverband: Keilformation, fliegt in +X; Bomben werden über der Stadt ausgeklinkt
    const g = 9.81, fallT = Math.sqrt(2 * p.altitude / g);
    const bombers = [], bombs = [];
    for (let i = 0; i < p.bombers; i++) {
      const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      // jede Maschine etwas anders: zwei- oder viermotorig, Spannweite, Rumpflänge, Farbton, leichtes Schaukeln
      const tint = new THREE.Color(p.bomberGlow).offsetHSL((r() - .5) * .04, (r() - .5) * .2, (r() - .5) * .14);
      const four = r() < .65, span = four ? 6.6 + r() * 1.6 : 5.2 + r() * 1.0;
      const m = H.faceZ(H.aircraft(H.glowMat(tint, 1.45 + r() * .35), { span, length: span * (.66 + r() * .1), engines: four ? 4 : 2 })); scene.add(m);
      const b = { m, ph: r() * 6, roll: .04 + r() * .05, z: side * row * 5.5 - 12 + (r() - .5), lag: row * 6, y: p.altitude + row * .8 + r() };
      bombers.push(b);
      const x0 = -44 - b.lag;                               // Startposition, x(t) = x0 + v t
      for (let k = 0; k < p.bombsPer; k++) {
        const xRel = Math.max(-38 - b.lag + 8, -30 + r() * 24 + k * 4);                // Abwurf so, dass der Einschlag in der Stadt liegt
        const tRel = (xRel - x0) / p.speed;
        const ft = Math.sqrt(2 * b.y / g);
        const ix = xRel + p.speed * ft, iz = b.z + (r() - .5) * 1.2;
        const model = H.bomb(1.6, H.glowMat(p.bombColor, 1.25), .2); model.visible = false; scene.add(model);
        const boom = H.fireball(r, { size: 2.6 + r() * 2.2, duration: 2.0 + r() * 1.2, debris: 20 + Math.floor(r() * 25), sparks: 40 + Math.floor(r() * 50), ring: r() < .6, variant: bombs.length % 5 });
        boom.position.set(ix, 0, iz); boom.rotation.y = r() * 6.28; boom.scale.set(1, .85 + r() * .35, 1); scene.add(boom);
        const fire = H.flame(r, { size: 1.8 + r() * .8 }); fire.position.set(ix, 0, iz); fire.visible = false; scene.add(fire);
        const smoke = H.smokeColumn(r, { height: 18, width: 2.2, color: '#4a4542' });
        const glow = new THREE.PointLight('#ff8a3a', 0, 22, 1.6); glow.position.set(ix, 3, iz); scene.add(glow); smoke.position.set(ix, 1, iz); smoke.visible = false; scene.add(smoke);
        bombs.push({ b, model, tRel, ft, xRel, ix, iz, boom, fire, smoke, glow, ph: r() * 6 });
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
        for (const b of bombers) { b.m.position.set(-44 - b.lag + t * p.speed, b.y + Math.sin(t * .9 + b.ph) * .25, b.z); b.m.rotation.x = Math.sin(t * .7 + b.ph) * b.roll; }
        for (const bm of bombs) {
          const age = t - bm.tRel;
          bm.model.visible = age >= 0 && age < bm.ft;
          if (bm.model.visible) {
            const x = bm.xRel + p.speed * age, y = bm.b.y - .6 - .5 * g * age * age;
            bm.model.position.set(x, y, bm.iz);
            bm.model.lookAt(x + p.speed, y - g * age, bm.iz);              // Spitze entlang der Flugbahn
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
