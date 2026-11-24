import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

// Der Morgen nach dem Angriff (Stil wie Szene 1 und 4): Blick eine zerstörte Wohnstraße entlang im blaugrauen
// Morgenlicht. Ruinen rechts und links mit Restbränden und aufsteigendem Rauch, Trümmer am Rand. Zivilisten räumen
// Schutt, suchen, trauern; Opfer liegen am Straßenrand; einige gehen mit Habseligkeiten die Straße entlang
// (feste Bahnen, niemand läuft durch etwas hindurch). Die Kamera fährt langsam die Straße hinein.
export default {
  id: 'zerstoerte-wohngebiete', title: 'Zerstörte Wohngebiete', seed: 19, duration: 8, rev: 4,
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
    civilGlow: { type: 'boolean', value: true, label: 'Zivilisten leuchten in Rollenfarbe' },
    civilColor: { type: 'color', value: '#ff2d2d', label: 'Zivilisten (Rollenfarbe: deutsch = rot)' },
    ...H.cameraParams([-24, 4.6, 1.2], [-15, 4.0, .8], [10, 1.2, 0], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 30, 130);
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
    // ---------- Details: Gehsteige, Straßenbahn, Schuttkegel, Hausrat, zweite Häuserreihe, Kirchenruine ----------
    const stone = new THREE.MeshLambertMaterial({ color: '#6e737b', flatShading: true });
    for (const z of [-1, 1]) {                                                                // Gehsteig mit Bordstein
      const walk = H.box(90, .14, 1.0, '#666b73'); walk.position.set(5, .07, z * 4.95); walk.receiveShadow = true; scene.add(walk);
      const curb = H.box(90, .18, .12, '#80858d'); curb.position.set(5, .09, z * 4.45); scene.add(curb);
    }
    for (const z of [-.72, .72]) { const rail = H.box(90, .05, .07, '#3a3c40'); rail.position.set(5, .03, z + .2); scene.add(rail); }   // Straßenbahngleise
    for (let i = 0; i < 7; i++) {                                                              // Oberleitungsmasten, teils umgeknickt, durchhängender Draht
      const x = -26 + i * 11, lean = i % 3 === 1 ? .5 : (r() - .5) * .12;
      const pole = H.cyl(.07, .09, 6, '#33363b', 6); pole.position.set(x, 3, -4.7); pole.rotation.x = lean; scene.add(pole);
      if (i < 6 && i % 3 !== 1 && (i + 1) % 3 !== 1) {
        const pts = []; for (let k = 0; k <= 10; k++) pts.push(new THREE.Vector3(x + k * 1.1, 5.8 - Math.sin(k / 10 * Math.PI) * .9, -4.7 + k * .02));
        scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, .015, 3), new THREE.MeshBasicMaterial({ color: '#1d1f23' })));
      }
    }
    const heap = (x, z, sz) => {                                                               // Schuttkegel aus Bruchsteinen
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.IcosahedronGeometry(sz, 1), stone); base.scale.set(1.6, .45, 1); base.position.y = sz * .1; base.castShadow = base.receiveShadow = true; g.add(base);
      for (let k = 0; k < 9; k++) { const b = H.box(.3 + r() * .5, .2 + r() * .3, .3 + r() * .5, cols[k % cols.length]); b.position.set((r() - .5) * sz * 2.4, sz * .3 + r() * sz * .25, (r() - .5) * sz * 1.2); b.rotation.set(r(), r() * 3, r()); g.add(b); }
      g.position.set(x, 0, z); g.rotation.y = r() * 3; scene.add(g);
    };
    for (let i = 0; i < 14; i++) heap(-30 + i * 5.2 + r() * 2, (i % 2 ? 1 : -1) * (6.2 + r() * 1.4), .9 + r() * .7);
    // Hausrat in den Trümmern: Bettgestell, Stuhl, Schrank, Badewanne
    const furn = [];
    const bedF = new THREE.Group(); { const f = H.box(2, .08, .9, '#4a3a2c'); f.position.y = .45; bedF.add(f); for (const [x, z] of [[-.95, -.4], [.95, -.4], [-.95, .4], [.95, .4]]) { const l = H.box(.06, .45, .06, '#3a2c20'); l.position.set(x, .22, z); bedF.add(l); } const hb = H.box(.08, .9, .9, '#4a3a2c'); hb.position.set(-1, .6, 0); bedF.add(hb); } furn.push(bedF);
    const chair = new THREE.Group(); { const sea = H.box(.45, .06, .45, '#5a4532'); sea.position.y = .45; chair.add(sea); const back = H.box(.06, .5, .45, '#5a4532'); back.position.set(-.2, .7, 0); chair.add(back); for (const [x, z] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) { const l = H.box(.05, .45, .05, '#3e2f22'); l.position.set(x, .22, z); chair.add(l); } } furn.push(chair);
    const wardrobe = H.box(1.1, 1.9, .55, '#4e3c2c'); wardrobe.position.y = .95; const wg = new THREE.Group(); wg.add(wardrobe); furn.push(wg);
    const tub = new THREE.Group(); { const t1 = H.box(1.6, .5, .75, '#c9c7c0'); t1.position.y = .3; tub.add(t1); const t2 = H.box(1.45, .45, .6, '#7f7d78'); t2.position.y = .4; tub.add(t2); } furn.push(tub);
    [[-17, 6.0, .3, 0], [-8, -6.1, 0, .2], [4, 6.6, 0, 1.3], [14, -6.4, .1, 0], [22, 6.2, 0, .4], [-22, -6.6, 0, 1.2]].forEach(([x, z, rz, rx], i) => {
      const o = furn[i % furn.length].clone(); o.position.set(x, 0, z); o.rotation.set(rx, r() * 3, rz); scene.add(o);
    });
    // ausgebrannte Straßenbahn am Rand
    const tram = new THREE.Group(); { const body = H.box(9, 2.6, 2.2, '#3b3530'); body.position.y = 1.7; tram.add(body); const roof = H.box(9.2, .2, 2.0, '#2a2622'); roof.position.y = 3.1; tram.add(roof);
      for (let k = 0; k < 7; k++) for (const z of [-1.11, 1.11]) { const w = H.box(.9, .9, .05, '#121315'); w.position.set(-3.6 + k * 1.2, 2.2, z); tram.add(w); }
      for (const x of [-3, 3]) for (const z of [-.8, .8]) { const wh = H.cyl(.35, .35, .12, '#1c1d20', 10); wh.rotation.x = Math.PI / 2; wh.position.set(x, .35, z); tram.add(wh); } }
    tram.position.set(30, 0, 6.6); tram.rotation.set(0, -.08, .07); scene.add(tram);
    // Wassergefüllter Bombentrichter auf dem Gehsteig gegenüber
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), new THREE.MeshStandardMaterial({ color: '#1f2a36', roughness: .2, metalness: .1 })); pool.rotation.x = -Math.PI / 2; pool.position.set(-12, .16, -5.2); pool.scale.set(1, .55, 1); scene.add(pool);
    // zweite, höhere Häuserreihe und ferne Silhouette mit Kirchenruine
    const far = ['#4f5662', '#5a5f68', '#6a6560', '#474d57'];
    for (let i = 0; i < 22; i++) {
      const side = i % 2 ? 1 : -1, w = 6 + r() * 6, h = 8 + r() * 10, d = 5 + r() * 4;
      const ru = H.ruin(w, h, d, far[i % far.length], r); ru.position.set(-30 + (i >> 1) * 9 + r() * 3, 0, side * (17 + r() * 6)); ru.rotation.y = side > 0 ? Math.PI : 0; scene.add(ru);
      if (smokes.length < p.smoke + 3 && r() < .25) { const sm = H.smokeColumn(r, { height: 20, width: 1.8, color: '#5a5550' }); sm.position.set(ru.position.x, h * .6, ru.position.z); scene.add(sm); smokes.push(sm); }
    }
    for (let i = 0; i < 10; i++) { const w = 8 + r() * 8, h = 9 + r() * 12, ru = H.ruin(w, h, 6 + r() * 4, far[i % far.length], r); ru.position.set(68 + r() * 18, 0, -30 + i * 6.5); ru.rotation.y = -Math.PI / 2; scene.add(ru); }
    const church = new THREE.Group(); { const nave = H.box(14, 11, 9, '#5c5a57'); nave.position.y = 5.5; church.add(nave); const tower = H.box(4.5, 26, 4.5, '#5c5a57'); tower.position.set(-8, 13, 0); church.add(tower);
      for (let k = 0; k < 4; k++) { const st = H.box(.5, 4 + r() * 3, .5, '#4b4946'); st.position.set(-9.8 + (k % 2) * 3.6, 27, -1.8 + (k >> 1) * 3.6); church.add(st); } }   // ausgebrannter Turmstumpf mit Rippen
    church.position.set(62, 0, 9); church.rotation.y = -Math.PI / 2; scene.add(church);

    // Kleidung in gedeckten Farben (nur ohne Leuchtfarbe sichtbar)
    // Leuchtfarbe wie im übrigen Video (deutsch = rot), je Person nur minimal in der Helligkeit variiert
    const civilTint = i => p.civilGlow ? new THREE.Color(p.civilColor).offsetHSL(0, 0, ((i * 53) % 9 - 4) * .006) : null;
    const CLOTHES = ['#6b5b4a', '#4e5f7a', '#7a6e5a', '#5a6a5c', '#8a7a6a', '#5d4f63', '#6e6a62', '#46505e'];
    // Stehende Gruppen am Rand (Schutt räumen, suchen, trauern) und Opfer
    const still = [
      ['Digging_Hole_With_Shovel', -6, -3.9, -Math.PI / 2], ['Kneeling_In_Prayer', -1.5, -4.1, Math.PI / 2], ['Crying_And_Rubbing_Eyes', 0, -3.6, Math.PI],
      ['Lifting_A_Heavy_Object_With_Both_Hands', 6, 3.9, Math.PI / 2], ['Sitting_On_The_Floor', 9, -4.2, Math.PI / 2], ['Thinking_While_Standing', 15, 3.6, Math.PI],
      ['Laying_On_The_Ground_Dying', -3.5, 4.2, 0], ['Laying_On_The_Ground_Dying', 11.5, -4.0, Math.PI]
    ];
    const people = [];
    still.forEach(([pose, x, z, ry], i) => {
      const f = H.figure({ color: CLOTHES[i % CLOTHES.length], scale: i === 2 ? .75 : 1, glow: civilTint(i), strength: 1.45, model: 'civil', seed: i * 7 + 5, pose, loopPose: !/Laying/.test(pose) });
      f.position.set(x, 0, z); f.rotation.y = ry; scene.add(f); people.push({ f, pose, ph: r() * 5 });
    });
    // Gehende auf festen Bahnen (je Bahn eine Richtung und ein Tempo)
    const LANES = [-1.6, -.4, .8, 2.0];
    const laneV = LANES.map(() => .8 + r() * .25);   // gleiches Tempo je Bahn -> kein Überholen
    const walkers = [];
    for (let i = 0; i < p.walkers; i++) {
      const lane = i % LANES.length, dir = lane % 2 ? 1 : -1;
      const clip = i % 3 === 1 ? 'Walk_Carry' : (i % 3 === 2 ? 'Injured_Walking' : 'Walk_Natural');
      const f = H.figure({ color: CLOTHES[(i + 3) % CLOTHES.length], scale: i === 3 ? .78 : 1, glow: civilTint(i + 20), strength: 1.45, model: 'civil', clips: { idle: 'Standing_Idle_Loop', walk: clip, run: clip }, seed: 60 + i * 9, carry: clip === 'Walk_Carry' });
      f.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(f);
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
