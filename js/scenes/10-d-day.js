import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'd-day', title: 'D-Day in der Normandie', seed: 20, duration: 9,
  script: 'Im Juni 1944 landen die Westalliierten in der Normandie.',
  caption: { title: 'Landung in der Normandie', sub: '6. Juni 1944' },
  params: {
    crafts: { type: 'number', min: 1, max: 8, step: 1, value: 4, label: 'Landungsboote' },
    soldiersPer: { type: 'number', min: 1, max: 6, step: 1, value: 4, label: 'Soldaten je Boot' },
    obstacles: { type: 'number', min: 0, max: 30, step: 1, value: 12, label: 'Strandhindernisse' },
    arrive: { type: 'number', min: 1, max: 8, step: .1, value: 4, label: 'Ankunft nach (s)' },
    explosions: { type: 'number', min: 0, max: 12, step: 1, value: 5, label: 'Einschläge' },
    planes: { type: 'number', min: 0, max: 6, step: 1, value: 2, label: 'Flugzeuge' },
    skyColor: { type: 'color', value: '#aab6bf', label: 'Himmel' },
    waterColor: { type: 'color', value: '#4a6f84', label: 'Wasser' },
    sandColor: { type: 'color', value: '#cdbb93', label: 'Sand' },
    uniformColor: { type: 'color', value: '#6f7a5a', label: 'Uniform' },
    glow: { type: 'boolean', value: true, label: 'Soldaten leuchten blau' },
    ...H.cameraParams([-2, 6, 26], [6, 5, 20], [8, 1, 0], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 40, 130);
    H.lights(scene, { sun: [-8, 14, 10], intensity: 1.1, hemi: .9, shadows, skyColor: p.skyColor, groundColor: '#665', shadowSize: 50 });
    const beach = H.ground(200, p.sandColor); scene.add(beach);
    const water = H.wavePlane(80, 120, 48, p.waterColor, { amp: .18 }); water.position.set(-30, .45, 0); scene.add(water);
    const foam = H.box(.6, .05, 120, P.white); foam.castShadow = false; foam.position.set(10.2, .5, 0); scene.add(foam);
    // Klippen
    for (let i = 0; i < 8; i++) {
      const c = H.box(10, 6 + r() * 6, 14 + r() * 6, i % 2 ? '#6e7f5c' : '#8a8a78');
      c.position.set(36 + r() * 6, (6 + r() * 6) / 2, -56 + i * 16); scene.add(c);
      const top = H.box(10, .6, 14 + r() * 6, P.green); top.position.set(c.position.x, c.position.y * 2 + .3, c.position.z); scene.add(top);
    }
    for (let i = 0; i < p.obstacles; i++) {
      const g = new THREE.Group();
      for (const rz of [.8, -.8]) { const b = H.box(.15, 2.2, .15, P.darkGrey); b.rotation.z = rz; g.add(b); }
      g.position.set(12 + r() * 10, .9, -30 + r() * 60); g.rotation.y = r() * 3; scene.add(g);
    }
    const crafts = [];
    for (let i = 0; i < p.crafts; i++) {
      const c = H.landingCraft('#5d6a55'); scene.add(c);
      const soldiers = [];
      for (let k = 0; k < p.soldiersPer; k++) {
        const f = H.figure({ color: p.uniformColor, helmet: '#4d5a3e', scale: .8, glow: p.glow ? '#3b6ea5' : null });
        scene.add(f); soldiers.push({ f, lag: k * .35 + r() * .2, dz: (r() - .5) * 1.0 });
      }
      crafts.push({ c, z: -18 + i * (36 / p.crafts) + r() * 3, delay: r() * 1.2, soldiers, ph: r() * 6 });
    }
    const booms = [];
    for (let i = 0; i < p.explosions; i++) {
      const b = H.explosion({ size: 1.6, color: '#d6c39a', smoke: '#8f8468', duration: 1.3 });
      b.position.set(12 + r() * 14, .3, -25 + r() * 50); scene.add(b); booms.push({ b, t0: 1 + r() * 7 });
    }
    const planes = [];
    for (let i = 0; i < p.planes; i++) {
      const m = H.faceZ(H.aircraft('#5c6a7a', { span: 4 })); m.rotation.y = Math.PI / 2; scene.add(m);
      planes.push({ m, y: 14 + r() * 6, z: -20 + r() * 30, lag: r() * 20 });
    }
    return {
      update(t, p) {
        water.userData.at(t);
        for (const cr of crafts) {
          const u = H.easeOut(H.span(t, cr.delay, cr.delay + p.arrive));
          const x = H.lerp(-34, 8, u);
          cr.c.position.set(x, .4 + Math.sin(t * 2 + cr.ph) * .12 * (1 - u), cr.z);
          cr.c.rotation.z = Math.sin(t * 1.7 + cr.ph) * .04 * (1 - u);
          const ramp = H.easeOut(H.span(t, cr.delay + p.arrive, cr.delay + p.arrive + .6));
          cr.c.userData.ramp.rotation.z = ramp * 1.3; cr.c.userData.ramp.position.x = 1.6 + ramp * .6;
          cr.soldiers.forEach((s, k) => {
            const run = H.span(t, cr.delay + p.arrive + .5 + s.lag, cr.delay + p.arrive + .5 + s.lag + 3.5);
            if (run <= 0) { s.f.position.set(x - 1.2 + k * .55, .45, cr.z + s.dz); s.f.userData.walk(0); }
            else { s.f.position.set(x + .8 + run * 16, 0, cr.z + s.dz + Math.sin(run * 6 + k) * .4); s.f.userData.walk(t * 1.3 + k, 1.2); }
          });
        }
        for (const b of booms) b.b.userData.at(t - b.t0);
        for (const pl of planes) pl.m.position.set(-50 + ((t * 12 + pl.lag) % 110), pl.y, pl.z);
      }
    };
  }
};
