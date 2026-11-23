import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'stalingrad', title: 'Stalingrad', seed: 14, duration: 9, rev: 3,
  script: 'Zwei Jahre später. Die Deutschen verlieren die Schlacht von Stalingrad.',
  caption: { title: 'Stalingrad', sub: 'Winter 1942/43' },
  params: {
    ruins: { type: 'number', min: 4, max: 40, step: 1, value: 26, label: 'Ruinen an der Straße' },
    backdrop: { type: 'boolean', value: true, label: 'Hintergrund (Häuserblocks, Fabrik, Getreidesilo)' },
    germans: { type: 'number', min: 0, max: 20, step: 1, value: 7, label: 'Deutsche Soldaten' },
    soviets: { type: 'number', min: 0, max: 20, step: 1, value: 9, label: 'Rote Armee Soldaten' },
    tanks: { type: 'number', min: 0, max: 1, step: 1, value: 1, label: 'Panzer (T-34)' },
    snow: { type: 'number', min: 0, max: 6000, step: 100, value: 4200, label: 'Schneeflocken' },
    details: { type: 'boolean', value: true, label: 'Straßendetails (Laternen, Draht, Krater)' },
    speed: { type: 'number', min: 0, max: 2, step: .05, value: 1, label: 'Lauftempo (1 = Joggen, ca. 3 m/s)' },
    skyColor: { type: 'color', value: '#101722', label: 'Himmel' },
    snowColor: { type: 'color', value: '#7e8a9b', label: 'Schnee' },
    fires: { type: 'number', min: 0, max: 10, step: 1, value: 5, label: 'Brände in den Ruinen' },
    germanColor: { type: 'color', value: '#6f7480', label: 'Deutsche' },
    sovietColor: { type: 'color', value: '#c8392e', label: 'Rote Armee' },
    sovietGlowColor: { type: 'color', value: '#b37b0e', label: 'Rote Armee Leuchtfarbe (dunkleres Gelb)' },
    glow: { type: 'boolean', value: true, label: 'Figuren leuchten (Rollenfarben)' },
    // Blick die Straße entlang (wie Szene 1: niedrig, filmisch): Deutsche fliehen auf die Kamera zu, die Kamera weicht zurück
    ...H.cameraParams([-13, 5.2, 1.5], [-25, 4.6, 1.2], [8, 1.4, 0], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 30, 150);
    H.lights(scene, { sun: [-10, 14, 8], intensity: 1.0, hemi: .6, shadows, skyColor: '#9fb3c8', groundColor: '#111', shadowSize: 50 });
    H.lightPool(scene, { x: -4, z: 0, radius: 18, height: 34, intensity: 230 });
    scene.add(H.ground(320, p.snowColor));
    const fires = [];
    // Straße mit Ruinen links und rechts
    for (let i = 0; i < p.ruins; i++) {
      const side = i % 2 ? 1 : -1;
      const w = 4 + r() * 4, h = 4 + r() * 7, d = 3 + r() * 3;
      const ru = H.ruin(w, h, d, [P.grey, P.darkGrey, '#a09a90', '#7d6f63'][i % 4], r);
      ru.position.set(-36 + (i >> 1) * 10 + r() * 3, 0, side * (8 + r() * 4));
      ru.rotation.y = side > 0 ? Math.PI : 0;
      scene.add(ru);
      // Ruinen, die in die Straße ragen, nach außen schieben (Laufbahnen bis |z| = 4,7 bleiben frei)
      ru.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(ru);
      if (side > 0 && bb.min.z < 5.4) ru.position.z += 5.4 - bb.min.z;
      if (side < 0 && bb.max.z > -5.4) ru.position.z -= bb.max.z + 5.4;
      if (r() < .35) { const s = H.smokeColumn(r, { height: 11, width: 1.1, color: '#3a3836' }); s.position.set(ru.position.x, h * .5, ru.position.z); scene.add(s); ru.userData.smoke = s; }
      if (fires.length < p.fires && r() < .55) { const f = H.flame(r, { size: .9 + r() * .6 }); f.position.set(ru.position.x + (r() - .5) * w * .4, 0, ru.position.z - side * d * .2); scene.add(f); fires.push(f); }
    }
    const smokes = []; scene.traverse(o => { if (o.userData.smoke) smokes.push(o.userData.smoke); });
    // Straße frei halten: Trümmer, Fässer, Kisten, Sandsäcke und Wrack stehen am Rand (|z| > 5), die Panzer fahren in
    // der Mitte (|z| < 1), die Soldaten auf festen Laufbahnen dazwischen -> niemand läuft durch etwas hindurch
    const edge = () => (r() < .5 ? -1 : 1) * (5.3 + r() * 1.8);
    for (let i = 0; i < 70; i++) {
      const b = H.box(.4 + r(), .3 + r() * .5, .4 + r(), r() < .5 ? P.darkGrey : '#b9b4ab');
      b.position.set(-30 + r() * 120, .2, edge()); b.rotation.y = r() * 3; scene.add(b);
    }
    // Laufbahnen: je Seite 4 Bahnen; wer auf derselben Bahn läuft, hat dasselbe Tempo -> kein Überholen.
    // Deutsche nutzen alle Bahnen, die Rote Armee nur die inneren (1–6): die beiden Gefallenen liegen auf den
    // äußeren Bahnen, dort läuft niemand mehr hinterher.
    const LANES = [-4.5, -3.6, -2.7, -1.8, 1.8, 2.7, 3.6, 4.5];
    const laneSpeed = LANES.map(() => 2.7 + r() * .7);                                    // m/s je Bahn
    const soviet = p.sovietGlowColor;
    const runner = (lane, row, clip, color, helmet, glow, xBase, seed) => {
      const f = H.figure({ color, helmet, glow, strength: 1.5, clips: { idle: 'Rifle_Idle', walk: clip, run: clip }, seed, weapon: true });
      f.rotation.y = Math.PI; scene.add(f);
      return { f, clip, x0: xBase + row * 3.4 + r() * .6 + (lane % 2) * 1.1, z: LANES[lane] + (r() - .5) * .12, v: laneSpeed[lane], amp: 1.3 };
    };
    // Deutsche weichen nach -X zurück (Laufen, Joggen, Gewehr-Lauf gemischt)
    const G_LANES = [0, 7, 1, 6, 2, 5, 3, 4], G_CLIPS = ['Run_Natural', 'Jogging', 'Rifle_Run_Forward'];
    const germans = [];
    for (let i = 0; i < p.germans; i++) {
      const lane = G_LANES[i % 8], row = Math.floor(i / 8);
      germans.push(runner(lane, row, G_CLIPS[i % 3], p.germanColor, '#555a63', p.glow ? H.ROLE.axis : null, 5 + r() * 2, 31 + i * 3));
    }
    // zwei Deutsche auf den äußeren Bahnen werden getroffen und bleiben liegen
    const victims = germans.slice(0, Math.min(2, germans.length));
    victims.forEach((g, k) => { g.tDie = [3.7, 5.6][k]; });
    // Rote Armee rückt aus +X nach; zwei von drei laufen mit Gewehr im Anschlag und schießen
    const S_CLIPS = ['Rifle_Run_Forward', 'Rifle_Run_Forward', 'Jogging'];
    const soviets = [];
    for (let i = 0; i < p.soviets; i++) {
      const lane = 1 + i % 6, row = Math.floor(i / 6);
      const s = runner(lane, row, S_CLIPS[i % 3], p.sovietColor, '#5b3a35', p.glow ? soviet : null, 19 + r() * 2, 61 + i * 5);
      s.shooter = s.clip === 'Rifle_Run_Forward'; s.t0 = 1.0 + r() * 1.2; s.period = .9 + r() * .7;
      soviets.push(s);
    }
    const posAt = (g, t) => { const tt = g.tDie !== undefined ? Math.min(t, g.tDie) : t; return g.x0 - tt * g.v * p.speed; };

    // Schüsse: Mündungsfeuer + Leuchtspur von der Mündung zum Ziel (deterministisch aus der Zeit)
    const flashTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(.35, 'rgba(255,190,90,.9)'); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const mkFlash = sz => { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); f.scale.setScalar(sz); f.visible = false; scene.add(f); return f; };
    const tracerGeo = new THREE.CylinderGeometry(.025, .025, 1.6, 5); tracerGeo.rotateX(Math.PI / 2);
    const tracerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(3) });
    const shooters = soviets.filter(s => s.shooter);
    for (const s of shooters) {
      s.flash = mkFlash(.55); s.tracer = new THREE.Mesh(tracerGeo, tracerMat); s.tracer.visible = false; scene.add(s.tracer);
      s.shots = [];
      for (let ts = s.t0; ts < p.duration; ts += s.period) s.shots.push({ ts, target: Math.floor(r() * 1000), miss: [(r() - .5) * 1.2, (r() - .3) * .8] });
    }
    // Treffer auf die Gefallenen: der nächstgelegene Schütze feuert kurz vorher genau auf sie
    victims.forEach(vk => { const sh = shooters.length ? shooters.reduce((a, b) => Math.abs(b.z - vk.z) < Math.abs(a.z - vk.z) ? b : a) : null; if (sh) sh.shots.push({ ts: vk.tDie - .12, victim: vk, miss: [0, 0] }); });
    const shotTarget = (sh, shot, ts) => {
      const alive = germans.filter(g => g.tDie === undefined || g.tDie > ts);
      const g = shot.victim || alive[shot.target % Math.max(1, alive.length)];
      if (!g) return null;
      return new THREE.Vector3(posAt(g, ts) + shot.miss[0], 1.25 + shot.miss[1], g.z + shot.miss[0] * .3);
    };

    // T-34 (Low-Poly, detailliert): schräge Bugplatte, Wanne mit Heckschräge, Kettenblech, fünf große Laufrollen je
    // Seite, Kette mit laufenden Gliedern, sechseckiger Turm mit Blende und langem Rohr, Luke, Bug-MG, Zusatztanks,
    // Auspuffrohre, Ersatzkettenglieder, roter Stern. Ursprung am Boden, Fahrtrichtung +X.
    const buildT34 = glow => {
      const tk = new THREE.Group();
      const body = new THREE.MeshLambertMaterial({ color: '#9a7a38', emissive: glow || '#000000', emissiveIntensity: glow ? .18 : 0, flatShading: true });
      const dark = new THREE.MeshLambertMaterial({ color: '#24262b', flatShading: true }), steel = new THREE.MeshLambertMaterial({ color: '#3d4048', flatShading: true });
      const add = (geo, m, x, y, z, parent = tk) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
      // Wanne: Seitenprofil extrudiert
      const prof = new THREE.Shape([[-2.45, .55], [2.2, .55], [2.75, .95], [1.55, 1.42], [-2.0, 1.42], [-2.45, 1.1]].map(([x, y]) => new THREE.Vector2(x, y)));
      const hullGeo = new THREE.ExtrudeGeometry(prof, { depth: 1.8, bevelEnabled: false }); hullGeo.translate(0, 0, -.9);
      const hull = add(hullGeo, body, 0, 0, 0);
      for (const z of [-1, 1]) {
        add(new THREE.BoxGeometry(5.3, .07, .46), body, 0, 1.05, z * 1.1);                 // Kettenblech
        add(new THREE.BoxGeometry(5.1, .62, .4), dark, 0, .48, z * 1.1);                 // Kette
        for (let k = 0; k < 5; k++) { const w = add(new THREE.CylinderGeometry(.36, .36, .14, 10), steel, -1.7 + k * .85, .42, z * 1.3); w.rotation.x = Math.PI / 2; w.userData.wheel = true; }
        for (const [x, rr] of [[-2.4, .3], [2.4, .3]]) { const w = add(new THREE.CylinderGeometry(rr, rr, .16, 10), dark, x, .62, z * 1.28); w.rotation.x = Math.PI / 2; w.userData.wheel = true; }   // Antriebs- und Leitrad
        const drum = add(new THREE.CylinderGeometry(.2, .2, .7, 8), steel, -2.15, 1.3, z * .78); drum.rotation.z = Math.PI / 2;   // Zusatztank
        const ex = add(new THREE.CylinderGeometry(.06, .07, .3, 6), dark, -2.48, 1.0, z * .38); ex.rotation.z = Math.PI / 2;      // Auspuff
      }
      for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(.06, .05, .5), dark, 2.05 - k * .14, 1.16 + k * .07, -.55 + k * .55);   // Ersatzglieder auf der Bugplatte
      const mg = add(new THREE.SphereGeometry(.12, 8, 6), steel, 2.25, 1.17, .55); const mgb = add(new THREE.CylinderGeometry(.03, .03, .45, 5), dark, 2.45, 1.12, .55); mgb.rotation.z = Math.PI / 2;
      // Turm auf Drehkranz
      const pivot = new THREE.Group(); pivot.position.set(.35, 1.42, 0); tk.add(pivot);
      const tur = add(new THREE.CylinderGeometry(.82, 1.0, .62, 6), body, -.15, .31, 0, pivot); tur.scale.set(1.3, 1, 1); tur.rotation.y = Math.PI / 6;
      add(new THREE.CylinderGeometry(.24, .26, .14, 8), steel, -.45, .69, .3, pivot);                                  // Luke
      add(new THREE.BoxGeometry(.32, .42, .62), body, .95, .3, 0, pivot);                                              // Blende
      const barrel = new THREE.Group(); barrel.position.set(1.05, .3, 0); pivot.add(barrel);
      const tube = add(new THREE.CylinderGeometry(.07, .085, 2.7, 8), steel, 1.35, 0, 0, barrel); tube.rotation.z = -Math.PI / 2;
      for (const z of [-1, 1]) { const rail = add(new THREE.CylinderGeometry(.025, .025, 1.2, 4), dark, -.3, .45, z * .9, pivot); rail.rotation.z = Math.PI / 2; }
      const starC = document.createElement('canvas'); starC.width = starC.height = 64; const sg = starC.getContext('2d'); sg.fillStyle = '#d42a1f'; sg.beginPath();
      for (let k = 0; k < 10; k++) { const an = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 12 : 30; sg.lineTo(32 + Math.cos(an) * rr, 34 + Math.sin(an) * rr); } sg.fill();
      for (const z of [-1, 1]) { const st = new THREE.Mesh(new THREE.PlaneGeometry(.42, .42), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(starC), transparent: true })); st.position.set(-.2, .33, z * .7); st.rotation.y = z > 0 ? 0 : Math.PI; pivot.add(st); }
      const tip = new THREE.Object3D(); tip.position.set(2.75, 0, 0); barrel.add(tip);
      const links = [];
      for (const z of [-1, 1]) for (let k = 0; k < 14; k++) links.push(add(new THREE.BoxGeometry(.1, .05, .4), steel, 0, .81, z * 1.1));
      const wheels = []; tk.traverse(o => { if (o.userData.wheel) wheels.push(o); });
      return { tk, hull, pivot, barrel, tip, links, wheels };
    };
    const tanks = [];
    for (let i = 0; i < p.tanks; i++) {
      const T = buildT34(p.glow ? soviet : null); T.tk.rotation.y = Math.PI; scene.add(T.tk);
      tanks.push({ ...T, muzzle: mkFlash(1.6), x0: 24, z: 0, shots: [] });
    }
    // Granateinschläge an den Ruinen weit vor dem schießenden Panzer (flacher Winkel: das Rohr ragt nie in die Laufbahnen)
    const booms = [];
    for (let i = 0; i < 4; i++) {
      const t0 = 1.6 + i * 1.7 + r() * .4, tk = tanks[i % Math.max(1, tanks.length)];
      const xTank = tk ? tk.x0 - (t0 - .25) * 2.2 * p.speed : 0;
      const b = H.fireball(r, { size: 1.5 + r() * .5, duration: 2.0, debris: 18, sparks: 40, ring: false, variant: i });   // wie die Einschläge in Szene 1/8
      b.position.set(xTank - 14 - r() * 5, 0, (r() < .5 ? -1 : 1) * (6.6 + r() * 1.2)); b.rotation.y = r() * 6.28; scene.add(b);
      booms.push({ b, t0 });
      if (tk) tk.shots.push({ ts: t0 - .25, at: b.position.clone() });
    }
    // Hintergrund: zweite Häuserreihe hinter den Straßenruinen, Seitenstraßen mit Trümmerfeldern, in der Ferne
    // Häuserblocks, Fabrikhallen mit Schornsteinen und das Getreidesilo; Brände und Rauch in der Tiefe
    if (p.backdrop) {
      const far = ['#59606b', '#4b525d', '#6a6660', '#545a63'];
      for (let i = 0; i < 26; i++) {
        const side = i % 2 ? 1 : -1, w = 6 + r() * 6, h = 7 + r() * 11, d = 5 + r() * 4;
        const ru = H.ruin(w, h, d, far[i % far.length], r);
        ru.position.set(-30 + (i >> 1) * 10 + r() * 4, 0, side * (19 + r() * 9)); ru.rotation.y = side > 0 ? Math.PI : 0; scene.add(ru);
        if (r() < .3) { const sm = H.smokeColumn(r, { height: 18, width: 1.6, color: '#3a3836' }); sm.position.set(ru.position.x, h * .6, ru.position.z); scene.add(sm); smokes.push(sm); }
      }
      for (let i = 0; i < 160; i++) {                                                     // Trümmerfelder zwischen den Reihen
        const b = H.box(.5 + r() * 1.4, .25 + r() * .7, .5 + r() * 1.4, r() < .5 ? '#4a4f58' : '#8e887e');
        b.position.set(-30 + r() * 130, .2, (r() < .5 ? -1 : 1) * (13 + r() * 8)); b.rotation.set(r() * .3, r() * 3, r() * .3); scene.add(b);
      }
      for (let i = 0; i < 10; i++) {                                                      // verbrannte Baumstümpfe, Masten
        const pole = H.cyl(.08, .12, 3 + r() * 3, '#2a2724', 5); pole.position.set(-20 + r() * 100, 1.5, (r() < .5 ? -1 : 1) * (10.5 + r() * 2)); pole.rotation.z = (r() - .5) * .3; scene.add(pole);
      }
      // Ferne Silhouette: Häuserblocks am Ende der Straße
      for (let i = 0; i < 14; i++) {
        const w = 8 + r() * 10, h = 10 + r() * 16, d = 6 + r() * 6, ru = H.ruin(w, h, d, far[i % far.length], r);
        ru.position.set(95 + r() * 30, 0, -40 + i * 6 + r() * 3); ru.rotation.y = -Math.PI / 2; scene.add(ru);
      }
      // Getreidesilo (Wahrzeichen der Schlacht) und Fabrik mit Schornsteinen
      const silo = new THREE.Group();
      for (let k = 0; k < 6; k++) { const c = H.cyl(1.8, 1.8, 26, '#6f6b63', 10); c.position.set(0, 13, -6 + k * 2.4); silo.add(c); }
      const head = H.box(5, 9, 16, '#625e57'); head.position.set(0, 30, 0); silo.add(head);
      silo.position.set(86, 0, 26); scene.add(silo);
      for (let k = 0; k < 3; k++) {
        const hall = H.box(20, 9, 12, '#4e535c'); hall.position.set(100 + k * 6, 4.5, -28 + k * 14); hall.rotation.y = .1; scene.add(hall);
        const ch = H.cyl(1.1, 1.5, 28, '#3f434b', 8); ch.position.set(96 + k * 8, 14, -22 + k * 14); scene.add(ch);
        const sm = H.smokeColumn(r, { height: 24, width: 2.4, color: '#35332f' }); sm.position.set(96 + k * 8, 26, -22 + k * 14); scene.add(sm); smokes.push(sm);
      }
      for (let i = 0; i < 5; i++) { const f = H.flame(r, { size: 1.6 + r() }); f.position.set(40 + r() * 60, 0, (r() < .5 ? -1 : 1) * (16 + r() * 10)); scene.add(f); fires.push(f); }
      // ausgebranntes deutsches Panzerwrack und umgestürztes Auto am Rand
      const wr = H.tank('#2f3136'); wr.position.set(32, 0, -8.8); wr.rotation.set(.04, .5, .1); scene.add(wr);
      const car = H.truck('#3a3d43'); car.scale.setScalar(.8); car.position.set(48, .4, 9.5); car.rotation.set(Math.PI / 2.4, -.6, 0); scene.add(car);
    }
    const flakes = p.snow > 0 ? H.particles(r, { count: p.snow, area: [120, 22, 60], color: '#e8eef6', size: .07, opacity: .8 }) : null;
    if (flakes) scene.add(flakes);
    if (p.details) {
      for (let i = 0; i < 5; i++) { const l = H.streetLamp(4.2, { lit: i === 2 }); l.position.set(-26 + i * 12, 0, 6.2); l.rotation.z = (r() - .5) * .25; scene.add(l); }
      const fz = H.fence(16, { posts: 8 }); fz.position.set(10, 0, -6.2); scene.add(fz);
      const sb = H.sandbags(r, 9); sb.position.set(-6, 0, 6.2); sb.rotation.y = .1; scene.add(sb);
      for (let i = 0; i < 5; i++) { const b = H.barrel(i % 2 ? '#4a4e57' : '#5a3a30'); b.position.set(-20 + r() * 40, 0, edge()); b.rotation.z = r() < .3 ? Math.PI / 2 : 0; scene.add(b); }
      for (let i = 0; i < 4; i++) { const c = H.crater(.6 + r() * .4, '#5e6a78'); c.position.set(-22 + r() * 44, 0, (r() - .5) * .6); scene.add(c); }   // Krater in der Panzerspur
      const wreck = H.truck('#3b3f46'); wreck.position.set(-3, 0, -7.2); wreck.rotation.set(0, 2.9, .12); scene.add(wreck);
      for (let i = 0; i < 3; i++) { const c = H.crate(.7 + r() * .4, '#5a4a3a'); c.position.set(-2 + r() * 10, 0, 5.6 + r() * 1.2); c.rotation.y = r() * 3; scene.add(c); }
    }

    return {
      update(t, p) {
        // Laufen nach Strecke: Schrittfrequenz passt zum Tempo, keine gleitenden Füße; Getroffene fallen und bleiben liegen
        // Schützen zielen auf ihr aktuelles Ziel: Oberkörper dreht sich dorthin (max. ±0,5 rad), Gewehr zeigt genau darauf
        for (const sh of shooters) {
          const shot = sh.shots.find(q => q.ts + .16 > t) || sh.shots[sh.shots.length - 1];
          const tg = shot && shotTarget(sh, shot, Math.min(t, shot.ts + .12));
          if (tg) {
            const x = posAt(sh, t), yaw = H.clamp(Math.atan2(-(tg.z - sh.z), tg.x - x) - Math.PI, -.5, .5);
            sh.f.rotation.y = Math.PI + ((yaw + Math.PI) % (2 * Math.PI) - Math.PI);
            sh.f.userData.aim = tg;
          }
        }
        for (const g of [...germans, ...soviets]) {
          g.f.position.set(posAt(g, t), 0, g.z);
          if (g.tDie !== undefined && t >= g.tDie) g.f.userData.pose('Dying_Falling_Forward', (t - g.tDie) * 1.1);
          else g.f.userData.walkDist((t - 0) * g.v * p.speed, g.amp);
        }
        // Schüsse der Roten Armee
        const tmp = new THREE.Vector3(), dir = new THREE.Vector3();
        for (const sh of shooters) {
          sh.flash.visible = sh.tracer.visible = false;
          const shot = sh.shots.find(q => t >= q.ts && t < q.ts + .16);
          if (!shot) continue;
          const age = t - shot.ts, from = sh.f.userData.muzzle ? sh.f.userData.muzzle(tmp).clone() : sh.f.position.clone().setY(1.3);
          from.x += (t - shot.ts) * sh.v * p.speed;                                       // Mündung zum Schusszeitpunkt
          const to = shotTarget(sh, shot, shot.ts + .12); if (!to) continue;
          if (age < .06) { sh.flash.visible = true; sh.flash.position.copy(from); sh.flash.material.opacity = 1 - age / .06; }
          const u = age / .12; if (u < 1) { dir.copy(to).sub(from); sh.tracer.visible = true; sh.tracer.position.copy(from).addScaledVector(dir, u); sh.tracer.lookAt(to); }
        }
        // Panzer: Fahrt, Laufrollen drehen, obere Kettenglieder laufen nach hinten, Wanne nickt, Turm schwenkt, Rückstoß
        for (const tk of tanks) {
          const d = t * 2.2 * p.speed;
          tk.tk.position.set(tk.x0 - d, 0, tk.z);
          tk.hull.rotation.z = Math.sin(t * 7) * .008;
          for (const w of tk.wheels) w.rotation.y = -d / .36;
          tk.links.forEach((l, k) => { l.position.x = 2.4 - (((k % 14) * .35 + d) % 4.9); });
          tk.tk.updateMatrixWorld(true);
          const yawTo = q => { const lp = tk.tk.worldToLocal(q.at.clone()); return H.clamp(Math.atan2(-lp.z, lp.x), -.18, .18); };   // Rohr ragt nie in die Laufbahnen
          const iNext = tk.shots.findIndex(q => q.ts > t - .4);
          let yaw = 0;
          if (tk.shots.length) {
            if (iNext < 0) yaw = yawTo(tk.shots[tk.shots.length - 1]);
            else if (iNext === 0) yaw = yawTo(tk.shots[0]) * H.smooth(H.span(t, tk.shots[0].ts - 1.2, tk.shots[0].ts - .3));
            else { const a = tk.shots[iNext - 1], b = tk.shots[iNext]; yaw = H.lerp(yawTo(a), yawTo(b), H.smooth(H.span(t, a.ts + .4, b.ts - .3))); }
          }
          tk.pivot.rotation.y = yaw;
          const last = [...tk.shots].reverse().find(q => q.ts <= t), age = last ? t - last.ts : 9;
          tk.barrel.position.x = 1.05 - .4 * Math.max(0, 1 - age / .35);
          tk.muzzle.visible = age < .1;
          if (tk.muzzle.visible) { tk.tip.getWorldPosition(tk.muzzle.position); tk.muzzle.material.opacity = 1 - age / .1; }
        }
        for (const b of booms) b.b.userData.at(t - b.t0);
        if (flakes) flakes.userData.drift(t, [.6, -1.8, 0], .6);
        for (const s of smokes) s.userData.at(t, .6);
        for (const f of fires) f.userData.at(t);
      }
    };
  }
};
