import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

// Der Morgen nach dem Angriff (Stil wie Szene 1 und 4): Blick eine zerstörte Wohnstraße entlang im blaugrauen
// Morgenlicht. Ruinen rechts und links mit Restbränden und aufsteigendem Rauch, Trümmer am Rand. Zivilisten räumen
// Schutt, suchen, trauern; Opfer liegen am Straßenrand; einige gehen mit Habseligkeiten die Straße entlang
// (feste Bahnen, niemand läuft durch etwas hindurch). Die Kamera fährt langsam die Straße hinein.
export default {
  id: 'zerstoerte-wohngebiete', title: 'Zerstörte Wohngebiete', seed: 19, duration: 8, rev: 2,
  script: 'Viele Wohngebiete werden zerstört und zahlreiche Zivilisten sterben.',
  caption: { title: 'Der Morgen danach', sub: 'Zivile Opfer' },
  params: {
    ruins: { type: 'number', min: 4, max: 40, step: 1, value: 18, label: 'Ruinen' },
    walkers: { type: 'number', min: 0, max: 10, step: 1, value: 5, label: 'Gehende Zivilisten' },
    fires: { type: 'number', min: 0, max: 10, step: 1, value: 5, label: 'Restbrände' },
    smoke: { type: 'number', min: 0, max: 12, step: 1, value: 6, label: 'Rauchsäulen' },
    dust: { type: 'number', min: 0, max: 2000, step: 50, value: 450, label: 'Staub' },
    skyColor: { type: 'color', value: '#1a2230', label: 'Himmel (Morgen)' },
    groundColor: { type: 'color', value: '#5a6370', label: 'Boden' },
    ruinColor: { type: 'color', value: '#566070', label: 'Ruinen' },
    civilGlow: { type: 'boolean', value: false, label: 'Zivilisten als weiße Leuchtfiguren' },
    ...H.cameraParams([-24, 4.6, 1.2], [-15, 4.0, .8], [10, 1.2, 0], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 24, 80);
    H.lights(scene, { sun: [-12, 10, 6], intensity: 1.1, hemi: .7, shadows, skyColor: '#a9bccf', groundColor: '#1a1d22', shadowSize: 50 });
    H.lightPool(scene, { x: 0, z: 0, radius: 18, height: 34, intensity: 200 });
    scene.add(H.ground(220, p.groundColor));
    const cols = [p.ruinColor, '#7a6e64', '#8d8478', '#5f5750'];
    const smokes = [], fires = [];
    // Ruinen nur außerhalb der Straße (|z| >= 5,6)
    for (let i = 0; i < p.ruins; i++) {
      const side = i % 2 ? 1 : -1;
      const w = 4 + r() * 5, h = 3 + r() * 7, d = 3 + r() * 3;
      const ru = H.ruin(w, h, d, cols[i % cols.length], r);
      ru.position.set(-30 + (i >> 1) * 8.5 + r() * 2, 0, side * (8 + r() * 4)); ru.rotation.y = side > 0 ? Math.PI : 0;
      scene.add(ru); ru.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(ru);
      if (side > 0 && bb.min.z < 5.6) ru.position.z += 5.6 - bb.min.z;
      if (side < 0 && bb.max.z > -5.6) ru.position.z -= bb.max.z + 5.6;
      if (smokes.length < p.smoke && r() < .55) { const s = H.smokeColumn(r, { height: 16, width: 1.5, color: '#5a5550' }); s.position.set(ru.position.x, h * .45, ru.position.z); scene.add(s); smokes.push(s); }
      if (fires.length < p.fires && r() < .5) { const f = H.flame(r, { size: .7 + r() * .6 }); f.position.set(ru.position.x + (r() - .5) * w * .3, 0, ru.position.z - side * d * .25); scene.add(f); fires.push(f); }
    }
    // Trümmer, Balken, Fässer am Straßenrand (|z| > 4,8); Straßenmitte frei
    const edge = () => (r() < .5 ? -1 : 1) * (4.9 + r() * 2);
    for (let i = 0; i < 70; i++) {
      const b = H.box(.3 + r() * 1.1, .2 + r() * .5, .3 + r() * 1.1, cols[i % cols.length]);
      b.position.set(-34 + r() * 72, .15, edge()); b.rotation.y = r() * 3; scene.add(b);
    }
    for (let i = 0; i < 8; i++) { const b = H.box(3.4, .22, .22, P.brown); b.position.set(-28 + r() * 56, .3 + r() * .8, edge()); b.rotation.set(r() * .5, (r() - .5) * .8, r() * .4); scene.add(b); }
    for (let i = 0; i < 5; i++) { const b = H.barrel('#4a4e57'); b.position.set(-24 + r() * 48, 0, edge()); b.rotation.z = r() < .5 ? Math.PI / 2 : 0; scene.add(b); }
    for (let i = 0; i < 4; i++) { const l = H.streetLamp(4, { lit: false }); l.position.set(-26 + i * 15, 0, 5.3); l.rotation.z = (r() - .5) * .5; scene.add(l); }
    const wreck = H.truck('#3b3f46'); wreck.position.set(12, 0, -6.6); wreck.rotation.set(.06, -.2, 0); scene.add(wreck);
    const cart = new THREE.Group();
    const bed = H.box(1.8, .3, 1, P.brown); bed.position.y = .7; cart.add(bed);
    for (const z of [-.55, .55]) { const w = H.cyl(.45, .45, .1, P.darkGrey, 12); w.rotation.x = Math.PI / 2; w.position.set(0, .45, z); cart.add(w); }
    for (let i = 0; i < 3; i++) { const c = H.crate(.45, '#6a5844'); c.position.set(-.4 + i * .4, .85, (r() - .5) * .3); cart.add(c); }
    cart.position.set(2, 0, 3.9); cart.rotation.y = .15; scene.add(cart);
    // Kleidung in gedeckten Farben (keine weißen Leuchtfiguren)
    const CLOTHES = ['#6b5b4a', '#4e5f7a', '#7a6e5a', '#5a6a5c', '#8a7a6a', '#5d4f63', '#6e6a62', '#46505e'];
    // Stehende Gruppen am Rand (Schutt räumen, suchen, trauern) und Opfer
    const still = [
      ['Digging_Hole_With_Shovel', -6, -3.9, -Math.PI / 2], ['Kneeling_In_Prayer', -1.5, -4.1, Math.PI / 2], ['Crying_And_Rubbing_Eyes', 0, -3.6, Math.PI],
      ['Lifting_A_Heavy_Object_With_Both_Hands', 6, 3.9, Math.PI / 2], ['Sitting_On_The_Floor', 9, -4.2, Math.PI / 2], ['Thinking_While_Standing', 15, 3.6, Math.PI],
      ['Laying_On_The_Ground_Dying', -3.5, 4.2, 0], ['Laying_On_The_Ground_Dying', 11.5, -4.0, Math.PI]
    ];
    const people = [];
    still.forEach(([pose, x, z, ry], i) => {
      const f = H.figure({ color: CLOTHES[i % CLOTHES.length], scale: i === 2 ? .75 : 1, glow: p.civilGlow ? '#dfe6f0' : null, strength: 1.05, model: 'civil', seed: i * 7 + 5, pose, loopPose: !/Laying/.test(pose) });
      f.position.set(x, 0, z); f.rotation.y = ry; scene.add(f); people.push({ f, pose, ph: r() * 5 });
    });
    // Gehende auf festen Bahnen (je Bahn eine Richtung und ein Tempo)
    const LANES = [-1.6, -.4, .8, 2.0];
    const laneV = LANES.map(() => .8 + r() * .25);   // gleiches Tempo je Bahn -> kein Überholen
    const walkers = [];
    for (let i = 0; i < p.walkers; i++) {
      const lane = i % LANES.length, dir = lane % 2 ? 1 : -1;
      const clip = i % 3 === 1 ? 'Walk_Carry' : (i % 3 === 2 ? 'Injured_Walking' : 'Walk_Natural');
      const f = H.figure({ color: CLOTHES[(i + 3) % CLOTHES.length], scale: i === 3 ? .78 : 1, glow: p.civilGlow ? '#dfe6f0' : null, strength: 1.05, model: 'civil', clips: { idle: 'Standing_Idle_Loop', walk: clip, run: clip }, seed: 60 + i * 9 });
      f.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(f);
      if (clip === 'Walk_Carry') { const c = H.crate(.42, '#6a5844'); c.position.set(.38, .82, 0); f.add(c); }   // Habseligkeiten in den Armen
      walkers.push({ f, dir, z: LANES[lane], x0: (dir > 0 ? 0 : 22) + Math.floor(i / LANES.length) * 6 * dir + r() * 2, v: laneV[lane] });   // nie direkt vor der Kamera
    }
    const dust = p.dust > 0 ? H.particles(r, { count: p.dust, area: [60, 10, 20], color: '#d8d2c6', size: .07, opacity: .35 }) : null;
    if (dust) scene.add(dust);

    return {
      update(t) {
        for (const s of smokes) s.userData.at(t, .5);
        for (const f of fires) f.userData.at(t);
        for (const pe of people) pe.f.userData.pose(pe.pose, /Laying/.test(pe.pose) ? 9 : t + pe.ph);
        for (const w of walkers) { const d = t * w.v; w.f.position.set(w.x0 + w.dir * d, 0, w.z); w.f.userData.walkDist(d, 1); }
        if (dust) dust.userData.drift(t, [.5, .15, 0], .4);
      }
    };
  }
};
