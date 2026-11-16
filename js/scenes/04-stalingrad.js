import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'stalingrad', title: 'Stalingrad', seed: 14, duration: 9,
  script: 'Zwei Jahre später. Die Deutschen verlieren die Schlacht von Stalingrad.',
  caption: { title: 'Stalingrad', sub: 'Winter 1942/43' },
  params: {
    ruins: { type: 'number', min: 4, max: 30, step: 1, value: 14, label: 'Ruinen' },
    germans: { type: 'number', min: 0, max: 20, step: 1, value: 7, label: 'Deutsche Soldaten' },
    soviets: { type: 'number', min: 0, max: 20, step: 1, value: 9, label: 'Rote Armee Soldaten' },
    tanks: { type: 'number', min: 0, max: 6, step: 1, value: 2, label: 'Panzer' },
    snow: { type: 'number', min: 0, max: 6000, step: 100, value: 2600, label: 'Schneeflocken' },
    details: { type: 'boolean', value: true, label: 'Straßendetails (Laternen, Draht, Krater)' },
    speed: { type: 'number', min: 0, max: 2, step: .05, value: 1, label: 'Lauftempo (1 = Joggen, ca. 3 m/s)' },
    skyColor: { type: 'color', value: '#0c1118', label: 'Himmel' },
    snowColor: { type: 'color', value: '#a9b6c6', label: 'Schnee' },
    germanColor: { type: 'color', value: '#6f7480', label: 'Deutsche' },
    sovietColor: { type: 'color', value: '#c8392e', label: 'Rote Armee' },
    glow: { type: 'boolean', value: true, label: 'Figuren leuchten (Rollenfarben)' },
    ...H.cameraParams([-8, 18, 14], [-2, 15, 10], [3, 0, -1], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 14, 60);
    H.lights(scene, { sun: [-6, 12, 8], intensity: .5, hemi: .5, shadows, skyColor: '#8fa3bb', groundColor: '#223', shadowSize: 40 });
    H.lightPool(scene, { x: 2, z: 0, radius: 14, height: 30, intensity: 200 });
    scene.add(H.ground(200, p.snowColor));
    // Straße mit Ruinen links und rechts
    for (let i = 0; i < p.ruins; i++) {
      const side = i % 2 ? 1 : -1;
      const w = 4 + r() * 4, h = 4 + r() * 7, d = 3 + r() * 3;
      const ru = H.ruin(w, h, d, [P.grey, P.darkGrey, '#a09a90', '#7d6f63'][i % 4], r);
      ru.position.set(-36 + (i >> 1) * 11 + r() * 3, 0, side * (8 + r() * 5));
      ru.rotation.y = side > 0 ? Math.PI : 0;
      scene.add(ru);
      // Ruinen, die in die Straße ragen, nach außen schieben (Laufbahnen bis |z| = 4,7 bleiben frei)
      ru.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(ru);
      if (side > 0 && bb.min.z < 5.4) ru.position.z += 5.4 - bb.min.z;
      if (side < 0 && bb.max.z > -5.4) ru.position.z -= bb.max.z + 5.4;
      if (r() < .4) { const s = H.smokeColumn(r, { height: 9, width: 1 }); s.position.set(ru.position.x, h * .5, ru.position.z); scene.add(s); ru.userData.smoke = s; }
    }
    const smokes = []; scene.traverse(o => { if (o.userData.smoke) smokes.push(o.userData.smoke); });
    // Straße frei halten: Trümmer, Fässer, Kisten, Sandsäcke und Wrack stehen am Rand (|z| > 5), die Panzer fahren in
    // der Mitte (|z| < 1), die Soldaten auf festen Laufbahnen dazwischen -> niemand läuft durch etwas hindurch
    const edge = () => (r() < .5 ? -1 : 1) * (5.3 + r() * 1.8);
    for (let i = 0; i < 30; i++) {
      const b = H.box(.4 + r(), .3 + r() * .5, .4 + r(), r() < .5 ? P.darkGrey : '#b9b4ab');
      b.position.set(-30 + r() * 60, .2, edge()); b.rotation.y = r() * 3; scene.add(b);
    }
    // Laufbahnen: je Seite 4 Bahnen; wer auf derselben Bahn läuft, hat dasselbe Tempo und Abstand -> kein Überholen
    const LANES = [-4.5, -3.6, -2.7, -1.8, 1.8, 2.7, 3.6, 4.5];
    const RUN_CLIPS = ['Rifle_Run_Forward', 'Run', 'Jogging'];
    const laneSpeed = LANES.map(() => 2.6 + r() * .8);                                    // m/s je Bahn
    const runner = (i, color, helmet, glow, xBase) => {
      const lane = i % LANES.length, row = Math.floor(i / LANES.length);
      const clip = RUN_CLIPS[(i * 7 + lane) % RUN_CLIPS.length];
      const f = H.figure({ color, helmet, glow, clips: { idle: 'Rifle_Idle', walk: clip, run: clip }, seed: 31 + i * 3 });
      f.rotation.y = Math.PI; scene.add(f);
      return { f, x0: xBase + row * 3.2 + r() * .6 + (lane % 2) * 1.1, z: LANES[lane] + (r() - .5) * .15, v: laneSpeed[lane], amp: 1.3 };
    };
    // Deutsche weichen nach -X zurück, Rote Armee rückt aus +X nach
    const germans = [], soviets = [];
    for (let i = 0; i < p.germans; i++) germans.push(runner(i, p.germanColor, '#555a63', p.glow ? H.ROLE.axis : null, 5 + r() * 2));
    for (let i = 0; i < p.soviets; i++) soviets.push(runner(i + 3, p.sovietColor, '#5b3a35', p.glow ? H.ROLE.soviet : null, 21 + r() * 2));
    const tanks = [];
    for (let i = 0; i < p.tanks; i++) {
      const tk = H.tank('#7d4a42', p.glow ? H.ROLE.soviet : null); tk.rotation.y = Math.PI; scene.add(tk);
      tanks.push({ tk, x0: 24 + i * 8, z: 0 });
    }
    const flakes = p.snow > 0 ? H.particles(r, { count: p.snow, area: [60, 20, 40], color: '#ffffff', size: .14 }) : null;
    if (flakes) scene.add(flakes);
    const booms = [];
    for (let i = 0; i < 4; i++) { const b = H.explosion({ size: 1.4, color: P.orange, smoke: '#555' }); b.position.set(-10 + r() * 22, .5, (r() < .5 ? -1 : 1) * (6.5 + r() * 2)); scene.add(b); booms.push({ b, t0: 1 + r() * 7 }); }   // Einschläge an den Ruinen, nicht zwischen den Soldaten
    if (p.details) {
      for (let i = 0; i < 5; i++) { const l = H.streetLamp(4.2, { lit: i === 2 }); l.position.set(-26 + i * 12, 0, 6.2); l.rotation.z = (r() - .5) * .25; scene.add(l); }
      const fz = H.fence(16, { posts: 8 }); fz.position.set(10, 0, -6.2); scene.add(fz);
      const sb = H.sandbags(r, 9); sb.position.set(-6, 0, 6.2); sb.rotation.y = .1; scene.add(sb);
      for (let i = 0; i < 5; i++) { const b = H.barrel(i % 2 ? '#4a4e57' : '#5a3a30'); b.position.set(-20 + r() * 40, 0, edge()); b.rotation.z = r() < .3 ? Math.PI / 2 : 0; scene.add(b); }
      for (let i = 0; i < 4; i++) { const c = H.crater(.6 + r() * .4, '#5e6a78'); c.position.set(-22 + r() * 44, 0, (r() - .5) * .6); scene.add(c); }   // Krater in der Panzerspur
      const wreck = H.truck('#3b3f46'); wreck.position.set(-14, 0, -7.0); wreck.rotation.set(0, 2.9, .12); scene.add(wreck);
      for (let i = 0; i < 3; i++) { const c = H.crate(.7 + r() * .4, '#5a4a3a'); c.position.set(-2 + r() * 10, 0, 5.6 + r() * 1.2); c.rotation.y = r() * 3; scene.add(c); }
    }

    return {
      update(t, p) {
        // Laufen nach Strecke: Schrittfrequenz passt zum Tempo, keine gleitenden Füße
        for (const g of [...germans, ...soviets]) { const d = t * g.v * p.speed; g.f.position.set(g.x0 - d, 0, g.z); g.f.userData.walkDist(d, g.amp); }
        for (const tk of tanks) tk.tk.position.set(tk.x0 - t * 2.2 * p.speed, 0, tk.z);
        if (flakes) flakes.userData.drift(t, [.6, -1.8, 0], .6);
        for (const s of smokes) s.userData.at(t, .6);
        for (const b of booms) b.b.userData.at(t - b.t0);
      }
    };
  }
};
