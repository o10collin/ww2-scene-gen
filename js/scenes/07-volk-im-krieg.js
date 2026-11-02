import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'volk-im-krieg', title: 'Volk im Krieg', seed: 17, duration: 9,
  script: 'Das ganze Leben des deutschen Volkes soll dem Krieg gewidmet werden, auch das von Zivilisten und Jugendlichen.',
  caption: { title: 'Alles für den Krieg', sub: 'Rüstungsproduktion' },
  params: {
    workers: { type: 'number', min: 2, max: 16, step: 1, value: 9, label: 'Arbeiter' },
    youthShare: { type: 'number', min: 0, max: 1, step: .05, value: .4, label: 'Anteil Jugendliche' },
    shells: { type: 'number', min: 2, max: 30, step: 1, value: 14, label: 'Granaten' },
    beltSpeed: { type: 'number', min: 0, max: 4, step: .1, value: 1.2, label: 'Bandtempo' },
    sparks: { type: 'number', min: 0, max: 600, step: 20, value: 220, label: 'Funken' },
    wallColor: { type: 'color', value: '#5d5a52', label: 'Wand' },
    floorColor: { type: 'color', value: '#3b3a37', label: 'Boden' },
    windowColor: { type: 'color', value: '#d9c184', label: 'Fensterlicht' },
    ...H.cameraParams([-8, 3.6, 9.5], [6, 3.6, 9.5], [1.5, -1.6, -8], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, '#0e1116', 30, 90);
    H.lights(scene, { sun: [-6, 14, 10], intensity: .9, hemi: .6, shadows, skyColor: '#ddd0b0', groundColor: '#222', shadowSize: 30 });
    scene.add(H.ground(120, p.floorColor));
    const wall = H.box(60, 14, 1, p.wallColor); wall.position.set(0, 7, -8); scene.add(wall);
    for (let i = 0; i < 9; i++) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshBasicMaterial({ color: p.windowColor }));
      w.position.set(-24 + i * 6, 8, -7.45); scene.add(w);
      for (let k = 0; k < 2; k++) { const bar = H.box(3.1, .12, .05, P.black); bar.position.set(-24 + i * 6, 6.7 + k * 1.3, -7.4); bar.castShadow = false; scene.add(bar); }
    }
    for (let i = 0; i < 6; i++) { const beam = H.box(.5, .5, 20, '#2b2a28'); beam.position.set(-25 + i * 10, 13.5, 0); scene.add(beam); }
    for (let i = 0; i < 4; i++) { const col = H.box(.6, 14, .6, '#4a4845'); col.position.set(-22 + i * 14, 7, -3); scene.add(col); }
    // Fließband
    const belt = H.box(60, .2, 1.6, P.black); belt.position.set(0, 1.1, 0); scene.add(belt);
    for (let i = 0; i < 12; i++) { const leg = H.box(.3, 1.0, 1.4, P.darkGrey); leg.position.set(-27 + i * 5, .5, 0); scene.add(leg); }
    const shells = [];
    for (let i = 0; i < p.shells; i++) {
      const g = new THREE.Group();
      const body = H.cyl(.18, .18, .7, '#8a7f55', 10); body.position.y = .35;
      const tip = H.cone(.18, .3, '#6e6646', 10); tip.position.y = .85;
      g.add(body, tip); scene.add(g); shells.push({ g, off: i * (60 / p.shells) });
    }
    // Maschinen hinter dem Band
    const wheels = [];
    for (let i = 0; i < 5; i++) {
      const m = H.box(3, 2.4, 2, '#56606a'); m.position.set(-20 + i * 10, 1.2, -4.5); scene.add(m);
      const w = H.cyl(.9, .9, .3, P.darkGrey, 16); w.rotation.x = Math.PI / 2; w.position.set(-20 + i * 10, 2.2, -3.3); scene.add(w); wheels.push(w);
      const pipe = H.cyl(.3, .3, 6, '#56606a', 10); pipe.position.set(-20 + i * 10, 5.4, -4.5); scene.add(pipe);
    }
    // Arbeiter: Erwachsene und Jugendliche (kleiner)
    const workers = [];
    const civ = ['#6b5b4a', '#4e5f7a', '#7a6e5a', '#5a6a5c', '#8a7a6a'];
    for (let i = 0; i < p.workers; i++) {
      const youth = r() < p.youthShare;
      const f = H.figure({ color: civ[i % civ.length], scale: youth ? .72 : 1, glow: H.ROLE.civil, strength: 1.3, model: youth ? 'civil' : 'worker', pose: 'PickUp', loopPose: true, seed: i + 3 });
      const side = i % 2 ? 1 : -1;
      f.position.set(-12 + i * (24 / p.workers) + r(), 0, side * 1.7);
      f.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(f); workers.push({ f, arms: [f.userData.armL, f.userData.armR], ph: r() * 6, sp: 2.5 + r() * 2 });
    }
    const craneBeam = H.box(60, .6, .8, '#3a3d44'); craneBeam.position.set(0, 11.5, 2); scene.add(craneBeam);
    const trolley = H.box(1.4, .8, 1.2, '#2f3238'); trolley.position.set(0, 10.9, 2); scene.add(trolley);
    const chain = H.cyl(.03, .03, 5, '#8a8f98', 4); chain.position.set(0, 8, 2); scene.add(chain);
    const hook = H.mesh(new THREE.TorusGeometry(.3, .07, 6, 12, Math.PI * 1.3), '#8a8f98'); hook.position.set(0, 5.3, 2); scene.add(hook);
    for (let i = 0; i < 8; i++) { const c = H.crate(.7 + r() * .5, '#5a4a3a'); c.position.set(-26 + i * 7 + r() * 2, 0, 5 + r() * 2); c.rotation.y = r() * 3; scene.add(c); if (r() < .5) { const c2 = H.crate(.6, '#5a4a3a'); c2.position.set(c.position.x, c.geometry ? 0 : .7 + r() * .5, c.position.z); c2.rotation.y = r() * 3; scene.add(c2); } }
    for (let i = 0; i < 6; i++) { const b = H.barrel('#4a4e57'); b.position.set(-24 + i * 9, 0, -6.5); scene.add(b); }
    const sparks = p.sparks > 0 ? H.particles(r, { count: p.sparks, area: [40, 4, 6], color: '#ffc46a', size: .08, opacity: .9 }) : null;
    if (sparks) { sparks.position.set(0, 1.5, -3.5); scene.add(sparks); }

    return {
      update(t, p) {
        for (const s of shells) { s.g.position.set(((s.off + t * p.beltSpeed * 3) % 60) - 30, 1.2, 0); }
        for (const w of wheels) w.rotation.z = t * 2;
        if (sparks) sparks.userData.drift(t, [0, -2.5, 0], .3);
        trolley.position.x = Math.sin(t * .25) * 18; chain.position.x = hook.position.x = trolley.position.x;
        for (const w of workers) {
          const a = Math.sin(t * w.sp + w.ph);
          w.arms[0].rotation.z = -1.1 + a * .35; w.arms[1].rotation.z = -1.1 - a * .35;
          w.f.position.y = Math.abs(a) * .02;
        }
      },
      camera(t, cam, p) {
        const u = H.easeInOut(t / p.duration);
        cam.position.set(H.lerp(p.camFromX, p.camToX, u), H.lerp(p.camFromY, p.camToY, u), H.lerp(p.camFromZ, p.camToZ, u));
        cam.lookAt(cam.position.x + p.lookX, cam.position.y + p.lookY, cam.position.z + p.lookZ);  // Blick relativ zur Kamera
      }
    };
  }
};
