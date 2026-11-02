import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'pearl-harbor', title: 'Pearl Harbor', seed: 11, duration: 8,
  script: 'Wir schreiben das Jahr 1941. Japan greift den US-Stützpunkt Pearl Harbor an.',
  caption: { title: 'Pearl Harbor', sub: '7. Dezember 1941' },
  params: {
    ships: { type: 'number', min: 1, max: 8, step: 1, value: 5, label: 'Schiffe' },
    planes: { type: 'number', min: 1, max: 14, step: 1, value: 7, label: 'Flugzeuge' },
    attackSpeed: { type: 'number', min: .5, max: 2, step: .05, value: 1, label: 'Angriffstempo' },
    explosionSize: { type: 'number', min: .5, max: 5, step: .1, value: 2.2, label: 'Explosionsgröße' },
    splashes: { type: 'number', min: 0, max: 20, step: 1, value: 8, label: 'Wassersäulen' },
    skyColor: { type: 'color', value: '#e9b48a', label: 'Himmel' },
    waterColor: { type: 'color', value: '#3a6a86', label: 'Wasser' },
    planeColor: { type: 'color', value: '#cfcac0', label: 'Flugzeugfarbe' },
    ...H.cameraParams([-20, 7, 24], [-10, 6, 17], [2, 1, -2], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 50, 140);
    H.lights(scene, { sun: [-10, 14, 8], shadows, skyColor: p.skyColor, shadowSize: 40 });
    const water = H.wavePlane(160, 160, 40, p.waterColor, { amp: .08 });
    scene.add(water);
    // Insel im Hintergrund
    for (let i = 0; i < 7; i++) {
      const hill = H.sphere(6 + r() * 8, i % 2 ? P.green : P.olive, 14);
      hill.position.set(-40 + i * 14 + r() * 6, -3, -40 - r() * 12); hill.scale.y = .45; scene.add(hill);
    }
    // Schiffe in Reihe ("Battleship Row")
    const ships = [];
    for (let i = 0; i < p.ships; i++) {
      const s = H.ship(P.steel, { length: 9 + r() * 3 });
      s.position.set(-14 + i * 8, 0, -6 + (i % 2) * 6 + r() * 2);
      s.rotation.y = (r() - .5) * .3;
      scene.add(s); ships.push(s);
    }
    // Flugzeuge mit Flugbahn
    const planes = [];
    for (let i = 0; i < p.planes; i++) {
      const target = ships[i % ships.length].position.clone();
      const m = H.faceZ(H.aircraft(p.planeColor, { accent: P.red }));
      scene.add(m);
      const t0 = i * (0.55 / p.attackSpeed) + r() * .3;
      const a = new THREE.Vector3(-55 + r() * 10, 18 + r() * 6, -30 + r() * 30);
      const b = new THREE.Vector3(target.x, 3.5 + r() * 1.5, target.z);
      const c = new THREE.Vector3(50, 16 + r() * 8, 20 + r() * 20);
      const curve = new THREE.QuadraticBezierCurve3(a, b, c);
      const boom = H.explosion({ size: p.explosionSize, duration: 1.8 });
      boom.position.copy(target).setY(1.5); scene.add(boom);
      const smoke = H.smokeColumn(r, { height: 10, width: .9 }); smoke.position.copy(target).setY(2); smoke.visible = false; scene.add(smoke);
      planes.push({ m, curve, t0, dur: 3.4 / p.attackSpeed, boom, smoke, bank: (r() - .5) * .8 });
    }
    // Wassersäulen (verfehlte Bomben)
    const splashes = [];
    for (let i = 0; i < p.splashes; i++) {
      const s = H.cone(.8, 4, P.white, 8); s.castShadow = false;
      s.position.set(-24 + r() * 44, 0, -14 + r() * 24); scene.add(s);
      splashes.push({ s, t0: 1 + r() * 6 });
    }
    const tmp = new THREE.Vector3();
    return {
      update(t) {
        water.userData.at(t);
        for (const pl of planes) {
          const u = H.span(t, pl.t0, pl.t0 + pl.dur);
          pl.m.visible = u > 0 && u < 1;
          pl.curve.getPoint(u, pl.m.position);
          pl.curve.getPoint(Math.min(1, u + .01), tmp);
          pl.m.lookAt(tmp);
          pl.m.rotateZ(pl.bank * Math.sin(u * Math.PI));
          pl.boom.userData.at(t - (pl.t0 + pl.dur * .5));
          const sm = t - (pl.t0 + pl.dur * .5);
          pl.smoke.visible = sm > 0; if (sm > 0) pl.smoke.userData.at(sm, .5);
        }
        for (const sp of splashes) {
          const age = t - sp.t0;
          const k = age < 0 || age > 1.4 ? 0 : Math.sin(age / 1.4 * Math.PI);
          sp.s.scale.set(k + .001, k + .001, k + .001); sp.s.position.y = k * 2;
        }
      }
    };
  }
};
