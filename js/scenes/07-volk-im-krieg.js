import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

// Rüstungsfabrik (Stil wie Szene 1, aber heller Innenraum): Granaten liegen auf einem laufenden Band, dahinter
// arbeiten Frauen, Männer und Jugendliche, im hinteren Gang werden Kisten getragen (feste Bahnen, kein Durchlaufen).
// Hängelampen werfen warme Lichtkegel, Funken an der Schweißstelle. Die Kamera fährt nah am Band entlang.
export default {
  id: 'volk-im-krieg', title: 'Volk im Krieg', seed: 17, duration: 9,
  script: 'Das ganze Leben des deutschen Volkes soll dem Krieg gewidmet werden, auch das von Zivilisten und Jugendlichen.',
  caption: { title: 'Alles für den Krieg', sub: 'Rüstungsproduktion' },
  params: {
    workers: { type: 'number', min: 2, max: 14, step: 1, value: 8, label: 'Arbeiter am Band' },
    carriers: { type: 'number', min: 0, max: 8, step: 1, value: 4, label: 'Träger im Gang' },
    youthShare: { type: 'number', min: 0, max: 1, step: .05, value: .35, label: 'Anteil Jugendliche' },
    shells: { type: 'number', min: 4, max: 60, step: 1, value: 34, label: 'Granaten auf dem Band' },
    beltSpeed: { type: 'number', min: 0, max: 3, step: .05, value: .8, label: 'Bandtempo (m/s)' },
    sparks: { type: 'number', min: 0, max: 400, step: 20, value: 120, label: 'Funken' },
    brightness: { type: 'number', min: .3, max: 2.5, step: .05, value: 1.7, label: 'Helligkeit' },
    wallColor: { type: 'color', value: '#857e70', label: 'Wand' },
    floorColor: { type: 'color', value: '#4c4a45', label: 'Boden' },
    windowColor: { type: 'color', value: '#f0d9a0', label: 'Fensterlicht' },
    workerGlow: { type: 'color', value: '#dfe6f0', label: 'Leuchtfarbe Arbeiter' },
    ...H.cameraParams([-7, 4.0, 6.6], [5, 4.0, 6.6], [1.2, -2.2, -8], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    const L = p.brightness;
    H.sky(scene, '#1a1d24', 26, 70);
    H.lights(scene, { sun: [-6, 14, 10], intensity: .9 * L, hemi: .85 * L, shadows, skyColor: '#f0e2c4', groundColor: '#3a3630', shadowSize: 30 });
    scene.add(H.ground(120, p.floorColor));
    // Halle: Rückwand mit hohen Fenstern, Stützen, Dachträger
    const wall = H.box(70, 14, 1, p.wallColor); wall.position.set(0, 7, -10); scene.add(wall);
    for (let i = 0; i < 11; i++) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.windowColor).multiplyScalar(1.1) }));
      w.position.set(-30 + i * 6, 8.6, -9.45); scene.add(w);
      for (let k = 0; k < 3; k++) { const bar = H.box(3.3, .1, .05, '#2a2a2a'); bar.position.set(-30 + i * 6, 6.9 + k * 1.15, -9.4); bar.castShadow = false; scene.add(bar); }
    }
    for (let i = 0; i < 8; i++) { const beam = H.box(.5, .6, 24, '#3a3833'); beam.position.set(-28 + i * 8, 13.2, -1); scene.add(beam); }
    for (let i = 0; i < 6; i++) { const col = H.box(.5, 14, .5, '#57544c'); col.position.set(-25 + i * 10, 7, -7.2); scene.add(col); }
    // Hängelampen mit Lichtkegel
    for (let i = 0; i < 7; i++) {
      const x = -18 + i * 6;
      const shade = H.cone(.7, .5, '#2b2d31', 12); shade.rotation.x = Math.PI; shade.position.set(x, 7.6, -.6); scene.add(shade);
      const cord = H.cyl(.02, .02, 7, '#222', 4); cord.position.set(x, 10.5, -.6); scene.add(cord);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), H.glowMat('#ffe2a8', 2.4)); bulb.position.set(x, 7.3, -.6); scene.add(bulb);
      H.lightPool(scene, { x, z: -.6, radius: 3.6, height: 7.3, intensity: 80 * L, color: '#ffe2b0', penumbra: .8 });
    }
    // Maschinen an der Wand, Räder drehen sich
    const wheels = [];
    for (let i = 0; i < 6; i++) {
      const x = -22 + i * 9;
      const m = H.box(3, 2.6, 2, '#5c6670'); m.position.set(x, 1.3, -6.6); scene.add(m);
      const w = H.cyl(.9, .9, .3, '#2b2f36', 16); w.rotation.x = Math.PI / 2; w.position.set(x + .6, 2.0, -5.5); scene.add(w); wheels.push(w);
      const pipe = H.cyl(.28, .28, 6, '#5c6670', 10); pipe.position.set(x - .8, 5.6, -6.6); scene.add(pipe);
    }
    // Fließband mit Rollen und liegenden Granaten (Messing, Spitze in Laufrichtung)
    const belt = H.box(70, .16, 1.4, '#1f2125'); belt.position.set(0, 1.0, 0); scene.add(belt);
    const rail = H.box(70, .12, .1, '#4a4e57'); rail.position.set(0, 1.12, .72); scene.add(rail); const rail2 = rail.clone(); rail2.position.z = -.72; scene.add(rail2);
    for (let i = 0; i < 14; i++) { const leg = H.box(.2, 1.0, 1.2, '#2b2f36'); leg.position.set(-32 + i * 5, .5, 0); scene.add(leg); }
    const brass = new THREE.MeshLambertMaterial({ color: '#b8923e' }), tipMat = new THREE.MeshLambertMaterial({ color: '#6b6b6b' });
    const shells = [];
    for (let i = 0; i < p.shells; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .42, 10), brass); body.rotation.z = Math.PI / 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(.11, .2, 10), tipMat); tip.rotation.z = -Math.PI / 2; tip.position.x = .31;
      body.castShadow = tip.castShadow = true; g.add(body, tip); scene.add(g);
      shells.push({ g, off: i * (40 / p.shells) + r() * .3, z: (r() - .5) * .5 });
    }
    // Arbeiter hinter dem Band (Blick zur Kamera): hämmern, prüfen
    const POSES = ['Banging_Fist_On_Table', 'Thinking_While_Standing', 'Banging_Fist_On_Table', 'Standing_Idle', 'Banging_Fist_On_Table'];   // Hämmern am Band, prüfen
    const workers = [];
    for (let i = 0; i < p.workers; i++) {
      const youth = r() < p.youthShare;
      const f = H.figure({ color: '#e8e3d8', scale: youth ? .8 : 1, glow: p.workerGlow, strength: 1.25, model: youth ? 'civil' : (i % 2 ? 'worker' : 'civil'), pose: POSES[i % POSES.length], loopPose: true, seed: i * 5 + 3 });
      f.position.set(-12 + i * (26 / p.workers) + r() * .8, 0, -1.75); f.rotation.y = -Math.PI / 2; scene.add(f);   // Gesicht zur Kamera (+Z)
      workers.push({ f, ph: r() * 6, pose: POSES[i % POSES.length] });
    }
    // Träger im hinteren Gang auf zwei Bahnen (gegenläufig, nie auf derselben Bahn)
    const carriers = [];
    for (let i = 0; i < p.carriers; i++) {
      const dir = i % 2 ? 1 : -1, z = dir > 0 ? -3.1 : -4.0;
      const f = H.figure({ color: '#e8e3d8', scale: r() < p.youthShare ? .8 : 1, glow: p.workerGlow, strength: 1.2, model: 'worker', clips: { idle: 'Standing_Idle_Loop', walk: 'Carrying_A_Box', run: 'Carrying_A_Box' }, seed: 40 + i * 7 });
      f.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(f);
      const box = H.crate(.42, '#6a5844'); box.position.set(.38, .82, 0); f.add(box);   // Kiste in den Armen
      carriers.push({ f, dir, z, x0: -20 + i * 11 + r() * 3, v: .9 + r() * .2 });
    }
    // Kistenstapel und Fässer am Rand
    for (let i = 0; i < 8; i++) { const c = H.crate(.7 + r() * .4, '#6a5844'); c.position.set(-26 + i * 7 + r() * 2, 0, 3.2 + r() * .8); c.rotation.y = r() * 3; scene.add(c); }
    for (let i = 0; i < 6; i++) { const b = H.barrel('#4a4e57'); b.position.set(-24 + i * 9, 0, -8.6); scene.add(b); }
    // Schweißstelle mit Funken
    const sparks = p.sparks > 0 ? H.particles(r, { count: p.sparks, area: [1.2, 1.2, .8], color: '#ffc46a', size: .045, opacity: .95 }) : null;
    if (sparks) { sparks.position.set(2.5, 1.6, -.2); scene.add(sparks); }
    const weld = new THREE.PointLight('#9fc3ff', 0, 8, 1.6); weld.position.set(2.5, 1.6, -.4); scene.add(weld);

    return {
      update(t, p) {
        for (const s of shells) s.g.position.set(((s.off + t * p.beltSpeed) % 40) - 20, 1.2, s.z);
        for (const w of wheels) w.rotation.z = -t * 2;
        for (const w of workers) w.f.userData.pose(w.pose, t + w.ph);
        for (const c of carriers) {
          const d = t * c.v, x = c.x0 + c.dir * d;
          c.f.position.set(((x + 24) % 48 + 48) % 48 - 24, 0, c.z);   // Gang ist 48 m lang, wer hinten rausläuft, kommt vorne wieder
          c.f.userData.walkDist(d, 1);
        }
        if (sparks) sparks.userData.drift(t, [0, -2.5, 0], .3);
        weld.intensity = 6 * L * (.5 + .5 * Math.abs(Math.sin(t * 23) * Math.sin(t * 7.3)));
      },
      camera(t, cam, p) {
        const u = H.easeInOut(t / p.duration);
        cam.position.set(H.lerp(p.camFromX, p.camToX, u), H.lerp(p.camFromY, p.camToY, u), H.lerp(p.camFromZ, p.camToZ, u));
        cam.lookAt(cam.position.x + p.lookX, cam.position.y + p.lookY, cam.position.z + p.lookZ);  // Blick relativ zur Kamera
      }
    };
  }
};
