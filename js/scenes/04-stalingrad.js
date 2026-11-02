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
    snow: { type: 'number', min: 0, max: 4000, step: 100, value: 1800, label: 'Schneeflocken' },
    speed: { type: 'number', min: 0, max: 4, step: .1, value: 1.3, label: 'Vorrücktempo' },
    skyColor: { type: 'color', value: '#8f98a3', label: 'Himmel' },
    snowColor: { type: 'color', value: '#e4e8ec', label: 'Schnee' },
    germanColor: { type: 'color', value: '#6f7480', label: 'Deutsche' },
    sovietColor: { type: 'color', value: '#9c3f36', label: 'Rote Armee' },
    ...H.cameraParams([-16, 4.5, 5.5], [-6, 4, 5], [8, 1.5, -1.5], 42)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 14, 60);
    H.lights(scene, { sun: [-6, 12, 8], intensity: 1.1, hemi: 1, shadows, skyColor: p.skyColor, groundColor: '#556', shadowSize: 40 });
    scene.add(H.ground(200, p.snowColor));
    // Straße mit Ruinen links und rechts
    for (let i = 0; i < p.ruins; i++) {
      const side = i % 2 ? 1 : -1;
      const w = 4 + r() * 4, h = 4 + r() * 7, d = 3 + r() * 3;
      const ru = H.ruin(w, h, d, [P.grey, P.darkGrey, '#a09a90', '#7d6f63'][i % 4], r);
      ru.position.set(-36 + (i >> 1) * 11 + r() * 3, 0, side * (8 + r() * 5));
      ru.rotation.y = side > 0 ? Math.PI : 0;
      scene.add(ru);
      if (r() < .4) { const s = H.smokeColumn(r, { height: 9, width: 1 }); s.position.set(ru.position.x, h * .5, ru.position.z); scene.add(s); ru.userData.smoke = s; }
    }
    const smokes = []; scene.traverse(o => { if (o.userData.smoke) smokes.push(o.userData.smoke); });
    // Trümmer auf der Straße
    for (let i = 0; i < 30; i++) {
      const b = H.box(.4 + r(), .3 + r() * .5, .4 + r(), r() < .5 ? P.darkGrey : '#b9b4ab');
      b.position.set(-30 + r() * 60, .2, -5 + r() * 10); b.rotation.y = r() * 3; scene.add(b);
    }
    // Deutsche weichen nach -X zurück
    const germans = [];
    for (let i = 0; i < p.germans; i++) {
      const f = H.figure({ color: p.germanColor, helmet: '#555a63' });
      f.rotation.y = Math.PI; scene.add(f);
      germans.push({ f, x0: -2 + r() * 8, z: -4 + r() * 8, ph: r() * 6 });
    }
    // Rote Armee rückt aus +X vor
    const soviets = [];
    for (let i = 0; i < p.soviets; i++) {
      const f = H.figure({ color: p.sovietColor, helmet: '#5b3a35' });
      scene.add(f); soviets.push({ f, x0: 18 + r() * 12, z: -4 + r() * 8, ph: r() * 6 });
    }
    const tanks = [];
    for (let i = 0; i < p.tanks; i++) {
      const tk = H.tank('#7d4a42'); tk.rotation.y = Math.PI; scene.add(tk);
      tanks.push({ tk, x0: 24 + i * 7 + r() * 3, z: -3 + i * 3 });
    }
    const flakes = p.snow > 0 ? H.particles(r, { count: p.snow, area: [60, 20, 40], color: '#ffffff', size: .14 }) : null;
    if (flakes) scene.add(flakes);
    const booms = [];
    for (let i = 0; i < 4; i++) { const b = H.explosion({ size: 1.4, color: P.orange, smoke: '#555' }); b.position.set(-10 + r() * 22, .5, -4 + r() * 8); scene.add(b); booms.push({ b, t0: 1 + r() * 7 }); }
    return {
      update(t, p) {
        for (const g of germans) { g.f.position.set(g.x0 - t * p.speed * .8, 0, g.z); g.f.userData.walk(t + g.ph, .9); }
        for (const s of soviets) { s.f.position.set(s.x0 - t * p.speed, 0, s.z); s.f.userData.walk(t + s.ph, 1); }
        for (const tk of tanks) tk.tk.position.set(tk.x0 - t * p.speed * .9, 0, tk.z);
        if (flakes) flakes.userData.drift(t, [.6, -1.8, 0], .6);
        for (const s of smokes) s.userData.at(t, .6);
        for (const b of booms) b.b.userData.at(t - b.t0);
      }
    };
  }
};
