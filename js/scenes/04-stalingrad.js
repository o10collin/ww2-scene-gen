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
    sovietGlowColor: { type: 'color', value: '#8a5c08', label: 'Rote Armee Leuchtfarbe (dunkleres Gelb)' },
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
    // Laufbahnen: je Seite 4 Bahnen; wer auf derselben Bahn läuft, hat dasselbe Tempo -> kein Überholen.
    // Deutsche nutzen alle Bahnen, die Rote Armee nur die inneren (1–6): die beiden Gefallenen liegen auf den
    // äußeren Bahnen, dort läuft niemand mehr hinterher.
    const LANES = [-4.5, -3.6, -2.7, -1.8, 1.8, 2.7, 3.6, 4.5];
    const laneSpeed = LANES.map(() => 2.7 + r() * .7);                                    // m/s je Bahn
    const soviet = p.sovietGlowColor;
    const runner = (lane, row, clip, color, helmet, glow, xBase, seed) => {
      const f = H.figure({ color, helmet, glow, clips: { idle: 'Rifle_Idle', walk: clip, run: clip }, seed, weapon: true });
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

    // Panzer: Turm schwenkt auf die Ziele, Rückstoß und Mündungsfeuer beim Schuss, Kettenglieder laufen mit,
    // Wanne nickt leicht; die Granaten schlagen an den Ruinen ein (die Explosionen)
    const tanks = [];
    for (let i = 0; i < p.tanks; i++) {
      const tk = H.tank('#7d4a42', p.glow ? soviet : null); tk.rotation.y = Math.PI; scene.add(tk);
      const [hull, trL, trR, turret, barrel] = tk.children;
      const pivot = new THREE.Group(); pivot.position.copy(turret.position); tk.add(pivot);
      pivot.attach(turret); pivot.attach(barrel);
      const barrelX = barrel.position.x;
      const linkMat = new THREE.MeshLambertMaterial({ color: '#3a3d44' }), links = [];
      for (const side of [-1, 1]) for (let k = 0; k < 10; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(.08, .04, .42), linkMat); l.position.set(0, .56, side * .75); tk.add(l); links.push(l); }
      const muzzle = mkFlash(1.4);
      tanks.push({ tk, pivot, barrel, barrelX, links, muzzle, hull, x0: 22 + i * 9, z: 0, shots: [] });
    }
    // Granateinschläge an den Ruinen weit vor dem schießenden Panzer (flacher Winkel: das Rohr ragt nie in die Laufbahnen)
    const booms = [];
    for (let i = 0; i < 4; i++) {
      const t0 = 1.6 + i * 1.7 + r() * .4, tk = tanks[i % Math.max(1, tanks.length)];
      const xTank = tk ? tk.x0 - (t0 - .25) * 2.2 * p.speed : 0;
      const b = H.explosion({ size: 1.4, color: P.orange, smoke: '#555' });
      b.position.set(xTank - 14 - r() * 5, .5, (r() < .5 ? -1 : 1) * (6.5 + r() * 1.5)); scene.add(b);
      booms.push({ b, t0 });
      if (tk) tk.shots.push({ ts: t0 - .25, at: b.position.clone() });
    }
    const flakes = p.snow > 0 ? H.particles(r, { count: p.snow, area: [60, 20, 40], color: '#ffffff', size: .14 }) : null;
    if (flakes) scene.add(flakes);
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
        // Laufen nach Strecke: Schrittfrequenz passt zum Tempo, keine gleitenden Füße; Getroffene fallen und bleiben liegen
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
        // Panzer
        for (const tk of tanks) {
          const d = t * 2.2 * p.speed;
          tk.tk.position.set(tk.x0 - d, 0, tk.z);
          tk.hull.rotation.z = Math.sin(t * 7 + tk.x0) * .012;
          tk.links.forEach((l, k) => { l.position.x = 1.35 - (((k % 10) * .28 + d) % 2.8); });   // Kettenglieder oben laufen nach hinten
          // Turm: zwischen zwei Zielen weich umschwenken (rein aus t berechnet, damit Export und Scrubben gleich sind)
          tk.tk.updateMatrixWorld(true);
          const yawTo = q => { const lp = tk.tk.worldToLocal(q.at.clone()); return H.clamp(Math.atan2(-lp.z, lp.x), -.5, .5); };
          const iNext = tk.shots.findIndex(q => q.ts > t - .4);
          let yaw = 0;
          if (tk.shots.length) {
            if (iNext < 0) yaw = yawTo(tk.shots[tk.shots.length - 1]);
            else if (iNext === 0) yaw = yawTo(tk.shots[0]) * H.smooth(H.span(t, tk.shots[0].ts - 1.2, tk.shots[0].ts - .3));
            else { const a = tk.shots[iNext - 1], b = tk.shots[iNext]; yaw = H.lerp(yawTo(a), yawTo(b), H.smooth(H.span(t, a.ts + .4, b.ts - .3))); }
          }
          tk.pivot.rotation.y = yaw;
          const last = [...tk.shots].reverse().find(q => q.ts <= t), age = last ? t - last.ts : 9;
          tk.barrel.position.x = tk.barrelX - .35 * Math.max(0, 1 - age / .35);
          tk.muzzle.visible = age < .1;
          if (tk.muzzle.visible) { tk.barrel.updateMatrixWorld(true); tk.muzzle.position.set(0, .95, 0).applyMatrix4(tk.barrel.matrixWorld); tk.muzzle.material.opacity = 1 - age / .1; }
        }
        for (const b of booms) b.b.userData.at(t - b.t0);
        if (flakes) flakes.userData.drift(t, [.6, -1.8, 0], .6);
        for (const s of smokes) s.userData.at(t, .6);
      }
    };
  }
};
