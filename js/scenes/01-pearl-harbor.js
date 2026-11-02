import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'pearl-harbor', title: 'Pearl Harbor', seed: 11, duration: 8,
  script: 'Wir schreiben das Jahr 1941. Japan greift den US-Stützpunkt Pearl Harbor an.',
  caption: { title: 'Pearl Harbor', sub: '7. Dezember 1941' },
  params: {
    ships: { type: 'number', min: 1, max: 10, step: 1, value: 6, label: 'Schiffe' },
    details: { type: 'boolean', value: true, label: 'Hafendetails (Piers, Kräne, Hangars)' },
    planes: { type: 'number', min: 1, max: 14, step: 1, value: 7, label: 'Flugzeuge' },
    attackSpeed: { type: 'number', min: .5, max: 2, step: .05, value: 1, label: 'Angriffstempo' },
    explosionSize: { type: 'number', min: .5, max: 5, step: .1, value: 2.2, label: 'Explosionsgröße' },
    splashes: { type: 'number', min: 0, max: 24, step: 1, value: 10, label: 'Wassersäulen' },
    splashHeight: { type: 'number', min: 3, max: 20, step: .5, value: 9, label: 'Höhe Wassersäulen' },
    debris: { type: 'number', min: 0, max: 200, step: 10, value: 70, label: 'Trümmer je Explosion' },
    skyColor: { type: 'color', value: '#101722', label: 'Himmel' },
    waterColor: { type: 'color', value: '#1c2d3e', label: 'Wasser' },
    planeColor: { type: 'color', value: '#cfcac0', label: 'Flugzeugfarbe' },
    ...H.cameraParams([-20, 7, 24], [-10, 6, 17], [2, 1, -2], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 50, 140);
    H.lights(scene, { sun: [-10, 14, 8], shadows, intensity: 1.1, hemi: .6, skyColor: '#9fb3c8', groundColor: '#111', shadowSize: 40 });
    H.lightPool(scene, { x: 0, z: -2, radius: 22, height: 40, intensity: 220 });
    const water = H.wavePlane(160, 160, 40, p.waterColor, { amp: .08 });
    scene.add(water);
    // Insel im Hintergrund
    for (let i = 0; i < 7; i++) {
      const hill = H.sphere(6 + r() * 8, i % 2 ? '#2a3038' : '#232930', 14);
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
      const m = H.faceZ(H.aircraft(H.glowMat(H.ROLE.axis)));
      scene.add(m);
      const t0 = i * (0.55 / p.attackSpeed) + r() * .3;
      const a = new THREE.Vector3(-55 + r() * 10, 18 + r() * 6, -30 + r() * 30);
      const b = new THREE.Vector3(target.x, 3.5 + r() * 1.5, target.z);
      const c = new THREE.Vector3(50, 16 + r() * 8, 20 + r() * 20);
      const curve = new THREE.QuadraticBezierCurve3(a, b, c);
      const boom = H.fireball(r, { size: p.explosionSize, duration: 2.6, debris: p.debris, sparks: 120 });
      boom.position.copy(target).setY(1.4); scene.add(boom);
      const smoke = H.smokeColumn(r, { height: 10, width: .9 }); smoke.position.copy(target).setY(2); smoke.visible = false; scene.add(smoke);
      planes.push({ m, curve, t0, dur: 3.4 / p.attackSpeed, boom, smoke, bank: (r() - .5) * .8 });
    }
    // Wassersäulen (verfehlte Bomben)
    const splashes = [];
    for (let i = 0; i < p.splashes; i++) {
      const s = H.waterColumn(r, { height: p.splashHeight * (.7 + r() * .6), radius: .7 + r() * .6, duration: 2.6, drops: 140 });
      s.position.set(-26 + r() * 48, .25, -14 + r() * 26); scene.add(s);
      splashes.push({ s, t0: .6 + r() * 6.4 });
    }
    const tmp = new THREE.Vector3();
    if (p.details) {
      for (let i = 0; i < 3; i++) {
        const pier = H.box(26, .5, 2.4, '#4a4f58'); pier.position.set(-6 + i * 4, .3, -16 - i * 7); scene.add(pier);
        for (let k = 0; k < 9; k++) { const post = H.cyl(.12, .12, 1.4, '#2f3338', 6); post.position.set(-18 + i * 4 + k * 3, -.2, -16 - i * 7 + 1.1); scene.add(post); }
        const crane = new THREE.Group();
        const tower = H.box(.8, 7, .8, '#3a3f47'); tower.position.y = 3.5; const jib = H.box(7, .4, .5, '#3a3f47'); jib.position.set(2.5, 7, 0);
        const cab = H.box(1.2, 1, 1.2, '#3a3f47'); cab.position.set(0, 6.2, 0); const cable = H.cyl(.02, .02, 3, P.black, 4); cable.position.set(5.5, 5.5, 0);
        const hook = H.box(.3, .4, .3, P.black); hook.position.set(5.5, 3.9, 0);
        crane.add(tower, jib, cab, cable, hook); crane.position.set(-12 + i * 10, .5, -16 - i * 7 + 2.2); crane.rotation.y = .3 * i; scene.add(crane);
      }
      for (let i = 0; i < 4; i++) {
        const hangar = H.mesh(new THREE.CylinderGeometry(3.2, 3.2, 9, 12, 1, false, 0, Math.PI), '#4f555e'); hangar.rotation.z = Math.PI / 2; hangar.rotation.y = Math.PI / 2;
        hangar.position.set(-30 + i * 9, 0, -34); scene.add(hangar);
      }
      for (let i = 0; i < 10; i++) { const pm = H.palm(3 + r() * 2); pm.position.set(-44 + i * 9 + r() * 3, 0, -36 - r() * 6); scene.add(pm); }
      const fires = [];
      for (let i = 0; i < 3; i++) { const f = H.fireball(r, { size: 1.0, duration: 1.6, debris: 20, sparks: 60, ring: false }); f.position.set(-10 + r() * 24, .3, -4 + r() * 10); scene.add(f); fires.push({ f, t0: 2.5 + r() * 2 }); }
      scene.userData.fires = fires;
    }

    return {
      update(t) {
        water.userData.at(t);
        for (const fr of scene.userData.fires || []) { const a = t - fr.t0; fr.f.userData.at(a > 0 ? a % 1.6 : -1); }
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
        for (const sp of splashes) sp.s.userData.at(t - sp.t0);
      }
    };
  }
};
