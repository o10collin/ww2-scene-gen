import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'zerstoerte-wohngebiete', title: 'Zerstörte Wohngebiete', seed: 19, duration: 8,
  script: 'Viele Wohngebiete werden zerstört und zahlreiche Zivilisten sterben.',
  caption: { title: 'Der Morgen danach', sub: 'Zivile Opfer' },
  params: {
    ruins: { type: 'number', min: 4, max: 40, step: 1, value: 18, label: 'Ruinen' },
    civilians: { type: 'number', min: 0, max: 20, step: 1, value: 6, label: 'Zivilisten' },
    smoke: { type: 'number', min: 0, max: 12, step: 1, value: 5, label: 'Rauchsäulen' },
    dust: { type: 'number', min: 0, max: 2000, step: 50, value: 500, label: 'Staub' },
    skyColor: { type: 'color', value: '#161a21', label: 'Himmel' },
    groundColor: { type: 'color', value: '#5d6670', label: 'Boden' },
    ruinColor: { type: 'color', value: '#4a5059', label: 'Ruinen' },
    ...H.cameraParams([-14, 12, 12], [-6, 10, 9], [2, 0, -1], 42)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 18, 70);
    H.lights(scene, { sun: [6, 12, 8], intensity: .5, hemi: .5, shadows, skyColor: '#8fa3bb', groundColor: '#223', shadowSize: 40 });
    H.lightPool(scene, { x: -2, z: 0, radius: 14, height: 28, intensity: 320 });
    scene.add(H.ground(200, p.groundColor));
    const cols = [p.ruinColor, '#7a6e64', '#9a8e80', '#5f5750'];
    const smokes = [];
    for (let i = 0; i < p.ruins; i++) {
      const side = i % 2 ? 1 : -1;
      const w = 4 + r() * 5, h = 3 + r() * 6, d = 3 + r() * 3;
      const ru = H.ruin(w, h, d, cols[i % cols.length], r);
      ru.position.set(-40 + (i >> 1) * 9 + r() * 2, 0, side * (7 + r() * 4)); ru.rotation.y = side > 0 ? Math.PI : 0;
      scene.add(ru);
      if (smokes.length < p.smoke && r() < .5) { const s = H.smokeColumn(r, { height: 14, width: 1.6, color: '#4a4744' }); s.position.set(ru.position.x, h * .4, ru.position.z); scene.add(s); smokes.push(s); }
    }
    for (let i = 0; i < 60; i++) {
      const b = H.box(.3 + r() * 1.2, .2 + r() * .6, .3 + r() * 1.2, cols[i % cols.length]);
      b.position.set(-36 + r() * 70, .15, -6 + r() * 12); b.rotation.y = r() * 3; scene.add(b);
    }
    // ein paar Balken, ein Karren
    for (let i = 0; i < 8; i++) { const b = H.box(4, .25, .25, P.brown); b.position.set(-30 + r() * 60, .3 + r() * 1.5, -5 + r() * 10); b.rotation.set(r() * .6, r() * 3, r() * .5); scene.add(b); }
    const cart = new THREE.Group();
    const bed = H.box(1.8, .3, 1, P.brown); bed.position.y = .7; cart.add(bed);
    for (const z of [-.55, .55]) { const w = H.cyl(.45, .45, .1, P.darkGrey, 12); w.rotation.x = Math.PI / 2; w.position.set(0, .45, z); cart.add(w); }
    cart.position.set(-4, 0, 3); scene.add(cart);
    const civ = ['#6b5b4a', '#4e5f7a', '#7a6e5a', '#5a6a5c', '#3d3a3f', '#8a7a6a'];
    const people = [];
    for (let i = 0; i < p.civilians; i++) {
      const f = H.figure({ color: civ[i % civ.length], scale: r() < .25 ? .7 : 1, glow: H.ROLE.civil, strength: 1.3, model: 'civil', seed: i + 5, pose: i < 2 ? 'Death' : (i === 2 ? 'Defeat' : null) });
      const walking = i > 2 && r() < .6;
      f.position.set(-20 + r() * 36, 0, -4 + r() * 8); f.rotation.y = walking ? Math.PI : r() * 6.28;
      scene.add(f); people.push({ f, walking, ph: r() * 6, x0: f.position.x });
    }
    const dust = p.dust > 0 ? H.particles(r, { count: p.dust, area: [60, 10, 30], color: '#d8d2c6', size: .1, opacity: .35 }) : null;
    if (dust) scene.add(dust);
    for (let i = 0; i < 4; i++) { const l = H.streetLamp(4, { lit: false }); l.position.set(-30 + i * 14, 0, 5.2); l.rotation.z = (r() - .5) * .5; scene.add(l); }
    for (let i = 0; i < 3; i++) { const c = H.crater(1.4 + r() * 1.6, '#3f464f'); c.position.set(-24 + i * 16 + r() * 6, 0, -3 + r() * 6); scene.add(c); }
    const wreck = H.truck('#3b3f46'); wreck.position.set(6, 0, 3); wreck.rotation.set(.08, -2.1, 0); scene.add(wreck);
    const fz = H.fence(10, { posts: 5, wires: 2, barbed: false }); fz.position.set(-12, 0, -5.5); fz.rotation.y = .2; scene.add(fz);
    for (let i = 0; i < 4; i++) { const b = H.barrel('#4a4e57'); b.position.set(-16 + r() * 30, 0, -4 + r() * 8); b.rotation.z = r() < .5 ? Math.PI / 2 : 0; b.rotation.y = r() * 3; scene.add(b); }

    return {
      update(t) {
        for (const s of smokes) s.userData.at(t, .8);
        for (const pe of people) if (pe.walking) { pe.f.position.x = pe.x0 - t * .4; pe.f.userData.walk(t * .6 + pe.ph, .6); }
        if (dust) dust.userData.drift(t, [.5, .15, 0], .4);
      }
    };
  }
};
